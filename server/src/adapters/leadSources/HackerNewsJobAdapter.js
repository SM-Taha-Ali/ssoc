import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class HackerNewsJobAdapter extends BaseLeadSource {
  constructor() {
    super('Y Combinator / Hacker News Jobs Adapter', 'ycombinator');
  }

  async fetchRawLeads(options = {}) {
    try {
      const limit = options.limit || 15;
      const thirtyDaysAgoSec = Math.floor(Date.now() / 1000) - 30 * 86400;
      // Query Hacker News Algolia API specifically for recent "SEEKING FREELANCER" client project posts
      const response = await axios.get(
        `https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=${encodeURIComponent('"SEEKING FREELANCER"')}&numericFilters=created_at_i>${thirtyDaysAgoSec}&hitsPerPage=35`,
        { timeout: 10000 }
      );

      const hits = response.data?.hits || [];
      const freelanceProjects = [];

      for (const hit of hits) {
        const rawHtml = hit.comment_text || '';
        const decoded = rawHtml
          .replace(/&#x2F;/g, '/')
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&');
        const cleanText = decoded.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        // Only keep genuine client project posts ("SEEKING FREELANCER"), never job-seeker posts ("SEEKING WORK")
        const upper = cleanText.toUpperCase();
        if (upper.startsWith('SEEKING WORK') || !upper.includes('SEEKING FREELANCER')) {
          continue;
        }
        // Ensure it is near the beginning of the post (clients start with SEEKING FREELANCER)
        if (upper.indexOf('SEEKING FREELANCER') > 80) {
          continue;
        }

        freelanceProjects.push({
          id: hit.objectID,
          author: hit.author || 'HN Startup Founder',
          createdAt: hit.created_at || new Date().toISOString(),
          text: cleanText
        });

        if (freelanceProjects.length >= limit) break;
      }

      return freelanceProjects;
    } catch (error) {
      console.error('[HackerNewsJobAdapter] Error fetching HN freelance projects:', error.message);
      return [];
    }
  }

  normalizeLead(item) {
    const cleanText = item.text || '';
    // Extract a clean title from the first line/segment after SEEKING FREELANCER
    const stripped = cleanText.replace(/^SEEKING FREELANCER\s*[\|\-:•]*\s*/i, '').trim();
    const firstChunk = stripped.split(/[\.\|\n]/)[0]?.trim() || 'Freelance Software & AI Project';
    const title = firstChunk.length > 10 && firstChunk.length < 95
      ? `${firstChunk} (Freelance Project)`
      : `Startup Freelance Project by ${item.author}`;

    // Extract email if present in the post
    const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const postedAt = item.createdAt ? new Date(item.createdAt) : new Date();

    return {
      title,
      description: cleanText.substring(0, 3000),
      platform: 'ycombinator',
      sourceUrl: `https://news.ycombinator.com/item?id=${item.id}`,
      externalId: `hn_freelance_${item.id}`,
      postedAt,
      createdAt: postedAt,
      clientInfo: {
        name: item.author || 'YC / HN Client',
        company: 'HN Freelance Client',
        email: emailMatch ? emailMatch[0] : '',
        location: 'Remote / Global'
      },
      skillsRequired: ['Freelance Project', 'Contract', 'Full-Stack / AI'],
      stage: 'discovered',
      budget: {
        amount: 0,
        type: 'hourly',
        currency: 'USD'
      }
    };
  }
}
