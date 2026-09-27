import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class RemoteOkAdapter extends BaseLeadSource {
  constructor() {
    super('RemoteOK Real Job API', 'remoteok');
  }

  async fetchRawLeads(options = {}) {
    try {
      const tag = options.tag || 'dev';
      const response = await axios.get(`https://remoteok.com/api?tag=${tag}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!Array.isArray(response.data)) {
        return [];
      }

      // First element in RemoteOK API is usually metadata / legal disclaimer, slice(1)
      const jobs = response.data.slice(1);
      const limit = options.limit || 30;
      return jobs.slice(0, limit);
    } catch (error) {
      console.error('[RemoteOkAdapter] Error fetching live jobs:', error.message);
      return [];
    }
  }

  normalizeLead(raw) {
    const title = raw.position || raw.title || 'Remote Software Opportunity';
    const description = (raw.description || raw.tags?.join(', ') || 'No description provided')
      .replace(/<[^>]*>?/gm, '')
      .trim();

    return {
      title,
      description: description.substring(0, 3000),
      platform: 'remoteok',
      sourceUrl: raw.url || `https://remoteok.com/remote-jobs/${raw.id}`,
      externalId: String(raw.id || raw.slug || `remoteok_${Date.now()}_${Math.random()}`),
      clientInfo: {
        name: raw.company || 'Hiring Lead',
        company: raw.company || '',
        email: '',
        location: raw.location || 'Remote',
        website: raw.company_url || ''
      },
      skillsRequired: Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : [],
      stage: 'discovered',
      budget: {
        amount: Number(raw.salary_max || raw.salary_min) || 0,
        type: (raw.salary_max || raw.salary_min) ? 'fixed' : 'unspecified',
        currency: 'USD'
      }
    };
  }
}
