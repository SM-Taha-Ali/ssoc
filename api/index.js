import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';
import { ensureDefaultCompany } from '../server/src/migrate_company.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    await ensureDefaultCompany();
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Serverless Function Error]:', error);
    return res.status(500).json({ error: error.message || 'Serverless Execution Error' });
  }
}
