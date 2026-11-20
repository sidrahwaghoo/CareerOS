const { generateContent, generateContentWithTools } = require('../config/gemini');
const {
  matchResultSchema,
  draftResultSchema,
  reviewResultSchema,
  interviewPrepSchema,
  resumeParseSchema,
} = require('../schemas');
const { searchJobsTool } = require('./aiTools');
const { searchJobs } = require('./jobService');

/**
 * Gemini AI Service - World-Class Agentic Career Intelligence
 * Powered by Google Gemini 2.0 Flash.
 *
 * Agents:
 * 1. Match Agent (Agentic Opportunity Radar & Fit Analysis)
 * 2. Draft Agent (Multi-Asset Tailoring Studio: Resume, Cover Letter, LinkedIn pitch)
 * 3. Review Agent (Deep ATS Inspector with 1-Click Actionable STAR Rewrites)
 * 4. Interview Coach Agent (Role-Specific Mock Prep, STAR blueprints & Strategic Qs)
 * 5. Resume Parser Agent (Intelligent structured CV extraction)
 */
class GeminiService {
  /**
   * AGENT 1: MATCH (Agentic)
   * Evaluates Career Record vs Job Description with market discovery tools.
   */
  async match(careerRecord, jobDescription) {
    const tools = [searchJobsTool];
    const executeTool = async (name, args) => {
      if (name === 'search_jobs') {
        return await searchJobs(args.query, { limit: args.limit || 5 });
      }
      throw new Error(`Unknown tool: ${name}`);
    };

    const prompt = `
You are an Elite AI Career Intelligence Match Agent. Compare the candidate's Career Record against the target Job Description.

CRITICAL RULES:
- Ground your analysis strictly in the provided Career Record. Never fabricate experience or skills.
- Use market insights and the search_jobs tool if helpful to contextualize job standards.
- Return ONLY valid JSON conforming to the requested schema.

INPUTS:
Candidate Career Record:
${JSON.stringify(careerRecord, null, 2)}

Target Job Description:
${jobDescription}

REASONING INSTRUCTIONS:
1. Parse the JD into required core skills, secondary/preferred skills, key responsibilities, and seniority level.
2. Cross-reference candidate's experiences, projects, and skills against the JD requirements.
3. Identify strong matches, skill gaps, and missing quantifiable metrics.
4. Calculate an accurate fit score (0-100) and assign Tier ("Strong" for 80+, "Ready" for 60-79, "Improve" for <60).
5. Suggest high-leverage actions to boost candidate alignment.

OUTPUT SCHEMA:
{
  "fitScore": number,
  "tier": "Strong" | "Ready" | "Improve",
  "matchedSkills": string[],
  "missingSkills": string[],
  "missingMetrics": string[],
  "jdRequiredSkills": string[],
  "jdPreferredSkills": string[],
  "jdResponsibilities": string[],
  "jdExperienceLevel": string,
  "suggestions": string[],
  "summary": string,
  "matchedJobs": [{
    "title": string,
    "company": string,
    "location": string,
    "matchReason": string
  }]
}
`;

    let finalText;
    try {
      finalText = await generateContentWithTools(prompt, tools, executeTool);
    } catch (_err) {
      // Fallback: direct generation without external tool loop
      finalText = await generateContent(prompt);
    }

    return this._validatedJSON(finalText, matchResultSchema, 'Match agent');
  }

  /**
   * AGENT 2: DRAFT (Multi-Asset Tailoring Studio)
   * Generates tailored resume content, ATS keywords, cover letter, and LinkedIn summary.
   */
  async draft(careerRecord, matchResult, jobDescription, style = 'modern') {
    const styleDescriptions = {
      modern: 'High-impact, balanced, clean metrics-driven bullet points using modern tech terminology.',
      executive: 'Leadership-focused, strategic vision, team scaling, budget & P&L impact, and organizational transformation.',
      tech: 'Deep architecture, systems scalability, engineering velocity, tech stack mastery, and concrete technical achievements.',
    };

    const prompt = `
You are an Elite AI Career Assets Draft Agent. Generate tailored, ATS-optimized resume content, a targeted Cover Letter, and a compelling LinkedIn headline/summary based on the candidate's verified Career Record and target JD.

SELECTED STYLE: ${style.toUpperCase()} (${styleDescriptions[style] || styleDescriptions.modern})

CRITICAL RULES:
- ONLY use real accomplishments and details from the Career Record. NEVER invent companies, dates, or achievements.
- Rewrite achievement bullets using strong action verbs and quantified impact (XYZ / STAR format: "Accomplished [X] by doing [Y], resulting in [Z]").
- Weave high-priority ATS keywords naturally into the experience bullets and summary.
- Return ONLY valid JSON.

INPUTS:
Career Record:
${JSON.stringify(careerRecord, null, 2)}

Match Analysis:
${JSON.stringify(matchResult, null, 2)}

Target Job Description:
${jobDescription}

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
  "linkedInSummary": string,
  "atsKeywords": string[]
}
`;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, draftResultSchema, 'Draft agent');
  }

  /**
   * AGENT 3: REVIEW (Deep ATS Inspector & 1-Click Optimizer)
   * Evaluates ATS compatibility and provides actionable STAR rewrites for weak bullets.
   */
  async review(draftContent, jobDescription, careerRecord) {
    const prompt = `
You are an Elite AI ATS Reviewer & Career Quality Auditor. Evaluate the tailored resume draft against the target Job Description across standard industry ATS filters and hiring manager criteria.

EVALUATION CHECKS TO RUN:
1. "Standard ATS Section Headings" (Are Summary, Experience, Education, Skills clearly demarcated?)
2. "Quantifiable Impact & Metrics" (Do at least 70% of bullets feature numbers, %, $, or scale?)
3. "Action Verb Strength" (Eliminate weak passive verbs like "assisted", "worked on", "helped" with power verbs)
4. "Target ATS Keyword Alignment" (Coverage of core skills & terms from JD)
5. "Bullet Point Length & Readability" (Each bullet ideally 1-2 lines, 15-30 words, concise)
6. "Contact & Professional Identity" (Full name, email, phone, location/links included)
7. "Chronological Consistency & Role Hierarchy"
8. "Avoidance of Cliché Buzzwords" (flags "synergistic", "ninja", "rockstar", etc.)

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
  "actionableRewrites": [{
    "original": string,
    "improved": string,
    "reason": string
  }],
  "summary": string
}

INPUTS:
Resume Draft Content:
${JSON.stringify(draftContent, null, 2)}

Job Description:
${jobDescription}

Original Career Record:
${JSON.stringify(careerRecord, null, 2)}

Return ONLY valid JSON.
`;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, reviewResultSchema, 'Review agent');
  }

  /**
   * AGENT 4: INTERVIEW INTELLIGENCE COACH (NEW)
   * Generates tailored technical, behavioral (STAR), and strategic questions with coaching notes.
   */
  async interviewPrep(careerRecord, matchResult, jobDescription) {
    const prompt = `
You are an Elite Executive Career Coach & Technical Hiring Manager. Prepare the candidate for interviews based on their specific Career Record and the target Job Description.

GOAL:
Help the candidate anticipate the hardest technical and behavioral questions, address identified skill gaps proactively, and ask memorable questions that demonstrate high agency.

INPUTS:
Candidate Record:
${JSON.stringify(careerRecord, null, 2)}

Match Analysis (Gaps & Fit):
${JSON.stringify(matchResult, null, 2)}

Job Description:
${jobDescription}

OUTPUT SCHEMA:
{
  "targetRole": string,
  "matchOverview": string,
  "technicalQuestions": [{
    "question": string,
    "context": string,
    "talkingPoints": string[],
    "redFlags": string
  }],
  "behavioralQuestions": [{
    "question": string,
    "competency": string,
    "starFramework": {
      "situation": string,
      "task": string,
      "action": string,
      "result": string
    }
  }],
  "questionsToAskInterviewer": string[],
  "keyPitfalls": string[]
}

Return ONLY valid JSON.
`;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, interviewPrepSchema, 'Interview coach agent');
  }

  /**
   * AGENT 5: RESUME PARSER AGENT (NEW)
   * Intelligent LLM-powered extraction from parsed resume document text.
   */
  async parseResume(rawText) {
    const prompt = `
You are an Expert Resume Parsing AI. Extract structured Career Record data from the raw resume text provided.

RULES:
- Extract full name, professional headline, email, phone, location, linkedin.
- Extract all work experience entries: company, role, startDate (YYYY-MM or YYYY), endDate (or null if current), current (boolean), and list of achievements.
- Extract education entries: degree, institution, startDate, endDate, honors.
- Extract comprehensive list of real technical and professional skills mentioned in the resume.
- Clean up any scanning artifacts, formatting noise, or line break glitches.
- Return ONLY valid JSON conforming to the schema.

RESUME RAW TEXT:
${rawText}

OUTPUT SCHEMA:
{
  "name": string,
  "headline": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedin": string,
  "summary": string,
  "experience": [{
    "company": string,
    "role": string,
    "startDate": string,
    "endDate": string | null,
    "current": boolean,
    "achievements": string[],
    "skillsUsed": string[]
  }],
  "education": [{
    "degree": string,
    "institution": string,
    "startDate": string,
    "endDate": string | null,
    "honors": string
  }],
  "skills": string[]
}
`;

    const text = await generateContent(prompt);
    return this._validatedJSON(text, resumeParseSchema, 'Resume parse agent');
  }

  /**
   * AGENT 6: CAREER DNA & OPPORTUNITY SYNTHESIZER
   * Synthesizes the verified Career Notebook into an executive archetype,
   * market salary benchmarks, superpowers, and target opportunities.
   */
  async analyzeCareerDNA(careerRecord) {
    const prompt = `
You are an Elite Executive Talent Strategist and Career Intelligence Agent for Credensa, powered by Google Gemini.
Analyze the candidate's Career Record below. Synthesize their unique market identity, competitive edge, and career opportunities.

CAREER RECORD:
${JSON.stringify(careerRecord, null, 2)}

INSTRUCTIONS:
1. Determine their exact Market Archetype (e.g. "Staff Distributed Systems Engineer & Scalability Architect").
2. Write a compelling 2-sentence Executive Summary bio highlighting their unique value proposition.
3. Extract 3-4 "Superpowers" — concrete, differentiated strengths with direct evidence from their recorded metrics.
4. Provide a realistic Market Compensation Band based on their years of experience and tech stack (e.g. "$160k – $215k / yr").
5. Identify 3 Target High-Growth Roles or sectors where their skills command the highest premium.
6. Provide 2-3 High-Leverage Strategic Next Steps to elevate their career trajectory.
7. Generate a 30-second networking elevator pitch they can use with recruiters or founders.

OUTPUT SCHEMA:
Respond with pure JSON conforming to:
{
  "archetype": string,
  "summaryBio": string,
  "superpowers": [{ "title": string, "evidence": string }],
  "marketSalaryEstimate": string,
  "topOpportunities": [{ "role": string, "whyFit": string }],
  "strategicNextSteps": string[],
  "elevatorPitch": string
}
`;

    const text = await generateContent(prompt);
    return this._parseJSON(text);
  }

  /**
   * Parse JSON (tolerant of markdown fences) and validate it against a schema.
   */
  _validatedJSON(text, schema, agentName) {
    const parsed = this._parseJSON(text);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
      console.warn(`${agentName} schema warning: ${details}. Preserving parsed output.`);
      // Return parsed data if structural shape matches reasonably
      return parsed;
    }
    return result.data;
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
