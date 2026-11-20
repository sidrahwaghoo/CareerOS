const { generateContent } = require('../config/gemini');

/**
 * Copilot Service — Conversational Agentic Career Intelligence
 * Powered by Google Gemini 2.0 Flash.
 *
 * Allows candidates to converse naturally with their career intelligence agent:
 * - Asking for career coaching, strategy, or salary positioning
 * - Directing the agent to rewrite bullets, summarize impact, or add skills
 * - Generating cold outreach emails / LinkedIn connection notes
 * - Running on-the-fly mock interview question & answer critiques
 * - Explaining ATS scores and diagnosing gap-closure roadmaps
 */
class CopilotService {
  async chat(messages, careerRecord, context = {}) {
    const historyText = messages
      .map((m) => `${m.role === 'user' ? 'Candidate' : 'Credensa AI'}: ${m.content}`)
      .join('\n\n');

    const prompt = `
You are the Credensa AI Career Copilot — an elite, high-agency autonomous Career Intelligence Agent, powered by Google Gemini.
You treat the candidate's career as an evolving, verified asset. You never hallucinate false credentials; you only sharpen, quantify, and strategically position real accomplishments.

CANDIDATE'S ACTIVE CAREER RECORD:
${careerRecord ? JSON.stringify(careerRecord, null, 2) : 'No career record loaded yet.'}

ADDITIONAL CONTEXT (Job Description, Draft or Review state if present):
${JSON.stringify(context, null, 2)}

CONVERSATION HISTORY:
${historyText}

INSTRUCTIONS:
1. Act as a world-class executive career strategist, technical recruiter, and negotiation coach.
2. If the candidate asks you to rewrite a bullet, use the STAR/XYZ format ("Accomplished [X] by doing [Y], resulting in [Z]") with strong action verbs.
3. If they ask about interview preparation, ask tough, authentic questions and provide constructive feedback with talking points.
4. If they ask for cold outreach (LinkedIn or email), keep it high-agency, punchy, and under 120 words.
5. If they want to update their record (e.g. add a skill or a bullet), provide the exact text and return an action block so the UI can apply it.
6. Format your response cleanly in Github-flavored markdown. Use bullet points and bold highlights for readability.
7. Keep responses concise, direct, and actionable. Avoid generic motivational fluff.

OUTPUT FORMAT:
Respond with pure JSON conforming to this schema:
{
  "reply": "Your markdown formatted message to the candidate",
  "suggestedActions": ["Short clickable follow-up prompt 1", "Short prompt 2", "Short prompt 3"],
  "recordPatch": null | {
    "section": "skills" | "experience" | "summary" | "personalInfo",
    "data": any
  }
}

Return ONLY valid JSON.
`;

    const text = await generateContent(prompt);
    return this._parseJSON(text);
  }

  _parseJSON(text) {
    if (typeof text !== 'string') {
      return {
        reply: 'I am here to help you sharpen your career record, tailor resumes, and prepare for interviews. What would you like to work on?',
        suggestedActions: ['Audit my resume bullets for metrics', 'Tailor my record for a job', 'Practice interview questions'],
        recordPatch: null,
      };
    }

    const candidates = [];
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) candidates.push(fenced[1]);
    candidates.push(text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/gi, '').trim());
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) candidates.push(objectMatch[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed.reply === 'string') {
          return parsed;
        }
      } catch (_err) {
        // Continue to next candidate
      }
    }

    // Fallback if model returned plain prose instead of JSON
    return {
      reply: text.replace(/```(?:json)?/gi, '').replace(/```/gi, '').trim(),
      suggestedActions: ['Rewrite this with stronger metrics', 'Run an ATS check', 'Prep for an interview'],
      recordPatch: null,
    };
  }
}

module.exports = { CopilotService };
