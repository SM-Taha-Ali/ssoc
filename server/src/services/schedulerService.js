import cron from 'node-cron';
import axios from 'axios';
import { Lead } from '../models/Lead.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { leadSourceRegistry } from '../adapters/leadSources/LeadSourceRegistry.js';
import { scoreAndAuditLead, generateFollowUpSequence, batchEvaluateLeads } from './geminiService.js';
import { Company } from '../models/Company.js';

let leadFinderJob = null;
let cooldownJob = null;
let imapJob = null;

/**
 * Checks if a lead is a full-time permanent salaried employee position rather than
 * a project, contract, freelance, MVP build, or B2B agency opportunity.
 */
export function isFullTimeEmployeeJob(lead) {
  const title = (lead.title || '').toLowerCase();
  const desc = (lead.description || '').toLowerCase();
  const url = (lead.sourceUrl || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // Reject competing staffing/talent middlemen and non-software micro-gigs
  if (
    lead.platform === 'weworkremotely' ||
    lead.platform === 'rss' ||
    url.includes('/careers/') ||
    url.includes('ashby_jid=') ||
    /toptal|proxify|turing\.com|bairesdev|lemon\.io|andela|arc\.dev|gun\.io|cybercoders|randstad|kforce|tek hire|jobgether|discussion participant|reseller partner|content writer/i.test(
      combined
    )
  ) {
    return true;
  }

  const projectIndicators = [
    'contract',
    'contractor',
    'freelance',
    'freelancer',
    'project',
    'prototype',
    'consultant',
    'consulting',
    'agency',
    'b2b',
    'c2c',
    'corp-to-corp',
    '1099',
    'fractional',
    'mvp',
    'fixed-price',
    'quotation request',
    'seeking freelancer',
    '/hr',
    'per task'
  ];
  const hasProjectSignal = projectIndicators.some((kw) => combined.includes(kw));

  // Hard full-time or W-2 employee signals
  const hardFullTimeSignals = [
    'w-2 only',
    'w2 only',
    'w2 contract',
    'no agencies',
    'no c2c',
    'no corp-to-corp',
    'no third parties',
    'no contractors',
    'full-time employee',
    'permanent employee',
    'part-time employee',
    '401(k)',
    '401k matching',
    'medical, dental, and vision',
    'health, dental, vision',
    'unlimited pto'
  ];
  if (hardFullTimeSignals.some((kw) => combined.includes(kw))) {
    return true;
  }

  // Require explicit contract/freelance/project signal on non-Freelancer platforms
  if (lead.platform !== 'freelancer' && !hasProjectSignal) {
    return true;
  }

  // Annual salary full-time job board listings without project/contract indicators
  if (
    lead.platform !== 'freelancer' &&
    lead.platform !== 'upwork' &&
    lead.budget?.amount >= 55000
  ) {
    return true;
  }

  return false;
}

/**
 * Automatically deletes closed leads, expired postings, and full-time employee jobs
 * so they never pollute the database or pipeline UI.
 */
export async function pruneClosedLeads(companyId = null) {
  try {
    const scope = companyId ? { companyId } : {};
    let deletedCount = 0;

    // 1. Delete all explicitly closed / lost / archived leads
    const closedRes = await Lead.deleteMany({
      ...scope,
      $or: [
        { stage: { $in: ['closed_lost', 'closed', 'lost'] } },
        { isArchived: true }
      ]
    });
    deletedCount += closedRes.deletedCount || 0;

    // 2. Delete stale uncontacted ('discovered') leads discovered more than 21 days ago
    const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    const staleRes = await Lead.deleteMany({
      ...scope,
      stage: 'discovered',
      createdAt: { $lt: twentyOneDaysAgo }
    });
    deletedCount += staleRes.deletedCount || 0;

    // 3. Inspect uncontacted ('discovered' and 'pre_reqs') leads to remove full-time employee roles & closed Freelancer.com projects
    const uncontactedLeads = await Lead.find({
      ...scope,
      stage: { $in: ['discovered', 'pre_reqs'] }
    })
      .select('_id title description platform externalId sourceUrl matchScore budget postedAt createdAt')
      .lean();

    const idsToDelete = [];
    const freelancerMap = new Map(); // projectId -> lead._id

    for (const lead of uncontactedLeads) {
      if (isFullTimeEmployeeJob(lead)) {
        idsToDelete.push(lead._id);
        continue;
      }
      if (lead.platform === 'freelancer' && lead.externalId?.startsWith('freelancer_')) {
        const pid = lead.externalId.replace('freelancer_', '');
        if (/^\d+$/.test(pid)) {
          freelancerMap.set(Number(pid), lead._id);
        }
      }
    }

    // Verify live open/closed status on Freelancer.com API in a single batch call
    if (freelancerMap.size > 0) {
      try {
        const projectIds = Array.from(freelancerMap.keys()).slice(0, 50);
        const queryParams = projectIds.map((id) => `projects[]=${id}`).join('&');
        const resp = await axios.get(`https://www.freelancer.com/api/projects/0.1/projects?${queryParams}`, {
          timeout: 6000
        });
        const projects = resp.data?.result?.projects || {};
        for (const [pid, leadId] of freelancerMap.entries()) {
          const p = projects[pid] || projects[String(pid)];
          if (p && (p.deleted || (p.status && p.status !== 'active') || (p.frontend_project_status && p.frontend_project_status !== 'open'))) {
            idsToDelete.push(leadId);
          }
        }
      } catch (_) {
        // Non-fatal if Freelancer status check times out
      }
    }

    if (idsToDelete.length > 0) {
      const delRes = await Lead.deleteMany({ _id: { $in: idsToDelete } });
      deletedCount += delRes.deletedCount || 0;
    }

    if (deletedCount > 0) {
      console.log(`[Scheduler] Auto-deleted ${deletedCount} closed/expired/full-time leads.`);
    }
    return deletedCount;
  } catch (err) {
    console.warn('[Scheduler] pruneClosedLeads warning:', err.message);
    return 0;
  }
}

/**
 * Runs the Lead Finder: scrapes raw project/freelance candidates, prunes closed leads,
 * runs high-efficiency single-call LLM batch evaluation, and saves top vetted project leads.
 */
export async function runLeadFinderTask(companyId = null) {
  console.log('[Scheduler] Starting Daily Project & Freelance Lead Finder Task...');
  try {
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const defaultCo = (await Company.findOne({ companyKey: 'quminai' })) || (await Company.findOne());
      targetCompanyId = defaultCo?._id;
    }

    // Automatically clean out closed, expired, or full-time leads before discovering fresh ones
    await pruneClosedLeads(targetCompanyId);

    let companyProfile = await CompanyProfile.findOne({ companyId: targetCompanyId });
    if (!companyProfile) {
      companyProfile = await CompanyProfile.create({ companyId: targetCompanyId });
    }

    let config = await IntegrationConfig.findOne({ companyId: targetCompanyId });
    if (!config) {
      config = await IntegrationConfig.create({ companyId: targetCompanyId });
    }

    const maxLeads = Math.max(Number(companyProfile.maxLeadsPerBatch) || 15, 12);

    // Compile multi-platform client-project & contract sources (Freelancer, Y Combinator / HN, LinkedIn Contracts, Remotive / RemoteOK Contracts)
    const sourcesToQuery = [
      {
        name: 'Y Combinator / Hacker News Contract & Freelance Projects',
        platform: 'ycombinator',
        options: { limit: 8 }
      },
      {
        name: 'LinkedIn Contract & Project Engagements',
        platform: 'linkedin',
        options: { limit: 8, keywords: 'AI Automation Full Stack Contract' }
      },
      {
        name: 'Remotive & RemoteOK Contract Projects',
        platform: 'remoteok',
        options: { limit: 6 }
      },
      {
        name: 'Freelancer.com Live Client Projects',
        platform: 'freelancer',
        options: { limit: 10 }
      }
    ];

    const apolloKey = config.apolloApiKey || process.env.APOLLO_API_KEY;
    if (apolloKey) {
      sourcesToQuery.push({
        name: 'Apollo.io Decision Makers',
        platform: 'apollo',
        options: {
          apiKey: apolloKey,
          limit: 10,
          keywords: companyProfile.targetKeywords || ['AI', 'Software', 'Automation']
        }
      });
    }

    // Phase 1: Collect candidates and filter out full-time jobs & hard negatives
    const candidateLeads = [];
    const negativeKeywords = [
      ...(companyProfile.negativeKeywords || []),
      'spanish speaking',
      'german speaking',
      'french speaking',
      'recruiter',
      'recruiting',
      'account executive',
      'telesales',
      'cold call',
      'unpaid',
      'internship',
      'volunteer',
      'commission only',
      'w-2 only',
      'w2 only',
      'no agencies',
      'no c2c'
    ].map((k) => k.toLowerCase());

    for (const source of sourcesToQuery) {
      const adapter = leadSourceRegistry.get(source.platform);
      if (!adapter) continue;

      try {
        console.log(`[Scheduler] Fetching project candidates from ${source.name}...`);
        const rawItems = await adapter.fetchRawLeads(source.options);
        for (const item of rawItems) {
          const normalized = adapter.normalizeLead(item);

          // Reject full-time employee positions immediately
          if (isFullTimeEmployeeJob(normalized)) continue;

          // Deduplication against DB
          const existing = await Lead.findOne({
            companyId: targetCompanyId,
            $or: [
              { externalId: normalized.externalId, platform: normalized.platform },
              { sourceUrl: normalized.sourceUrl, platform: normalized.platform }
            ]
          }).select('_id').lean();
          if (existing) continue;

          // Deduplication against current batch
          const duplicateInBatch = candidateLeads.some(
            (c) =>
              (c.externalId && c.externalId === normalized.externalId) ||
              (c.sourceUrl && c.sourceUrl === normalized.sourceUrl)
          );
          if (duplicateInBatch) continue;

          // Hard negative check
          const textToInspect = `${normalized.title} ${normalized.description} ${(normalized.skillsRequired || []).join(' ')}`.toLowerCase();
          const hasNegative = negativeKeywords.some((neg) => textToInspect.includes(neg));
          if (hasNegative) continue;

          candidateLeads.push(normalized);
          if (candidateLeads.length >= 35) break;
        }
      } catch (srcErr) {
        console.warn(`[Scheduler] Source ${source.name} error:`, srcErr.message);
      }
      if (candidateLeads.length >= 35) break;
    }

    console.log(`[Scheduler] Project candidate pool gathered: ${candidateLeads.length} leads. Running evaluation...`);

    let newLeadsCount = 0;
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

    // Phase 2: Single-Call Batch LLM Evaluation (with smart deterministic fallback if Gemini rate-limits)
    let evaluated = [];
    if (apiKey && candidateLeads.length > 0) {
      console.log(`[Scheduler] Running Single-Call Batch Gemini evaluation for ${candidateLeads.length} project candidates...`);
      evaluated = await batchEvaluateLeads(
        candidateLeads,
        companyProfile,
        apiKey,
        config.geminiModel
      );
      console.log(`[Scheduler] Gemini approved ${evaluated.length} high-fit project leads out of ${candidateLeads.length}.`);
    }

    const savedIndices = new Set();
    const savedByPlatform = {};

    if (evaluated.length > 0) {
      for (const item of evaluated) {
        if (newLeadsCount >= maxLeads) break;
        const candidate = candidateLeads[item.id];
        if (!candidate || isFullTimeEmployeeJob(candidate)) continue;

        const lead = new Lead({
          ...candidate,
          companyId: targetCompanyId,
          postedAt: candidate.postedAt || new Date()
        });
        lead.stage = 'discovered';
        lead.matchScore = item.matchScore || 85;
        lead.matchReasoning =
          item.matchReasoning || 'High-fit client project matching agency AI and full-stack capabilities.';
        if (item.extractedTechStack?.length) {
          lead.skillsRequired = Array.from(
            new Set([...(lead.skillsRequired || []), ...item.extractedTechStack])
          );
        }
        if (item.demoAngle) {
          lead.demoAngle = item.demoAngle;
          lead.demoScript = {
            hook: item.demoAngle,
            recommendedAngle: item.demoAngle,
            summary: item.demoAngle
          };
        }
        lead.activityLogs.push({
          action: 'Project Lead Discovered & Vetted',
          details: `Ingested project from ${candidate.platform}. AI Fit Score: ${lead.matchScore}%`
        });

        await lead.save();
        savedIndices.add(item.id);
        savedByPlatform[candidate.platform] = (savedByPlatform[candidate.platform] || 0) + 1;
        newLeadsCount++;
      }
    }

    // Ensure multi-platform coverage across Y Combinator, LinkedIn Contracts, Remotive/RemoteOK Contracts, and Freelancer
    if (candidateLeads.length > 0 && newLeadsCount < maxLeads) {
      const targetKeywords = [
        ...(companyProfile.targetKeywords || []),
        'AI',
        'Agent',
        'Automation',
        'React',
        'Node',
        'Python',
        'Full-Stack',
        'Full Stack',
        'Next.js',
        'LLM',
        'API',
        'MVP',
        'Prototype',
        'Cloud',
        'DevOps',
        'Postgres',
        'Software'
      ];
      const uniqueKws = Array.from(new Set(targetKeywords.map((k) => k.toLowerCase())));

      for (let idx = 0; idx < candidateLeads.length; idx++) {
        if (newLeadsCount >= maxLeads) break;
        if (savedIndices.has(idx)) continue;

        const candidate = candidateLeads[idx];
        if (!candidate || isFullTimeEmployeeJob(candidate)) continue;

        const platCount = savedByPlatform[candidate.platform] || 0;
        // Cap supplementary per-platform additions at 3 so every source gets fair representation
        if (evaluated.length > 0 && platCount >= 3) continue;

        const text = `${candidate.title} ${candidate.description} ${(candidate.skillsRequired || []).join(' ')}`.toLowerCase();
        const matchedKws = uniqueKws.filter((kw) => text.includes(kw));
        if (matchedKws.length === 0) continue;

        const computedScore = Math.min(
          95,
          80 + Math.min(12, matchedKws.length * 3) + (candidate.budget?.amount > 500 ? 3 : 0)
        );
        const lead = new Lead({
          ...candidate,
          companyId: targetCompanyId,
          postedAt: candidate.postedAt || new Date()
        });
        lead.stage = 'discovered';
        lead.matchScore = computedScore;
        lead.matchReasoning = `Verified ${candidate.platform.toUpperCase()} contract/project engagement matching ${matchedKws
          .slice(0, 4)
          .join(', ')}.`;
        lead.demoAngle = `Show a live 60-second architecture & working module tailored to "${candidate.title.slice(0, 60)}".`;
        lead.activityLogs.push({
          action: 'Project Lead Discovered',
          details: `Ingested active contract/project from ${candidate.platform} (${computedScore}% match).`
        });
        await lead.save();
        savedIndices.add(idx);
        savedByPlatform[candidate.platform] = platCount + 1;
        newLeadsCount++;
      }
    }

    console.log(`[Scheduler] Live Project Lead Finder complete. Added ${newLeadsCount} vetted project leads.`);
    return { success: true, newLeadsCount };
  } catch (err) {
    console.error('[Scheduler] Lead Finder encountered error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Runs the Follow-Up & Cooldown Tracker
 * Cadence: Day 7 -> Day 21 -> Monthly for 4 months (Day 51, 81, 111, 141) -> Auto-Delete Closed Lead
 */
export async function runCooldownTrackerTask(companyId = null) {
  console.log('[Scheduler] Starting Follow-Up Tracker & Closed Lead Cleanup Task...');
  try {
    await pruneClosedLeads(companyId);

    const leadQuery = {
      stage: { $in: ['sent', 'cooldown'] },
      lastContactedAt: { $exists: true, $ne: null }
    };
    if (companyId) {
      leadQuery.companyId = companyId;
    }
    const leadsInCooldown = await Lead.find(leadQuery);

    let updatedCount = 0;
    let deletedClosedCount = 0;
    const now = new Date();

    for (const lead of leadsInCooldown) {
      const daysSinceContact = Math.floor((now - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24));
      let leadUpdated = false;

      for (const followUp of lead.followUps || []) {
        if (followUp.status === 'pending') {
          const threshold = followUp.delayDays || 7;
          if (daysSinceContact >= threshold) {
            followUp.status = 'ready';
            lead.stage = 'cooldown';
            lead.activityLogs.push({
              action: 'Follow-Up Ready',
              details: `Follow-up "${followUp.stage}" (${threshold} days) is now ready to review and send (${daysSinceContact} days since initial contact).`
            });
            leadUpdated = true;
            updatedCount++;
          }
        }
      }

      // Auto-Delete Closed Leads after 4-month follow-up cadence completes without reply
      const allFollowUpsHandled =
        (lead.followUps || []).length > 0 &&
        lead.followUps.every((f) => f.status === 'sent' || f.status === 'skipped');

      if ((daysSinceContact >= 141 || (allFollowUpsHandled && daysSinceContact >= 141)) && lead.stage !== 'replied' && lead.stage !== 'closed_won') {
        await Lead.deleteOne({ _id: lead._id });
        deletedClosedCount++;
        continue;
      }

      if (leadUpdated) {
        await lead.save();
      }
    }

    console.log(`[Scheduler] Follow-Up Tracker finished. Updated ${updatedCount} leads, auto-deleted ${deletedClosedCount} unresponsive closed leads.`);
    return { success: true, updatedCount, deletedClosedCount };
  } catch (err) {
    console.error('[Scheduler] Follow-Up Tracker error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Initializes and schedules the background cron jobs
 */
export async function initScheduler() {
  let config = await IntegrationConfig.findOne();
  if (!config) {
    config = await IntegrationConfig.create({});
  }

  const finderSchedule = config.leadFinderSchedule || '0 8 * * *';
  const cooldownSchedule = config.cooldownSchedule || '0 9 * * *';

  if (leadFinderJob) leadFinderJob.stop();
  if (cooldownJob) cooldownJob.stop();
  if (imapJob) imapJob.stop();

  leadFinderJob = cron.schedule(finderSchedule, () => {
    runLeadFinderTask();
  });

  cooldownJob = cron.schedule(cooldownSchedule, () => {
    runCooldownTrackerTask();
  });

  imapJob = cron.schedule('*/30 * * * *', async () => {
    try {
      const { syncImapReplies } = await import('./imapSyncService.js');
      await syncImapReplies();
    } catch (_) {}
  });

  console.log(`[Scheduler] Initialized. Lead Finder: "${finderSchedule}", Cooldown Tracker: "${cooldownSchedule}", IMAP Reply Checker: every 30m`);
}
