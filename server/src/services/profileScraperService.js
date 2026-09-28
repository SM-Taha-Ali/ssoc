import axios from 'axios';
import * as cheerio from 'cheerio';
import { CompanyProfile } from '../models/CompanyProfile.js';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Scrapes and extracts key text, services, and case studies from a public agency/company website.
 */
export async function scrapeWebsite(url) {
  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    throw new Error('Please provide a valid website URL starting with http:// or https://');
  }

  const cleanUrl = url.trim();

  try {
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;
    if (typeof html !== 'string') {
      throw new Error('Received non-HTML response from website.');
    }

    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, noscript, iframe, svg, nav, footer, form').remove();

    const scrapedTitle =
      $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      '';

    const metaDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    // Extract key headings
    const headings = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 5 && text.length < 150 && !headings.includes(text)) {
        headings.push(text);
      }
    });

    // Extract paragraph text
    const paragraphs = [];
    $('p, li').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 25 && text.length < 500 && !paragraphs.includes(text)) {
        paragraphs.push(text);
      }
    });

    // Infer services and case studies from text
    const services = [];
    const caseStudies = [];

    headings.forEach((h) => {
      const lower = h.toLowerCase();
      if (
        lower.includes('service') ||
        lower.includes('what we do') ||
        lower.includes('solution') ||
        lower.includes('capability') ||
        lower.includes('build')
      ) {
        services.push(h);
      }
      if (
        lower.includes('case study') ||
        lower.includes('project') ||
        lower.includes('client win') ||
        lower.includes('portfolio') ||
        lower.includes('result')
      ) {
        caseStudies.push(h);
      }
    });

    const combinedSummary = [
      scrapedTitle ? `Site Title: ${scrapedTitle}` : '',
      metaDescription ? `Meta Description: ${metaDescription}` : '',
      headings.length ? `Key Highlights: ${headings.slice(0, 10).join(' | ')}` : '',
      paragraphs.length ? `Main Content: ${paragraphs.slice(0, 15).join(' ')}` : ''
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 4000); // Keep compact for LLM ingestion

    return {
      scrapedTitle,
      metaDescription,
      rawTextSummary: combinedSummary,
      scrapedServices: services.slice(0, 10),
      scrapedCaseStudies: caseStudies.slice(0, 10),
      lastScrapedAt: new Date()
    };
  } catch (err) {
    console.error(`[ProfileScraper] Error scraping website (${cleanUrl}):`, err.message);
    return {
      scrapedTitle: '',
      metaDescription: '',
      rawTextSummary: `Could not fetch live website content (${err.message}). Using manual value proposition.`,
      scrapedServices: [],
      scrapedCaseStudies: [],
      lastScrapedAt: new Date()
    };
  }
}

/**
 * Scrapes an Upwork profile or extracts metadata.
 */
export async function scrapeUpworkProfile(url) {
  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    return null;
  }

  const cleanUrl = url.trim();

  try {
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const headline =
      $('h1, h2, meta[property="og:title"]').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      '';

    const overview =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('.air3-paragraph, [data-qa="freelancer-overview"]').text().trim() ||
      '';

    const skills = [];
    $('.air3-token, [data-qa="skill-badge"]').each((_, el) => {
      const s = $(el).text().trim();
      if (s && !skills.includes(s)) skills.push(s);
    });

    const rawSummary = [
      headline ? `Headline: ${headline}` : '',
      overview ? `Overview: ${overview}` : '',
      skills.length ? `Skills: ${skills.join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2500);

    return {
      headline,
      overview,
      skills: skills.slice(0, 20),
      hourlyRate: '',
      rawTextSummary: rawSummary || `Upwork profile at ${cleanUrl}`,
      lastScrapedAt: new Date()
    };
  } catch (err) {
    console.warn(`[ProfileScraper] Upwork scrape note for ${cleanUrl}: ${err.message}`);
    // Upwork has strong anti-bot shields; return structured profile placeholder
    return {
      headline: '',
      overview: '',
      skills: [],
      hourlyRate: '',
      rawTextSummary: `Upwork profile registered at: ${cleanUrl}. Automated scraper received note: ${err.message}.`,
      lastScrapedAt: new Date()
    };
  }
}

/**
 * Scrapes a public LinkedIn profile or company page.
 */
export async function scrapeLinkedInProfile(url) {
  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    return null;
  }

  const cleanUrl = url.trim();

  try {
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const headline =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      '';

    const about =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    const rawSummary = [
      headline ? `LinkedIn Headline: ${headline}` : '',
      about ? `LinkedIn Summary: ${about}` : ''
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2500);

    return {
      headline,
      about,
      services: [],
      rawTextSummary: rawSummary || `LinkedIn profile at ${cleanUrl}`,
      lastScrapedAt: new Date()
    };
  } catch (err) {
    console.warn(`[ProfileScraper] LinkedIn scrape note for ${cleanUrl}: ${err.message}`);
    return {
      headline: '',
      about: '',
      services: [],
      rawTextSummary: `LinkedIn profile registered at: ${cleanUrl}. Note: ${err.message}.`,
      lastScrapedAt: new Date()
    };
  }
}

/**
 * Syncs and stores all external digital profiles (Website, Upwork, LinkedIn) for a company.
 */
export async function syncAllCompanyProfiles(companyId) {
  let profile = await CompanyProfile.findOne(companyId ? { _id: companyId } : {});
  if (!profile) {
    profile = await CompanyProfile.create({
      companyName: 'Apex Solutions',
      website: ''
    });
  }

  const results = {
    websiteSynced: false,
    upworkSynced: false,
    linkedinSynced: false
  };

  // 1. Scrape Website if present
  if (profile.website && profile.website.trim().startsWith('http')) {
    try {
      const webData = await scrapeWebsite(profile.website);
      if (webData) {
        profile.websiteData = webData;
        results.websiteSynced = true;
      }
    } catch (e) {
      console.error('[ProfileScraper] Website sync failed:', e.message);
    }
  }

  // 2. Scrape Upwork if present
  const upworkUrl =
    profile.upworkProfileUrl ||
    profile.profileLinks?.find((p) => p.platform?.toLowerCase() === 'upwork')?.url;

  if (upworkUrl && upworkUrl.trim().startsWith('http')) {
    try {
      const upworkData = await scrapeUpworkProfile(upworkUrl);
      if (upworkData) {
        profile.upworkProfileUrl = upworkUrl;
        profile.upworkData = upworkData;
        results.upworkSynced = true;
      }
    } catch (e) {
      console.error('[ProfileScraper] Upwork sync failed:', e.message);
    }
  }

  // 3. Scrape LinkedIn if present
  const linkedinUrl =
    profile.linkedinProfileUrl ||
    profile.profileLinks?.find((p) => p.platform?.toLowerCase() === 'linkedin')?.url;

  if (linkedinUrl && linkedinUrl.trim().startsWith('http')) {
    try {
      const linkedinData = await scrapeLinkedInProfile(linkedinUrl);
      if (linkedinData) {
        profile.linkedinProfileUrl = linkedinUrl;
        profile.linkedinData = linkedinData;
        results.linkedinSynced = true;
      }
    } catch (e) {
      console.error('[ProfileScraper] LinkedIn sync failed:', e.message);
    }
  }

  await profile.save();
  return { profile, results };
}
