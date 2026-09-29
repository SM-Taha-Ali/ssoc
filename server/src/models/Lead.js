import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema({
  stage: {
    type: String,
    required: true
  },
  delayDays: {
    type: Number,
    required: true
  },
  scheduledDate: {
    type: Date
  },
  sentDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'ready', 'sent', 'skipped'],
    default: 'pending'
  },
  subject: {
    type: String,
    default: ''
  },
  body: {
    type: String,
    default: ''
  }
});

const activityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  }
});

const leadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
      // e.g. upwork, freelancer, linkedin, indeed, ycombinator, apollo, manual, webhook
    },
    sourceUrl: {
      type: String,
      default: ''
    },
    externalId: {
      type: String,
      index: true
      // for deduplication
    },
    clientInfo: {
      name: { type: String, default: 'Hiring Lead' },
      company: { type: String, default: '' },
      email: { type: String, default: '' },
      location: { type: String, default: '' },
      website: { type: String, default: '' }
    },
    budget: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ['fixed', 'hourly', 'competitive', 'unspecified'], default: 'unspecified' },
      currency: { type: String, default: 'USD' }
    },
    skillsRequired: {
      type: [String],
      default: []
    },
    stage: {
      type: String,
      enum: [
        'discovered',
        'pre_reqs',
        'draft_ready',
        'sent',
        'cooldown',
        'replied',
        'meeting',
        'closed_won',
        'closed_lost'
      ],
      default: 'discovered',
      index: true
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    matchReasoning: {
      type: String,
      default: ''
    },
    profileOptimizationTips: {
      type: [String],
      default: []
    },
    demoScript: {
      hook: { type: String, default: '' },
      problemStatement: { type: String, default: '' },
      microSolution: { type: String, default: '' },
      callToAction: { type: String, default: '' },
      fullScript: { type: String, default: '' }
    },
    demoVideoUrl: {
      type: String,
      default: ''
    },
    pitchDraft: {
      subject: { type: String, default: '' },
      body: { type: String, default: '' },
      channel: { type: String, default: 'email' }, // 'email' | 'platform'
      generatedAt: { type: Date },
      reviewedAt: { type: Date }
    },
    followUps: [followUpSchema],
    activityLogs: [activityLogSchema],
    lastContactedAt: {
      type: Date
    },
    lastRepliedAt: {
      type: Date
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Compound index to guarantee no duplicate external leads per platform for each company
leadSchema.index({ companyId: 1, platform: 1, externalId: 1 }, { unique: true, sparse: true });
leadSchema.index({ companyId: 1, stage: 1, isArchived: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
