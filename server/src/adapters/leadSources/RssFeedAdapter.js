import Parser from 'rss-parser';
import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['description', 'rawDescription']
    ]
  }
});

export class RssFeedAdapter extends BaseLeadSource {
  constructor() {
    super('RSS Feed Adapter', 'rss');
  }

  /**
   * Fetches items from an RSS feed URL
   */
  async fetchRawLeads(options = {}) {
    const { url } = options;
    if (!url) {
      throw new Error('RSS Feed URL is required');
    }

    try {
      // Use axios with browser headers to avoid 403/410 bot blocks
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        timeout: 10000
      });

      const feed = await parser.parseString(response.data);
      return (feed.items || []).map((item) => ({
        ...item,
        _feedPlatform: options.platform || 'rss'
      }));
    } catch (error) {
      try {
        // Fallback to direct parser.parseURL
        const feed = await parser.parseURL(url);
        return (feed.items || []).map((item) => ({
          ...item,
          _feedPlatform: options.platform || 'rss'
        }));
      } catch (fallbackErr) {
        console.error(`[RssFeedAdapter] Failed to fetch feed from ${url}:`, error.message);
        return [];
      }
    }
  }

  /**
   * Normalizes RSS feed item into a structured Lead object
   */
  normalizeLead(rawItem) {
    const description = (
      rawItem.contentEncoded ||
      rawItem.rawDescription ||
      rawItem.content ||
      rawItem.summary ||
      ''
    ).replace(/<[^>]*>?/gm, '').trim();

    // Generate unique external ID from guid or link
    const externalId = rawItem.guid || rawItem.id || rawItem.link;
    const platform = rawItem._feedPlatform || 'rss';

    // Extract potential budget / skills if present in description or categories
    const categories = Array.isArray(rawItem.categories)
      ? rawItem.categories
      : [];

    return {
      title: rawItem.title ? rawItem.title.trim() : 'Untitled Lead',
      description: description || rawItem.title || 'No description provided',
      platform: platform.toLowerCase(),
      sourceUrl: rawItem.link || '',
      externalId: String(externalId),
      clientInfo: {
        name: rawItem.creator || rawItem.author || 'Hiring Lead',
        company: '',
        email: '',
        location: ''
      },
      skillsRequired: categories.slice(0, 8),
      stage: 'discovered',
      budget: {
        amount: 0,
        type: 'unspecified',
        currency: 'USD'
      }
    };
  }
}
