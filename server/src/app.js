import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import leadsRoutes from './routes/leads.js';
import companyProfileRoutes from './routes/companyProfile.js';
import integrationsRoutes from './routes/integrations.js';
import schedulerRoutes from './routes/scheduler.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'Smart Sales Operations Center (SSOC)',
    timestamp: new Date().toISOString()
  });
});

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/company-profile', companyProfileRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/scheduler', schedulerRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
