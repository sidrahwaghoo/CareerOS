import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Folder, Search, Plus, User, ShieldCheck, Rocket,
  Briefcase, GraduationCap, Target, Award, TrendingUp, Menu, ChevronRight,
  Import, Settings, LogOut, X, FileText, Sparkles, Loader2, Upload, Zap, CheckCircle2, FileCheck
} from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import { careerRecordAPI, userAPI, resumeAPI } from './api';
import type { CareerRecord, UserProfile } from './types';
import RecordEditor from './components/RecordEditor';
import AICopilot from './components/AICopilot';
import CareerDNAHub from './components/CareerDNAHub';
import QuickEntryModal from './components/QuickEntryModal';

type IconType = React.ComponentType<{ className?: string }>;

const CATEGORIES: { id: string; name: string; icon: IconType }[] = [
  { id: 'experience', name: 'Experience', icon: Briefcase },
  { id: 'education', name: 'Education', icon: GraduationCap },
  { id: 'projects', name: 'Projects', icon: Rocket },
  { id: 'skills', name: 'Skills', icon: Target },
  { id: 'certifications', name: 'Certifications', icon: Award },
  { id: 'volunteering', name: 'Volunteering', icon: ShieldCheck },
  { id: 'internships', name: 'Internships', icon: TrendingUp },
  { id: 'achievements', name: 'Achievements', icon: Target },
];

interface Entry {
  id: string;
  title: string;
  category: string;
  description: string;
  recordId: string;
  icon: IconType;
}

function recordsToEntries(records: CareerRecord[]): Entry[] {
  const entries: Entry[] = [];
  for (const r of records) {
    (r.experience || []).forEach((e, i) => entries.push({
      id: `${r.id}-exp-${i}`, title: e.role || 'Experience', category: 'experience',
      description: e.achievements?.map((a) => (typeof a === 'string' ? a : a.text)).filter(Boolean).join('  ·  ') || `${e.company || ''} ${e.startDate || ''}`,
      recordId: r.id!, icon: Briefcase,
    }));
    (r.projects || []).forEach((p, i) => entries.push({
      id: `${r.id}-proj-${i}`, title: p.name || 'Project', category: 'projects',
      description: p.description || (p.techStack || []).join(', '),
      recordId: r.id!, icon: Rocket,
    }));
    (r.education || []).forEach((ed, i) => entries.push({
      id: `${r.id}-edu-${i}`, title: ed.degree || 'Education', category: 'education',
      description: `${ed.institution || ''} ${ed.startDate || ''} ${ed.honors || ''}`.trim(),
      recordId: r.id!, icon: GraduationCap,
    }));
    (r.skills || []).forEach((s, i) => entries.push({
      id: `${r.id}-skill-${i}`, title: typeof s === 'string' ? s : s.name, category: 'skills',
      description: typeof s === 'string' ? 'Skill' : `${s.level || ''} · ${s.years || 0} years`.trim(),
      recordId: r.id!, icon: Target,
    }));
    (r.certifications || []).forEach((c, i) => entries.push({
      id: `${r.id}-cert-${i}`, title: c.name || 'Certification', category: 'certifications',
      description: `${c.issuer || ''} ${c.date || ''}`.trim(),
      recordId: r.id!, icon: Award,
    }));
    (r.volunteering || []).forEach((v, i) => entries.push({
      id: `${r.id}-vol-${i}`, title: v.role || 'Volunteering', category: 'volunteering',
      description: `${v.organization || ''} ${v.description || ''}`.trim(),
      recordId: r.id!, icon: ShieldCheck,
    }));
    (r.achievements || []).forEach((a, i) => entries.push({
      id: `${r.id}-ach-${i}`, title: a.title || 'Achievement', category: 'achievements',
      description: `${a.issuer || ''} · ${a.metric || a.description || ''}`.trim(),
      recordId: r.id!, icon: Target,
    }));
  }
  return entries;
}

function safeUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

function getSampleRecord(name: string, email: string): Omit<CareerRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'> {
  return {
    personalInfo: {
      name: name || 'Sidrah Waghoo',
      headline: 'Tech Lead & Senior Full-Stack Cloud Architect',
      location: 'San Francisco, CA',
      email: email || 'sidrahwaghoo786@gmail.com',
      phone: '+1 (555) 234-5678',
      linkedin: 'https://linkedin.com/in/sidrahwaghoo',
      portfolio: 'https://sidrah.dev',
    },
    experience: [
      {
        id: safeUUID(),
        company: 'NexaTech Systems',
        role: 'Tech Lead & Senior Distributed Systems Engineer',
        startDate: '2022-03-01',
        endDate: null,
        current: true,
        achievements: [
          { text: 'Architected high-throughput event processing platform processing 1.4B events/day', metric: '45% p99 latency reduction & $110k/yr AWS savings' },
          { text: 'Directed engineering team of 9 across backend services, establishing zero-downtime CI/CD pipelines', metric: 'Reduced release cycle from 14 days to daily deployments' },
          { text: 'Authored multi-region database failover protocol with PostgreSQL and Redis cluster', metric: 'Achieved 99.995% service availability' },
        ],
        skillsUsed: ['Go', 'TypeScript', 'Node.js', 'Kubernetes', 'AWS', 'PostgreSQL', 'Kafka'],
      },
      {
        id: safeUUID(),
        company: 'CloudScale Infrastructure',
        role: 'Full-Stack Software Engineer',
        startDate: '2019-06-01',
        endDate: '2022-02-28',
        current: false,
        achievements: [
          { text: 'Built user-facing analytics engine and real-time observability dashboards in React and Node', metric: 'Adopted by 350,000 active enterprise users' },
          { text: 'Optimized complex SQL and GraphQL aggregation queries', metric: '60% database CPU load reduction' },
        ],
        skillsUsed: ['React', 'Node.js', 'PostgreSQL', 'GraphQL', 'Docker'],
      },
    ],
    projects: [
      {
        id: safeUUID(),
        name: 'Credensa AI Career Intelligence Engine',
        description: 'Multi-agent autonomous career intelligence platform using Google Gemini 2.0 Flash to diagnose ATS gaps and generate STAR resumes.',
        role: 'Lead Architect',
        techStack: ['React 19', 'TypeScript', 'Node.js', 'Gemini 2.0 Flash', 'Tailwind CSS'],
        outcomes: [
          { text: 'Implemented real-time STAR metric quantification and ATS compliance evaluator', metric: 'Over 94% average ATS pass rate across test corpora' },
        ],
        link: 'https://github.com/credensa/career-intelligence',
      },
      {
        id: safeUUID(),
        name: 'Distributed KV Storage Engine',
        description: 'In-memory persistent key-value store in Go implementing Raft consensus for leader election and log replication.',
        role: 'Creator & Maintainer',
        techStack: ['Go', 'Raft Consensus', 'gRPC', 'Protobuf'],
        outcomes: [
          { text: 'Benchmarked at 180,000 write ops/sec under concurrent stress test', metric: '180k ops/sec throughput' },
        ],
        link: 'https://github.com/sidrah/raft-kv',
      },
    ],
    education: [
      {
        id: safeUUID(),
        degree: 'B.S. in Computer Science & Engineering',
        institution: 'University of Engineering & Technology',
        startDate: '2015-08-01',
        endDate: '2019-05-31',
        honors: 'Summa Cum Laude, Dean’s Honors List (Top 2%)',
      },
    ],
    skills: [
      { name: 'TypeScript / JavaScript', level: 'Expert', years: 6 },
      { name: 'Node.js & Express', level: 'Expert', years: 6 },
      { name: 'Go (Golang)', level: 'Advanced', years: 4 },
      { name: 'React 19 & Next.js', level: 'Expert', years: 6 },
      { name: 'Kubernetes & Docker', level: 'Advanced', years: 4 },
      { name: 'AWS Cloud Architecture', level: 'Advanced', years: 5 },
      { name: 'PostgreSQL & Redis', level: 'Expert', years: 6 },
      { name: 'System Design & Distributed Systems', level: 'Expert', years: 5 },
    ],
    certifications: [
      {
        id: safeUUID(),
        name: 'AWS Certified Solutions Architect – Professional',
        issuer: 'Amazon Web Services',
        date: '2023',
        url: 'https://aws.amazon.com/certification',
      },
      {
        id: safeUUID(),
        name: 'Certified Kubernetes Administrator (CKA)',
        issuer: 'Cloud Native Computing Foundation (CNCF)',
        date: '2022',
        url: 'https://cncf.io',
      },
    ],
    achievements: [
      {
        id: safeUUID(),
        title: 'Grand Prize Winner – Global Cloud & AI Hackathon',
        issuer: 'TechCrunch Disrupt',
        description: 'Recognized for creating an autonomous disaster response coordination system.',
        metric: 'Selected 1st out of 420 international engineering teams',
      },
    ],
  };
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Google's brand mark — used only for the single real sign-in button. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Flat document mark — OLED titanium obsidian glyph. */
function Mark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`${className} rounded-xl bg-black border border-white/15 flex items-center justify-center shadow-inner hover:border-white/40 transition-all duration-200 group cursor-pointer`}>
      <FileText className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-200" strokeWidth={1.75} />
    </div>
  );
}

function SignInScreen() {
  const { signIn, signInAsDemo } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signIn();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Popup was closed before sign-in completed. Please try again or click "Enter Workspace".');
      } else if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
        setError('Google sign-in is disabled in Firebase Console. Go to Authentication > Sign-in method > Google and enable it, or use "Enter Workspace".');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console (Authentication > Settings > Authorized domains). Add your run.app domain, or use "Enter Workspace".');
      } else {
        setError(err?.message || 'Unable to sign in. Please verify Google Auth in Firebase Console or use "Enter Workspace".');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-none border border-[#262626] bg-[#0d0d0d] p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <Mark className="w-12 h-12" />
            <h1 className="mt-4 text-2xl tracking-[0.15em] uppercase font-bold text-white font-['Saira_Condensed']">Credensa</h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-zinc-400 font-mono">Professional Identity OS</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl text-white text-center font-['Cormorant_Garamond'] italic text-2xl">Executive Access</h2>
            <p className="mt-2 text-xs text-zinc-400 text-center font-mono">
              Access your verified Career Notebook and AI Copilot reasoning engine.
            </p>

            {error && (
              <div className="mt-4 border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 font-mono" role="alert">
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={busy}
              className="cred-btn-primary mt-6 w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              {busy ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-[#262626] w-full" />
              <span className="bg-[#0d0d0d] px-3 text-[10px] uppercase font-mono tracking-widest text-zinc-500 absolute">OR</span>
            </div>

            <button
              onClick={() => signInAsDemo()}
              className="w-full h-11 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white font-mono text-xs uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-white" />
              Enter Workspace (Instant Access)
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] font-mono tracking-wide text-zinc-500">
          Career records are encrypted and protected by Credensa Core OS
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [records, setRecords] = useState<CareerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorRecordId, setEditorRecordId] = useState<string | null | undefined>(undefined); // undefined = closed, null = new
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryCategory, setQuickEntryCategory] = useState('experience');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: recordsData }, profileRes] = await Promise.all([
        careerRecordAPI.list().catch(() => ({ data: [] })),
        userAPI.getProfile().catch(() => ({ data: null })),
      ]);
      setRecords(Array.isArray(recordsData) ? recordsData : []);
      if (profileRes?.data) setUserProfile(profileRes.data);
    } catch (_err) {
      setToast('Unable to load records from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadRecords();
  }, [user, loadRecords]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const entries = recordsToEntries(records);
  const counts: Record<string, number> = {};
  CATEGORIES.forEach((c) => { counts[c.id] = entries.filter((e) => e.category === c.id).length; });
  const filtered = entries.filter((e) => {
    const catOk = activeSection === 'all' || activeSection === 'notebook' || e.category === activeSection;
    const q = searchQuery.trim().toLowerCase();
    const searchOk = !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    return catOk && searchOk;
  });

  const closeEditor = () => { setEditorRecordId(undefined); loadRecords(); };

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const sample = getSampleRecord(displayName, email);
      await careerRecordAPI.create(sample);
      await loadRecords();
      setToast('Sample tech leader career record loaded with verified metrics!');
    } catch (err: any) {
      setToast(err?.message || 'Failed to load sample profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const { data: parsed } = await resumeAPI.parse(file);
      const newRecord: Omit<CareerRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
        personalInfo: {
          name: parsed.name || displayName,
          headline: parsed.headline || 'Professional',
          location: parsed.location || '',
          email: parsed.email || email,
          phone: parsed.phone || '',
          linkedin: parsed.linkedin || '',
          portfolio: '',
        },
        experience: (parsed.experience || []).map((exp: any) => ({
          id: crypto.randomUUID(),
          company: exp.company || '',
          role: exp.role || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || null,
          current: exp.current || false,
          achievements: (exp.achievements || []).map((ach: string) => ({ text: ach, metric: null })),
          skillsUsed: exp.skillsUsed || [],
        })),
        projects: [],
        education: (parsed.education || []).map((edu: any) => ({
          id: crypto.randomUUID(),
          degree: edu.degree || '',
          institution: edu.institution || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || null,
          honors: edu.honors || '',
        })),
        skills: (parsed.skills || []).map((s: string) => ({
          name: s,
          level: 'Intermediate',
          years: 2,
        })),
        certifications: [],
        achievements: [],
      };
      await careerRecordAPI.create(newRecord);
      await loadRecords();
      setToast(`Resume extracted & imported into Career Notebook!`);
    } catch (err: any) {
      setToast(err?.response?.data?.error || err.message || 'Failed to parse resume');
    } finally {
      setUploadingResume(false);
    }
  };

  // All hooks are declared before these gates so hook order never changes.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }
  if (!user) return <SignInScreen />;

  const displayName = user.displayName || user.email || 'Your account';
  const email = user.email || '';
  const initials = getInitials(user.displayName, user.email);

  if (editorRecordId !== undefined) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-40" onClick={closeEditor} />
        <div className="fixed inset-y-0 right-0 w-full md:max-w-5xl bg-page z-50 overflow-y-auto border-l border-line" style={{ transition: 'opacity 220ms var(--ease-out)' }}>
          <div className="sticky top-0 bg-page/95 backdrop-blur z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-line gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Mark className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base text-txt truncate">Career Studio</h2>
                <p className="meta truncate">{displayName} · Build record to export</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCopilotOpen(true)}
                className="h-9 px-2.5 sm:px-3 rounded-lg border border-line-strong bg-raised hover:bg-page text-txt text-xs flex items-center gap-1.5 focus-ring"
              >
                <Sparkles className="w-3.5 h-3.5 text-ink" strokeWidth={1.5} />
                <span className="hidden sm:inline">Ask Copilot</span>
              </button>
              <button onClick={closeEditor} className="cred-btn-ghost w-9 h-9 sm:w-10 sm:h-10 p-0 focus-ring shrink-0" aria-label="Close Career Studio">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            <RecordEditor recordId={editorRecordId ?? undefined} />
          </div>
        </div>
        <AICopilot
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          record={records.find((r) => r.id === editorRecordId) || records[0] || null}
        />
        {toast && <Toast message={toast} />}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-page text-txt overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Responsive Off-Canvas on Mobile, Collapsible on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static ${
          sidebarOpen ? 'w-64' : 'w-16'
        } ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } bg-void border-r border-line flex flex-col shrink-0 transition-all duration-200`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Mark />
            {sidebarOpen && (
              <div className="flex flex-col">
                <h1 className="text-base text-txt">Credensa</h1>
                <p className="text-xs text-txt-3">Professional identity OS</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-txt-3 hover:text-txt hover:bg-raised focus-ring"
              aria-label="Close mobile navigation"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 rounded-lg text-txt-3 hover:text-txt hover:bg-raised focus-ring"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <Menu className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {sidebarOpen && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 px-3">
                <button onClick={() => { setActiveSection('notebook'); setMobileSidebarOpen(false); }} className="flex items-center gap-2 text-sm text-txt focus-ring">
                  <LayoutDashboard className={`w-4 h-4 ${activeSection === 'notebook' ? 'text-ink' : 'text-txt-3'}`} strokeWidth={1.5} />
                  <span>Career Notebook</span>
                </button>
                <button className="p-1.5 rounded text-txt-3 hover:text-txt focus-ring" onClick={() => setSearchQuery('')} title="Clear search">
                  <Search className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-1">
                {[
                  { id: 'all', name: 'All Entries', icon: Folder },
                  { id: 'experience', name: 'Experience', icon: Briefcase },
                  { id: 'education', name: 'Education', icon: GraduationCap },
                  { id: 'projects', name: 'Projects', icon: Rocket },
                  { id: 'skills', name: 'Skills', icon: Target },
                ].map((item) => {
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setMobileSidebarOpen(false); }}
                      className={`w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm active-rule focus-ring ${active ? 'bg-raised text-txt' : 'text-txt-2 hover:bg-raised hover:text-txt'}`}
                      style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-ink' : 'text-txt-3'}`} strokeWidth={1.5} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sidebarOpen && (
            <div className="mb-4">
              <h2 className="px-3 pb-2 text-xs text-txt-3">Improve</h2>
              <div className="space-y-1">
                <button onClick={() => { setCopilotOpen(true); setMobileSidebarOpen(false); }} className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring" style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
                  <Sparkles className="w-4 h-4 text-ink" strokeWidth={1.5} /> <span>Gemini Copilot</span>
                </button>
                <button onClick={() => { setEditorRecordId(records[0]?.id || null); setMobileSidebarOpen(false); }} className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring" style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
                  <TrendingUp className="w-4 h-4 text-txt-3" strokeWidth={1.5} /> <span>Career Insights</span>
                </button>
                <button onClick={() => { setEditorRecordId(null); setMobileSidebarOpen(false); }} className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring" style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
                  <Import className="w-4 h-4 text-txt-3" strokeWidth={1.5} /> <span>Add Career Data</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {sidebarOpen && (
          <div className="p-3 space-y-1 border-t border-line">
            <button onClick={() => setToast(`Signed in as ${email || displayName}`)} className="w-full h-9 flex items-center gap-3 px-2 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring">
              <Settings className="w-4 h-4 text-txt-3" strokeWidth={1.5} /> Settings
            </button>
            <button onClick={() => { void signOut(); }} className="w-full h-9 flex items-center gap-3 px-2 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring">
              <LogOut className="w-4 h-4 text-txt-3" strokeWidth={1.5} /> Sign out
            </button>
            <div className="flex items-center gap-3 px-2 py-2 mt-2 border-t border-line">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-line-strong" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-raised border border-line flex items-center justify-center text-xs text-txt">{initials}</div>
              )}
              <div className="flex flex-col min-w-0">
                <p className="text-sm text-txt truncate">{displayName}</p>
                <p className="meta truncate">{email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-page overflow-hidden relative">
        <header className="h-16 border-b border-line flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-txt-3 hover:text-txt hover:bg-raised focus-ring"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Mark className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-medium text-txt truncate">Career Notebook</h1>
              <p className="text-xs text-txt-2 hidden sm:block truncate">Your professional story, one entry at a time</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="badge hidden lg:inline-flex bg-ok/10 text-ok border-ok/20 text-xs">
              {userProfile?.tierConfig?.name || 'Career Intelligence Pro'}
            </span>
            <button
              onClick={() => setCopilotOpen(true)}
              className="cred-btn-secondary h-9 px-2.5 sm:px-3 text-xs sm:text-sm focus-ring flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-ink shrink-0" strokeWidth={1.5} />
              <span className="hidden sm:inline">Ask Copilot</span>
            </button>
            <button
              onClick={() => setEditorRecordId(null)}
              className="cred-btn-primary h-9 px-2.5 sm:px-3 text-xs sm:text-sm focus-ring flex items-center gap-1.5"
            >
              <Import className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="hidden sm:inline">Career Studio</span>
              <span className="sm:hidden">Studio</span>
            </button>
            <button
              onClick={() => setToast(`Signed in as ${displayName}`)}
              title={email || undefined}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-raised border border-line flex items-center justify-center text-txt overflow-hidden focus-ring shrink-0"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{initials}</span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* AI Career Intelligence & Opportunities Hub */}
          {records.length > 0 && records[0] && (
            <CareerDNAHub
              record={records[0]}
              onOpenStudio={(tab) => setEditorRecordId(records[0]?.id || null)}
              onOpenCopilot={(_prompt) => setCopilotOpen(true)}
            />
          )}

          {/* Category tiles — interactive cards with 1-click quick add */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {CATEGORIES.map((cat) => {
              const active = activeSection === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveSection(cat.id)}
                  className={`group relative rounded-xl p-4 sm:p-5 cursor-pointer border focus-ring ${
                    active
                      ? 'bg-raised border-line-strong active-rule'
                      : 'bg-surface border-line hover:border-line-strong'
                  }`}
                  style={{ transition: 'background-color 140ms var(--ease-out), border-color 140ms var(--ease-out)' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-9 h-9 rounded-lg bg-void border border-line flex items-center justify-center">
                      <cat.icon className={`w-4 h-4 ${active ? 'text-ink' : 'text-txt-2'}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="meta">{counts[cat.id] || 0}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickEntryCategory(cat.id);
                          setQuickEntryOpen(true);
                        }}
                        className="w-6 h-6 rounded-md bg-void border border-line hover:bg-raised hover:text-ink flex items-center justify-center text-txt-3 transition"
                        title={`Quick add ${cat.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-medium text-txt mb-1">{cat.name}</h3>
                  <p className="meta">
                    {counts[cat.id] || 0} {counts[cat.id] === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Filters & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 max-w-sm relative">
                <Search className="w-4 h-4 text-txt-3 absolute left-3 top-3" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10 text-xs sm:text-sm"
                />
              </div>
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value)}
                className="input-field max-w-xs text-xs sm:text-sm"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({counts[cat.id] || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickEntryCategory(activeSection === 'all' || activeSection === 'notebook' ? 'experience' : activeSection);
                  setQuickEntryOpen(true);
                }}
                className="cred-btn-primary h-9 px-3 text-xs flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>

              <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-0.5">
                {(['cards', 'timeline', 'table'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`h-8 px-2.5 rounded-md text-xs focus-ring ${
                      viewMode === m ? 'bg-raised text-txt shadow-sm font-medium' : 'text-txt-3 hover:text-txt'
                    }`}
                  >
                    {m === 'cards' ? 'Cards' : m === 'timeline' ? 'Timeline' : 'Table'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entries */}
          {loading ? (
            <div className="text-center py-20 meta">Loading your career notebook...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 max-w-2xl mx-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-line flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles className="w-7 h-7 text-ink" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-txt mb-2">
                {records.length === 0 ? 'Your Career Notebook is Ready' : 'No matching entries found'}
              </h3>
              <p className="text-xs sm:text-sm text-txt-2 mb-6 max-w-md mx-auto leading-relaxed">
                {records.length === 0
                  ? 'Credensa treats your career as a structured asset. Add an entry, drop your existing resume, or load a sample tech profile in 1 click.'
                  : 'Try adjusting your search terms or selecting a different category.'}
              </p>

              {records.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  {/* 1-Click Demo */}
                  <div className="bugatti-card flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center mb-3">
                        <Zap className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h4 className="font-display text-sm uppercase tracking-[0.16em] text-white mb-1.5">Exemplary Profile</h4>
                      <p className="font-serif text-xs text-[#999999] leading-relaxed mb-5">
                        Populate a verified Technology Leader profile with metrics to test Gemini 3.8 Flash agents and export executive resumes immediately.
                      </p>
                    </div>
                    <button
                      onClick={handleLoadSample}
                      className="btn-bugatti-primary w-full text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Demo Profile</span>
                    </button>
                  </div>

                  {/* Upload Resume */}
                  <div className="bugatti-card flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full border border-[#262626] flex items-center justify-center mb-3">
                        <Upload className="w-3.5 h-3.5 text-[#999999]" />
                      </div>
                      <h4 className="font-display text-sm uppercase tracking-[0.16em] text-white mb-1.5">Resume Ingestion</h4>
                      <p className="font-serif text-xs text-[#999999] leading-relaxed mb-5">
                        Drop any PDF or Word file. Gemini 3.8 Flash extracts your career history, accomplishments, and skills into your notebook.
                      </p>
                    </div>
                    <label className="btn-bugatti-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={handleResumeUpload}
                        disabled={uploadingResume}
                      />
                      {uploadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingResume ? 'Parsing...' : 'Upload PDF/DOCX'}</span>
                    </label>
                  </div>

                  {/* Manual Quick Add */}
                  <div className="bugatti-card flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full border border-[#262626] flex items-center justify-center mb-3">
                        <Plus className="w-3.5 h-3.5 text-[#999999]" />
                      </div>
                      <h4 className="font-display text-sm uppercase tracking-[0.16em] text-white mb-1.5">Precision Entry</h4>
                      <p className="font-serif text-xs text-[#999999] leading-relaxed mb-5">
                        Directly add your current leadership role, key projects, or top skills with our structured quick entry form.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setQuickEntryCategory('experience');
                        setQuickEntryOpen(true);
                      }}
                      className="btn-bugatti-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Entry Manually</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="rounded-xl border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface text-txt-3 text-left">
                  <tr><th className="px-4 py-3 font-normal">Title</th><th className="px-4 py-3 font-normal">Category</th><th className="px-4 py-3 font-normal">Details</th><th className="px-4 py-3"></th></tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-t border-line hover:bg-surface" style={{ transition: 'background-color 140ms var(--ease-out)' }}>
                      <td className="px-4 py-3 text-txt">{e.title}</td>
                      <td className="px-4 py-3"><span className="badge">{e.category}</span></td>
                      <td className="px-4 py-3 text-txt-2 max-w-md truncate">{e.description || '—'}</td>
                      <td className="px-4 py-3"><button onClick={() => setEditorRecordId(e.recordId)} className="text-ink text-sm hover:text-txt focus-ring">Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'timeline' ? (
            <div className="space-y-4 border-l border-line ml-4 pl-6">
              {filtered.map((e) => (
                <div key={e.id} className="relative">
                  <div className="absolute -left-[31px] top-4 w-3 h-3 rounded-full bg-ink border-2 border-page" />
                  <button onClick={() => setEditorRecordId(e.recordId)} className="w-full text-left rounded-xl p-4 bg-surface border border-line hover:border-line-strong focus-ring" style={{ transition: 'border-color 140ms var(--ease-out)' }}>
                    <div className="flex items-center gap-2 mb-1"><span className="badge">{e.category}</span><h3 className="text-base text-txt">{e.title}</h3></div>
                    <p className="text-sm text-txt-2 line-clamp-2">{e.description}</p>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (
                <div key={e.id} className="rounded-xl p-5 bg-surface border border-line hover:border-line-strong focus-ring" style={{ transition: 'border-color 140ms var(--ease-out)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-lg bg-void border border-line flex items-center justify-center">
                      <e.icon className="w-4 h-4 text-txt-2" />
                    </div>
                    <button onClick={() => setEditorRecordId(e.recordId)} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-3 hover:text-txt hover:bg-raised focus-ring" title="Open record">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="badge inline-block mb-2">{e.category}</span>
                  <h3 className="text-base text-txt mb-2">{e.title}</h3>
                  <p className="text-sm text-txt-2 leading-relaxed mb-4 line-clamp-3">{e.description || 'No details yet'}</p>
                  <button onClick={() => setEditorRecordId(e.recordId)} className="text-sm text-ink hover:text-txt flex items-center gap-1 focus-ring">View details <ChevronRight className="w-3 h-3" strokeWidth={1.5} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Copilot and Add actions */}
        <div className="fixed bottom-6 right-6 flex items-center gap-3 z-30">
          <button
            onClick={() => setCopilotOpen(true)}
            title="Open Gemini Career Copilot"
            className="btn-bugatti-primary h-12 px-6 flex items-center gap-2.5 text-xs shadow-2xl"
          >
            <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span className="tracking-[0.18em]">Ask Copilot</span>
          </button>

          <button
            onClick={() => {
              setQuickEntryCategory('experience');
              setQuickEntryOpen(true);
            }}
            title="Quick add entry"
            className="w-12 h-12 rounded-full border border-white text-white hover:bg-white hover:text-black flex items-center justify-center transition-all duration-200 active:scale-95 shadow-2xl shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <AICopilot
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          record={records[0] || null}
        />
        <QuickEntryModal
          isOpen={quickEntryOpen}
          onClose={() => setQuickEntryOpen(false)}
          initialCategory={quickEntryCategory}
          record={records[0] || null}
          userProfile={userProfile}
          onSaved={() => {
            loadRecords();
            setToast('Career Notebook entry saved!');
          }}
        />
        {toast && <Toast message={toast} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm px-5 py-3 rounded-2xl z-[60] shadow-[0_12px_40px_rgba(0,0,0,0.95)] flex items-center gap-2.5">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="font-medium tracking-tight">{message}</span>
    </div>
  );
}
