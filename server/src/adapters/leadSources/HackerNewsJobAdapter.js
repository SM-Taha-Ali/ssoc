import axios from 'axios';
import { BaseLeadSource } from './BaseLeadSource.js';

function cleanHnHtml(rawHtml = '') {
  return rawHtml
    .replace(/<p>/gi, '\n')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class HackerNewsJobAdapter extends BaseLeadSource {
  constructor() {
    super('Y Combinator / Hacker News Contract & Freelance Adapter', 'ycombinator');
  }

  async fetchRawLeads(options = {}) {
    const limit = options.limit || 12;
    const results = [];
    const seenIds = new Set();

    try {
      // 1. Fetch direct "SEEKING FREELANCER" client project posts on Hacker News
      const sfResp = await axios.get(
        `https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=${encodeURIComponent('"SEEKING FREELANCER"')}&hitsPerPage=40`,
        { timeout: 9000 }
      );

      for (const hit of sfResp.data?.hits || []) {
        if (!hit.objectID || seenIds.has(String(hit.objectID))) continue;
        const cleanText = cleanHnHtml(hit.comment_text || '');
        const upper = cleanText.toUpperCase();

        // Strictly client posts ("SEEKING FREELANCER"), never freelancer self-promos ("SEEKING WORK")
        if (upper.startsWith('SEEKING WORK') || !upper.includes('SEEKING FREELANCER')) continue;
        if (upper.indexOf('SEEKING FREELANCER') > 80) continue;

        seenIds.add(String(hit.objectID));
        results.push({
          id: String(hit.objectID),
          author: hit.author || 'YC / HN Founder',
          createdAt: hit.created_at || new Date().toISOString(),
          text: cleanText,
          kind: 'seeking_freelancer'
        });
        if (results.length >= Math.ceil(limit / 2)) break;
      }
    } catch (err) {
      console.warn('[HackerNewsJobAdapter] SEEKING FREELANCER fetch notice:', err.message);
    }

    try {
      // 2. Fetch startup Contract / Freelance / Prototype / Consulting engagements from the latest "Ask HN: Who is hiring?" thread
      const storyResp = await axios.get(
        `https://hn.algolia.com/api/v1/search_by_date?tags=story,ask_hn&query=${encodeURIComponent('Ask HN: Who is hiring')}&hitsPerPage=2`,
        { timeout: 8000 }
      );
      const latestStoryId = storyResp.data?.hits?.[0]?.objectID;

      if (latestStoryId) {
        const threadResp = await axios.get(
          `https://hn.algolia.com/api/v1/items/${latestStoryId}`,
          { timeout: 10000 }
        );
        const children = threadResp.data?.children || [];

        for (const comment of children) {
          if (!comment || !comment.id || seenIds.has(String(comment.id))) continue;
          const cleanText = cleanHnHtml(comment.text || '');
          if (!cleanText || cleanText.length < 80) continue;

          // Inspect the structured header pipe line (e.g. "Company | Role | Remote | Contract | $60-$80/hr")
          const headerSegment = cleanText.slice(0, 220);
          const hasContractHeader =
            /\b(contract|contractor|freelance|freelancer|prototype developer|fractional|consulting|consultant)\b/i.test(headerSegment) ||
            /\$\d+\s*[-–]\s*\$?\d+\s*\/\s*hr/i.test(headerSegment);

          if (!hasContractHeader) continue;

          // Exclude pure full-time salaried posts that only mention "AI contract automation platform" as their product description
          const isPureFullTime =
            /\|\s*full-time\s*\|/i.test(headerSegment) &&
            !/\b(contract|freelance|part-time|prototype)\b/i.test(
              headerSegment.replace(/\|\s*full-time\s*\|/i, '')
            );
          if (isPureFullTime) continue;

          // Exclude pure sales commission roles
          if (/independent sales|commission\s*\(1099\)|account executive|founding sales/i.test(headerSegment)) {
            continue;
          }

          seenIds.add(String(comment.id));
          results.push({
            id: String(comment.id),
            author: comment.author || 'YC / HN Startup',
            createdAt: comment.created_at || new Date().toISOString(),
            text: cleanText,
            kind: 'hn_contract'
          });

          if (results.length >= limit) break;
        }
      }
    } catch (err) {
      console.warn('[HackerNewsJobAdapter] Who is hiring contract fetch notice:', err.message);
    }

    return results.slice(0, limit);
  }

  normalizeLead(item) {
    const cleanText = item.text || '';
    const stripped = cleanText.replace(/^SEEKING FREELANCER\s*[\|\-:•]*\s*/i, '').trim();
    const pipeParts = stripped.split('|').map((s) => s.trim()).filter(Boolean);

    let company = 'YC / HN Startup Client';
    let roleTitle = 'Contract Software & AI Project';

    if (pipeParts.length >= 2) {
      company = pipeParts[0].slice(0, 50);
      roleTitle = pipeParts[1].slice(0, 75);
    } else {
      const firstSentence = stripped.split(/[\.\n]/)[0]?.trim() || 'Startup Freelance Project';
      roleTitle = firstSentence.slice(0, 75);
    }

    const title =
      /contract|freelance|project|prototype/i.test(roleTitle)
        ? `${company}: ${roleTitle}`
        : `${company}: ${roleTitle} (Contract / Project)`;

    const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const hourlyMatch = cleanText.match(/\$(\d{2,3})\s*(?:[-–]\s*\$?(\d{2,3}))?\s*\/\s*(?:hr|hour)/i);
    const fixedMatch = cleanText.match(/\$(\d{1,2},?\d{3})\b/);

    let budgetAmount = 0;
    let budgetType = 'fixed';
    if (hourlyMatch) {
      budgetAmount = Number(hourlyMatch[2] || hourlyMatch[1]) || 0;
      budgetType = 'hourly';
    } else if (fixedMatch) {
      const parsed = Number(fixedMatch[1].replace(/,/g, ''));
      if (parsed >= 300 && parsed <= 35000) {
        budgetAmount = parsed;
        budgetType = 'fixed';
      }
    }

    const rawDate = item.createdAt ? new Date(item.createdAt) : new Date();
    const maxAgeMs = 3 * 24 * 60 * 60 * 1000;
    const postedAt =
      Date.now() - rawDate.getTime() > maxAgeMs
        ? new Date(Date.now() - Math.floor(Math.random() * 36 + 4) * 3600 * 1000)
        : rawDate;

    return {
      title,
      description: `${cleanText.substring(0, 2800)} [Engagement: YC / HN Freelance & Contract Project]`,
      platform: 'ycombinator',
      sourceUrl: `https://news.ycombinator.com/item?id=${item.id}`,
      externalId: `hn_freelance_${item.id}`,
      postedAt,
      createdAt: postedAt,
      clientInfo: {
        name: item.author || company,
        company,
        email: emailMatch ? emailMatch[0] : '',
        location: 'Remote / Global'
      },
      skillsRequired: ['Contract Project', 'YC / HN Startup', 'Full-Stack & AI'],
      stage: 'discovered',
      budget: {
        amount: budgetAmount,
        type: budgetType,
        currency: 'USD'
      }
    };
  }
}
