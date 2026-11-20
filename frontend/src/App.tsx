import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Folder, Search, Plus, User, ShieldCheck, Rocket,
  Briefcase, GraduationCap, Target, Award, TrendingUp, Menu, ChevronRight,
  Import, Settings, LogOut, X, FileText, Sparkles, Loader2
} from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import { careerRecordAPI } from './api';
import type { CareerRecord } from './types';
import RecordEditor from './components/RecordEditor';

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
  }
  return entries;
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

/** Flat document mark — one solid ink glyph, no gradient tile. */
function Mark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`${className} rounded-lg bg-raised border border-line flex items-center justify-center`}>
      <FileText className="w-4 h-4 text-ink" strokeWidth={1.5} />
    </div>
  );
}

function SignInScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signIn();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message || 'Unable to sign in. Verify that Google Authentication is enabled for this project, or contact your administrator.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-line bg-surface p-8">
          <div className="flex flex-col items-center text-center">
            <Mark className="w-12 h-12" />
            <h1 className="mt-4 text-2xl text-txt">Credensa</h1>
            <p className="mt-1 text-sm text-txt-3">Professional identity OS</p>
          </div>

          <div className="mt-10">
            <h2 className="text-xl text-txt text-center">Sign in to Credensa</h2>
            <p className="mt-2 text-sm text-txt-2 text-center">
              Use your Google account to access your private career workspace.
            </p>

            {error && (
              <div className="mt-6 rounded-lg border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad" role="alert">
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={busy}
              className="cred-btn-primary mt-8 w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              {busy ? 'Signing in' : 'Continue with Google'}
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-txt-3">
          Your career data is private to your account and never shared
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
  const [activeSection, setActiveSection] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorRecordId, setEditorRecordId] = useState<string | null | undefined>(undefined); // undefined = closed, null = new
  const [toast, setToast] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await careerRecordAPI.list();
      setRecords(Array.isArray(data) ? data : []);
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
        <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-page z-50 overflow-y-auto border-l border-line" style={{ transition: 'opacity 220ms var(--ease-out)' }}>
          <div className="sticky top-0 bg-page/95 backdrop-blur z-10 flex items-center justify-between px-6 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <Mark className="w-9 h-9" />
              <div>
                <h2 className="text-base text-txt">Career Studio</h2>
                <p className="meta">{displayName}  ·  Build record to export</p>
              </div>
            </div>
            <button onClick={closeEditor} className="cred-btn-ghost w-10 h-10 p-0 focus-ring" aria-label="Close Career Studio">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <RecordEditor recordId={editorRecordId ?? undefined} />
          </div>
        </div>
        {toast && <Toast message={toast} />}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-page text-txt overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-void border-r border-line flex flex-col z-20 shrink-0`} style={{ transition: 'width 220ms var(--ease-out)' }}>
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
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-txt-3 hover:text-txt hover:bg-raised focus-ring" aria-label="Toggle sidebar" style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
            {sidebarOpen ? <Menu className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {sidebarOpen && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 px-3">
                <button onClick={() => setActiveSection('notebook')} className="flex items-center gap-2 text-sm text-txt focus-ring">
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
                    <button key={item.id} onClick={() => setActiveSection(item.id)}
                      className={`w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm active-rule focus-ring ${active ? 'bg-raised text-txt' : 'text-txt-2 hover:bg-raised hover:text-txt'}`}
                      style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
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
                <button onClick={() => setToast('Career Insights are not available in this release')} className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring" style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
                  <TrendingUp className="w-4 h-4 text-txt-3" strokeWidth={1.5} /> <span>Career Insights</span>
                </button>
                <button onClick={() => setEditorRecordId(null)} className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm text-txt-2 hover:bg-raised hover:text-txt focus-ring" style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
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

      {/* Main */}
      <main className="flex-1 flex flex-col bg-page overflow-hidden relative">
        <header className="h-16 border-b border-line flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Mark />
            <div>
              <h1 className="text-2xl text-txt">Career Notebook</h1>
              <p className="text-sm text-txt-2">Your professional story, one entry at a time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditorRecordId(null)} className="cred-btn-secondary focus-ring">
              <Import className="w-4 h-4 text-txt-2" strokeWidth={1.5} /> <span>Add Entry</span>
            </button>
            <button onClick={() => setToast(`Signed in as ${displayName}`)} title={email || undefined} className="w-10 h-10 rounded-full bg-raised border border-line flex items-center justify-center text-txt overflow-hidden focus-ring">
              {user.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{initials}</span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Category tiles — quiet navigation, no hue gradients */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {CATEGORIES.map((cat) => {
              const active = activeSection === cat.id;
              return (
                <div key={cat.id} onClick={() => setActiveSection(cat.id)}
                  className={`relative rounded-xl p-5 cursor-pointer border focus-ring ${active ? 'bg-raised border-line-strong active-rule' : 'bg-surface border-line hover:border-line-strong'}`}
                  style={{ transition: 'background-color 140ms var(--ease-out), border-color 140ms var(--ease-out)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-9 h-9 rounded-lg bg-void border border-line flex items-center justify-center">
                      <cat.icon className={`w-4 h-4 ${active ? 'text-ink' : 'text-txt-2'}`} />
                    </div>
                    <span className="meta">{counts[cat.id] || 0}</span>
                  </div>
                  <h3 className="text-base text-txt mb-1">{cat.name}</h3>
                  <p className="meta">{counts[cat.id] || 0} {counts[cat.id] === 1 ? 'entry' : 'entries'}</p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 max-w-sm relative">
              <Search className="w-4 h-4 text-txt-3 absolute left-3 top-3" strokeWidth={1.5} />
              <input type="text" placeholder="Search entries" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10" />
            </div>
            <select value={activeSection} onChange={(e) => setActiveSection(e.target.value)}
              className="input-field max-w-xs">
              <option value="all">All categories</option>
              {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1">
              {(['cards', 'timeline', 'table'] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`h-9 px-3 rounded-md text-sm focus-ring ${viewMode === m ? 'bg-raised text-txt' : 'text-txt-3 hover:text-txt'}`}
                  style={{ transition: 'background-color 140ms var(--ease-out), color 140ms var(--ease-out)' }}>
                  {m === 'cards' ? 'Cards' : m === 'timeline' ? 'Timeline' : 'Table'}
                </button>
              ))}
            </div>
          </div>

          {/* Entries */}
          {loading ? (
            <div className="text-center py-20 meta">Loading your career notebook</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-xl bg-surface border border-line flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-txt-3" strokeWidth={1.5} />
              </div>
              <h3 className="text-base text-txt mb-2">{records.length === 0 ? 'No entries yet' : 'No matching entries'}</h3>
              <p className="text-sm text-txt-2 mb-5">{records.length === 0 ? 'Create your first career record to get started.' : 'Try a different search or category.'}</p>
              <button onClick={() => setEditorRecordId(null)} className="cred-btn-primary">Create Career Record</button>
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

        <button onClick={() => setEditorRecordId(null)} title="Add new career record"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-ink text-void flex items-center justify-center hover:bg-ink-soft focus-ring z-30"
          style={{ transition: 'background-color 140ms var(--ease-out)' }}>
          <Plus className="w-6 h-6" strokeWidth={1.5} />
        </button>
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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-raised border border-line-strong text-txt text-sm px-5 py-3 rounded-lg z-[60]">
      {message}
    </div>
  );
}
