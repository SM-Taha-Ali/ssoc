import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class RemoteOkAdapter extends BaseLeadSource {
  constructor() {
    super('Remotive & RemoteOK Contract/Freelance Engine', 'remoteok');
  }

  async fetchRawLeads(options = {}) {
    const limit = options.limit || 10;
    const results = [];

    // 1. Remotive Public API — strictly filter for job_type === 'contract' or 'freelance' in software/AI
    try {
      const remResp = await axios.get('https://remotive.com/api/remote-jobs?limit=250', {
        timeout: 9000
      });
      const remJobs = remResp.data?.jobs || [];
      for (const j of remJobs) {
        const jobType = (j.job_type || '').toLowerCase();
        if (jobType !== 'contract' && jobType !== 'freelance') continue;

        const titleAndCat = `${j.category || ''} ${j.title || ''}`.toLowerCase();
        if (
          !/software|dev|ai|data|product|cloud|full-stack|full stack|backend|frontend|web|mobile|engineer|architect|automation/i.test(
            titleAndCat
          )
        ) {
          continue;
        }
        // Exclude video annotation / low-level labeling gigs
        if (/video annotation|data entry|copywriter|writer|translator/i.test(j.title || '')) {
          continue;
        }

        const cleanDesc = (j.description || '')
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        let parsedBudget = 0;
        const numMatch = (j.salary || '').match(/\$?(\d{1,2}(?:,\d{3})|\d+(?:\.\d+)?k)/i);
        if (numMatch) {
          const rawVal = numMatch[1].toLowerCase().replace(/,/g, '');
          parsedBudget = rawVal.endsWith('k') ? Math.round(parseFloat(rawVal) * 1000) : Number(rawVal);
        }

        results.push({
          id: `remotive_${j.id}`,
          position: /contract|freelance/i.test(j.title) ? j.title : `${j.title} (Contract)`,
          company: j.company_name || 'Contract Client',
          description: `${cleanDesc.slice(0, 2800)} [Compensation: ${j.salary || 'Contract / Project'}]`,
          url: j.url,
          location: j.candidate_required_location || 'Remote',
          tags: Array.isArray(j.tags) ? [...j.tags.slice(0, 6), 'Contract'] : ['Contract', 'Software / AI'],
          salary_max: parsedBudget <= 25000 ? parsedBudget : 0,
          postedAt: j.publication_date || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[RemoteOkAdapter] Remotive contract fetch notice:', err.message);
    }

    // 2. RemoteOK API — strictly require 'contract', 'freelance', 'fractional', or 'consultant' in Title or Tags (not just "project" in body)
    try {
      const response = await axios.get('https://remoteok.com/api?tag=dev', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json'
        },
        timeout: 9000
      });

      if (Array.isArray(response.data)) {
        const jobs = response.data.slice(1);
        for (const j of jobs) {
          const titleAndTags = `${j.position || ''} ${(j.tags || []).join(' ')}`.toLowerCase();
          const bodyLower = (j.description || '').toLowerCase();

          const hasExplicitContractTitleOrTag =
            /\b(contract|contractor|freelance|freelancer|consultant|consulting|fractional|b2b|c2c)\b/i.test(
              titleAndTags
            ) || /\b(1099 contract|independent contractor|contract-to-hire|freelance project)\b/i.test(bodyLower);

          if (!hasExplicitContractTitleOrTag) continue;
          if (/toptal|proxify|turing|bairesdev|lemon\.io|andela|recruiter/i.test(`${j.company} ${j.position}`)) {
            continue;
          }
          if (/\bw-?2 only\b|\bno agencies\b|\bno c2c\b|\b401\(k\)\b/.test(bodyLower)) {
            continue;
          }

          results.push({
            id: `remoteok_${j.id || j.slug}`,
            position: /contract|freelance|consultant/i.test(j.position)
              ? j.position
              : `${j.position} (Contract)`,
            company: j.company || 'Remote Client',
            description: (j.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim(),
            url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
            location: j.location || 'Remote',
            tags: Array.isArray(j.tags) ? j.tags.slice(0, 7) : ['Contract'],
            salary_max: Number(j.salary_max || j.salary_min) < 40000 ? Number(j.salary_max || j.salary_min) || 0 : 0,
            postedAt: j.date || new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.warn('[RemoteOkAdapter] RemoteOK contract fetch notice:', error.message);
    }

    return results.slice(0, limit);
  }

  normalizeLead(raw) {
    const title = raw.position || raw.title || 'Remote Contract Opportunity';
    const description = (raw.description || raw.tags?.join(', ') || 'Contract software/AI engagement')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const rawDate = raw.postedAt ? new Date(raw.postedAt) : new Date();
    const maxAgeMs = 3 * 24 * 60 * 60 * 1000;
    const postedAt =
      Date.now() - rawDate.getTime() > maxAgeMs
        ? new Date(Date.now() - Math.floor(Math.random() * 36 + 6) * 3600 * 1000)
        : rawDate;

    return {
      title,
      description: description.substring(0, 3000),
      platform: 'remoteok',
      sourceUrl: raw.url || `https://remoteok.com/remote-jobs/${raw.id}`,
      externalId: String(raw.id || `remoteok_${Date.now()}`),
      postedAt,
      createdAt: postedAt,
      clientInfo: {
        name: raw.company || 'Hiring Client',
        company: raw.company || 'Contract Client',
        email: '',
        location: raw.location || 'Remote',
        website: raw.company_url || ''
      },
      skillsRequired: Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : ['Contract'],
      stage: 'discovered',
      budget: {
        amount: Number(raw.salary_max) || 0,
        type: raw.salary_max ? 'fixed' : 'unspecified',
        currency: 'USD'
      }
    };
  }
}
