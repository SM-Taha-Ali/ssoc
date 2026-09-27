import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CompanyProfile } from './models/CompanyProfile.js';
import { Lead } from './models/Lead.js';
import { IntegrationConfig } from './models/IntegrationConfig.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ssoc';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('[Seed] Connected to MongoDB');

  // Seed Company Profile
  let profile = await CompanyProfile.findOne();
  if (!profile) {
    profile = await CompanyProfile.create({
      name: 'Apex AI & Cloud Solutions',
      tagline: 'Enterprise AI Agents, Scalable Full-Stack Engineering & Cloud Optimization',
      website: 'https://apexsolutions.io',
      valueProposition: 'We build production-ready custom AI agents, automated workflow pipelines (n8n/Zapier), and scalable MERN applications that drive revenue and cut infrastructure bills by 40%.',
      targetServices: [
        'AI & Workflows (Custom AI agents, n8n/Zapier automations, RAG pipelines, voice bots)',
        'Web & Mobile Apps (React, React Native, Node.js, MERN stack, Next.js)',
        'Tech Infrastructure (Cloud cost reduction, AWS/GCP, API optimizations)',
        'Quick Fixes & Scripts (Python automation, database migrations, debugging)'
      ],
      targetKeywords: ['AI', 'Agent', 'n8n', 'Zapier', 'React', 'Node', 'MERN', 'DevOps', 'AWS', 'Python', 'RAG'],
      negativeKeywords: ['unpaid', 'internship', 'volunteer', 'commission only', 'crypto shill'],
      minBudget: 150,
      portfolioLinks: [
        { label: 'Enterprise AI Support Agent Demo', url: 'https://loom.com/share/sample-ai-agent' },
        { label: 'SaaS Architecture Case Study', url: 'https://github.com/sample/saas-architecture' }
      ],
      senderName: 'Alex Vance',
      senderTitle: 'Principal Solutions Architect',
      senderEmail: 'alex@apexsolutions.io'
    });
    console.log('[Seed] Default Company Profile created.');
  }

  // Seed Integration Config
  let config = await IntegrationConfig.findOne();
  if (!config) {
    config = await IntegrationConfig.create({
      geminiModel: 'gemini-2.5-flash',
      emailProvider: 'manual',
      rssFeeds: [
        {
          id: 'remoteok_dev',
          name: 'RemoteOK Developer & AI Jobs',
          platform: 'remoteok',
          url: 'https://remoteok.com/remote-dev-jobs.rss',
          enabled: true
        },
        {
          id: 'weworkremotely_fullstack',
          name: 'WeWorkRemotely Full-Stack',
          platform: 'weworkremotely',
          url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
          enabled: true
        }
      ]
    });
    console.log('[Seed] Default Integration Config created.');
  }

  // Check if leads exist
  const existingLeads = await Lead.countDocuments();
  if (existingLeads === 0) {
    await Lead.create([
      {
        title: 'Custom AI Agent for Customer Support & Zendesk Automation',
        description: 'Looking for an AI engineer to build a multi-channel support agent that integrates with our Zendesk tickets and Postgres database to answer client questions autonomously.',
        platform: 'upwork',
        sourceUrl: 'https://www.upwork.com/jobs/~sample1',
        externalId: 'seed_lead_1',
        clientInfo: {
          name: 'David Chen',
          company: 'Nexus Tech Logistics',
          email: 'david@nexustech.co',
          location: 'San Francisco, CA'
        },
        budget: { amount: 3500, type: 'fixed', currency: 'USD' },
        skillsRequired: ['AI Agents', 'OpenAI', 'Python', 'Postgres', 'Zendesk API'],
        stage: 'discovered',
        matchScore: 94,
        matchReasoning: 'Perfect match for AI & Workflow automations with high budget and clear technical scope.'
      },
      {
        title: 'Full-Stack React & Node.js Developer for Real-Time Analytics Dashboard',
        description: 'Need a senior developer to build real-time charting and analytics dashboard using React, Tailwind CSS, Express, and WebSocket connections.',
        platform: 'remoteok',
        sourceUrl: 'https://remoteok.com/jobs/sample2',
        externalId: 'seed_lead_2',
        clientInfo: {
          name: 'Sarah Miller',
          company: 'PulseMetrics SaaS',
          email: 'sarah@pulsemetrics.io',
          location: 'Austin, TX'
        },
        budget: { amount: 75, type: 'hourly', currency: 'USD' },
        skillsRequired: ['React', 'Node.js', 'WebSockets', 'Tailwind CSS'],
        stage: 'pre_reqs',
        matchScore: 89,
        matchReasoning: 'Strong fit for full-stack MERN expertise.',
        profileOptimizationTips: [
          'Highlight experience with high-frequency WebSocket data streaming and React memoization in your headline.',
          'Link our Pulse Dashboard live demo directly in the proposal.',
          'Emphasize previous SaaS metrics architectures that handled 100k+ events/sec.'
        ],
        demoScript: {
          hook: 'Hi Sarah, I noticed PulseMetrics is scaling real-time analytics. Handling live WebSocket streams without React UI lag is a common bottleneck.',
          problemStatement: 'Most dashboards drop frames when multiple charts re-render concurrently on high-frequency socket events.',
          microSolution: 'Here is a quick look at how we implemented batch-buffering with zustand and canvas-backed charts to maintain 60 FPS smoothly.',
          callToAction: 'Would you be open to a 10-minute technical chat to review this architecture for PulseMetrics?',
          fullScript: 'Hi Sarah, I noticed PulseMetrics is scaling real-time analytics. Handling live WebSocket streams without React UI lag is a common bottleneck. Most dashboards drop frames when multiple charts re-render concurrently on high-frequency socket events. Here is a quick look at how we implemented batch-buffering with zustand and canvas-backed charts to maintain 60 FPS smoothly. Would you be open to a 10-minute technical chat to review this architecture for PulseMetrics?'
        }
      },
      {
        title: 'n8n & Zapier Workflow Specialist for Multi-CRM Data Sync',
        description: 'We need complex n8n workflows connecting HubSpot, Stripe, and Postgres with error alert webhooks to Slack.',
        platform: 'ycombinator',
        sourceUrl: 'https://news.ycombinator.com/item?id=sample3',
        externalId: 'seed_lead_3',
        clientInfo: {
          name: 'Marcus Brody',
          company: 'FinFlow Corp',
          email: 'marcus@finflow.com',
          location: 'New York, NY'
        },
        budget: { amount: 2000, type: 'fixed', currency: 'USD' },
        skillsRequired: ['n8n', 'Zapier', 'HubSpot API', 'Stripe Webhooks', 'Postgres'],
        stage: 'draft_ready',
        matchScore: 96,
        demoVideoUrl: 'https://loom.com/share/sample-n8n-sync-demo',
        pitchDraft: {
          subject: 'Quick 60s demo: Fault-tolerant n8n sync for HubSpot & Stripe',
          body: 'Hi Marcus,\n\nI saw your need for resilient n8n workflows syncing Stripe and HubSpot. Managing webhook deduplication and API rate-limits without silent failures is critical here.\n\nI recorded a quick 60-second walkthrough showing our retry queue architecture: https://loom.com/share/sample-n8n-sync-demo\n\nWould you be open to a quick 10-minute chat this week to discuss FinFlow\'s pipeline?\n\nBest,\nAlex Vance\nApex AI Solutions',
          channel: 'email',
          generatedAt: new Date()
        }
      },
      {
        title: 'Cloud Cost Optimization & AWS Architecture Audit',
        description: 'Our monthly AWS bill has jumped past $12k. Looking for a DevOps / Cloud engineer to audit ECS, RDS, and CloudFront to cut costs.',
        platform: 'apollo',
        sourceUrl: 'https://apollo.io/lead-sample4',
        externalId: 'seed_lead_4',
        clientInfo: {
          name: 'Elena Rostova',
          company: 'CloudScale Labs',
          email: 'elena@cloudscalelabs.com',
          location: 'Denver, CO'
        },
        budget: { amount: 4500, type: 'fixed', currency: 'USD' },
        skillsRequired: ['AWS', 'DevOps', 'RDS', 'ECS', 'CloudWatch'],
        stage: 'cooldown',
        matchScore: 91,
        demoVideoUrl: 'https://loom.com/share/sample-aws-audit',
        lastContactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Contacted 3 days ago!
        pitchDraft: {
          subject: 'AWS Cost Reduction Audit - Apex AI',
          body: 'Hi Elena, reaching out regarding your AWS infrastructure optimization...',
          channel: 'email'
        },
        followUps: [
          {
            stage: 'day_2',
            delayDays: 2,
            status: 'ready', // Ready to send!
            scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            subject: 'Quick bump regarding AWS audit demo',
            body: 'Hi Elena,\n\nJust wanted to make sure you saw the quick demo video on ECS right-sizing I sent over: https://loom.com/share/sample-aws-audit\n\nBest,\nAlex'
          },
          {
            stage: 'day_7',
            delayDays: 7,
            status: 'pending',
            scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            subject: 'Quick AWS RDS reserved instance tip',
            body: 'Hi Elena, thought you might find this tip useful...'
          }
        ]
      },
      {
        title: 'AI Voice Bot Integration for Dental Clinic Appointment Booking',
        description: 'Need a developer to configure Retell AI / Vapi with Cal.com and Twilio to book patient appointments autonomously.',
        platform: 'linkedin',
        sourceUrl: 'https://linkedin.com/jobs/sample5',
        externalId: 'seed_lead_5',
        clientInfo: {
          name: 'Dr. Jason Reed',
          company: 'SmileCare Dental Group',
          email: 'jason@smilecaredental.com',
          location: 'Seattle, WA'
        },
        budget: { amount: 5000, type: 'fixed', currency: 'USD' },
        skillsRequired: ['Vapi', 'Retell AI', 'Twilio', 'Cal.com API', 'Node.js'],
        stage: 'replied',
        matchScore: 98,
        demoVideoUrl: 'https://loom.com/share/sample-voice-bot',
        lastRepliedAt: new Date(),
        pitchDraft: {
          subject: 'AI Voice Receptionist for SmileCare',
          body: 'Hi Dr. Reed, here is our demo for dental voice bots...',
          channel: 'email'
        }
      }
    ]);
    console.log('[Seed] Sample leads across lifecycle stages inserted successfully.');
  }

  console.log('[Seed] Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
