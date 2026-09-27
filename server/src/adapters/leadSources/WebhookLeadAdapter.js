import { BaseLeadSource } from './BaseLeadSource.js';

export class WebhookLeadAdapter extends BaseLeadSource {
  constructor() {
    super('Webhook / Direct Inbound Adapter', 'webhook');
  }

  async fetchRawLeads(options = {}) {
    // Inbound webhooks push data directly; this handles array payloads if needed
    return options.payloads || [];
  }

  normalizeLead(rawItem) {
    return {
      title: rawItem.title || rawItem.jobTitle || rawItem.subject || 'Incoming Lead',
      description: rawItem.description || rawItem.text || rawItem.body || '',
      platform: (rawItem.platform || 'webhook').toLowerCase(),
      sourceUrl: rawItem.sourceUrl || rawItem.url || '',
      externalId: String(rawItem.id || rawItem.externalId || rawItem.email || Date.now()),
      clientInfo: {
        name: rawItem.clientName || rawItem.name || 'Hiring Lead',
        company: rawItem.company || rawItem.companyName || '',
        email: rawItem.email || rawItem.clientEmail || '',
        location: rawItem.location || '',
        website: rawItem.website || ''
      },
      budget: {
        amount: Number(rawItem.budget || rawItem.amount || 0),
        type: rawItem.budgetType || 'unspecified',
        currency: rawItem.currency || 'USD'
      },
      skillsRequired: Array.isArray(rawItem.skills) ? rawItem.skills : [],
      stage: 'discovered'
    };
  }
}
