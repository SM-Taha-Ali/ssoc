import { Router } from 'express';
import { Lead } from '../models/Lead.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';

const router = Router();

function extractEmailAddress(raw) {
  if (!raw) return '';
  if (typeof raw === 'object' && raw.email) return String(raw.email).toLowerCase().trim();
  const str = String(raw);
  const match = str.match(/<([^>]+)>/) || str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
}

/**
 * Inbound Email Reply Webhook
 * Accepts payloads from Resend Inbound, SendGrid Inbound Parse, Zapier, Make, n8n, or custom mail forwarders.
 * Endpoint: POST /api/webhooks/email-reply
 */
router.post('/email-reply', async (req, res) => {
  try {
    const payload = req.body || {};
    const query = req.query || {};

    // 1. Optional Secret Verification
    const secret = query.secret || req.headers['x-webhook-secret'];
    if (secret) {
      const config = await IntegrationConfig.findOne();
      if (config?.inboundWebhookSecret && config.inboundWebhookSecret !== secret) {
        return res.status(401).json({ success: false, error: 'Invalid webhook secret token.' });
      }
    }

    // 2. Extract Sender & Subject
    const rawFrom =
      payload.fromEmail ||
      payload.from ||
      payload.sender ||
      payload.data?.from ||
      payload.envelope?.from ||
      '';

    const fromEmail = extractEmailAddress(rawFrom);
    const subject = payload.subject || payload.data?.subject || '(No Subject)';
    const snippet = (payload.text || payload.html || payload.data?.text || '').slice(0, 300);
    const leadId = query.leadId || payload.leadId;

    if (!fromEmail && !leadId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sender email address or leadId in webhook payload.'
      });
    }

    // 3. Locate Lead in Database
    let lead = null;
    if (leadId) {
      lead = await Lead.findById(leadId);
    }

    if (!lead && fromEmail) {
      // Find active lead awaiting client response
      lead = await Lead.findOne({
        'clientInfo.email': { $regex: new RegExp(`^${fromEmail}$`, 'i') },
        stage: { $in: ['contacted', 'lead_found', 'pitch_generated'] }
      });

      // If not in active contacted stage, check any lead with this email
      if (!lead) {
        lead = await Lead.findOne({
          'clientInfo.email': { $regex: new RegExp(`^${fromEmail}$`, 'i') }
        });
      }
    }

    if (!lead) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: `Inbound email recorded from ${fromEmail || 'unknown'}, but no corresponding lead was found.`,
        fromEmail,
        subject
      });
    }

    // 4. Update Lead Stage to 'replied' and Halt Follow-ups
    const previousStage = lead.stage;
    lead.stage = 'replied';
    lead.lastRepliedAt = new Date();

    if (lead.followUps && lead.followUps.length) {
      lead.followUps.forEach((f) => {
        if (f.status === 'scheduled' || f.status === 'pending') {
          f.status = 'skipped';
        }
      });
    }

    lead.activityLogs = lead.activityLogs || [];
    lead.activityLogs.unshift({
      action: 'Client Reply Detected via Webhook',
      timestamp: new Date(),
      details: `Inbound email received from ${fromEmail} ("${subject}"). Previous stage was "${previousStage}". Automated follow-up sequence halted.`
    });

    await lead.save();

    return res.status(200).json({
      success: true,
      matched: true,
      leadId: lead._id,
      leadTitle: lead.title,
      clientName: lead.clientInfo?.name,
      newStage: lead.stage,
      message: 'Client reply registered successfully. Follow-ups halted.'
    });
  } catch (err) {
    console.error('[Webhooks] Error handling email-reply:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
