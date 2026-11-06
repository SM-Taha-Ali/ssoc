import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseLeadSource } from './BaseLeadSource.js';

const STAFFING_RECRUITER_COMPANIES =
  /\b(cybercoders|randstad|kforce|robert half|tek hire|teksystems|eliassen|yoh|jobgether|lensa|dice|toptal|proxify|turing|bairesdev|lemon\.io|andela|arc\.dev|gun\.io|insight global|apex systems|motion recruitment|harnham|nigel frank|jefferson frank|akkodis|modis|adecco|manpower|kelly services|beacon hill|judge group|collabera|infosys|tcs|wipro|cognizant|hcl|capgemini)\b/i;

export class LinkedInLeadAdapter extends BaseLeadSource {
  constructor() {
    super('LinkedIn Contract & Project Engine', 'linkedin');
  }

  /**
   * Fetch public LinkedIn Contract & Freelance project opportunities using LinkedIn's public guest search API.
   * Filters strictly for Contract (C) and Temporary/Project (T) engagements (f_JT=C%2CT) posted recently,
   * excluding staffing/W-2 recruiting agencies so only direct client/startup contracts are returned.
   */
  async fetchRawLeads(options = {}) {
    const limit = options.limit || 10;
    const queries = [
      'AI Automation Engineer Contract',
      'AI Agent Developer Contract',
      'Full Stack React Node Contract',
      'AI Consultant Contract'
    ];
    if (options.keywords && typeof options.keywords === 'string') {
      queries.unshift(
        /contract|freelance/i.test(options.keywords)
          ? options.keywords
          : `${options.keywords} Contract`
      );
    }

    const candidates = [];
    const seenIds = new Set();

    for (const q of queries.slice(0, 4)) {
      if (candidates.length >= limit + 4) break;
      try {
        // f_JT=C%2CT restricts LinkedIn to Contract & Temporary/Project roles only (no full-time W-2 employee roles)
        const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(q)}&f_JT=C%2CT&f_TPR=r604800&start=0`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 9000
        });

        if (!response.data || typeof response.data !== 'string') continue;
        const $ = cheerio.load(response.data);

        $('li').each((_, element) => {
          const urn = $(element).find('[data-entity-urn]').attr('data-entity-urn') || '';
          const urnId = urn.split(':').pop();
          const title = $(element).find('.base-search-card__title').text().trim();
          const company = $(element).find('.base-search-card__subtitle').text().trim();
          const loc = $(element).find('.job-search-card__location').text().trim();
          let jobUrl = $(element).find('.base-card__full-link, a.base-search-card--link').attr('href') || '';
          if (jobUrl.includes('?')) jobUrl = jobUrl.split('?')[0];

          const externalId =
            urnId ||
            jobUrl.match(/view\/([a-zA-Z0-9_-]+)/)?.[1] ||
            jobUrl.match(/currentJobId=([0-9]+)/)?.[1];

          if (!title || !company || !externalId || seenIds.has(externalId)) return;

          // Exclude staffing agencies and W-2-only contracts
          if (STAFFING_RECRUITER_COMPANIES.test(company) || STAFFING_RECRUITER_COMPANIES.test(title)) {
            return;
          }
          if (/\bw-?2\b|onsite only|secret clearance|ts\/sci/i.test(title)) {
            return;
          }

          seenIds.add(externalId);
          candidates.push({
            id: externalId,
            title: /contract|freelance|consultant|project/i.test(title)
              ? title
              : `${title} (Contract)`,
            company,
            location: loc || 'Remote / Hybrid',
            url: jobUrl || `https://www.linkedin.com/jobs/view/${externalId}`,
            postedAt: $(element).find('time').attr('datetime') || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[LinkedInLeadAdapter] Search query notice:', err.message);
      }
    }

    // Enrich top candidates with actual project description from LinkedIn guest jobPosting endpoint
    const sliced = candidates.slice(0, limit);
    const enriched = await Promise.all(
      sliced.map(async (item) => {
        const details = await this.fetchJobDetails(item.id);
        return {
          ...item,
          description:
            details?.description ||
            `${item.title} contract/project engagement at ${item.company} (${item.location}).`
        };
      })
    );

    // Filter out any candidate whose full description specifies W-2 only or no agencies/no C2C
    return enriched.filter((item) => {
      const desc = (item.description || '').toLowerCase();
      return !/\bw-?2 only\b|\bno c2c\b|\bno agencies\b|\bno third parties\b/.test(desc);
    });
  }

  /**
   * Parse a single LinkedIn job listing page or guest endpoint
   */
  async fetchJobDetails(jobUrlOrId) {
    try {
      let targetUrl = jobUrlOrId;
      if (!targetUrl.startsWith('http')) {
        const numericId = String(jobUrlOrId).match(/(\d{8,})/)?.[1] || jobUrlOrId;
        targetUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${numericId}`;
      }

      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 6000
      });

      const $ = cheerio.load(response.data || '');
      const title =
        $('h1.top-card-layout__title, h2.top-card-layout__title, .topcard__title').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        '';
      const company =
        $('.topcard__flavor--black-link, .topcard__org-name-link').text().trim() ||
        $('meta[property="og:site_name"]').attr('content') ||
        '';
      const description =
        $('.show-more-less-html__markup, .description__text').text().replace(/\s+/g, ' ').trim() ||
        $('meta[property="og:description"]').attr('content') ||
        '';
      const location = $('.topcard__flavor--bullet').first().text().trim() || 'Remote';

      return {
        title,
        company,
        description,
        location,
        url: targetUrl
      };
    } catch (_) {
      return null;
    }
  }

  normalizeLead(raw) {
    const title = raw.title || 'LinkedIn Contract Opportunity';
    const description =
      raw.description || `${raw.title} contract engagement at ${raw.company}.`;

    const detectedSkills = ['Contract / Project'];
    const skillList = [
      'React',
      'Node.js',
      'Python',
      'AI',
      'LLM',
      'Next.js',
      'AWS',
      'TypeScript',
      'Docker',
      'Automation'
    ];
    const combinedText = `${title} ${description}`.toLowerCase();
    skillList.forEach((s) => {
      if (combinedText.includes(s.toLowerCase())) detectedSkills.push(s);
    });

    // Extract hourly or contract budget if mentioned in description
    let budgetAmount = 0;
    let budgetType = 'unspecified';
    const hourlyMatch = description.match(/\$(\d{2,3})(?:\.\d{2})?\s*(?:[-–to]+\s*\$?(\d{2,3})(?:\.\d{2})?)?\s*\/?\s*(?:hr|hour)/i);
    if (hourlyMatch) {
      budgetAmount = Number(hourlyMatch[2] || hourlyMatch[1]) || 0;
      budgetType = 'hourly';
    }

    const postedAt = raw.postedAt ? new Date(raw.postedAt) : new Date();

    return {
      title,
      description: description.substring(0, 3500),
      platform: 'linkedin',
      sourceUrl: raw.url || `https://www.linkedin.com/jobs/view/${raw.id}`,
      externalId: `li_contract_${raw.id}`,
      postedAt,
      createdAt: postedAt,
      clientInfo: {
        name: raw.company || 'Hiring Client',
        company: raw.company || 'Contract Client',
        email: '',
        location: raw.location || 'Remote',
        website: ''
      },
      skillsRequired: detectedSkills,
      stage: 'discovered',
      budget: {
        amount: budgetAmount,
        type: budgetType,
        currency: 'USD'
      }
    };
  }
}
