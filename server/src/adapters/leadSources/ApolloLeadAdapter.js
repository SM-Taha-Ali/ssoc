import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class ApolloLeadAdapter extends BaseLeadSource {
  constructor() {
    super('Apollo.io Prospecting Adapter', 'apollo');
  }

  async fetchRawLeads(options = {}) {
    const apiKey = options.apiKey || process.env.APOLLO_API_KEY;
    if (!apiKey) {
      console.warn('[ApolloLeadAdapter] No APOLLO_API_KEY configured in .env or settings. Skipping Apollo scrape.');
      return [];
    }

    try {
      const titles = options.personTitles || ['CTO', 'Founder', 'VP Engineering', 'Head of Product'];
      const keywords = options.keywords || ['Software', 'SaaS', 'Automation', 'AI'];

      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search',
        {
          api_key: apiKey,
          q_person_title: titles.join(','),
          q_organization_keyword_tags: keywords,
          page: 1,
          per_page: options.limit || 15
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          timeout: 10000
        }
      );

      const people = response.data?.people || [];
      return people;
    } catch (error) {
      console.error('[ApolloLeadAdapter] Error calling Apollo API:', error.response?.data?.message || error.message);
      return [];
    }
  }

  normalizeLead(person) {
    const fullName = person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Tech Executive';
    const company = person.organization?.name || person.headline || '';
    const title = person.title || 'Technical Leadership';
    const email = person.email || '';
    const linkedinUrl = person.linkedin_url || '';

    return {
      title: `${title} at ${company || 'High-Growth Tech Startup'}`,
      description: `Target Outreach Prospect:\nName: ${fullName}\nTitle: ${title}\nCompany: ${company}\nEmail: ${email || 'Direct contact on Apollo'}\nLinkedIn: ${linkedinUrl}\nIndustry: ${person.organization?.primary_domain || 'Technology'}\nHeadcount: ${person.organization?.estimated_num_employees || 'N/A'}`,
      platform: 'apollo',
      sourceUrl: linkedinUrl || person.organization?.website_url || 'https://apollo.io',
      externalId: `apollo_${person.id || email || Date.now()}`,
      clientInfo: {
        name: fullName,
        company,
        email,
        location: person.city ? `${person.city}, ${person.country || ''}` : 'Remote',
        website: person.organization?.website_url || ''
      },
      skillsRequired: ['AI Automation', 'System Integration', 'Software Engineering'],
      stage: 'discovered',
      budget: {
        amount: 2500,
        type: 'fixed',
        currency: 'USD'
      }
    };
  }
}
