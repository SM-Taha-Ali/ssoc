import mongoose from 'mongoose';

const companyProfileSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    name: {
      type: String,
      default: 'My Agency / Tech Solutions'
    },
    tagline: {
      type: String,
      default: 'Full-Stack & AI Automation Engineering'
    },
    website: {
      type: String,
      default: ''
    },
    valueProposition: {
      type: String,
      default: 'We help tech companies and founders build custom AI agents, full-stack applications, and automated workflows that scale revenue and cut operational costs.'
    },
    targetServices: {
      type: [String],
      default: [
        'AI & Workflows (AI agents, n8n/Zapier automations, RAG pipelines, voice bots)',
        'Web & Mobile Apps (React, React Native, Node.js, MERN stack, Next.js)',
        'Tech Infrastructure (Cloud optimization, API integrations, DevOps)',
        'Quick Fixes & Scripts (Python automation, database migrations, debugging)'
      ]
    },
    targetKeywords: {
      type: [String],
      default: ['AI', 'Agent', 'n8n', 'Zapier', 'React', 'Node', 'MERN', 'Full Stack', 'Automation', 'Python', 'API', 'RAG']
    },
    negativeKeywords: {
      type: [String],
      default: ['unpaid', 'internship', 'volunteer', 'commission only', 'crypto telegram shill', 'spanish speaking', 'german speaking', 'telemarketer']
    },
    coreStrengths: {
      type: [String],
      default: [
        'Custom Autonomous AI Agents & Voice Bots',
        'Complex Workflow Automation (n8n, Zapier, Make, Webhooks)',
        'Modern Full-Stack Web Development (React, Next.js, Node.js, Python/FastAPI)',
        'Cloud Cost Optimization & Scalable DevOps (AWS, GCP, Docker, Serverless)'
      ]
    },
    caseStudies: {
      type: String,
      default: '1. Automated customer onboarding and Zendesk ticket triaging using custom AI agents, reducing support tickets by 62% for a Series A SaaS.\n2. Built multi-tenant n8n & Stripe synchronization pipeline processing $1.2M in annual recurring transactions.\n3. Re-architected AWS infrastructure and database queries for a healthcare portal, slashing monthly AWS bill from $14,000 to $5,800.'
    },
    idealClientProfile: {
      industries: {
        type: [String],
        default: ['B2B SaaS', 'Tech Startups & Founders', 'E-commerce & Marketplaces', 'Digital Agencies & Consultancies']
      },
      targetRoles: {
        type: [String],
        default: ['Founder / CEO', 'CTO / Technical Co-founder', 'VP of Engineering', 'Head of Product / Operations']
      },
      companyStages: {
        type: [String],
        default: ['Pre-Seed to Series B', 'Bootstrapped & Profitable ($1M-$10M ARR)', 'Fast-Growing SMBs']
      }
    },
    disqualifiers: {
      type: [String],
      default: [
        'Non-tech sales or cold-calling telesales roles',
        'Specific non-English language requirements (e.g. Spanish-only or German-only customer service)',
        'Staffing agency or generic recruiter headhunting listings',
        'Unpaid internships or 100% commission/equity-only without baseline budget',
        'Basic data entry or virtual assistant tasks with zero engineering'
      ]
    },
    calendarLink: {
      type: String,
      default: ''
    },
    geographicPreference: {
      type: String,
      default: 'Remote Worldwide (US/EU timezones preferred)'
    },
    maxLeadsPerBatch: {
      type: Number,
      default: 20
    },
    minBudget: {
      type: Number,
      default: 100
    },
    websiteData: {
      scrapedTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      rawTextSummary: { type: String, default: '' },
      scrapedServices: [{ type: String }],
      scrapedCaseStudies: [{ type: String }],
      lastScrapedAt: { type: Date }
    },
    upworkProfileUrl: {
      type: String,
      default: ''
    },
    upworkData: {
      headline: { type: String, default: '' },
      overview: { type: String, default: '' },
      skills: [{ type: String }],
      hourlyRate: { type: String, default: '' },
      rawTextSummary: { type: String, default: '' },
      lastScrapedAt: { type: Date }
    },
    linkedinProfileUrl: {
      type: String,
      default: ''
    },
    linkedinData: {
      headline: { type: String, default: '' },
      about: { type: String, default: '' },
      services: [{ type: String }],
      rawTextSummary: { type: String, default: '' },
      lastScrapedAt: { type: Date }
    },
    portfolioLinks: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],
    profileLinks: [
      {
        platform: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],
    senderName: {
      type: String,
      default: 'Alex Vance'
    },
    senderTitle: {
      type: String,
      default: 'Principal Solutions Architect'
    },
    senderEmail: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);
