import express from 'express';
import { FounderProspect } from '../models/FounderProspect.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { deliveryRegistry } from '../adapters/delivery/DeliveryRegistry.js';
import { requireAuth } from '../middleware/auth.js';
import {
  discoverFoundersForCompany,
  purgeFakeFoundersForCompany,
  regenerateFounderOutreachForProspect,
  buildSmartFounderOutreachFallback
} from '../services/founderScoutService.js';

const router = express.Router();
router.use(requireAuth);

function computeFounderPriority(founder, nowMs = Date.now()) {
  const matchScore = Number(founder.matchScore) || 85;
  const refDate = founder.postedAt || founder.createdAt || nowMs;
  const refMs = new Date(refDate).getTime() || nowMs;
  const ageInDays = Math.max(0, (nowMs - refMs) / (1000 * 60 * 60 * 24));
  const freshnessBoost = ageInDays <= 1 ? 4 : ageInDays <= 3 ? 2 : 0;
  const decay = Math.min(35, ageInDays * 2.5);
  return Math.round((matchScore + freshnessBoost - decay) * 10) / 10;
}

/**
 * GET /api/founders - Fetch discovered Founders & Decision Makers ranked by Match % + Recency
 */
router.get('/', async (req, res) => {
  try {
    const { platform, status, search, sort } = req.query;

    // Always purge any legacy placeholder/unverified founders first
    await purgeFakeFoundersForCompany(req.companyId);

    // Auto-seed real verified founders if workspace has none
    const existingCount = await FounderProspect.countDocuments({ companyId: req.companyId });
    if (existingCount === 0) {
      await discoverFoundersForCompany(req.companyId, { keywords: 'AI SaaS Startup' });
    }

    const query = { companyId: req.companyId };
    if (platform && platform !== 'all') {
      query.platform = platform;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { company: { $regex: s, $options: 'i' } },
        { role: { $regex: s, $options: 'i' } },
        { signal: { $regex: s, $options: 'i' } },
        { bio: { $regex: s, $options: 'i' } }
      ];
    }

    const rawFounders = await FounderProspect.find(query)
      .sort({ matchScore: -1, postedAt: -1, createdAt: -1 })
      .lean();

    const nowMs = Date.now();
    const founders = rawFounders.map((f) => {
      const refMs = new Date(f.postedAt || f.createdAt || nowMs).getTime() || nowMs;
      return {
        ...f,
        priorityScore: computeFounderPriority(f, nowMs),
        ageInHours: Math.max(0, Math.round((nowMs - refMs) / (1000 * 60 * 60)))
      };
    });

    if (!sort || sort === 'smart') {
      founders.sort((a, b) => b.priorityScore - a.priorityScore);
    } else if (sort === 'match') {
      founders.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (sort === 'newest') {
      founders.sort((a, b) => new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0));
    }

    res.json({ founders, total: founders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/founders/discover - Trigger live Founder & Decision Maker discovery
 */
router.post('/discover', async (req, res) => {
  try {
    const { keywords, reset } = req.body || {};
    const result = await discoverFoundersForCompany(req.companyId, {
      keywords: keywords || 'AI Automation SaaS',
      reset: Boolean(reset)
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/founders/reset - Wipe all founders for the authenticated workspace and re-seed fresh verified founders
 */
router.delete('/reset', async (req, res) => {
  try {
    const deleted = await FounderProspect.deleteMany({ companyId: req.companyId });
    const discovered = await discoverFoundersForCompany(req.companyId, {
      keywords: 'AI SaaS Startup',
      reset: false
    });
    res.json({
      success: true,
      deletedCount: deleted.deletedCount || 0,
      addedCount: discovered.addedCount || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/founders - Manually add a Founder / LinkedIn URL and auto-draft AI outreach
 */
router.post('/', async (req, res) => {
  try {
    const { name, role, company, linkedinUrl, twitterUrl, email, signal, bio } = req.body;
    if (!name && !linkedinUrl) {
      return res.status(400).json({ error: 'Founder name or LinkedIn URL is required' });
    }

    let derivedName = name;
    if (!derivedName && linkedinUrl) {
      const slug = linkedinUrl.split('/in/')[1]?.split('/')[0]?.split('?')[0] || 'Founder';
      derivedName = slug
        .replace(/-[0-9a-f]{5,}$/i, '')
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    const companyProfile = (await CompanyProfile.findOne({ companyId: req.companyId })) || {};
    const draft = {
      name: derivedName || 'Startup Founder',
      role: role || 'Founder & CEO',
      company: company || 'Tech Startup',
      platform: 'linkedin',
      linkedinUrl: linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((derivedName || '') + ' ' + (company || 'Founder'))}`,
      twitterUrl: twitterUrl || '',
      profileUrl: linkedinUrl || '',
      email: email || '',
      signal: signal || `Direct LinkedIn Founder target at ${company || 'Tech Startup'}`,
      bio: bio || '',
      tags: ['Direct Target', 'LinkedIn Outreach'],
      matchScore: 94,
      postedAt: new Date()
    };

    const generated = await regenerateFounderOutreachForProspect(draft, req.companyId);
    const fallback = buildSmartFounderOutreachFallback(draft, companyProfile);

    const created = await FounderProspect.create({
      ...draft,
      companyId: req.companyId,
      externalId: `manual_founder_${Date.now()}`,
      matchScore: generated?.matchScore || 94,
      matchReasoning: generated?.matchReasoning || fallback.matchReasoning,
      outreachMessage: generated?.outreachMessage || fallback.outreachMessage,
      connectionNote: generated?.connectionNote || fallback.connectionNote,
      emailSubject: generated?.emailSubject || fallback.emailSubject,
      status: 'discovered'
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/founders/:id - Update outreach message, connection note, or status (e.g. mark contacted)
 */
router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    const allowed = ['outreachMessage', 'connectionNote', 'emailSubject', 'status', 'linkedinUrl', 'email', 'role', 'company'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    if (req.body.status === 'contacted') {
      updates.lastContactedAt = new Date();
    }

    const updated = await FounderProspect.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { $set: updates },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Founder prospect not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/founders/:id/regenerate - Regenerate AI outreach message with optional custom angle
 */
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { customAngle } = req.body || {};
    const founder = await FounderProspect.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!founder) return res.status(404).json({ error: 'Founder prospect not found' });

    const generated = await regenerateFounderOutreachForProspect(founder, req.companyId, customAngle);
    founder.outreachMessage = generated.outreachMessage || founder.outreachMessage;
    founder.connectionNote = generated.connectionNote || founder.connectionNote;
    founder.emailSubject = generated.emailSubject || founder.emailSubject;
    if (generated.matchReasoning) founder.matchReasoning = generated.matchReasoning;

    await founder.save();
    res.json(founder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/founders/:id/send-email - 1-click direct email dispatch when founder has an email
 */
router.post('/:id/send-email', async (req, res) => {
  try {
    const { subject, messageBody } = req.body || {};
    const founder = await FounderProspect.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!founder) return res.status(404).json({ error: 'Founder prospect not found' });
    if (!founder.email) {
      return res.status(400).json({ error: 'No email address on file for this founder. Use Open LinkedIn & Send.' });
    }

    const companyProfile = (await CompanyProfile.findOne({ companyId: req.companyId })) || {};
    const config = (await IntegrationConfig.findOne({ companyId: req.companyId })) || {};
    const provider = config.emailProvider || 'smtp';
    const dispatcher = deliveryRegistry.get(provider);

    const syntheticLead = {
      title: `Partnership with ${founder.company}`,
      platform: founder.platform,
      clientInfo: {
        name: founder.name,
        company: founder.company,
        email: founder.email
      }
    };

    const dispatchResult = await dispatcher.dispatch({
      lead: syntheticLead,
      subject: subject || founder.emailSubject || `Quick idea for ${founder.company}`,
      messageBody: messageBody || founder.outreachMessage,
      companyProfile,
      integrationConfig: config
    });

    founder.status = 'contacted';
    founder.lastContactedAt = new Date();
    if (messageBody) founder.outreachMessage = messageBody;
    await founder.save();

    res.json({ success: true, founder, dispatchResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/founders/:id - Dismiss / remove a founder prospect
 */
router.delete('/:id', async (req, res) => {
  try {
    await FounderProspect.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    res.json({ success: true, _id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
