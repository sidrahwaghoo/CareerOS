export interface PersonalInfo {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
}

export interface Achievement {
  text: string;
  metric: string | null;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  achievements: Achievement[];
  skillsUsed: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  techStack: string[];
  outcomes: Achievement[];
  link: string | null;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string | null;
  honors: string;
}

export interface Skill {
  name: string;
  level: string;
  years: number;
}

export interface Certification {
  id?: string;
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface Volunteering {
  id?: string;
  role: string;
  organization: string;
  description?: string;
  date?: string;
}

export interface CareerAchievement {
  id?: string;
  title: string;
  issuer?: string;
  description?: string;
  metric?: string;
}

export interface CareerDNA {
  archetype: string;
  summaryBio: string;
  superpowers: { title: string; evidence: string }[];
  marketSalaryEstimate: string;
  topOpportunities: { role: string; whyFit: string }[];
  strategicNextSteps: string[];
  elevatorPitch: string;
}

export interface CareerRecord {
  id?: string;
  userId?: string;
  version?: number;
  personalInfo: PersonalInfo;
  experience: Experience[];
  projects: Project[];
  education: Education[];
  skills: Skill[];
  certifications?: Certification[];
  volunteering?: Volunteering[];
  achievements?: CareerAchievement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchedJob {
  title: string;
  company: string;
  location: string;
  matchReason: string;
}

export interface MatchResult {
  id?: string;
  recordId: string;
  recordVersion: number;
  jdText: string;
  jdParsed: {
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
    experienceLevel: string;
  };
  fitScore: number;
  tier: 'Strong' | 'Ready' | 'Improve';
  matchedSkills: string[];
  missingSkills: string[];
  missingMetrics: string[];
  suggestions: string[];
  summary: string;
  matchedJobs?: MatchedJob[];
  createdAt?: string;
}

export interface ActionableRewrite {
  original: string;
  improved: string;
  reason: string;
}

export interface ReviewCheck {
  id: string;
  name: string;
  passed: boolean;
  suggestion: string | null;
}

export interface ReviewResult {
  atsScore: number;
  checks: ReviewCheck[];
  criticalIssues: string[];
  actionableRewrites?: ActionableRewrite[];
  summary: string;
}

export interface ResumeDraft {
  id?: string;
  recordId: string;
  recordVersion: number;
  matchId: string;
  status: 'draft' | 'approved' | 'rejected' | 'edited';
  style?: 'modern' | 'executive' | 'tech';
  content: {
    summary: string;
    experience: any[];
    skills: string[];
    coverLetter: string;
    linkedInSummary?: string;
    atsKeywords: string[];
  };
  reviewResult?: ReviewResult;
  approvedAt?: string;
  createdAt?: string;
}

export interface TechnicalQuestion {
  question: string;
  context: string;
  talkingPoints: string[];
  redFlags?: string;
}

export interface BehavioralQuestion {
  question: string;
  competency: string;
  starFramework: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export interface InterviewPrepSession {
  id?: string;
  recordId: string;
  matchId: string;
  targetRole: string;
  matchOverview: string;
  technicalQuestions: TechnicalQuestion[];
  behavioralQuestions: BehavioralQuestion[];
  questionsToAskInterviewer: string[];
  keyPitfalls: string[];
  createdAt?: string;
}

export interface SaaSTierConfig {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  matchLimit: number;
  draftLimit: number;
  exportLimit: number;
  interviewCoach: boolean;
  deepAtsOptimizer: boolean;
  multiTemplates: boolean;
}

export interface UserUsage {
  matches: number;
  drafts: number;
  reviews: number;
  exports: number;
  interviews: number;
  resumesParsed: number;
}

export interface UserProfile {
  userId: string;
  email?: string;
  tier: 'free' | 'pro' | 'enterprise';
  usage: UserUsage;
  tierConfig: SaaSTierConfig;
}

export type ResumeTemplateType = 'modern' | 'executive' | 'tech';
