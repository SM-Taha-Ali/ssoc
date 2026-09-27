import express from 'express';
import { runLeadFinderTask, runCooldownTrackerTask } from '../services/schedulerService.js';

const router = express.Router();

/**
 * POST /api/scheduler/run-lead-finder - Manually trigger daily lead scanner
 */
router.post('/run-lead-finder', async (req, res) => {
  try {
    const result = await runLeadFinderTask();
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
