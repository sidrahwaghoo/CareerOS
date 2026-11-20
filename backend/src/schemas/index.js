const { z } = require('zod');

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------
const requiredId = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

const nonEmptyText = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

// An achievement/outcome may be a plain string or { text, metric }.
const achievementSchema = z
  .object({
    text: z.string(),
    metric: z.string().nullable().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Career record
// ---------------------------------------------------------------------------
const personalInfoSchema = z
  .object({
    name: z.string().optional().default('Candidate'),
    headline: z.string().optional().default('Professional'),
    email: z.string().optional().default(''),
    location: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    linkedin: z.string().optional().default(''),
    portfolio: z.string().optional().default(''),
  })
  .passthrough()
  .default({ name: 'Candidate', headline: 'Professional', email: '' });

const experienceEntrySchema = z
  .object({
    id: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    current: z.boolean().optional(),
    achievements: z.array(z.union([z.string(), achievementSchema])).optional(),
    skillsUsed: z.array(z.string()).optional(),
  })
  .passthrough();

const projectEntrySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    role: z.string().optional(),
    techStack: z.array(z.string()).optional(),
    outcomes: z.array(z.union([z.string(), achievementSchema])).optional(),
    link: z.string().nullable().optional(),
  })
  .passthrough();

const educationEntrySchema = z
  .object({
    id: z.string().optional(),
    degree: z.string().optional(),
    institution: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    honors: z.string().optional(),
  })
  .passthrough();

const skillEntrySchema = z
  .object({
    name: z.string().optional().default('Skill'),
    level: z.string().optional(),
    years: z.number().optional(),
  })
  .passthrough();

const careerRecordSchema = z
  .object({
    personalInfo: personalInfoSchema.optional().default({ name: 'Candidate', headline: 'Professional', email: '' }),
    experience: z.array(experienceEntrySchema).default([]),
    projects: z.array(projectEntrySchema).default([]),
    education: z.array(educationEntrySchema).default([]),
    skills: z.array(z.union([z.string(), skillEntrySchema])).default([]),
    certifications: z.array(z.any()).optional().default([]),
    volunteering: z.array(z.any()).optional().default([]),
    achievements: z.array(z.any()).optional().default([]),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Agent request bodies
// ---------------------------------------------------------------------------
const matchRequestSchema = z
  .object({
    recordId: requiredId('recordId'),
    jobDescription: z
      .string({ required_error: 'jobDescription is required' })
      .trim()
      .min(10, 'jobDescription must be at least 10 characters'),
  })
  .passthrough();

const draftRequestSchema = z
  .object({
    recordId: requiredId('recordId'),
    matchId: requiredId('matchId'),
    jobDescription: nonEmptyText('jobDescription'),
    style: z.enum(['modern', 'executive', 'tech']).optional().default('modern'),
  })
  .passthrough();

const reviewRequestSchema = z
  .object({
    draftId: requiredId('draftId'),
    jobDescription: nonEmptyText('jobDescription'),
  })
  .passthrough();

const interviewRequestSchema = z
  .object({
    recordId: requiredId('recordId'),
    matchId: requiredId('matchId'),
    jobDescription: nonEmptyText('jobDescription'),
  })
  .passthrough();

// Approve/reject endpoints
const draftIdParamSchema = z.object({
  id: requiredId('Draft id'),
});

const draftIdNamedParamSchema = z.object({
  draftId: requiredId('draftId'),
});

// Export approve/pdf endpoints carry the draft id in the JSON body.
const draftIdBodySchema = z
  .object({
    draftId: requiredId('draftId'),
    template: z.enum(['modern', 'executive', 'tech']).optional().default('modern'),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// AI agent output schemas (used by geminiService to validate LLM JSON)
// ---------------------------------------------------------------------------
const matchResultSchema = z.object({
  fitScore: z.coerce.number().min(0).max(100),
  tier: z.enum(['Strong', 'Ready', 'Improve']),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  missingMetrics: z.array(z.string()).default([]),
  jdRequiredSkills: z.array(z.string()).default([]),
  jdPreferredSkills: z.array(z.string()).default([]),
  jdExperienceLevel: z.string().default('Mid-level'),
  jdResponsibilities: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  summary: nonEmptyText('summary'),
  matchedJobs: z.array(z.any()).optional().default([]),
}).passthrough();

const draftResultSchema = z.object({
  summary: nonEmptyText('summary'),
  experience: z
    .array(
      z.object({
        company: z.string().default(''),
        role: z.string().default(''),
        startDate: z.string().default(''),
        endDate: z.string().nullable().default(null),
        current: z.boolean().default(false),
        achievements: z.array(z.string()).default([]),
      }).passthrough()
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  coverLetter: z.string().default(''),
  linkedInSummary: z.string().optional().default(''),
  atsKeywords: z.array(z.string()).default([]),
}).passthrough();

const reviewResultSchema = z.object({
  atsScore: z.coerce.number().min(0).max(100),
  checks: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        passed: z.boolean(),
        suggestion: z.string().nullable().optional(),
      }).passthrough()
    )
    .default([]),
  criticalIssues: z.array(z.string()).default([]),
  actionableRewrites: z.array(z.object({
    original: z.string(),
    improved: z.string(),
    reason: z.string(),
  })).optional().default([]),
  summary: nonEmptyText('summary'),
}).passthrough();

const interviewPrepSchema = z.object({
  targetRole: z.string().default('Target Role'),
  matchOverview: z.string().default(''),
  technicalQuestions: z.array(z.object({
    question: z.string(),
    context: z.string(),
    talkingPoints: z.array(z.string()),
    redFlags: z.string().optional(),
  })).default([]),
  behavioralQuestions: z.array(z.object({
    question: z.string(),
    competency: z.string(),
    starFramework: z.object({
      situation: z.string(),
      task: z.string(),
      action: z.string(),
      result: z.string(),
    }),
  })).default([]),
  questionsToAskInterviewer: z.array(z.string()).default([]),
  keyPitfalls: z.array(z.string()).default([]),
}).passthrough();

const resumeParseSchema = z.object({
  name: z.string().default(''),
  headline: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  linkedin: z.string().default(''),
  summary: z.string().default(''),
  experience: z.array(z.object({
    company: z.string().default(''),
    role: z.string().default(''),
    startDate: z.string().default(''),
    endDate: z.string().nullable().default(null),
    current: z.boolean().default(false),
    achievements: z.array(z.string()).default([]),
    skillsUsed: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    degree: z.string().default(''),
    institution: z.string().default(''),
    startDate: z.string().default(''),
    endDate: z.string().nullable().default(null),
    honors: z.string().default(''),
  })).default([]),
  skills: z.array(z.string()).default([]),
}).passthrough();

const schemas = {
  careerRecordSchema,
  matchRequestSchema,
  draftRequestSchema,
  reviewRequestSchema,
  interviewRequestSchema,
  draftIdParamSchema,
  draftIdNamedParamSchema,
  draftIdBodySchema,
  matchResultSchema,
  draftResultSchema,
  reviewResultSchema,
  interviewPrepSchema,
  resumeParseSchema,
};

module.exports = {
  ...schemas,
  schemas,
};
