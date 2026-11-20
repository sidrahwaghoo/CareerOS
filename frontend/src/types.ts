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

export interface CareerRecord {
  id?: string;
  userId?: string;
  version?: number;
  personalInfo: PersonalInfo;
  experience: Experience[];
  projects: Project[];
  education: Education[];
  skills: Skill[];
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
}

export interface ResumeDraft {
  id?: string;
  recordId: string;
  recordVersion: number;
  matchId: string;
  status: 'draft' | 'approved' | 'rejected' | 'edited';
  content: {
    summary: string;
    experience: any[];
    skills: string[];
    coverLetter: string;
    atsKeywords: string[];
  };
  reviewResult?: {
    atsScore: number;
    checks: { id: string; name: string; passed: boolean; suggestion: string | null }[];
    criticalIssues: string[];
    summary: string;
  };
  approvedAt?: string;
  createdAt?: string;
}
