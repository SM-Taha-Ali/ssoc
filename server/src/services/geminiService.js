import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

let cachedAvailableModels = null;
let lastModelFetch = 0;

/**
 * Extracts and parses valid JSON from LLM string output, even if wrapped in markdown blocks
 */
function cleanAndParseJSON(text) {
  try {
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return JSON.parse(trimmed);
    }
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
    const firstBrace = trimmed.search(/[\{\[]/);
    const lastBrace = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    }
    throw new Error('No valid JSON block detected in response.');
  } catch (error) {
    console.error('[Gemini JSON Parse Error]:', error.message, 'Raw text:', text);
    throw error;
  }
}

/**
 * The 3 Supported Gemini 3 Models in SSOC:
 * Display Label <-> Real API Model Key
 */
export const SUPPORTED_GEMINI_MODELS = {
  'Gemini 3.8 Flash': 'gemini-3.8-flash',
  'Gemini 3.7 Flash': 'gemini-3.7-flash',
  'Gemini 3.5 Flash Lite': 'gemini-3.5-flash-lite',
  'gemini-3.8-flash': 'gemini-3.8-flash',
  'gemini-3.7-flash': 'gemini-3.7-flash',
  'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite'
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Normalizes user-selected model names or settings into the real Gemini 3 API model key.
 * Defaults to 'gemini-3.8-flash' (Gemini 3.8 Flash).
 */
export function resolveGeminiModelName(modelName) {
  if (!modelName) return DEFAULT_GEMINI_MODEL;
  const trimmed = String(modelName).trim();
  if (SUPPORTED_GEMINI_MODELS[trimmed]) {
    return SUPPORTED_GEMINI_MODELS[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('3.8')) return 'gemini-3.8-flash';
  if (lower.includes('3.7')) return 'gemini-3.7-flash';
  if (lower.includes('3.5') || lower.includes('lite')) return 'gemini-3.5-flash-lite';
  return DEFAULT_GEMINI_MODEL;
}

/**
 * Executes a Gemini prompt with the selected Gemini 3 model.
 * Strictly calls the real API model key (gemini-3.8-flash, gemini-3.7-flash, gemini-3.5-flash-lite).
 */
async function executeGeminiPrompt(apiKeyOverride, modelNameOverride, prompt) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key is not set. Please enter it in the Integrations Settings or .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const rawModel = modelNameOverride || process.env.GEMINI_MODEL || 'Gemini 3.8 Flash';
  const targetModel = resolveGeminiModelName(rawModel);

  // Strictly execute the selected model first, with fallback only across the other 2 supported Gemini 3 tiers
  const candidateModels = [
    targetModel,
    targetModel === 'gemini-3.8-flash' ? 'gemini-3.7-flash' : 'gemini-3.8-flash',
    'gemini-3.5-flash-lite'
  ].filter((v, i, a) => a.indexOf(v) === i && Boolean(v));

  let lastError = null;
  for (let i = 0; i < candidateModels.length; i++) {
    const candidateModel = candidateModels[i];
    try {
      console.log(`[Gemini 3 Engine] Invoking model: "${candidateModel}" (Requested: "${rawModel}")`);
      const generativeModel = genAI.getGenerativeModel({ model: candidateModel });
      const result = await generativeModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      const isRecoverable = err.message && (
        err.message.includes('404') ||
        err.message.includes('400') ||
        err.message.includes('503') ||
        err.message.includes('429') ||
        err.message.includes('high demand') ||
        err.message.includes('temporarily') ||
        err.message.includes('Resource has been exhausted') ||
        err.message.includes('not found') ||
        err.message.includes('not supported') ||
        err.message.includes('unexpected model name format') ||
        err.message.includes('is not a valid model') ||
        err.message.includes('is not supported for generateContent')
      );
      if (isRecoverable && i < candidateModels.length - 1) {
        console.warn(`[Gemini 3 Engine] Model "${candidateModel}" returned (${err.message.slice(0, 100)}). Trying fallback tier "${candidateModels[i + 1]}"...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Evaluates lead fit, generates profile optimization tips, and crafts a 60-second video demo script
 */
export async function scoreAndAuditLead(lead, companyProfile, apiKey, modelName) {

  const prompt = `
You are a Principal AI & Tech Sales Solutions Architect. Evaluate this tech job lead against the company profile and criteria.

COMPANY PROFILE & GROUND-TRUTH DIGITAL ASSETS:
- Name: ${companyProfile.name || companyProfile.companyName || 'Agency'}
- Tagline: ${companyProfile.tagline || ''}
- Value Proposition: ${companyProfile.valueProposition || ''}
- Target Services: ${JSON.stringify(companyProfile.targetServices || [])}
- Target Keywords: ${JSON.stringify(companyProfile.targetKeywords || [])}
- Negative Keywords: ${JSON.stringify(companyProfile.negativeKeywords || [])}
- Minimum Budget: $${companyProfile.minBudget || 0}
${companyProfile.websiteData?.rawTextSummary ? `- Live Website Intelligence & Case Studies:\n${companyProfile.websiteData.rawTextSummary.slice(0, 1000)}` : ''}
${companyProfile.upworkData?.rawTextSummary ? `- Live Upwork Profile (Headline, Overview, Skills):\n${companyProfile.upworkData.rawTextSummary.slice(0, 800)}` : ''}
${companyProfile.linkedinData?.rawTextSummary ? `- Live LinkedIn Profile (Headline & About):\n${companyProfile.linkedinData.rawTextSummary.slice(0, 800)}` : ''}

JOB LEAD:
- Title: ${lead.title}
- Platform: ${lead.platform}
- Skills: ${lead.skillsRequired?.join(', ') || 'N/A'}
- Budget: $${lead.budget?.amount || 0} (${lead.budget?.type || 'unspecified'})
- Description:
${lead.description}

YOUR TASKS:
1. Calculate a matchScore (integer from 0 to 100) based on how well this job matches the company's real target services, skills, and budget. Penalize heavily if it hits negative keywords or is below minimum budget.
2. Provide a 2-sentence matchReasoning explaining the score.
3. List 3 concrete, personalized profileOptimizationTips: compare their real ground-truth Upwork headline, LinkedIn about section, or website case studies against this exact job posting. Give precise recommendations on what words to highlight, how to adjust their headline, and which specific proof point to put first.
4. Write a 60-second video demo script:
   - hook: (0-10 sec) Compelling personal opening directly addressing their specific pain point.
   - problemStatement: (10-25 sec) Articulate the exact technical difficulty they are facing.
   - microSolution: (25-50 sec) Demonstrate the exact architecture, bot, code, or workflow that fixes it.
   - callToAction: (50-60 sec) Simple zero-pressure invitation to discuss the implementation.
   - fullScript: Full cohesive speaking script.

Output ONLY a valid JSON object matching this schema:
{
  "matchScore": 85,
  "matchReasoning": "String",
  "profileOptimizationTips": ["tip 1", "tip 2", "tip 3"],
  "demoScript": {
    "hook": "String",
    "problemStatement": "String",
    "microSolution": "String",
    "callToAction": "String",
    "fullScript": "String"
  }
}
`;

  const responseText = await executeGeminiPrompt(apiKey, modelName, prompt);
  return cleanAndParseJSON(responseText);
}

/**
 * Crafts a personalized, high-converting outreach pitch incorporating the demo video
 */
export async function generatePitchDraft(lead, companyProfile, apiKey, modelName) {
  const prompt = `
You are a world-class elite B2B tech copywriter and sales strategist.
Draft a concise, punchy, hyper-personalized pitch for this lead.

COMPANY INFO:
- Sender Name: ${companyProfile.senderName || 'Lead Tech Lead'}
- Sender Title: ${companyProfile.senderTitle || 'Solutions Architect'}
- Company: ${companyProfile.name}
- Value Proposition: ${companyProfile.valueProposition}
- Portfolio Links: ${JSON.stringify(companyProfile.portfolioLinks || [])}

LEAD DETAILS:
- Title: ${lead.title}
- Platform: ${lead.platform}
- Client Name: ${lead.clientInfo?.name || 'Hiring Manager'}
- Client Company: ${lead.clientInfo?.company || ''}
- Description:
${lead.description}
- Custom Recorded Demo Video URL: ${lead.demoVideoUrl || '[Demo Video Link]'}

GUIDELINES:
- Under 150 words. No corporate fluff, no generic pleasantries like "I hope this email finds you well".
- Focus directly on their outcome.
- Mention that a custom 60-second video demonstration was prepared specifically for them, linking directly to ${lead.demoVideoUrl || 'the recorded demo'}.
- Tone: Technical peer, confident, consultative.

Output ONLY a valid JSON object:
{
  "subject": "Quick demo regarding [Specific Problem]",
  "body": "Hi [Name],\\n\\n[Body text here with demo link]...\\n\\nBest,\\n${companyProfile.senderName}"
}
`;

  const responseText = await executeGeminiPrompt(apiKey, modelName, prompt);
  return cleanAndParseJSON(responseText);
}

/**
 * Generates dynamic 3-touch follow-up sequence (Day 2, Day 7, Day 21)
 */
export async function generateFollowUpSequence(lead, companyProfile, apiKey, modelName) {
  const responseText = await executeGeminiPrompt(apiKey, modelName, prompt);
  return cleanAndParseJSON(responseText);
}

/**
 * Parses raw messy job posting text pasted by user into structured lead data
 */
export async function parseRawJobText(rawText, apiKey, modelName) {
  const prompt = `
Extract structured job/lead data from this raw job description or email text.

RAW TEXT:
${rawText}

Output ONLY a valid JSON object with these keys:
{
  "title": "Clean concise job title",
  "clientName": "Extracted name or 'Hiring Lead'",
  "company": "Company name if mentioned or empty string",
  "email": "Email address if present or empty string",
  "platform": "upwork, linkedin, indeed, freelancer, or manual",
  "budgetAmount": 0,
  "budgetType": "fixed, hourly, or unspecified",
  "skills": ["Skill 1", "Skill 2"],
  "cleanDescription": "Cleaned readable summary of the requirements"
}
`;

  const responseText = await executeGeminiPrompt(apiKey, modelName, prompt);
  return cleanAndParseJSON(responseText);
}

/**
 * Evaluates a batch of raw candidate leads in a SINGLE LLM prompt.
 * Highly cost-efficient, lightning fast, and strictly filters out irrelevant jobs.
 */
export async function batchEvaluateLeads(candidates, companyProfile, apiKey, modelName) {
  if (!candidates || candidates.length === 0) return [];

  const prompt = `
You are an expert Chief Revenue Officer and Technical Lead Auditor evaluating job listings for a software engineering & AI agency.

### COMPANY OFFERINGS & SPECIALTIES:
- Agency Name: ${companyProfile.name || 'Tech Solutions'}
- Core Services:
${(companyProfile.targetServices || []).map((s) => `  * ${s}`).join('\n')}
- Core Technical Strengths:
${(companyProfile.coreStrengths || []).map((s) => `  * ${s}`).join('\n')}
- Target Tech Stack / Keywords: ${(companyProfile.targetKeywords || []).join(', ')}
- Value Proposition: ${companyProfile.valueProposition || 'Custom AI agents, workflow automation, and MERN apps'}

### STRICT DISQUALIFICATION RULES (DISCARD IMMEDIATELY):
1. Foreign-Language Specific: Any role requiring non-English languages (e.g., Spanish speaking, German speaking, French speaking, Portuguese speaking).
2. Non-Technical / Sales / Recruiting: Pure sales (SDR/BDR/Account Executive), recruiters, HR coordinators, telemarketing, data entry, virtual assistants, customer support agents with NO coding.
3. Incompatible terms: Unpaid, volunteer, commission-only with 0 base.
4. Non-Software: Hardware, physical engineering, manufacturing, automotive mechanics, medical billing.
${(companyProfile.disqualifiers || []).map((d) => `5. Disqualifier: ${d}`).join('\n')}

### CANDIDATE JOBS TO EVALUATE:
${candidates
  .map(
    (c, i) => `
[JOB ID ${i}]
Title: ${c.title}
Platform: ${c.platform}
Budget: ${c.budget?.amount ? `${c.budget.amount} ${c.budget.currency}` : 'Unspecified'}
Skills: ${(c.skillsRequired || []).join(', ')}
Summary: ${(c.description || '').substring(0, 300)}...
`
  )
  .join('\n---\n')}

### TASK:
1. Review each candidate against our company's actual technical services (AI agents, automations, React/Node/MERN, Cloud/AWS).
2. Strictly reject any job that violates the disqualification rules or is not a genuine software/AI/automation need.
3. Select up to a maximum of 20 TOP approved leads.
4. Return a valid JSON array of objects for the approved candidates ONLY.

Schema:
[
  {
    "id": 0,
    "approved": true,
    "matchScore": 88,
    "matchReasoning": "1 concise sentence explaining exactly why this is a high-fit client for our AI/full-stack team.",
    "extractedTechStack": ["React", "Node.js", "AWS"],
    "demoAngle": "Brief 1-sentence recommended angle for outreach"
  }
]

Return ONLY the raw JSON array.
`;

  try {
    const rawOutput = await executeGeminiPrompt(apiKey, modelName, prompt);
    const parsed = cleanAndParseJSON(rawOutput);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[Gemini Batch Evaluation Error]:', err.message);
    return [];
  }
}

/**
 * Automatically parses raw agency website text, pitch deck copy, or company bio
 * into structured Company Profile, Value Proposition, and ICP Targeting fields.
 */
export async function extractCompanyProfileFromText(rawText, apiKey, modelName) {
  const prompt = `
You are an expert Chief Revenue Officer and Sales Operations Consultant.
Analyze the provided company description, agency website text, or pitch deck summary, and extract a complete, structured company profile and sales targeting configuration.

RAW COMPANY/AGENCY TEXT:
${rawText}

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following fields:
{
  "name": "Company/Agency Name",
  "tagline": "A crisp 1-sentence tagline",
  "website": "Extracted website URL or empty string",
  "services": ["Service 1", "Service 2", "Service 3"],
  "strengths": ["Key Technical Strength 1", "Strength 2", "Strength 3"],
  "valueProposition": "A powerful 1-2 sentence core value proposition explaining the business impact and transformation delivered",
  "caseStudies": "Extracted past client successes, metrics, or notable achievements (formatted as bullet points)",
  "targetKeywords": ["Keyword 1", "Keyword 2", "Keyword 3", "Tech 4"],
  "negativeKeywords": ["telemarketer", "data entry", "unpaid", "commission only"],
  "disqualifiers": [
    "Non-technical or administrative listings",
    "Unpaid or 100% equity-only roles with no budget",
    "Roles requiring non-English primary languages"
  ],
  "targetIndustries": ["SaaS", "FinTech", "HealthTech", "E-Commerce"],
  "targetRoles": ["CTO", "VP of Engineering", "Head of Product", "Founder / CEO"]
}
`;

  const responseText = await executeGeminiPrompt(apiKey, modelName, prompt);
  return cleanAndParseJSON(responseText);
}

