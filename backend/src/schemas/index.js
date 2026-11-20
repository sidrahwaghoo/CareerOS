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
    name: nonEmptyText('personalInfo.name'),
    headline: nonEmptyText('personalInfo.headline'),
    email: z
      .string({ required_error: 'personalInfo.email is required' })
      .trim()
      .email('personalInfo.email must be a valid email address'),
    location: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  })
  .passthrough();

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
    name: nonEmptyText('skill name'),
    level: z.string().optional(),
    years: z.number().optional(),
  })
  .passthrough();

const careerRecordSchema = z
  .object({
    personalInfo: personalInfoSchema,
    experience: z.array(experienceEntrySchema).default([]),
    projects: z.array(projectEntrySchema).default([]),
    education: z.array(educationEntrySchema).default([]),
    skills: z.array(z.union([z.string(), skillEntrySchema])).default([]),
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
  })
  .passthrough();

const reviewRequestSchema = z
  .object({
    draftId: requiredId('draftId'),
    jobDescription: nonEmptyText('jobDescription'),
  })
  .passthrough();

// Approve/reject endpoints do not need a body. The draft id is supplied as a
// route param. Routes currently use `:id`; `:draftId` is also supported.
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
  })
  .passthrough();

// ---------------------------------------------------------------------------
// AI agent output schemas (used by geminiService to validate LLM JSON)
// ---------------------------------------------------------------------------
const matchResultSchema = z.object({
  fitScore: z.coerce.number().min(0).max(100),
  tier: z.enum(['Strong', 'Ready', 'Improve']),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  missingMetrics: z.array(z.string()),
  jdRequiredSkills: z.array(z.string()),
  jdPreferredSkills: z.array(z.string()),
  jdExperienceLevel: z.string(),
  jdResponsibilities: z.array(z.string()).optional(),
  suggestions: z.array(z.string()),
  summary: nonEmptyText('summary'),
});

const draftResultSchema = z.object({
  summary: nonEmptyText('summary'),
  experience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        startDate: z.string(),
        endDate: z.string().nullable(),
        current: z.boolean(),
        achievements: z.array(z.string()),
      })
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  coverLetter: z.string().default(''),
  atsKeywords: z.array(z.string()).default([]),
});

const reviewResultSchema = z.object({
  atsScore: z.coerce.number().min(0).max(100),
  checks: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        passed: z.boolean(),
        suggestion: z.string().nullable().optional(),
      })
    )
    .default([]),
  criticalIssues: z.array(z.string()).default([]),
  summary: nonEmptyText('summary'),
});

const schemas = {
  careerRecordSchema,
  matchRequestSchema,
  draftRequestSchema,
  reviewRequestSchema,
  draftIdParamSchema,
  draftIdNamedParamSchema,
  draftIdBodySchema,
  matchResultSchema,
  draftResultSchema,
  reviewResultSchema,
};

module.exports = {
  ...schemas,
  schemas,
};
