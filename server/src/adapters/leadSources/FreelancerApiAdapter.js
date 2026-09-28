import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class FreelancerApiAdapter extends BaseLeadSource {
  constructor() {
    super('Freelancer.com Live Project Adapter', 'freelancer');
  }

  async fetchRawLeads(options = {}) {
    try {
      const limit = options.limit || 25;
      const response = await axios.get(
        `https://www.freelancer.com/api/projects/0.1/projects/active?limit=${limit}&job_details=true&full_description=true`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const projects = response.data?.result?.projects || [];
      return projects;
    } catch (error) {
      console.error('[FreelancerApiAdapter] Error fetching live projects:', error.message);
      return [];
    }
  }

  normalizeLead(project) {
    const title = project.title || 'Freelance Project Opportunity';
    const description = project.description || project.preview_description || 'No description provided';
    const currency = project.currency?.code || 'USD';
    const amount = project.budget?.maximum || project.budget?.minimum || 0;

    const skills = Array.isArray(project.jobs)
      ? project.jobs.map((j) => j.name).filter(Boolean)
      : [];

    const projectUrl = project.seo_url
      ? `https://www.freelancer.com/projects/${project.seo_url}`
      : `https://www.freelancer.com/projects/${project.id}`;

    return {
      title,
      description: description.substring(0, 3000),
      platform: 'freelancer',
      sourceUrl: projectUrl,
      externalId: `freelancer_${project.id}`,
      clientInfo: {
        name: 'Hiring Client',
        company: '',
        email: '',
        location: project.currency?.country_name || 'Global'
      },
      skillsRequired: skills.slice(0, 8),
      stage: 'discovered',
      budget: {
        amount: Number(amount) || 0,
        type: project.type === 'hourly' ? 'hourly' : 'fixed',
        currency
      }
    };
  }
}
