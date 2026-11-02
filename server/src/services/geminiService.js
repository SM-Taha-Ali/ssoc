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
  'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-flash-latest': 'gemini-flash-latest'
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Normalizes user-selected model names or settings into the real Gemini API model key.
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
  if (lower.includes('2.5')) return 'gemini-2.5-flash';
  return DEFAULT_GEMINI_MODEL;
}

/**
 * Builds an intelligent fallback sequence prioritizing the user's choice,
 * followed by peer Gemini 3 tiers, and finally high-capacity production tiers.
 */
export function getCandidateModelChain(targetModel) {
  const primary = targetModel;
  let alternatives = [];
  if (primary === 'gemini-3.5-flash-lite') {
    alternatives = ['gemini-3.7-flash', 'gemini-3.8-flash'];
  } else if (primary === 'gemini-3.7-flash') {
    alternatives = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  } else {
    alternatives = ['gemini-3.7-flash', 'gemini-3.5-flash-lite'];
  }

  const stableTiers = ['gemini-2.5-flash', 'gemini-flash-latest'];
  return [primary, ...alternatives, ...stableTiers].filter((v, i, a) => a.indexOf(v) === i && Boolean(v));
}

/**
 * Executes a Gemini prompt with the selected Gemini model.
 * Resilient against temporary 503 high-demand bursts with backoff and graceful fallback.
 */
async function executeGeminiPrompt(apiKeyOverride, modelNameOverride, prompt) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key is not set. Please enter it in the Integrations Settings or .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const rawModel = modelNameOverride || process.env.GEMINI_MODEL || 'Gemini 3.8 Flash';
  const targetModel = resolveGeminiModelName(rawModel);

  const candidateModels = getCandidateModelChain(targetModel);
  let lastError = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const candidateModel = candidateModels[i];
    try {
      console.log(`[Gemini Engine] Invoking model: "${candidateModel}" (User configured: "${rawModel}")`);
      const generativeModel = genAI.getGenerativeModel({ model: candidateModel });

      let result;
      try {
        result = await generativeModel.generateContent(prompt);
      } catch (firstErr) {
        const is503HighDemand = firstErr.message && (
          firstErr.message.includes('503') ||
          firstErr.message.includes('high demand') ||
          firstErr.message.includes('temporarily')
        );
        if (is503HighDemand) {
          console.warn(`[Gemini Engine] Model "${candidateModel}" experienced high demand (503). Retrying in 1s...`);
          await new Promise((r) => setTimeout(r, 1000));
          result = await generativeModel.generateContent(prompt);
        } else {
          throw firstErr;
        }
      }

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
        console.warn(`[Gemini Engine] Model "${candidateModel}" unavailable (${err.message.slice(0, 80)}). Falling back to "${candidateModels[i + 1]}"...`);
        continue;
      }
      break;
    }
  }

  if (lastError?.message?.includes('503') || lastError?.message?.includes('high demand')) {
    throw new Error(`Google Gemini service is temporarily experiencing high demand for model "${rawModel}". Please try again in a few moments.`);
  }

  throw lastError;
}

/**
 * Evaluates lead fit, generates profile optimization tips, and crafts a 60-second video demo script
 */
export async function scoreAndAuditLead(lead, companyProfile, apiKey, modelName) {
  const prompt = `
You are a Principal AI & Tech Sales Solutions Architect. Evaluate this project/freelance lead against the company profile and criteria.

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

JOB / PROJECT LEAD:
- Title: ${lead.title}
- Platform: ${lead.platform}
- Skills: ${lead.skillsRequired?.join(', ') || 'N/A'}
- Budget: $${lead.budget?.amount || 0} (${lead.budget?.type || 'unspecified'})
- Description:
${lead.description}

YOUR TASKS:
1. Calculate a matchScore (integer from 0 to 100) based on how well this project matches the company's real target services, skills, and budget. Penalize heavily if it is a full-time W-2 employee role rather than a project/contract/freelance engagement, or if it hits negative keywords.
2. Provide a 2-sentence matchReasoning explaining the score.
3. List 3 concrete, personalized profileOptimizationTips: compare their real ground-truth Upwork headline, LinkedIn about section, or website case studies against this exact project posting. Give precise recommendations on what words to highlight, how to adjust their headline, and which specific proof point to put first.
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
Draft a concise, punchy, hyper-personalized pitch for this project lead.

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
- Focus directly on their project outcome.
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
 * Generates dynamic follow-up sequence (Day 7, Day 21)
 */
export async function generateFollowUpSequence(lead, companyProfile, apiKey, modelName) {
  const prompt = `
You are an elite B2B sales strategist. Generate a 2-touch follow-up sequence (Day 7 and Day 21) for this project lead.

COMPANY: ${companyProfile.name || 'Agency'} (Sender: ${companyProfile.senderName || 'Solutions Architect'})
LEAD: ${lead.title} (${lead.clientInfo?.company || lead.clientInfo?.name || 'Client'})
DEMO URL: ${lead.demoVideoUrl || ''}

Output ONLY a valid JSON object:
{
  "day_7": {
    "subject": "Quick follow-up re: ${lead.title}",
    "body": "Short helpful 60-word follow-up..."
  },
  "day_21": {
    "subject": "Checking in on ${lead.title}",
    "body": "Short value-driven 60-word follow-up..."
  }
}
`;
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
 * Highly cost-efficient, lightning fast, and strictly filters out full-time jobs and irrelevant roles.
 */
export async function batchEvaluateLeads(candidates, companyProfile, apiKey, modelName) {
  if (!candidates || candidates.length === 0) return [];

  const prompt = `
You are an expert Chief Revenue Officer and Technical Lead Auditor evaluating project & contract opportunities for a software engineering & AI agency.

### COMPANY OFFERINGS & SPECIALTIES:
- Agency Name: ${companyProfile.name || 'Tech Solutions'}
- Core Services:
${(companyProfile.targetServices || []).map((s) => `  * ${s}`).join('\n')}
- Core Technical Strengths:
${(companyProfile.coreStrengths || []).map((s) => `  * ${s}`).join('\n')}
- Target Tech Stack / Keywords: ${(companyProfile.targetKeywords || []).join(', ')}
- Value Proposition: ${companyProfile.valueProposition || 'Custom AI agents, workflow automation, and MERN apps'}

### STRICT DISQUALIFICATION RULES (DISCARD IMMEDIATELY):
1. FULL-TIME EMPLOYEE ROLES (CRITICAL): Strictly reject any permanent full-time salaried employee position (W-2, internal staff engineer, annual salary with health/401k benefits, or roles stating "no agencies / no C2C"). Companies hiring a permanent employee will NOT entertain an external agency/freelance partner. ONLY approve project-based, freelance, contract, fractional, MVP build, consulting, or B2B agency opportunities!
2. Foreign-Language Specific: Any role requiring non-English languages (e.g., Spanish speaking, German speaking, French speaking, Portuguese speaking).
3. Non-Technical / Sales / Recruiting: Pure sales (SDR/BDR/Account Executive), recruiters, HR coordinators, telemarketing, data entry, virtual assistants, customer support agents with NO coding.
4. Incompatible terms: Unpaid, volunteer, commission-only with 0 base.
5. Non-Software: Hardware, physical engineering, manufacturing, automotive mechanics, medical billing.
${(companyProfile.disqualifiers || []).map((d) => `6. Disqualifier: ${d}`).join('\n')}

### CANDIDATE PROJECTS / JOBS TO EVALUATE:
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
2. Strictly reject any job that violates the disqualification rules (especially full-time employee jobs) or is not a genuine software/AI/automation project/contract need.
3. Select up to a maximum of 20 TOP approved project/freelance/contract leads.
4. Return a valid JSON array of objects for the approved candidates ONLY.

Schema:
[
  {
    "id": 0,
    "approved": true,
    "matchScore": 88,
    "matchReasoning": "1 concise sentence explaining why this project/contract is a high-fit engagement for our AI/full-stack team.",
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
    "Full-time salaried employee roles (W-2 only)",
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

/**
 * Generates hyper-personalized LinkedIn/Social outreach messages for a batch of discovered Founders & Decision Makers
 */
export async function batchGenerateFounderOutreach(founders, companyProfile, apiKey, modelName) {
  if (!founders || founders.length === 0) return [];

  const senderName = companyProfile.senderName || 'Founder';
  const companyName = companyProfile.name || companyProfile.companyName || 'QuminAI';

  const prompt = `
You are an elite B2B Founder-to-Founder Growth Strategist.
We are reaching out directly to startup Founders, CEOs, CTOs, and Technical Decision Makers on LinkedIn and social platforms to offer project/engineering/AI partnership.

### OUR AGENCY / COMPANY PROFILE:
- Name: ${companyName}
- Sender: ${senderName} (${companyProfile.senderTitle || 'Solutions Architect'})
- Value Proposition: ${companyProfile.valueProposition || 'We build production AI agents, workflow automations, and scalable full-stack web products rapidly.'}
- Core Services: ${(companyProfile.targetServices || []).join(', ')}
- Tech Stack: ${(companyProfile.targetKeywords || []).join(', ')}

### DISCOVERED FOUNDERS & DECISION MAKERS:
${founders
  .map(
    (f, i) => `
[FOUNDER ID ${i}]
Name: ${f.name}
Role: ${f.role}
Company: ${f.company}
Platform: ${f.platform}
Signal / Context: ${f.signal || ''}
Bio / Summary: ${(f.bio || '').substring(0, 280)}
`
  )
  .join('\n---\n')}

### TASK:
For each founder, calculate a matchScore (65-99) and write:
1. "matchReasoning": 1 crisp sentence on why their startup/company is a strong fit for our engineering/AI services.
2. "outreachMessage": A natural, high-converting LinkedIn DM (under 95 words). Peer-to-peer founder tone, zero corporate fluff, referencing their company/context and offering a concrete low-friction way to help accelerate their roadmap or AI/product build. Sign off with "${senderName}".
3. "connectionNote": A short LinkedIn Connection Request Note (strictly under 260 characters) in case LinkedIn requires a connection note first.
4. "emailSubject": A crisp email subject line in case we also email them.

Return ONLY a valid JSON array matching this schema:
[
  {
    "id": 0,
    "matchScore": 92,
    "matchReasoning": "String",
    "outreachMessage": "Hi [First Name], ...",
    "connectionNote": "Hi [First Name], ...",
    "emailSubject": "Quick idea for [Company]"
  }
]
`;

  try {
    const rawOutput = await executeGeminiPrompt(apiKey, modelName, prompt);
    const parsed = cleanAndParseJSON(rawOutput);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[Gemini Founder Outreach Batch Error]:', err.message);
    return [];
  }
}

/**
 * Generates or regenerates a personalized LinkedIn/Social outreach message for a single Founder
 */
export async function generateSingleFounderOutreach(founder, companyProfile, customAngle = '', apiKey, modelName) {
  const senderName = companyProfile.senderName || 'Founder';
  const companyName = companyProfile.name || companyProfile.companyName || 'QuminAI';

  const prompt = `
You are an elite B2B Founder-to-Founder Growth Strategist.
Write a hyper-personalized LinkedIn outreach message and connection note for this Founder / Decision Maker.

OUR COMPANY:
- Name: ${companyName}
- Sender: ${senderName} (${companyProfile.senderTitle || 'Solutions Architect'})
- Value Proposition: ${companyProfile.valueProposition || 'Custom AI agents, workflow automations, and full-stack product engineering.'}
- Services: ${(companyProfile.targetServices || []).join(', ')}

TARGET FOUNDER:
- Name: ${founder.name}
- Role: ${founder.role}
- Company: ${founder.company}
- Signal / Trigger: ${founder.signal || ''}
- Bio / Details: ${founder.bio || ''}
${customAngle ? `- Custom Angle / Instruction: ${customAngle}` : ''}

GUIDELINES:
- "outreachMessage": Under 95 words. Conversational, peer-to-peer, specific to ${founder.company || 'their work'}. No "I hope this finds you well". Offer concrete project/engineering/AI velocity. Sign off as ${senderName}.
- "connectionNote": Strictly under 260 characters for LinkedIn's "Add a note" limit.
- "emailSubject": Short, curiosity-driven subject line.

Return ONLY a valid JSON object:
{
  "matchScore": 92,
  "matchReasoning": "1 sentence fit summary",
  "outreachMessage": "Hi ...",
  "connectionNote": "Hi ...",
  "emailSubject": "Quick question re: ${founder.company || 'your roadmap'}"
}
`;

  const rawOutput = await executeGeminiPrompt(apiKey, modelName, prompt);
  return cleanAndParseJSON(rawOutput);
}
