/**
 * Tool definitions for Google Gemini function calling.
 * These define the tools the AI agent can invoke during reasoning.
 * Each tool has a name, description, and input schema.
 */

/**
 * Search for jobs matching a query.
 * Returns job listings with title, company, location, description, skills, etc.
 */
const searchJobsTool = {
  name: 'search_jobs',
  description:
    'Search for job listings matching a query. Use this when the user wants to find relevant job opportunities based on skills, job title, or industry. Returns a list of matching jobs with details like company, location, required skills, and salary.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Search query describing the job. Include job title, skills, industry, or location. Example: "React developer remote" or "data engineer python sql"',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of job results to return (default: 5, max: 10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['query'],
  },
};

/**
 * Check ATS compatibility of resume text against a job description.
 * Returns an ATS score and checklist of issues.
 */
const checkATSScoreTool = {
  name: 'check_ats_score',
  description:
    'Analyze resume text against a job description to calculate ATS compatibility score and identify missing keywords or issues. Use this when the user wants to know how well their resume matches a specific job.',
  parameters: {
    type: 'object',
    properties: {
      resumeText: {
        type: 'string',
        description: 'The full text content of the resume to analyze',
      },
      jobDescription: {
        type: 'string',
        description: 'The job description text to compare against',
      },
    },
    required: ['resumeText', 'jobDescription'],
  },
};

const allTools = [searchJobsTool, checkATSScoreTool];

module.exports = {
  allTools,
  searchJobsTool,
  checkATSScoreTool,
};
