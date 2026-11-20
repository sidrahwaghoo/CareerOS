const { generateContent } = require('../config/gemini');
const {
  matchResultSchema,
  draftResultSchema,
  reviewResultSchema,
} = require('../schemas');

/**
 * Gemini AI Service - Agentic Career Intelligence
 * Three agents: Match, Draft, Review.
 * All agents call the live model and validate its JSON output; invalid or
 * empty responses throw an error. No fabricated responses are produced.
 */
class GeminiService {
  /**
   * AGENT 1: MATCH
   * Compare Career Record vs Job Description.
   */
  async match(careerRecord, jobDescription) {
    const prompt = `
You are an AI Career Match Agent. Compare a user's Career Record against a Job Description.

CRITICAL RULES:
- Only use information from the provided Career Record. Never fabricate.
- Return ONLY valid JSON. No markdown, no explanations.

INPUTS:
Career Record: ${JSON.stringify(careerRecord, null, 2)}
Job Description: ${jobDescription}

Think step by step: 1) extract key information from the JD, 2) compare against the record,
3) score and rank the fit, 4) produce the final JSON.

OUTPUT SCHEMA:
{
  "fitScore": number (0-100),
  "tier": "Strong" | "Ready" | "Improve",
  "matchedSkills": string[],
  "missingSkills": string[],
  "missingMetrics": string[],
  "jdRequiredSkills": string[],
  "jdPreferredSkills": string[],
  "jdResponsibilities": string[],
  "jdExperienceLevel": string,
  "suggestions": string[],
  "summary": string
}

Return only the JSON.
    `;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, matchResultSchema, 'Match agent');
  }

  /**
   * AGENT 2: DRAFT
   * Generate tailored, ATS-ready resume content.
   */
  async draft(careerRecord, matchResult, jobDescription) {
    const prompt = `
You are an AI Resume Draft Agent. Generate tailored resume content from a Career Record
and a matched Job Description.

CRITICAL RULES:
- Only use information from the Career Record. Never fabricate experience or skills.
- Return ONLY valid JSON.

INPUTS:
Career Record: ${JSON.stringify(careerRecord, null, 2)}
Match Result: ${JSON.stringify(matchResult, null, 2)}
Job Description: ${jobDescription}

Think step by step: 1) extract key information, 2) map it to the JD requirements,
3) prioritise relevant achievements, 4) produce the final JSON.

OUTPUT SCHEMA:
{
  "summary": string,
  "experience": [{
    "company": string,
    "role": string,
    "startDate": string,
    "endDate": string | null,
    "current": boolean,
    "achievements": string[]
  }],
  "skills": string[],
  "coverLetter": string,
  "atsKeywords": string[]
}

Return only the JSON.
    `;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, draftResultSchema, 'Draft agent');
  }

  /**
   * AGENT 3: REVIEW
   * Review a draft for ATS compatibility.
   */
  async review(draftContent, jobDescription, careerRecord) {
    const prompt = `
You are an AI Resume Review Agent. Check a resume draft for ATS compatibility.

CRITICAL RULES:
- Return ONLY valid JSON.

INPUTS:
Draft Content: ${JSON.stringify(draftContent, null, 2)}
Job Description: ${jobDescription}
Career Record: ${JSON.stringify(careerRecord, null, 2)}

Think step by step: 1) extract key information, 2) check ATS signals against the JD,
3) score each check, 4) produce the final JSON.

OUTPUT SCHEMA:
{
  "atsScore": number (0-100),
  "checks": [{
    "id": string,
    "name": string,
    "passed": boolean,
    "suggestion": string | null
  }],
  "criticalIssues": string[],
  "summary": string
}

Return only the JSON.
    `;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, reviewResultSchema, 'Review agent');
  }

  /**
   * Parse JSON (tolerant of markdown fences) and validate it against a schema.
   * Returns the original parsed object so that any additional fields the model
   * included are preserved; validation itself never fabricates data.
   */
  _validatedJSON(text, schema, agentName) {
    const parsed = this._parseJSON(text);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
      throw new Error(`${agentName} returned invalid JSON: ${details}`);
    }
    return parsed;
  }

  _parseJSON(text) {
    if (typeof text !== 'string') {
      throw new Error('Failed to parse Gemini response: response was not text.');
    }

    const candidates = [];
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) candidates.push(fenced[1]);
    candidates.push(
      text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/gi, '').trim()
    );
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) candidates.push(objectMatch[0]);

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (_err) {
        // Try the next candidate.
      }
    }

    throw new Error(
      'Failed to parse Gemini response as JSON. The model did not return valid JSON.'
    );
  }
}

module.exports = { GeminiService };
