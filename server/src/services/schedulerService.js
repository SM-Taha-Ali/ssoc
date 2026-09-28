import cron from 'node-cron';
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
 * Runs the Lead Finder: scrapes raw candidates, runs high-efficiency single-call LLM batch evaluation,
 * and saves top strictly vetted leads (bounded to ~15-20 per run).
 */
export async function runLeadFinderTask(companyId = null) {
  console.log('[Scheduler] Starting Daily Lead Finder Task (Single-Call Batch LLM Architecture)...');
  try {
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const defaultCo = await Company.findOne();
      targetCompanyId = defaultCo?._id;
    }

    let companyProfile = await CompanyProfile.findOne({ companyId: targetCompanyId });
    if (!companyProfile) {
      companyProfile = await CompanyProfile.create({ companyId: targetCompanyId });
    }

    let config = await IntegrationConfig.findOne({ companyId: targetCompanyId });
    if (!config) {
      config = await IntegrationConfig.create({ companyId: targetCompanyId });
    }

    const maxLeads = companyProfile.maxLeadsPerBatch || 20;

    // Compile active sources with tight, balanced limits
    const sourcesToQuery = [
      ...((config.rssFeeds || []).filter((f) => f.enabled).map((f) => ({
        name: f.name,
        platform: f.platform || 'rss',
        options: { url: f.url, platform: f.platform, limit: 10 }
      }))),
      {
        name: 'RemoteOK Live Tech API',
        platform: 'remoteok',
        options: { limit: 12, tag: 'dev' }
      },
      {
        name: 'Freelancer.com Live Projects',
        platform: 'freelancer',
        options: { limit: 12 }
      },
      {
        name: 'LinkedIn Public Tech Jobs',
        platform: 'linkedin',
        options: {
          limit: 10,
          keywords: config.linkedin?.searchKeywords || 'Full Stack AI Developer'
        }
      },
      {
        name: 'Y Combinator & Hacker News Jobs',
        platform: 'ycombinator',
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

    // Phase 1: Collect candidates and filter hard negatives
    const candidateLeads = [];
    const negativeKeywords = [
      ...(companyProfile.negativeKeywords || []),
      'spanish speaking',
      'spanish',
      'german speaking',
      'german',
      'french speaking',
      'recruiter',
      'recruiting',
      'account executive',
      'telesales',
      'cold call',
      'unpaid',
      'internship',
      'volunteer',
      'commission only'
    ].map((k) => k.toLowerCase());

    for (const source of sourcesToQuery) {
      const adapter = leadSourceRegistry.get(source.platform);
      if (!adapter) continue;

      try {
        console.log(`[Scheduler] Fetching candidates from ${source.name}...`);
        const rawItems = await adapter.fetchRawLeads(source.options);
        for (const item of rawItems) {
          const normalized = adapter.normalizeLead(item);

          // Deduplication against DB
          const existing = await Lead.findOne({
            companyId: targetCompanyId,
            $or: [
              { externalId: normalized.externalId, platform: normalized.platform },
              { sourceUrl: normalized.sourceUrl, platform: normalized.platform }
            ]
          });
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
          if (candidateLeads.length >= 35) break; // Collect a pool of ~35 candidates to evaluate
        }
      } catch (srcErr) {
        console.warn(`[Scheduler] Source ${source.name} error:`, srcErr.message);
      }
      if (candidateLeads.length >= 35) break;
    }

    console.log(`[Scheduler] Candidate pool gathered: ${candidateLeads.length} leads. Running evaluation...`);

    let newLeadsCount = 0;
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

    // Phase 2: Single-Call Batch LLM Evaluation (or fallback keyword filter)
    if (apiKey && candidateLeads.length > 0) {
      console.log(`[Scheduler] Running Single-Call Batch Gemini evaluation for ${candidateLeads.length} candidates...`);
      const evaluated = await batchEvaluateLeads(
        candidateLeads,
        companyProfile,
        apiKey,
        config.geminiModel
      );

      console.log(`[Scheduler] Gemini approved ${evaluated.length} high-fit leads out of ${candidateLeads.length}.`);

      for (const item of evaluated) {
        if (newLeadsCount >= maxLeads) break;
        const candidate = candidateLeads[item.id];
        if (!candidate) continue;

        const lead = new Lead({ ...candidate, companyId: targetCompanyId });
        lead.stage = 'discovered';
        lead.matchScore = item.matchScore || 85;
        lead.matchReasoning = item.matchReasoning || 'Matches agency core AI and full-stack services.';
        if (item.extractedTechStack?.length) {
          lead.skillsRequired = Array.from(new Set([...lead.skillsRequired, ...item.extractedTechStack]));
        }
        if (item.demoAngle) {
          lead.demoScript = {
            recommendedAngle: item.demoAngle,
            summary: item.demoAngle
          };
        }
        lead.activityLogs.push({
          action: 'Discovered & AI Vetted',
          details: `Ingested from ${candidate.platform}. AI Fit Score: ${lead.matchScore}%`
        });

        await lead.save();
        newLeadsCount++;
      }
    } else {
      // Regex keyword fallback if no Gemini key is configured
      const targetKeywords = companyProfile.targetKeywords?.length
        ? companyProfile.targetKeywords
        : ['AI', 'Agent', 'Automation', 'React', 'Node', 'Python', 'Full-Stack', 'DevOps'];

      for (const candidate of candidateLeads) {
        if (newLeadsCount >= maxLeads) break;
        const text = `${candidate.title} ${candidate.description}`.toLowerCase();
        const matches = targetKeywords.some((kw) => text.includes(kw.toLowerCase()));
        if (!matches) continue;

        const lead = new Lead({ ...candidate, companyId: targetCompanyId });
        lead.stage = 'discovered';
        lead.matchScore = 75;
        lead.matchReasoning = 'Matches target technical keywords.';
        lead.activityLogs.push({
          action: 'Discovered',
          details: `Ingested from ${candidate.platform} via keyword match.`
        });
        await lead.save();
        newLeadsCount++;
      }
    }

    console.log(`[Scheduler] Live Lead Finder complete. Added ${newLeadsCount} vetted leads (Capped at ${maxLeads}).`);
    return { success: true, newLeadsCount };
  } catch (err) {
    console.error('[Scheduler] Lead Finder encountered error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Runs the Cooldown & Follow-Up Tracker
 */
export async function runCooldownTrackerTask(companyId = null) {
  console.log('[Scheduler] Starting Cooldown & Follow-Up Tracker Task...');
  try {
    const leadQuery = {
      stage: { $in: ['sent', 'cooldown'] },
      lastContactedAt: { $exists: true, $ne: null }
    };
    if (companyId) {
      leadQuery.companyId = companyId;
    }
    const leadsInCooldown = await Lead.find(leadQuery);

    let updatedCount = 0;
    const now = new Date();

    for (const lead of leadsInCooldown) {
      const daysSinceContact = Math.floor((now - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24));

      // Find pending follow-ups
      for (const followUp of lead.followUps || []) {
        if (followUp.status === 'pending') {
          if (
            (followUp.stage === 'day_2' && daysSinceContact >= 2) ||
            (followUp.stage === 'day_7' && daysSinceContact >= 7) ||
            (followUp.stage === 'day_21' && daysSinceContact >= 21)
          ) {
            followUp.status = 'ready';
            lead.stage = 'cooldown';
            lead.activityLogs.push({
              action: 'Follow-Up Ready',
              details: `Follow-up ${followUp.stage} is now ready to review and send (${daysSinceContact} days since last contact).`
            });
            updatedCount++;
          }
        }
      }

      await lead.save();
    }

    console.log(`[Scheduler] Cooldown Tracker finished. Updated ${updatedCount} follow-ups.`);
    return { success: true, updatedCount };
  } catch (err) {
    console.error('[Scheduler] Cooldown Tracker error:', err.message);
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

  // Automated IMAP Reply Detection every 30 minutes
  imapJob = cron.schedule('*/30 * * * *', async () => {
    try {
      const { syncImapReplies } = await import('./imapSyncService.js');
      await syncImapReplies();
    } catch (_) {}
  });

  console.log(`[Scheduler] Initialized. Lead Finder: "${finderSchedule}", Cooldown Tracker: "${cooldownSchedule}", IMAP Reply Checker: every 30m`);
}
