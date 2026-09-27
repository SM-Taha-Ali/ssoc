import express from 'express';
import bcrypt from 'bcryptjs';
import { Company } from '../models/Company.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Registers a new company and provisions its isolated profile & integration workspace
 */
router.post('/register', async (req, res) => {
  try {
    const { companyName, password } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }

    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanName = companyName.trim();
    const companyKey = cleanName.toLowerCase();

    // Check if company already exists
    const existing = await Company.findOne({ companyKey });
    if (existing) {
      return res.status(400).json({
        error: `Company "${cleanName}" is already registered. Please sign in or choose another name.`
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Create Company
    const company = await Company.create({
      companyName: cleanName,
      companyKey,
      password: hashedPassword
    });

    // Auto-provision Company Profile
    await CompanyProfile.create({
      companyId: company._id,
      name: company.companyName,
      tagline: `${company.companyName} Operations & Sales`,
      senderName: `${company.companyName} Team`
    });

    // Auto-provision Default Integration Config
    await IntegrationConfig.create({
      companyId: company._id,
      geminiModel: 'Gemini 3.8 Flash',
      rssFeeds: [
        {
          id: `${companyKey}_remoteok`,
          name: 'RemoteOK Developer Jobs',
          platform: 'remoteok',
          url: 'https://remoteok.com/remote-dev-jobs.rss',
          enabled: true
        },
        {
          id: `${companyKey}_wwr`,
          name: 'WeWorkRemotely Full-Stack',
          platform: 'weworkremotely',
          url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
          enabled: true
        }
      ]
    });

    const token = generateToken(company);

    res.status(201).json({
      message: `Company "${company.companyName}" registered successfully!`,
      token,
      company: {
        _id: company._id,
        companyName: company.companyName
      }
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

/**
 * POST /api/auth/login
 * Signs in to an existing company workspace
 */
router.post('/login', async (req, res) => {
  try {
    const { companyName, password } = req.body;

    if (!companyName || !password) {
      return res.status(400).json({ error: 'Both company name and password are required.' });
    }

    const companyKey = companyName.trim().toLowerCase();
    const company = await Company.findOne({ companyKey });

    if (!company) {
      return res.status(401).json({ error: 'Company not found. Please check your company name or register.' });
    }

    const isMatch = await company.comparePassword(password.trim());
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password for this company.' });
    }

    const token = generateToken(company);

    res.json({
      message: `Welcome back, ${company.companyName}!`,
      token,
      company: {
        _id: company._id,
        companyName: company.companyName
      }
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated company session
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    company: {
      _id: req.company._id,
      companyName: req.company.companyName
    }
  });
});

export default router;
