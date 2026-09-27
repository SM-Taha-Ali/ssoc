import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

export class HackerNewsJobAdapter extends BaseLeadSource {
  constructor() {
    super('Y Combinator / Hacker News Jobs Adapter', 'ycombinator');
  }

  async fetchRawLeads(options = {}) {
    try {
      const response = await axios.get('https://hacker-news.firebaseio.com/v0/jobstories.json', {
        timeout: 10000
      });

      const storyIds = (response.data || []).slice(0, options.limit || 20);
      const jobs = await Promise.all(
        storyIds.map(async (id) => {
          try {
            const itemRes = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
              timeout: 6000
            });
            return itemRes.data;
          } catch {
            return null;
          }
        })
      );

      return jobs.filter(Boolean);
    } catch (error) {
      console.error('[HackerNewsJobAdapter] Error fetching HN/YC jobs:', error.message);
      return [];
    }
  }

  normalizeLead(story) {
    const rawTitle = story.title || 'YC Startup Engineering Opportunity';
    let cleanText = (story.text || rawTitle).replace(/<[^>]*>?/gm, '').trim();

    return {
      title: rawTitle,
      description: cleanText.substring(0, 3000),
      platform: 'ycombinator',
      sourceUrl: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      externalId: `hn_yc_${story.id}`,
      clientInfo: {
        name: story.by || 'YC Founder',
        company: rawTitle.split('Is Hiring')[0]?.trim() || '',
        email: '',
        location: 'Remote / US'
      },
      skillsRequired: ['Full-Stack', 'Startup', 'Engineering'],
      stage: 'discovered',
      budget: {
        amount: 0,
        type: 'unspecified',
        currency: 'USD'
      }
    };
  }
}
