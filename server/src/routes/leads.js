import express from 'express';
import { Lead } from '../models/Lead.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { deliveryRegistry } from '../adapters/delivery/DeliveryRegistry.js';
import { requireAuth } from '../middleware/auth.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { leadSourceRegistry } from '../adapters/leadSources/LeadSourceRegistry.js';
import {
  scoreAndAuditLead,
  generatePitchDraft,
  generateFollowUpSequence,
  parseRawJobText
} from '../services/geminiService.js';

const router = express.Router();

// Enforce authentication on all lead operations
router.use(requireAuth);

/**
 * GET /api/leads - Query leads with filtering and search scoped to the authenticated company
 */
router.get('/', async (req, res) => {
  try {
    // If the authenticated company is QuminAI and currently has 0 leads,
    // automatically adopt existing legacy or unassigned leads into QuminAI
    if (req.company?.companyKey === 'quminai') {
      const quminLeadCount = await Lead.countDocuments({ companyId: req.companyId });
      if (quminLeadCount === 0) {
        await Lead.updateMany(
          { $or: [{ companyId: { $ne: req.companyId } }, { companyId: null }, { companyId: { $exists: false } }] },
          { $set: { companyId: req.companyId } }
        );
      }
    }

    const { stage, platform, search, sort } = req.query;
    const query = { companyId: req.companyId, isArchived: { $ne: true } };

    if (stage && stage !== 'all') {
      query.stage = stage;
    }
    if (platform && platform !== 'all') {
      query.platform = platform;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'clientInfo.name': { $regex: search, $options: 'i' } },
        { 'clientInfo.company': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const leads = await Lead.find(query).sort(sortOption);

    // Also calculate quick stage counts strictly scoped to company
    const counts = await Lead.aggregate([
      { $match: { companyId: req.companyId, isArchived: { $ne: true } } },
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ]);

    const stageCounts = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({ leads, stageCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this company workspace' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads - Create lead manually
 */
router.post('/', async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      companyId: req.companyId,
      externalId: req.body.externalId || `manual_${Date.now()}`
    };
    const lead = new Lead(leadData);
    lead.activityLogs.push({
      action: 'Created',
      details: `Manually added to ${req.company.companyName} pipeline`
    });
    await lead.save();
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/leads/paste-parse - Parse unstructured raw job posting with Gemini
 */
router.post('/paste-parse', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Raw job text is required' });
    }

    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;

    let parsed;
    if (apiKey) {
      parsed = await parseRawJobText(rawText, apiKey, config?.geminiModel);
    } else {
      // Heuristic fallback if no API key yet
      const lines = rawText.split('\n').filter(Boolean);
      parsed = {
        title: lines[0]?.substring(0, 80) || 'Pasted Job Opportunity',
        clientName: 'Hiring Lead',
        company: '',
        email: '',
        platform: 'manual',
        budgetAmount: 0,
        budgetType: 'unspecified',
        skills: [],
        cleanDescription: rawText
      };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/import-url - Import and parse any job posting from LinkedIn, Freelancer, Upwork, or public URL
 */
router.post('/import-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'A valid HTTP/HTTPS job listing URL is required.' });
    }

    let platform = 'manual';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com')) platform = 'linkedin';
    else if (lowerUrl.includes('freelancer.com')) platform = 'freelancer';
    else if (lowerUrl.includes('upwork.com')) platform = 'upwork';
    else if (lowerUrl.includes('remoteok.com')) platform = 'remoteok';
    else if (lowerUrl.includes('weworkremotely.com')) platform = 'weworkremotely';

    let jobTitle = '';
    let companyName = '';
    let description = '';
    let clientLocation = 'Remote / Global';

    if (platform === 'linkedin') {
      const adapter = leadSourceRegistry.get('linkedin');
      if (adapter && typeof adapter.fetchJobDetails === 'function') {
        const details = await adapter.fetchJobDetails(url);
        if (details) {
          jobTitle = details.title;
          companyName = details.company;
          description = details.description;
          clientLocation = details.location;
        }
      }
    }

    // Generic scrape fallback if adapter did not return full text
    if (!description || !jobTitle) {
      try {
        const resp = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 10000
        });
        const $ = cheerio.load(resp.data);
        if (!jobTitle) {
          jobTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Imported Opportunity';
        }
        if (!companyName) {
          companyName = $('meta[property="og:site_name"]').attr('content') || $('meta[name="author"]').attr('content') || 'Hiring Client';
        }
        if (!description) {
          description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('article').text().trim() || $('main').text().trim() || $('body').text().trim();
        }
      } catch (scrapeErr) {
        console.warn('[import-url] Direct scrape notice:', scrapeErr.message);
      }
    }

    if (!jobTitle) jobTitle = 'Imported Project Opportunity';
    if (!description) description = `Imported from ${url}`;

    // Clean description length
    description = description.replace(/\s+/g, ' ').trim().substring(0, 4000);

    // AI scoring & pitch generation if API key is present
    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    let companyProfile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!companyProfile) companyProfile = await CompanyProfile.create({ companyId: req.companyId, name: req.company.companyName });

    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;
    let matchScore = 85;
    let matchReasoning = 'Directly imported listing matching workspace competencies.';
    let demoAngle = 'Custom interactive prototype showcase';
    let pitchDraft = { subject: `Regarding your ${jobTitle} project`, body: '' };

    if (apiKey) {
      try {
        const audit = await scoreAndAuditLead(
          { title: jobTitle, description, platform, budget: { amount: 0, type: 'unspecified' }, skillsRequired: [] },
          companyProfile,
          apiKey,
          config?.geminiModel
        );
        matchScore = audit.matchScore;
        matchReasoning = audit.matchReasoning;
        demoAngle = audit.demoAngle;

        const pitch = await generatePitchDraft(
          { title: jobTitle, description, platform, clientName: companyName, clientInfo: { company: companyName } },
          companyProfile,
          apiKey,
          config?.geminiModel
        );
        pitchDraft = {
          subject: pitch.subject,
          body: pitch.body,
          generatedAt: new Date()
        };
      } catch (aiErr) {
        console.warn('[import-url] AI evaluation error:', aiErr.message);
      }
    }

    const lead = new Lead({
      companyId: req.companyId,
      title: jobTitle,
      description,
      platform,
      sourceUrl: url,
      externalId: `${platform}_${Date.now()}`,
      clientName: companyName || 'Hiring Client',
      clientInfo: {
        name: companyName || 'Hiring Client',
        company: companyName || 'Client Entity',
        location: clientLocation,
        email: '',
        website: ''
      },
      skillsRequired: companyProfile.targetKeywords?.slice(0, 5) || ['Full-Stack Development'],
      matchScore,
      matchReasoning,
      demoAngle,
      pitchDraft,
      stage: 'discovered',
      activityLogs: [
        {
          action: 'Imported via URL',
          details: `Directly captured from ${platform.toUpperCase()} (${url})`
        }
      ]
    });

    await lead.save();
    res.status(201).json({ success: true, lead });
  } catch (err) {
    console.error('[import-url] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/leads/:id/stage - Update lead stage manually
 */
router.patch('/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this workspace' });

    const previousStage = lead.stage;
    lead.stage = stage;

    lead.activityLogs.push({
      action: 'Stage Changed',
      details: `Moved from "${previousStage}" to "${stage}"`
    });

    // If client replied, cancel automated follow-ups
    if (stage === 'replied') {
      lead.lastRepliedAt = new Date();
      (lead.followUps || []).forEach((f) => {
        if (f.status === 'pending' || f.status === 'ready') {
          f.status = 'skipped';
        }
      });
      lead.activityLogs.push({
        action: 'Follow-ups Halted',
        details: 'Client responded! All automated follow-up sequences stopped immediately.'
      });
    }

    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/audit - Run AI Audit & Generate 60s Demo Script
 */
router.post('/:id/audit', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this workspace' });

    let companyProfile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!companyProfile) companyProfile = await CompanyProfile.create({ companyId: req.companyId, name: req.company.companyName });

    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API key is missing. Please add it in Settings > Integrations.'
      });
    }

    const audit = await scoreAndAuditLead(lead, companyProfile, apiKey, config?.geminiModel);

    lead.matchScore = audit.matchScore || 75;
    lead.matchReasoning = audit.matchReasoning || '';
    lead.profileOptimizationTips = audit.profileOptimizationTips || [];
    lead.demoScript = audit.demoScript || {};
    lead.stage = 'pre_reqs';

    lead.activityLogs.push({
      action: 'AI Audit Completed',
      details: `Calculated match score of ${lead.matchScore}%, generated 60s demo script and profile optimization tips.`
    });

    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/video - Submit recorded demo video link & auto-generate pitch
 */
router.post('/:id/video', async (req, res) => {
  try {
    const { demoVideoUrl } = req.body;
    if (!demoVideoUrl) {
      return res.status(400).json({ error: 'demoVideoUrl is required' });
    }

    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this workspace' });

    lead.demoVideoUrl = demoVideoUrl;
    lead.stage = 'draft_ready';

    let companyProfile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!companyProfile) companyProfile = await CompanyProfile.create({ companyId: req.companyId, name: req.company.companyName });

    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const pitch = await generatePitchDraft(lead, companyProfile, apiKey, config?.geminiModel);
        lead.pitchDraft = {
          subject: pitch.subject || `Demo regarding ${lead.title}`,
          body: pitch.body || '',
          channel: lead.clientInfo?.email ? 'email' : 'platform',
          generatedAt: new Date()
        };
      } catch (aiErr) {
        console.warn('[Video Submit] Could not auto-generate pitch draft:', aiErr.message);
      }
    }

    lead.activityLogs.push({
      action: 'Demo Video Linked',
      details: `Added demo video: ${demoVideoUrl}. Lead moved to Draft Ready.`
    });

    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/generate-pitch - Manually generate or regenerate pitch
 */
router.post('/:id/generate-pitch', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this workspace' });

    let companyProfile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!companyProfile) companyProfile = await CompanyProfile.create({ companyId: req.companyId, name: req.company.companyName });

    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API key is required in Settings.' });
    }

    const pitch = await generatePitchDraft(lead, companyProfile, apiKey, config?.geminiModel);
    lead.pitchDraft = {
      subject: pitch.subject,
      body: pitch.body,
      channel: lead.clientInfo?.email ? 'email' : 'platform',
      generatedAt: new Date()
    };

    lead.activityLogs.push({
      action: 'Pitch Draft Generated',
      details: `Generated personalized pitch draft using ${config?.geminiModel || 'Gemini'}`
    });

    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/send - Dispatch the pitch (Direct SMTP, Resend, or Manual Clipboard/Mailto)
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { subject, messageBody, channelOverride, providerOverride } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this workspace' });

    let companyProfile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!companyProfile) companyProfile = await CompanyProfile.create({ companyId: req.companyId, name: req.company.companyName });

    let config = await IntegrationConfig.findOne({ companyId: req.companyId });
    if (!config) config = await IntegrationConfig.create({ companyId: req.companyId });

    const finalSubject = subject || lead.pitchDraft?.subject || `Regarding ${lead.title}`;
    const finalBody = messageBody || lead.pitchDraft?.body;

    if (!finalBody) {
      return res.status(400).json({ error: 'Pitch message body cannot be empty.' });
    }

    const provider = providerOverride || config.emailProvider || 'manual';
    const dispatcher = deliveryRegistry.get(provider);

    const dispatchResult = await dispatcher.dispatch({
      lead,
      subject: finalSubject,
      messageBody: finalBody,
      companyProfile,
      integrationConfig: config
    });

    // Update lead state
    lead.stage = 'sent';
    lead.lastContactedAt = new Date();
    lead.pitchDraft.subject = finalSubject;
    lead.pitchDraft.body = finalBody;
    lead.pitchDraft.reviewedAt = new Date();

    lead.activityLogs.push({
      action: 'Pitch Dispatched',
      details: dispatchResult.details || `Sent via ${provider}`
    });

    // Initialize 3-touch Follow-Up schedule: Day 2, Day 7, Day 21
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    let followUpTexts = null;
    if (apiKey) {
      try {
        followUpTexts = await generateFollowUpSequence(lead, companyProfile, apiKey, config.geminiModel);
      } catch (aiErr) {
        console.warn('[Dispatch] Could not auto-generate follow-up sequence:', aiErr.message);
      }
    }

    lead.followUps = [
      {
        stage: 'day_7',
        delayDays: 7,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subject: followUpTexts?.day_7?.subject || `Thought you might find this helpful regarding ${lead.title}`,
        body: followUpTexts?.day_7?.body || `Hi ${lead.clientInfo?.name || 'there'},\n\nFollowing up on my previous message regarding ${lead.title}. Just wanted to check if you had a chance to view the 60-second video demo I prepared: ${lead.demoVideoUrl || ''}.\n\nWould you be open to a 10-minute chat this week?\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'day_21',
        delayDays: 21,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        subject: followUpTexts?.day_21?.subject || `Re-checking priorities on ${lead.title}`,
        body: followUpTexts?.day_21?.body || `Hi ${lead.clientInfo?.name || 'there'},\n\nRe-surfacing this in case ${lead.title} is still on your radar. We recently delivered an identical solution and I would love to share key benchmarks with you.\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'month_1',
        delayDays: 51,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000),
        subject: `Monthly check-in regarding ${lead.title}`,
        body: `Hi ${lead.clientInfo?.name || 'there'},\n\nChecking back in to see if you are still looking for support with ${lead.title}. Our team has specialized engineering bandwidth ready if you would like to revisit this.\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'month_2',
        delayDays: 81,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 81 * 24 * 60 * 60 * 1000),
        subject: `Quick update on ${lead.title}`,
        body: `Hi ${lead.clientInfo?.name || 'there'},\n\nFollowing up with a quick touchpoint regarding ${lead.title}. Let me know if priorities have evolved and we can schedule a quick implementation review.\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'month_3',
        delayDays: 111,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 111 * 24 * 60 * 60 * 1000),
        subject: `Project check-in: ${lead.title}`,
        body: `Hi ${lead.clientInfo?.name || 'there'},\n\nReaching out to see if the initiative for ${lead.title} is currently active. Happy to answer any technical questions or provide a tailored estimate whenever you are ready.\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'month_4',
        delayDays: 141,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 141 * 24 * 60 * 60 * 1000),
        subject: `Final follow-up on ${lead.title}`,
        body: `Hi ${lead.clientInfo?.name || 'there'},\n\nThis is my final check-in regarding ${lead.title}. I assume your priorities may have shifted, so I will close this file on our end to respect your inbox. If you ever need assistance in the future, don't hesitate to reach back out!\n\nBest,\n${companyProfile.senderName}`
      }
    ];

    const fullPitchPayload = {
      subject: finalSubject,
      body: finalBody,
      demoVideoUrl: lead.demoVideoUrl || '',
      actionUrl: dispatchResult.actionUrl || lead.sourceUrl || '',
      platform: lead.platform,
      provider,
      clientName: lead.clientInfo?.name || lead.clientName || 'Client'
    };

    await lead.save();
    res.json({ success: true, lead, dispatchResult, fullPitchPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/client-replied - Instant response trigger
 */
router.post('/:id/client-replied', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!lead) return res.status(404).json({ error: 'Lead not found in this workspace' });

    lead.stage = 'replied';
    lead.lastRepliedAt = new Date();

    // Instantly freeze all pending followups
    (lead.followUps || []).forEach((f) => {
      if (f.status === 'pending' || f.status === 'ready') {
        f.status = 'skipped';
      }
    });

    lead.activityLogs.push({
      action: 'Client Responded',
      details: 'Client sent a reply! Lead elevated to High-Priority Inbox. Follow-ups stopped.'
    });

    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/leads/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Lead.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    if (!deleted) return res.status(404).json({ error: 'Lead not found or already deleted' });
    res.json({ success: true, message: 'Lead deleted from workspace' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
