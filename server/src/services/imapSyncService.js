import { ImapFlow } from 'imapflow';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { Lead } from '../models/Lead.js';

/**
 * Extracts a clean email address from string (e.g. "Jane Doe <jane@example.com>" -> "jane@example.com")
 */
function extractEmailAddress(raw) {
  if (!raw) return '';
  const match = raw.match(/<([^>]+)>/) || raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase().trim() : raw.toLowerCase().trim();
}

/**
 * Connects to the configured IMAP mailbox, checks for client replies, and automatically halts follow-ups.
 */
export async function syncImapReplies(customConfig = null) {
  const config = customConfig || (await IntegrationConfig.findOne());
  if (!config || !config.imap || !config.imap.enabled) {
    return { success: false, message: 'IMAP sync is not enabled or configured.' };
  }

  const { host, port, secure, user, pass } = config.imap;
  if (!host || !user || !pass) {
    return { success: false, message: 'Incomplete IMAP credentials. Host, user, and password required.' };
  }

  const client = new ImapFlow({
    host,
    port: Number(port) || 993,
    secure: secure !== false,
    auth: {
      user,
      pass
    },
    logger: false
  });

  let processedCount = 0;
  let matchedLeadsCount = 0;
  const matchedLeads = [];

  try {
    await client.connect();

    // Lock mailbox for reading
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Calculate since date (last checked or last 48 hours)
      const sinceDate = config.imap.lastCheckedAt
        ? new Date(config.imap.lastCheckedAt)
        : new Date(Date.now() - 48 * 60 * 60 * 1000);

      // Search messages since that date
      const searchCriteria = {
        since: sinceDate
      };

      for await (const message of client.fetch(searchCriteria, { envelope: true, bodyStructure: true })) {
        processedCount++;

        const envelope = message.envelope;
        if (!envelope || !envelope.from || !envelope.from.length) continue;

        const senderObj = envelope.from[0];
        const senderEmail = (senderObj.address || '').toLowerCase().trim();
        const subject = envelope.subject || '(No Subject)';

        if (!senderEmail || senderEmail === user.toLowerCase()) continue;

        // Find active lead with this client email that is awaiting reply
        const lead = await Lead.findOne({
          'clientInfo.email': { $regex: new RegExp(`^${senderEmail}$`, 'i') },
          stage: { $in: ['contacted', 'lead_found', 'pitch_generated'] }
        });

        if (lead) {
          // Halts all follow-up sequence touches
          if (lead.followUps && lead.followUps.length) {
            lead.followUps.forEach((f) => {
              if (f.status === 'scheduled' || f.status === 'pending') {
                f.status = 'skipped';
              }
            });
          }

          lead.stage = 'replied';
          lead.lastRepliedAt = new Date();

          lead.activityLogs = lead.activityLogs || [];
          lead.activityLogs.unshift({
            action: 'Client Reply Detected via IMAP',
            timestamp: new Date(),
            details: `Incoming reply received from ${senderEmail} ("${subject}"). Automated follow-ups halted.`
          });

          await lead.save();
          matchedLeadsCount++;
          matchedLeads.push({
            id: lead._id,
            title: lead.title,
            clientEmail: senderEmail
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // Update last checked timestamp
    config.imap.lastCheckedAt = new Date();
    await config.save();

    return {
      success: true,
      processedCount,
      matchedLeadsCount,
      matchedLeads,
      checkedAt: new Date()
    };
  } catch (err) {
    console.error('[ImapSync] Error connecting or reading mailbox:', err.message);
    try {
      await client.logout();
    } catch (_) {}
    return {
      success: false,
      error: err.message
    };
  }
}
