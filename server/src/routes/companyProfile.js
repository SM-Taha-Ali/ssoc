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
    let profile = await CompanyProfile.findOne({ companyId: req.companyId });
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
    let profile = await CompanyProfile.findOne({ companyId: req.companyId });
    if (!profile) {
      profile = new CompanyProfile({ ...req.body, companyId: req.companyId });
    } else {
      Object.assign(profile, req.body, { companyId: req.companyId });
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

export default router;
