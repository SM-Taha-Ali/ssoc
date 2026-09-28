import mongoose from 'mongoose';

const integrationConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    geminiApiKey: {
      type: String,
      default: ''
    },
    geminiModel: {
      type: String,
      enum: [
        'Gemini 3.8 Flash',
        'Gemini 3.7 Flash',
        'Gemini 3.5 Flash Lite',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.5-flash-lite'
      ],
      default: 'Gemini 3.8 Flash'
    },
    emailProvider: {
      type: String,
      enum: ['manual', 'smtp', 'resend'],
      default: 'manual'
    },
    smtp: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: '' }
    },
    resend: {
      apiKey: { type: String, default: '' },
      fromEmail: { type: String, default: '' }
    },
    imap: {
      host: { type: String, default: '' },
      port: { type: Number, default: 993 },
      secure: { type: Boolean, default: true },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      enabled: { type: Boolean, default: false },
      lastCheckedAt: { type: Date }
    },
    inboundWebhookSecret: {
      type: String,
      default: ''
    },
    apolloApiKey: {
      type: String,
      default: ''
    },
    freelancer: {
      apiToken: { type: String, default: '' },
      profileUsername: { type: String, default: '' },
      enabled: { type: Boolean, default: true }
    },
    upwork: {
      profileUrl: { type: String, default: '' },
      agencyName: { type: String, default: '' },
      searchKeywords: { type: String, default: 'React, Node, AI, Full Stack' },
      enabled: { type: Boolean, default: true }
    },
    linkedin: {
      searchKeywords: { type: String, default: 'Full Stack AI Developer' },
      companyPageUrl: { type: String, default: '' },
      enabled: { type: Boolean, default: true }
    },
    rssFeeds: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        platform: { type: String, required: true }, // e.g. upwork, remoteok, weworkremotely, ycombinator
        url: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        lastFetchedAt: { type: Date }
      }
    ],
    leadFinderSchedule: {
      type: String,
      default: '0 8 * * *' // 8:00 AM daily
    },
    cooldownSchedule: {
      type: String,
      default: '0 9 * * *' // 9:00 AM daily
    },
    isLeadFinderRunning: {
      type: Boolean,
      default: false
    },
    isCooldownTrackerRunning: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const IntegrationConfig = mongoose.model('IntegrationConfig', integrationConfigSchema);
