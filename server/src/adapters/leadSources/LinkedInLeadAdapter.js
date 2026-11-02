import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseLeadSource } from './BaseLeadSource.js';

export class LinkedInLeadAdapter extends BaseLeadSource {
  constructor() {
    super('LinkedIn Public Jobs & Talent Engine', 'linkedin');
  }

  /**
   * Fetch public LinkedIn Contract & Freelance project opportunities using LinkedIn's public guest search API
   * Filters strictly for Contract (C) and Temporary/Project (T) engagements (f_JT=C%2CT) posted recently.
   */
  async fetchRawLeads(options = {}) {
    try {
      const baseKeywords = options.keywords || 'AI Full Stack Developer';
      const contractKeywords = /contract|freelance|consultant|project/i.test(baseKeywords)
        ? baseKeywords
        : `${baseKeywords} Contract`;
      const location = options.location || 'Worldwide';
      // f_JT=C%2CT restricts LinkedIn to Contract & Temporary/Project roles only (no full-time W-2 employee roles)
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(contractKeywords)}&location=${encodeURIComponent(location)}&f_JT=C%2CT&f_TPR=r604800&start=0`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 12000
      });

      if (!response.data || typeof response.data !== 'string') {
        return [];
      }

      const $ = cheerio.load(response.data);
      const jobs = [];

      $('li').each((_, element) => {
        const titleElem = $(element).find('.base-search-card__title');
        const companyElem = $(element).find('.base-search-card__subtitle');
        const locationElem = $(element).find('.job-search-card__location');
        const linkElem = $(element).find('.base-card__full-link, a.base-search-card--link');
        const dateElem = $(element).find('time');

        const title = titleElem.text().trim();
        const company = companyElem.text().trim();
        const loc = locationElem.text().trim();
        let jobUrl = linkElem.attr('href') || '';
        if (jobUrl.includes('?')) {
          jobUrl = jobUrl.split('?')[0]; // Strip tracking parameters
        }

        const externalId = jobUrl.match(/view\/([a-zA-Z0-9_-]+)/)?.[1] || 
                           jobUrl.match(/currentJobId=([0-9]+)/)?.[1] || 
                           `linkedin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        if (title && jobUrl) {
          jobs.push({
            title: title.includes('Contract') || title.includes('Freelance') ? title : `${title} (Contract / Project)`,
            company: company || 'Hiring Client',
            location: loc || 'Remote / Global',
            url: jobUrl,
            id: externalId,
            postedAt: dateElem.attr('datetime') || new Date().toISOString()
          });
        }
      });

      const limit = options.limit || 15;
      return jobs.slice(0, limit);
    } catch (error) {
      console.warn('[LinkedInLeadAdapter] Public job fetch notice:', error.message);
      return [];
    }
  }

  /**
   * Parse a single LinkedIn job listing page or guest endpoint
   */
  async fetchJobDetails(jobUrlOrId) {
    try {
      let targetUrl = jobUrlOrId;
      if (!targetUrl.startsWith('http')) {
        targetUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobUrlOrId}`;
      }

      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const title = $('h1.top-card-layout__title, h2.top-card-layout__title, .topcard__title').text().trim() || 
                    $('meta[property="og:title"]').attr('content') || '';
      const company = $('.topcard__flavor--black-link, .topcard__org-name-link').text().trim() || 
                      $('meta[property="og:site_name"]').attr('content') || '';
      const description = $('.show-more-less-html__markup, .description__text').text().trim() || 
                          $('meta[property="og:description"]').attr('content') || '';
      const location = $('.topcard__flavor--bullet').first().text().trim() || 'Remote';

      return {
        title,
        company,
        description,
        location,
        url: targetUrl
      };
    } catch (err) {
      console.warn('[LinkedInLeadAdapter] Job details fetch notice:', err.message);
      return null;
    }
  }

  normalizeLead(raw) {
    const title = raw.title || 'LinkedIn Engineering Opportunity';
    const description = raw.description || `${raw.title} at ${raw.company}. Sourced from LinkedIn corporate listings.`;

    // Extract basic skills from title & description
    const detectedSkills = [];
    const skillList = ['React', 'Node.js', 'Python', 'AI', 'MERN', 'Next.js', 'AWS', 'TypeScript', 'Docker', 'Automation'];
    const combinedText = `${title} ${description}`.toLowerCase();
    skillList.forEach(s => {
      if (combinedText.includes(s.toLowerCase())) detectedSkills.push(s);
    });

    return {
      title,
      description: description.substring(0, 4000),
      platform: 'linkedin',
      sourceUrl: raw.url || `https://www.linkedin.com/jobs/view/${raw.id}`,
      externalId: String(raw.id || `linkedin_${Date.now()}`),
      clientInfo: {
        name: raw.company || 'Hiring Manager',
        company: raw.company || 'Direct Employer',
        email: '',
        location: raw.location || 'Remote',
        website: ''
      },
      skillsRequired: detectedSkills.length ? detectedSkills : ['Full-Stack Development'],
      stage: 'discovered',
      budget: {
        amount: 0,
        type: 'unspecified',
        currency: 'USD'
      }
    };
  }
}
