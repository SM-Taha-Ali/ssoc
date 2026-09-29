import express from 'express';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { extractCompanyProfileFromText } from '../services/geminiService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Require authenticated company for all profile operations
router.use(requireAuth);

/**
 * GET /api/company-profile
 */
router.get('/', async (req, res) => {
  try {
    let profile = await CompanyProfile.findOne({ companyId: req.companyId }).lean();
    if (!profile) {
      profile = await CompanyProfile.create({
        companyId: req.companyId,
        name: req.company.companyName,
        tagline: `${req.company.companyName} Operations & Sales`,
        senderName: `${req.company.companyName} Team`
      });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/company-profile
 */
router.put('/', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (Array.isArray(payload.caseStudies)) {
      payload.caseStudies = payload.caseStudies.map((cs, i) => `${i + 1}. ${cs}`).join('\n');
    }
    let profile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!profile) {
      profile = new CompanyProfile({ ...payload, companyId: req.companyId });
    } else {
      Object.assign(profile, payload, { companyId: req.companyId });
    }
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/company-profile/ai-extract
 * Quick AI Paste: extracts complete agency profile & sales targeting from raw text
 */
router.post('/ai-extract', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Please paste your company website text or summary.' });
    }

    const config = await IntegrationConfig.findOne({ companyId: req.companyId });
    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;
    const model = config?.geminiModel || process.env.GEMINI_MODEL || 'Gemini 3.8 Flash';

    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API Key is not set. Please enter your API key in Gemini AI Engine Settings.'
      });
    }

    const extracted = await extractCompanyProfileFromText(rawText, apiKey, model);
    res.json({
      message: 'Successfully extracted company & targeting profile using AI',
      data: extracted
    });
  } catch (err) {
    console.error('[Company Profile AI Extract Error]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to extract company profile.' });
  }
});

/**
 * POST /api/company-profile/sync-profiles
 * Automatically scrapes and ingests live data from Website, Upwork, and LinkedIn
 */
router.post('/sync-profiles', async (req, res) => {
  try {
    const { syncAllCompanyProfiles } = await import('../services/profileScraperService.js');
    let profile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found. Please create profile first.' });
    }

    const { profile: updatedProfile, results } = await syncAllCompanyProfiles(profile._id);
    res.json({
      success: true,
      message: 'Profile synchronization complete',
      results,
      profile: updatedProfile
    });
  } catch (err) {
    console.error('[Profile Sync Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to sync live profiles.' });
  }
});

export default router;
