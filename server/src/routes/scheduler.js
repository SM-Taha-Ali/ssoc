import express from 'express';
import jwt from 'jsonwebtoken';
import { runLeadFinderTask, runCooldownTrackerTask } from '../services/schedulerService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ssoc_super_secret_multi_tenant_key_2025';

function extractCompanyId(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.companyId || null;
    }
  } catch (_) {
    // Fallback to null (all companies)
  }
  return null;
}

/**
 * POST /api/scheduler/run-lead-finder - Manually trigger daily lead scanner
 */
router.post('/run-lead-finder', async (req, res) => {
  try {
    const companyId = extractCompanyId(req);
    const result = await runLeadFinderTask(companyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scheduler/run-cooldown - Manually trigger daily cooldown & follow-up check
 */
router.post('/run-cooldown', async (req, res) => {
  try {
    const result = await runCooldownTrackerTask();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
