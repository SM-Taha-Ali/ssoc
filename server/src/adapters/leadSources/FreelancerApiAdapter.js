import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class FreelancerApiAdapter extends BaseLeadSource {
  constructor() {
    super('Freelancer.com Live Project Adapter', 'freelancer');
  }

  async fetchRawLeads(options = {}) {
    try {
      const limit = options.limit || 25;
      const queries = options.queries || ['AI automation', 'React Node full stack', 'Python web app'];
      const allProjects = [];
      const seenIds = new Set();

      // Fetch targeted software/AI freelance projects plus latest active projects
      const endpoints = [
        ...queries.map(
          (q) =>
            `https://www.freelancer.com/api/projects/0.1/projects/active?query=${encodeURIComponent(q)}&limit=${Math.ceil(limit / 2)}&job_details=true&full_description=true`
        ),
        `https://www.freelancer.com/api/projects/0.1/projects/active?limit=${limit}&job_details=true&full_description=true`
      ];

      const responses = await Promise.allSettled(
        endpoints.map((url) =>
          axios.get(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/json'
            },
            timeout: 10000
          })
        )
      );

      for (const res of responses) {
        if (res.status === 'fulfilled') {
          const projects = res.value.data?.result?.projects || [];
          for (const p of projects) {
            // Strictly exclude closed, deleted, frozen, or full-time local jobs
            if (!p || !p.id || seenIds.has(p.id)) continue;
            if (p.deleted || (p.status && p.status !== 'active')) continue;
            if (
              p.frontend_project_status &&
              p.frontend_project_status !== 'open'
            ) {
              continue;
            }
            seenIds.add(p.id);
            allProjects.push(p);
          }
        }
      }

      return allProjects.slice(0, limit * 2);
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

    const postedAt = project.submitdate ? new Date(project.submitdate * 1000) : new Date();

    return {
      title,
      description: description.substring(0, 3000),
      platform: 'freelancer',
      sourceUrl: projectUrl,
      externalId: `freelancer_${project.id}`,
      postedAt,
      createdAt: postedAt,
      clientInfo: {
        name: 'Project Client',
        company: 'Freelance Project Scope',
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
