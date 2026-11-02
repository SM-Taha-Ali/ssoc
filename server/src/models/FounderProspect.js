import mongoose from 'mongoose';

const founderProspectSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    externalId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      default: 'Founder & CEO',
      trim: true
    },
    company: {
      type: String,
      default: 'Stealth / Tech Startup',
      trim: true
    },
    platform: {
      type: String,
      enum: ['linkedin', 'ycombinator', 'github', 'twitter', 'apollo', 'manual'],
      default: 'linkedin',
      index: true
    },
    linkedinUrl: {
      type: String,
      default: ''
    },
    twitterUrl: {
      type: String,
      default: ''
    },
    githubUrl: {
      type: String,
      default: ''
    },
    companyUrl: {
      type: String,
      default: ''
    },
    profileUrl: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: 'Global / Remote'
    },
    industry: {
      type: String,
      default: 'AI & SaaS'
    },
    signal: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    tags: [{ type: String }],
    matchScore: {
      type: Number,
      default: 88,
      min: 0,
      max: 100,
      index: true
    },
    matchReasoning: {
      type: String,
      default: ''
    },
    outreachMessage: {
      type: String,
      default: ''
    },
    connectionNote: {
      type: String,
      default: ''
    },
    emailSubject: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['discovered', 'contacted', 'replied'],
      default: 'discovered',
      index: true
    },
    lastContactedAt: {
      type: Date
    },
    postedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

founderProspectSchema.index({ companyId: 1, matchScore: -1, postedAt: -1 });
founderProspectSchema.index({ companyId: 1, externalId: 1 }, { unique: true });

export const FounderProspect = mongoose.model('FounderProspect', founderProspectSchema);
