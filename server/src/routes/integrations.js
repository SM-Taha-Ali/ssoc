import express from 'express';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { leadSourceRegistry } from '../adapters/leadSources/LeadSourceRegistry.js';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { runLeadFinderTask, runCooldownTrackerTask } from '../services/schedulerService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/integrations
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    let config = await IntegrationConfig.findOne({ companyId: req.companyId }).lean();
    if (!config) {
      const created = await IntegrationConfig.create({
        companyId: req.companyId,
        rssFeeds: [
          {
            id: 'remoteok_dev',
            name: 'RemoteOK Developer Jobs',
            platform: 'remoteok',
            url: 'https://remoteok.com/remote-dev-jobs.rss',
            enabled: true
          },
          {
            id: 'weworkremotely_fullstack',
            name: 'WeWorkRemotely Full-Stack',
            platform: 'weworkremotely',
            url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
            enabled: true
          }
        ]
      });
      config = created.toObject();
    }

    // Mask sensitive passwords before sending to client
    const safeConfig = { ...config };
    if (safeConfig.smtp && safeConfig.smtp.pass) {
      safeConfig.smtp.pass = '••••••••';
    }
    if (safeConfig.imap && safeConfig.imap.pass) {
      safeConfig.imap.pass = '••••••••';
    }
    if (safeConfig.geminiApiKey) {
      safeConfig.geminiApiKey = safeConfig.geminiApiKey ? '••••••••' + safeConfig.geminiApiKey.slice(-4) : '';
    }
    if (safeConfig.resend && safeConfig.resend.apiKey) {
      safeConfig.resend.apiKey = safeConfig.resend.apiKey ? '••••••••' + safeConfig.resend.apiKey.slice(-4) : '';
    }
    if (safeConfig.freelancer && safeConfig.freelancer.apiToken) {
      safeConfig.freelancer.apiToken = safeConfig.freelancer.apiToken ? '••••••••' + safeConfig.freelancer.apiToken.slice(-4) : '';
    }
    if (safeConfig.apolloApiKey) {
      safeConfig.apolloApiKey = safeConfig.apolloApiKey ? '••••••••' + safeConfig.apolloApiKey.slice(-4) : '';
    }

    // Attach production-ready inbound reply webhook URL
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    safeConfig.inboundWebhookUrl = `${protocol}://${host}/api/webhooks/email-reply`;

    res.json(safeConfig);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/integrations
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    let config = await IntegrationConfig.findOne({ companyId: req.companyId });
    if (!config) {
      config = new IntegrationConfig({ ...req.body, companyId: req.companyId });
    } else {
      // Don't overwrite passwords if masked string was sent back
      if (req.body.smtp && req.body.smtp.pass === '••••••••') {
        delete req.body.smtp.pass;
      }
      if (req.body.imap && req.body.imap.pass === '••••••••') {
        delete req.body.imap.pass;
      }
      if (req.body.geminiApiKey && req.body.geminiApiKey.startsWith('••••••••')) {
        delete req.body.geminiApiKey;
      }
      if (req.body.resend && req.body.resend.apiKey && req.body.resend.apiKey.startsWith('••••••••')) {
        delete req.body.resend.apiKey;
      }
      if (req.body.apolloApiKey && req.body.apolloApiKey.startsWith('••••••••')) {
        delete req.body.apolloApiKey;
      }
      if (req.body.freelancer && req.body.freelancer.apiToken && req.body.freelancer.apiToken.startsWith('••••••••')) {
        delete req.body.freelancer.apiToken;
      }

      Object.assign(config, req.body, { companyId: req.companyId });
    }
    await config.save();
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/rss - Add a new RSS Feed source
 */
router.post('/rss', requireAuth, async (req, res) => {
  try {
    const { name, platform, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and RSS Feed URL are required' });
    }

    let config = await IntegrationConfig.findOne({ companyId: req.companyId });
    if (!config) config = await IntegrationConfig.create({ companyId: req.companyId });

    const newFeed = {
      id: `feed_${Date.now()}`,
      name,
      platform: platform || 'rss',
      url,
      enabled: true
    };

    config.rssFeeds.push(newFeed);
    await config.save();

    res.status(201).json(newFeed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/integrations/rss/:id - Delete an RSS Feed source
 */
router.delete('/rss/:id', requireAuth, async (req, res) => {
  try {
    let config = await IntegrationConfig.findOne({ companyId: req.companyId });
    if (!config) return res.status(404).json({ error: 'Config not found' });

    config.rssFeeds = config.rssFeeds.filter((f) => f.id !== req.params.id);
    await config.save();

    res.json({ success: true, message: 'Feed removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/inbound-webhook - Receive direct leads from Apollo, Zapier, Make, n8n, scrapers
 */
router.post('/inbound-webhook', async (req, res) => {
  try {
    const rawPayload = req.body;
    const webhookAdapter = leadSourceRegistry.get('webhook');
    const normalized = webhookAdapter.normalizeLead(rawPayload);

    // Determine tenant target
    let targetCompanyId = req.query.companyId || req.body.companyId;
    if (!targetCompanyId) {
      const defaultCo = await Company.findOne();
      targetCompanyId = defaultCo?._id;
    }

    // Check duplicate
    const existing = await Lead.findOne({
      companyId: targetCompanyId,
      $or: [
        { externalId: normalized.externalId, platform: normalized.platform },
        { sourceUrl: normalized.sourceUrl, platform: normalized.platform }
      ]
    });

    if (existing) {
      return res.status(200).json({
        message: 'Lead already exists in pipeline',
        leadId: existing._id,
        status: 'duplicate'
      });
    }

    const lead = new Lead({
      ...normalized,
      companyId: targetCompanyId,
      stage: 'discovered',
      matchScore: 80,
      matchReasoning: 'Inbound verified webhook lead'
    });

    lead.activityLogs.push({
      action: 'Inbound Webhook Received',
      details: `Received from ${normalized.platform || 'webhook'}`
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Inbound lead ingested into pipeline',
      leadId: lead._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/integrations/scheduler-status
 */
router.get('/scheduler-status', requireAuth, async (req, res) => {
  try {
    const [config, totalLeads] = await Promise.all([
      IntegrationConfig.findOne({ companyId: req.companyId })
        .select('leadFinderSchedule cooldownSchedule apolloApiKey')
        .lean(),
      Lead.countDocuments({ companyId: req.companyId, isArchived: { $ne: true } })
    ]);

    res.json({
      status: 'active',
      leadFinderSchedule: config?.leadFinderSchedule || '0 8 * * *',
      leadFinderHuman: 'Every day at 8:00 AM',
      cooldownSchedule: config?.cooldownSchedule || '0 9 * * *',
      cooldownHuman: 'Every day at 9:00 AM',
      activeSources: [
        'RemoteOK Live Tech API',
        'Freelancer.com Live Projects API',
        'Y Combinator & Hacker News Jobs',
        'WeWorkRemotely RSS Feed',
        config?.apolloApiKey || process.env.APOLLO_API_KEY ? 'Apollo.io Active' : 'Apollo.io (Awaiting Key)',
        'Inbound Webhook (/api/integrations/inbound-webhook)'
      ],
      totalLeadsInDb: totalLeads
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/run-lead-finder - Immediately trigger live scraping and lead finding
 */
router.post('/run-lead-finder', requireAuth, async (req, res) => {
  try {
    console.log(`[API] Triggering on-demand Live Lead Finder for company ${req.company.companyName}...`);
    const result = await runLeadFinderTask(req.companyId);
    const totalLeads = await Lead.countDocuments({ companyId: req.companyId, isArchived: { $ne: true } });
    res.json({
      success: true,
      message: `Lead Finder completed. Ingested ${result.newLeadsCount || 0} new live leads.`,
      newLeadsCount: result.newLeadsCount || 0,
      totalLeads
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/run-cooldown-tracker - Immediately trigger cooldown & follow-up progression
 */
router.post('/run-cooldown-tracker', requireAuth, async (req, res) => {
  try {
    const result = await runCooldownTrackerTask(req.companyId);
    res.json({
      success: true,
      message: `Cooldown Tracker completed. Updated ${result.updatedCount || 0} follow-ups.`,
      updatedCount: result.updatedCount || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/reset-database - Clear all leads back to zero for current company
 */
router.post('/reset-database', requireAuth, async (req, res) => {
  try {
    const result = await Lead.deleteMany({ companyId: req.companyId });
    console.log(`[API] Reset company pipeline for ${req.company.companyName}: deleted ${result.deletedCount} leads.`);
    res.json({
      success: true,
      message: `Pipeline cleared. Deleted ${result.deletedCount} leads for ${req.company.companyName}. Database is now at 0 leads.`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/sync-imap - Check IMAP mailbox for client replies now
 */
router.post('/sync-imap', requireAuth, async (req, res) => {
  try {
    const { syncImapReplies } = await import('../services/imapSyncService.js');
    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    const result = await syncImapReplies(config);
    res.json(result);
  } catch (err) {
    console.error('[API sync-imap error]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
