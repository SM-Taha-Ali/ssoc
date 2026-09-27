import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initScheduler } from './services/schedulerService.js';
import { ensureDefaultCompany } from './migrate_company.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  await ensureDefaultCompany();
  await initScheduler();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Smart Sales Operations Center (SSOC) Server Running `);
    console.log(`  URL: http://localhost:${PORT}                      `);
    console.log(`====================================================`);
  });
}

startServer();
