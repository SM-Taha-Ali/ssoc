import express from 'express';
import { Lead } from '../models/Lead.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { deliveryRegistry } from '../adapters/delivery/DeliveryRegistry.js';
import { requireAuth } from '../middleware/auth.js';
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
        stage: 'day_2',
        delayDays: 2,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        subject: followUpTexts?.day_2?.subject || `Quick bump: ${finalSubject}`,
        body: followUpTexts?.day_2?.body || `Hi ${lead.clientInfo?.name || 'there'},\n\nJust wanted to make sure you had a chance to view the 60-second demo I recorded for you: ${lead.demoVideoUrl || ''}.\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'day_7',
        delayDays: 7,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subject: followUpTexts?.day_7?.subject || `Thought you might find this helpful regarding ${lead.title}`,
        body: followUpTexts?.day_7?.body || `Hi ${lead.clientInfo?.name || 'there'},\n\nFollowing up with a quick thought on your architecture regarding ${lead.title}.\n\nWould you be open to a 10-minute chat this week?\n\nBest,\n${companyProfile.senderName}`
      },
      {
        stage: 'day_21',
        delayDays: 21,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        subject: followUpTexts?.day_21?.subject || `Final check-in on ${lead.title}`,
        body: followUpTexts?.day_21?.body || `Hi ${lead.clientInfo?.name || 'there'},\n\nI assume your priorities may have shifted, so I won't follow up again. If you ever need help with this, feel free to reach out anytime!\n\nBest,\n${companyProfile.senderName}`
      }
    ];

    await lead.save();
    res.json({ success: true, lead, dispatchResult });
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
