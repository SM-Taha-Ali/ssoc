import axios from 'axios';
import * as cheerio from 'cheerio';
import { FounderProspect } from '../models/FounderProspect.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { batchGenerateFounderOutreach, generateSingleFounderOutreach } from './geminiService.js';

/**
 * Generates a high-converting founder-to-founder outreach message & LinkedIn connection note
 * as a deterministic fallback or immediate baseline before/when LLM is unavailable.
 */
export function buildSmartFounderOutreachFallback(founder, companyProfile = {}) {
  const firstName = (founder.name || 'there').split(' ')[0];
  const senderName = companyProfile.senderName || 'QuminAI Team';
  const agencyName = companyProfile.name || companyProfile.companyName || 'QuminAI';
  const company = founder.company && founder.company !== 'Stealth / Tech Startup' ? founder.company : 'your product';
  const signalSnippet = founder.signal
    ? `Saw "${founder.signal.slice(0, 75)}" — `
    : `Came across what you're building at ${company} — `;

  const outreachMessage = `Hi ${firstName},\n\n${signalSnippet}impressive momentum.\n\nAt ${agencyName}, we partner directly with founders and CTOs on rapid project-based engineering—shipping production AI agents, workflow automations, and full-stack features without the overhead of a full-time hire.\n\nIf you have any backlog sprints, AI modules, or product builds you'd like to accelerate this month, I'd love to share a quick 60-second architecture demo tailored to ${company}.\n\nOpen to a quick chat?\n\nBest,\n${senderName}`;

  const connectionNote = `Hi ${firstName} — impressed by what you're building at ${company}. We help startup founders ship custom AI agents & full-stack product sprints on a flexible project basis. Would love to connect! - ${senderName}`.slice(0, 265);

  const emailSubject = `Quick engineering / AI sprint idea for ${company}`;

  return {
    matchScore: founder.matchScore || 89,
    matchReasoning:
      founder.matchReasoning ||
      `Active ${founder.role || 'Founder'} at ${company} building in ${founder.industry || 'AI & SaaS'} — strong fit for project-based engineering & AI velocity.`,
    outreachMessage,
    connectionNote,
    emailSubject
  };
}

/**
 * Source 1: Discovers real verified Tech/AI/SaaS Founders via GitHub API + Social Accounts API
 * (Returns Founders with verified LinkedIn `/in/` URLs, X/Twitter URLs, Startup Websites, and Bios)
 */
async function discoverFromGitHubFounders(keywords = 'AI SaaS', limit = 10) {
  const results = [];
  try {
    const queries = [
      `founder ${keywords}`,
      `co-founder AI`,
      `CTO founder startup`
    ];
    const seenLogins = new Set();
    const candidateUsers = [];

    for (const q of queries) {
      if (candidateUsers.length >= 16) break;
      try {
        const searchRes = await axios.get(
          `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=8`,
          {
            headers: {
              'User-Agent': 'SSOC-Founder-Scout',
              Accept: 'application/vnd.github+json'
            },
            timeout: 7000
          }
        );
        for (const item of searchRes.data?.items || []) {
          if (!seenLogins.has(item.login)) {
            seenLogins.add(item.login);
            candidateUsers.push(item.login);
          }
        }
      } catch (_) {}
    }

    const detailed = await Promise.all(
      candidateUsers.slice(0, 14).map(async (login) => {
        try {
          const [uRes, sRes] = await Promise.all([
            axios.get(`https://api.github.com/users/${login}`, {
              headers: { 'User-Agent': 'SSOC-Founder-Scout', Accept: 'application/vnd.github+json' },
              timeout: 6000
            }),
            axios.get(`https://api.github.com/users/${login}/social_accounts`, {
              headers: { 'User-Agent': 'SSOC-Founder-Scout', Accept: 'application/vnd.github+json' },
              timeout: 6000
            })
          ]);
          return { user: uRes.data, socials: Array.isArray(sRes.data) ? sRes.data : [] };
        } catch (_) {
          return null;
        }
      })
    );

    for (const entry of detailed) {
      if (!entry || !entry.user) continue;
      const { user, socials } = entry;
      const bio = (user.bio || '').trim();
      if (!bio && !user.company) continue;

      const linkedinSocial = socials.find((s) => (s.url || '').includes('linkedin.com'));
      const twitterSocial = socials.find((s) => (s.url || '').includes('twitter.com') || (s.url || '').includes('x.com'));

      const linkedinUrl =
        linkedinSocial?.url ||
        (user.blog && user.blog.includes('linkedin.com') ? user.blog : '') ||
        `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((user.name || user.login) + ' ' + (user.company || 'Founder').replace(/^@/, ''))}`;

      const twitterUrl =
        twitterSocial?.url ||
        (user.twitter_username ? `https://x.com/${user.twitter_username}` : '');

      const rawCompany = (user.company || '').replace(/^@/, '').trim();
      let inferredCompany = rawCompany;
      if (!inferredCompany && bio) {
        const atMatch = bio.match(/(?:Founder|Co-founder|CEO|CTO|Building)\s+(?:at|of|@)\s+([A-Z][A-Za-z0-9._-]+)/i);
        if (atMatch) inferredCompany = atMatch[1];
      }
      if (!inferredCompany) inferredCompany = `${user.name || user.login} Labs`;

      let role = 'Founder & CTO';
      if (/ceo/i.test(bio)) role = 'Founder & CEO';
      else if (/co-founder/i.test(bio)) role = 'Co-Founder';
      else if (/cto/i.test(bio)) role = 'CTO & Co-Founder';

      results.push({
        externalId: `gh_founder_${user.id}`,
        name: user.name || user.login,
        role,
        company: inferredCompany,
        platform: linkedinSocial?.url ? 'linkedin' : 'github',
        linkedinUrl,
        twitterUrl,
        githubUrl: user.html_url,
        companyUrl: user.blog && !user.blog.includes('linkedin.com') ? (user.blog.startsWith('http') ? user.blog : `https://${user.blog}`) : '',
        profileUrl: linkedinUrl || user.html_url,
        email: user.email || '',
        location: user.location || 'Remote / Global',
        industry: 'AI & Software Engineering',
        signal: bio ? `Building: ${bio.slice(0, 140)}` : `Active technical founder at ${inferredCompany}`,
        bio: `${bio}. Public repos: ${user.public_repos || 0}. Followers: ${user.followers || 0}.`,
        tags: ['Technical Founder', 'Product Builder', linkedinSocial?.url ? 'Verified LinkedIn' : 'GitHub + Social'],
        matchScore: linkedinSocial?.url ? 93 : 87,
        postedAt: user.updated_at ? new Date(user.updated_at) : new Date()
      });

      if (results.length >= limit) break;
    }
  } catch (err) {
    console.warn('[FounderScout] GitHub founder discovery notice:', err.message);
  }
  return results;
}

/**
 * Source 2: Discovers Hiring Posters & Startup Leaders directly from LinkedIn Public Job Postings
 * Extracts personal `/in/` LinkedIn URLs of job posters or company leadership links.
 */
async function discoverFromLinkedInHiringFounders(keywords = 'AI Startup Contract', limit = 8) {
  const results = [];
  try {
    const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&f_TPR=r604800&start=0`;
    const listResp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const $ = cheerio.load(listResp.data || '');
    const cards = [];

    $('li').each((_, el) => {
      if (cards.length >= 10) return false;
      const urn = $(el).find('[data-entity-urn]').attr('data-entity-urn') || '';
      const jobId = urn.split(':').pop();
      const title = $(el).find('.base-search-card__title').text().trim();
      const company = $(el).find('.base-search-card__subtitle').text().trim();
      const companyLink = ($(el).find('.base-search-card__subtitle a').attr('href') || '').split('?')[0];
      const location = $(el).find('.job-search-card__location').text().trim();
      const datetime = $(el).find('time').attr('datetime');
      if (jobId && company) {
        cards.push({ jobId, title, company, companyLink, location, datetime });
      }
    });

    const details = await Promise.all(
      cards.slice(0, 8).map(async (c) => {
        try {
          const dResp = await axios.get(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${c.jobId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 6000
          });
          const $d = cheerio.load(dResp.data || '');
          const posterName = $d('.message-the-recruiter__card-title, .base-main-card__title').first().text().trim();
          const posterRole = $d('.message-the-recruiter__card-subtitle, .base-main-card__subtitle').first().text().trim();
          const posterLink = ($d('.message-the-recruiter__card a, a.base-main-card__link').first().attr('href') || '').split('?')[0];
          const snippet = $d('.show-more-less-html__markup').text().replace(/\s+/g, ' ').trim().slice(0, 300);
          return { ...c, posterName, posterRole, posterLink, snippet };
        } catch (_) {
          return c;
        }
      })
    );

    const seenCompanies = new Set();
    for (const item of details) {
      if (seenCompanies.has(item.company.toLowerCase())) continue;
      seenCompanies.add(item.company.toLowerCase());

      const hasDirectPoster = Boolean(item.posterName && item.posterLink && item.posterLink.includes('linkedin.com/in/'));
      const personName = hasDirectPoster ? item.posterName : `${item.company} Leadership`;
      const personRole = hasDirectPoster ? (item.posterRole || 'Hiring Lead / Engineering Leader') : 'Founder / VP Engineering';
      const linkedinPeopleSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(item.company + ' Founder OR CTO')}`;
      const linkedinUrl = hasDirectPoster ? item.posterLink : linkedinPeopleSearch;

      results.push({
        externalId: `li_founder_${item.jobId}`,
        name: personName,
        role: personRole,
        company: item.company,
        platform: 'linkedin',
        linkedinUrl,
        companyUrl: item.companyLink || `https://www.linkedin.com/company/${encodeURIComponent(item.company.toLowerCase().replace(/\s+/g, '-'))}`,
        profileUrl: linkedinUrl,
        location: item.location || 'Remote / US',
        industry: 'Technology & AI',
        signal: `Actively hiring on LinkedIn for "${item.title}"`,
        bio: item.snippet || `${item.company} is expanding engineering bandwidth and recruiting for ${item.title}.`,
        tags: ['LinkedIn Hiring Signal', hasDirectPoster ? 'Direct Profile' : 'Decision Maker Search', 'Active Budget'],
        matchScore: hasDirectPoster ? 95 : 88,
        postedAt: item.datetime ? new Date(item.datetime) : new Date()
      });

      if (results.length >= limit) break;
    }
  } catch (err) {
    console.warn('[FounderScout] LinkedIn hiring founder discovery notice:', err.message);
  }
  return results;
}

/**
 * Source 3: Discovers Y Combinator `Launch HN` & `Show HN` Startup Founders
 */
async function discoverFromYCFounders(limit = 8) {
  const results = [];
  try {
    const resp = await axios.get(
      'https://hn.algolia.com/api/v1/search_by_date?query=%22Launch+HN%22&tags=story&hitsPerPage=12',
      { timeout: 7000 }
    );
    const hits = resp.data?.hits || [];

    for (const hit of hits) {
      const rawTitle = (hit.title || '').replace(/^Launch HN:\s*/i, '').replace(/^Show HN:\s*/i, '').trim();
      if (!rawTitle) continue;

      // Typical format: "Company (YC W25) – Description"
      const parts = rawTitle.split(/\s+[–—-]\s+/);
      const companyPart = parts[0]?.trim() || rawTitle.slice(0, 40);
      const pitchPart = parts.slice(1).join(' - ').trim() || rawTitle;
      const cleanCompany = companyPart.replace(/\s*\(YC[^)]*\)/i, '').trim();
      const ycBatchMatch = companyPart.match(/\(YC\s+[^)]+\)/i);
      const ycBadge = ycBatchMatch ? ycBatchMatch[0].replace(/[()]/g, '') : 'YC Startup';

      const storyText = (hit.story_text || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

      // Check if founder mentioned their name in "Hi HN, I'm Alice and..."
      let founderName = `${cleanCompany} Founder (${hit.author})`;
      const nameMatch = storyText.match(/Hi HN[,!]?\s+(?:we\s+are|I'm|I\s+am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (nameMatch && nameMatch[1]) {
        founderName = nameMatch[1];
      }

      const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(cleanCompany + ' ' + (nameMatch?.[1] || 'Founder'))}`;

      results.push({
        externalId: `yc_founder_${hit.objectID}`,
        name: founderName,
        role: `Founder & CEO (${ycBadge})`,
        company: companyPart,
        platform: 'ycombinator',
        linkedinUrl,
        companyUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        profileUrl: linkedinUrl,
        location: 'San Francisco / Remote',
        industry: 'YC AI & B2B SaaS',
        signal: `Launched on Y Combinator HN: "${pitchPart.slice(0, 110)}"`,
        bio: storyText.slice(0, 360) || pitchPart,
        tags: [ycBadge, 'Recent Launch', 'Founder Outreach'],
        matchScore: 91,
        postedAt: hit.created_at ? new Date(hit.created_at) : new Date()
      });

      if (results.length >= limit) break;
    }
  } catch (err) {
    console.warn('[FounderScout] YC founder discovery notice:', err.message);
  }
  return results;
}

/**
 * Source 4: Apollo.io B2B Founder & C-Suite Discovery (when Apollo API key is configured)
 */
async function discoverFromApollo(apiKey, keywords = ['AI', 'SaaS'], limit = 8) {
  if (!apiKey) return [];
  try {
    const response = await axios.post(
      'https://api.apollo.io/v1/mixed_people/search',
      {
        api_key: apiKey,
        q_organization_keyword_tags: Array.isArray(keywords) ? keywords : [keywords],
        person_titles: ['Founder', 'Co-Founder', 'CEO', 'CTO', 'VP of Engineering'],
        page: 1,
        per_page: limit
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    const people = response.data?.people || [];
    return people.map((p) => {
      const company = p.organization?.name || 'Tech Company';
      const linkedinUrl =
        p.linkedin_url ||
        `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((p.name || '') + ' ' + company)}`;
      return {
        externalId: `apollo_founder_${p.id || Date.now()}`,
        name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Founder',
        role: p.title || 'Founder & CEO',
        company,
        platform: 'apollo',
        linkedinUrl,
        twitterUrl: p.twitter_url || '',
        companyUrl: p.organization?.website_url || '',
        profileUrl: linkedinUrl,
        email: p.email && !p.email.includes('email_not_unlocked') ? p.email : '',
        location: [p.city, p.state, p.country].filter(Boolean).join(', ') || 'United States',
        industry: p.organization?.industry || 'Software & AI',
        signal: `${p.title || 'Decision Maker'} at ${company}`,
        bio: p.headline || `${p.title} leading engineering and product at ${company}.`,
        tags: ['Apollo Verified', p.title || 'Founder'],
        matchScore: 94,
        postedAt: new Date()
      };
    });
  } catch (err) {
    console.warn('[FounderScout] Apollo discovery notice:', err.message);
    return [];
  }
}

/**
 * Main Discovery Orchestrator: Discovers Founders & Decision Makers across LinkedIn, GitHub, YC, and Apollo,
 * generates AI personalized outreach messages for each, and saves them to MongoDB.
 */
export async function discoverFoundersForCompany(companyId, options = {}) {
  const keywords = options.keywords || 'AI Automation SaaS';

  let companyProfile = await CompanyProfile.findOne({ companyId });
  if (!companyProfile) {
    companyProfile = await CompanyProfile.create({ companyId });
  }

  let config = await IntegrationConfig.findOne({ companyId });
  if (!config) {
    config = await IntegrationConfig.create({ companyId });
  }

  const apolloKey = config.apolloApiKey || process.env.APOLLO_API_KEY;
  const geminiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

  // Fetch in parallel across all real public & configured founder channels
  const [ghFounders, liFounders, ycFounders, apolloFounders] = await Promise.all([
    discoverFromGitHubFounders(keywords, 10),
    discoverFromLinkedInHiringFounders(keywords, 8),
    discoverFromYCFounders(8),
    discoverFromApollo(apolloKey, companyProfile.targetKeywords || [keywords], 8)
  ]);

  const allRaw = [...apolloFounders, ...ghFounders, ...liFounders, ...ycFounders];

  // Filter out already-saved founders for this company
  const newCandidates = [];
  const seenExternalIds = new Set();

  for (const candidate of allRaw) {
    if (!candidate.externalId || seenExternalIds.has(candidate.externalId)) continue;
    seenExternalIds.add(candidate.externalId);

    const exists = await FounderProspect.findOne({
      companyId,
      externalId: candidate.externalId
    })
      .select('_id')
      .lean();

    if (!exists) {
      newCandidates.push(candidate);
    }
    if (newCandidates.length >= 18) break;
  }

  if (newCandidates.length === 0) {
    return { addedCount: 0, totalAttempted: allRaw.length };
  }

  // Generate personalized outreach messages in a single batch LLM call (with guaranteed fallback)
  let aiResults = [];
  if (geminiKey) {
    try {
      aiResults = await batchGenerateFounderOutreach(
        newCandidates,
        companyProfile,
        geminiKey,
        config.geminiModel
      );
    } catch (err) {
      console.warn('[FounderScout] Batch AI outreach fallback triggered:', err.message);
    }
  }

  const aiMap = new Map();
  for (const item of aiResults) {
    if (typeof item.id === 'number') {
      aiMap.set(item.id, item);
    }
  }

  let addedCount = 0;
  for (let i = 0; i < newCandidates.length; i++) {
    const raw = newCandidates[i];
    const ai = aiMap.get(i);
    const fallback = buildSmartFounderOutreachFallback(raw, companyProfile);

    try {
      await FounderProspect.create({
        ...raw,
        companyId,
        matchScore: ai?.matchScore || raw.matchScore || fallback.matchScore,
        matchReasoning: ai?.matchReasoning || fallback.matchReasoning,
        outreachMessage: ai?.outreachMessage || fallback.outreachMessage,
        connectionNote: ai?.connectionNote || fallback.connectionNote,
        emailSubject: ai?.emailSubject || fallback.emailSubject,
        status: 'discovered'
      });
      addedCount++;
    } catch (_) {}
  }

  return { addedCount, totalAttempted: allRaw.length };
}

/**
 * Regenerates a single Founder's outreach message with Gemini (or smart fallback)
 */
export async function regenerateFounderOutreachForProspect(founder, companyId, customAngle = '') {
  const companyProfile = (await CompanyProfile.findOne({ companyId })) || {};
  const config = (await IntegrationConfig.findOne({ companyId })) || {};
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const generated = await generateSingleFounderOutreach(
        founder,
        companyProfile,
        customAngle,
        apiKey,
        config.geminiModel
      );
      if (generated && generated.outreachMessage) {
        return generated;
      }
    } catch (err) {
      console.warn('[FounderScout] Single outreach regeneration fallback:', err.message);
    }
  }

  return buildSmartFounderOutreachFallback(founder, companyProfile);
}
