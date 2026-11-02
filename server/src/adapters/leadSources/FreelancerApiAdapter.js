import axios from 'axios';
import { LeadSourceAdapter } from './LeadSourceAdapter.js';

const CURRENCY_TO_USD = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  AUD: 0.65,
  CAD: 0.73,
  SGD: 0.74,
  CHF: 1.12,
  INR: 0.012,
  AED: 0.27,
  SAR: 0.27,
  NZD: 0.60,
  HKD: 0.13,
  MYR: 0.22,
  PHP: 0.018,
  PKR: 0.0036
};

// Freelancer.com skill IDs for Software Architecture, Python, Node.js, Web Dev, Full Stack, Frontend, API, REST API, Automation, AI Chatbot, AI Dev, AI Integration, Mobile App Dev
const AGENCY_TECH_JOB_IDS = [13, 116, 500, 1031, 1087, 1088, 1093, 1977, 2703, 2917, 2986, 3375, 44];

const EXCLUDE_GIG_REGEX =
  /discussion participant|reseller|commission only|tutor|tutoring|coaching|logo design|content writer|ghostwriting|voiceover|translation|translator|tester de app|data entry|virtual assistant|illustrator|2d animation|3d house|revit|autocad|pcb layout|knx|sharepoint student|homework|assignment|academic/i;

const AGENCY_BUILD_REGEX =
  /build|develop|platform|app|application|saas|mvp|api|backend|frontend|full stack|full-stack|integration|automation|ai|agent|llm|openai|chatbot|portal|system|dashboard|marketplace|software|cloud|aws|python|react|node|flutter|nextjs|django|fastapi|quotation request/i;

function computeUsdBudget(project) {
  const code = project.currency?.code || 'USD';
  const rate = CURRENCY_TO_USD[code] || 1;
  const rawMax = project.budget?.maximum || project.budget?.minimum || 0;
  const rawMin = project.budget?.minimum || 0;
  return {
    usdMax: Math.round(rawMax * rate),
    usdMin: Math.round(rawMin * rate),
    originalCurrency: code
  };
}

/**
 * Fetches active, open client software/AI/MVP build projects from Freelancer.com's public API.
 * Strictly filters for clients paying project/agency budgets (>= $250 USD fixed or >= $25/hr USD).
 */
export class FreelancerApiAdapter extends LeadSourceAdapter {
  constructor() {
    super('freelancer');
  }

  async fetchRawLeads(options = {}) {
    const limit = options.limit || 20;
    try {
      const jobsParam = AGENCY_TECH_JOB_IDS.map((id) => `jobs[]=${id}`).join('&');
      const url = `https://www.freelancer.com/api/projects/0.1/projects/active/?${jobsParam}&limit=80&full_description=true&job_details=true`;

      const response = await axios.get(url, { timeout: 10000 });
      const projects = response.data?.result?.projects || [];

      const validProjects = [];
      const seenIds = new Set();

      for (const p of projects) {
        if (!p || !p.id || seenIds.has(p.id)) continue;
        // Strictly open, active, non-deleted client projects only
        if (p.deleted) continue;
        if (p.status && p.status !== 'active') continue;
        if (p.frontend_project_status && p.frontend_project_status !== 'open') continue;

        const { usdMax, usdMin } = computeUsdBudget(p);
        const isHourly = p.type === 'hourly';

        // Require agency-viable project budgets (>= $250 USD fixed or >= $25/hr USD)
        if (isHourly && usdMax < 25 && usdMin < 25) continue;
        if (!isHourly && usdMax < 250) continue;

        const skillNames = (p.jobs || []).map((j) => j.name).filter(Boolean);
        const combinedText = `${p.title || ''} ${p.description || ''} ${skillNames.join(' ')}`;

        if (EXCLUDE_GIG_REGEX.test(combinedText)) continue;
        if (!AGENCY_BUILD_REGEX.test(combinedText)) continue;

        seenIds.add(p.id);
        p._usdMax = usdMax;
        p._usdMin = usdMin;
        validProjects.push(p);
      }

      // Prioritize higher-budget agency-ready client projects + freshest postings
      validProjects.sort((a, b) => {
        const scoreA = Math.min(3000, a._usdMax || 0) + (a.submitdate || 0) / 100000;
        const scoreB = Math.min(3000, b._usdMax || 0) + (b.submitdate || 0) / 100000;
        return scoreB - scoreA;
      });

      return validProjects.slice(0, limit);
    } catch (err) {
      console.error('[FreelancerApiAdapter] Failed to fetch active client projects:', err.message);
      return [];
    }
  }

  normalizeLead(rawItem) {
    const { usdMax, usdMin } = computeUsdBudget(rawItem);
    const budgetAmount = usdMax || usdMin || 0;
    const budgetType = rawItem.type === 'hourly' ? 'hourly' : 'fixed';

    const skills = (rawItem.jobs || [])
      .map((j) => j.name)
      .filter(Boolean)
      .slice(0, 8);

    const seoUrl = rawItem.seo_url ? `https://www.freelancer.com/projects/${rawItem.seo_url}` : '';
    const postedAt = rawItem.submitdate ? new Date(rawItem.submitdate * 1000) : new Date();

    // Clean "- Quotation Request" or "-- 2" suffixes from titles for cleaner presentation
    const cleanTitle = (rawItem.title || 'Untitled Software Build Project')
      .replace(/\s*--\s*\d+/g, '')
      .trim();

    return {
      externalId: `freelancer_${rawItem.id}`,
      platform: 'freelancer',
      title: cleanTitle,
      description: rawItem.description || rawItem.preview_description || cleanTitle,
      sourceUrl: seoUrl || `https://www.freelancer.com/projects/${rawItem.id}`,
      postedAt,
      clientInfo: {
        name: 'Project Client',
        company: 'Client Project Scope',
        location: rawItem.currency?.country || 'Global',
        email: '',
        website: ''
      },
      budget: {
        amount: Math.round(budgetAmount),
        currency: 'USD',
        type: budgetType
      },
      skillsRequired: skills.length > 0 ? skills : ['Software Development', 'Full-Stack', 'AI']
    };
  }
}
