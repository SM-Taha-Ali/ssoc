import { BaseLeadSource } from './BaseLeadSource.js';

export class ManualPasteAdapter extends BaseLeadSource {
  constructor() {
    super('Manual / Paste Lead Adapter', 'manual');
  }

  async fetchRawLeads(options = {}) {
    return [options];
  }

  normalizeLead(rawItem) {
    return {
      title: rawItem.title || 'Manually Added Lead',
      description: rawItem.description || rawItem.rawText || '',
      platform: (rawItem.platform || 'manual').toLowerCase(),
      sourceUrl: rawItem.sourceUrl || '',
      externalId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      clientInfo: {
        name: rawItem.clientName || 'Hiring Lead',
        company: rawItem.company || '',
        email: rawItem.email || '',
        location: rawItem.location || '',
        website: rawItem.website || ''
      },
      budget: {
        amount: Number(rawItem.budget || 0),
        type: rawItem.budgetType || 'unspecified',
        currency: rawItem.currency || 'USD'
      },
      skillsRequired: Array.isArray(rawItem.skills)
        ? rawItem.skills
        : (rawItem.skills ? rawItem.skills.split(',').map(s => s.trim()) : []),
      stage: 'discovered'
    };
  }
}
