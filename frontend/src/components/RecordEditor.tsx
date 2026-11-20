import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  Target,
  RefreshCw,
  ShieldCheck,
  Download,
  ArrowLeft,
  X
} from 'lucide-react';
import { careerRecordAPI, matchAPI, draftAPI, reviewAPI, exportAPI } from '../api';
import type { CareerRecord, Experience, Project, Education, Skill, Achievement, MatchResult } from '../types';

/** Turn an API failure into an honest, user-facing message. Never fake data. */
function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { error?: string } }; message?: string };
  const status = e?.response?.status;
  const serverMessage = e?.response?.data?.error;
  if (status === 401) return 'Sign in required';
  if (status === 403) return 'You do not have access to this record';
  if (serverMessage && /api[_ -]?key|gemini|not configured|credential|auth/i.test(serverMessage)) {
    return 'AI not configured — contact administrator';
  }
  return serverMessage || e?.message || fallback;
}

// Computes how much of a Career Record is filled out (0-100%).
function computeCompleteness(record: CareerRecord | null): { percent: number; filled: number; total: number } {
  let filled = 0;
  let total = 0;
  const check = (value: unknown) => {
    total += 1;
    if (typeof value === 'boolean') {
      if (value) filled += 1;
    } else if (value !== undefined && value !== null && String(value).trim() !== '') {
      filled += 1;
    }
  };

  if (!record) return { percent: 0, filled, total };

  const pi = record.personalInfo;
  check(pi?.name);
  check(pi?.headline);
  check(pi?.location);
  check(pi?.email);
  check(pi?.phone);
  check(pi?.linkedin);
  check(pi?.portfolio);

  const experiences = record.experience || [];
  check(experiences.length > 0);
  experiences.forEach((exp) => {
    check(exp.company);
    check(exp.role);
    check(exp.startDate);
    check((exp.achievements || []).length > 0);
  });

  const projects = record.projects || [];
  check(projects.length > 0);
  projects.forEach((project) => {
    check(project.name);
    check(project.description);
    check((project.techStack || []).length > 0);
  });

  const education = record.education || [];
  check(education.length > 0);
  education.forEach((edu) => {
    check(edu.degree);
    check(edu.institution);
  });

  const skills = record.skills || [];
  check(skills.length > 0);
  check(skills.some((skill) => (skill?.name || '').trim() !== ''));

  return {
    percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    filled,
    total,
  };
}

export default function RecordEditor({ recordId }: { recordId?: string }) {
  const [record, setRecord] = useState<CareerRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [jd, setJd] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [matching, setMatching] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [reviewing, setReviewing] = useState(false);
  const [view, setView] = useState<'record' | 'match' | 'draft' | 'export'>('record');
  // Guards the automatic transition so "Back to Record" is respected until a
  // brand-new match result arrives.
  const [matchDismissed, setMatchDismissed] = useState(false);

  const completeness = computeCompleteness(record);

  useEffect(() => {
    if (recordId) {
      loadRecord(recordId);
    } else {
      setRecord(getEmptyRecord());
    }
  }, [recordId]);

  /**
   * The Match view transition lives in an effect rather than only inside the
   * click handler. This makes it reliable even when a parent re-render (for
   * example an `onUpdated` callback that refreshes the record list) restores
   * or overwrites the local `view` value: as soon as a real match result is
   * present, the UI is driven to the Job Match Analysis view.
   */
  useEffect(() => {
    if (matchResult) {
      setMatchDismissed(false);
      setView('match');
    }
  }, [matchResult]);

  const loadRecord = async (id: string) => {
    try {
      const { data } = await careerRecordAPI.get(id);
      setRecord(data);
    } catch (err) {
      console.error('Failed to load record', err);
    }
  };

  const getEmptyRecord = (): CareerRecord => ({
    personalInfo: {
      name: '',
      headline: '',
      location: '',
      email: '',
      phone: '',
      linkedin: '',
      portfolio: '',
    },
    experience: [],
    projects: [],
    education: [],
    skills: [],
  });

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      if (record.id) {
        const { data } = await careerRecordAPI.update(record.id, record);
        setRecord(data);
      } else {
        const { data } = await careerRecordAPI.create(record);
        setRecord(data);
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to save record'));
    } finally {
      setSaving(false);
    }
  };

  // Personal Info
  const updatePersonal = (field: string, value: string) => {
    if (!record) return;
    setRecord({
      ...record,
      personalInfo: { ...record.personalInfo, [field]: value },
    });
  };

  // Experience
  const addExperience = () => {
    if (!record) return;
    const newExp: Experience = {
      id: crypto.randomUUID(),
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      current: false,
      achievements: [],
      skillsUsed: [],
    };
    setRecord({ ...record, experience: [...record.experience, newExp] });
  };

  const updateExp = (index: number, field: string, value: any) => {
    if (!record) return;
    const exps = [...record.experience];
    exps[index] = { ...exps[index], [field]: value };
    setRecord({ ...record, experience: exps });
  };

  const addAchievement = (expIndex: number) => {
    if (!record) return;
    const exps = [...record.experience];
    exps[expIndex].achievements.push({ text: '', metric: null });
    setRecord({ ...record, experience: exps });
  };

  const updateAchievement = (expIndex: number, achIndex: number, field: string, value: any) => {
    if (!record) return;
    const exps = [...record.experience];
    exps[expIndex].achievements[achIndex] = {
      ...exps[expIndex].achievements[achIndex],
      [field]: value,
    } as Achievement;
    setRecord({ ...record, experience: exps });
  };

  const removeExperience = (index: number) => {
    if (!record) return;
    setRecord({ ...record, experience: record.experience.filter((_, i) => i !== index) });
  };

  // Projects
  const addProject = () => {
    if (!record) return;
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      role: '',
      techStack: [],
      outcomes: [],
      link: '',
    };
    setRecord({ ...record, projects: [...record.projects, newProj] });
  };

  const updateProject = (index: number, field: string, value: any) => {
    if (!record) return;
    const projs = [...record.projects];
    projs[index] = { ...projs[index], [field]: value };
    setRecord({ ...record, projects: projs });
  };

  const removeProject = (index: number) => {
    if (!record) return;
    setRecord({ ...record, projects: record.projects.filter((_, i) => i !== index) });
  };

  // Education
  const addEducation = () => {
    if (!record) return;
    const newEdu: Education = {
      id: crypto.randomUUID(),
      degree: '',
      institution: '',
      startDate: '',
      endDate: '',
      honors: '',
    };
    setRecord({ ...record, education: [...record.education, newEdu] });
  };

  const updateEdu = (index: number, field: string, value: any) => {
    if (!record) return;
    const edus = [...record.education];
    edus[index] = { ...edus[index], [field]: value };
    setRecord({ ...record, education: edus });
  };

  const removeEducation = (index: number) => {
    if (!record) return;
    setRecord({ ...record, education: record.education.filter((_, i) => i !== index) });
  };

  // Skills
  const addSkill = () => {
    if (!record) return;
    const newSkill: Skill = { name: '', level: 'Intermediate', years: 0 };
    setRecord({ ...record, skills: [...record.skills, newSkill] });
  };

  const updateSkill = (index: number, field: string, value: any) => {
    if (!record) return;
    const skills = [...record.skills];
    skills[index] = { ...skills[index], [field]: value };
    setRecord({ ...record, skills });
  };

  const removeSkill = (index: number) => {
    if (!record) return;
    setRecord({ ...record, skills: record.skills.filter((_, i) => i !== index) });
  };

  // Match flow
  const handleMatch = async () => {
    if (!record || !jd) return;
    setMatching(true);
    try {
      const { data } = await matchAPI.create({ recordId: record.id!, jobDescription: jd });
      // Normalise the response so a proxy envelope can never leave us with a
      // null result while `view` says "match".
      const result = (data && typeof data === 'object' && 'match' in data
        ? (data as any).match
        : data) as MatchResult;
      setMatchDismissed(false);
      setMatchResult(result);
      setView('match'); // immediate transition; the effect above backs it up
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to generate match'));
    } finally {
      setMatching(false);
    }
  };

  const backToRecord = () => {
    setMatchDismissed(true);
    setView('record');
  };

  // Draft flow
  const handleDraft = async () => {
    if (!matchResult || !record) return;
    try {
      const { data } = await draftAPI.create({
        recordId: record.id!,
        matchId: matchResult.id,
        jobDescription: matchResult.jdText,
      });
      setDraft(data);
      setView('draft');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to generate draft'));
    }
  };

  // Review flow
  const handleReview = async () => {
    if (!draft || !matchResult) return;
    setReviewing(true);
    try {
      const { data } = await reviewAPI.create({
        draftId: draft.id,
        jobDescription: matchResult.jdText,
      });
      setDraft({ ...draft, reviewResult: data.reviewResult });
      setReview(data.reviewResult);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to review draft'));
    } finally {
      setReviewing(false);
    }
  };

  // Keep parent draft state in sync after an inline edit or rejection.
  // Clearing the review forces the user to re-run ATS review on edited content.
  const handleDraftUpdated = (updated: any) => {
    setDraft(updated);
    setReview(null);
  };

  // Export flow
  const handleApprove = async () => {
    if (!draft) return;
    try {
      await exportAPI.approve(draft.id);
      setDraft({ ...draft, status: 'approved' });
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to approve'));
    }
  };

  const handleDownloadPDF = async () => {
    if (!draft) return;
    try {
      const { data } = await exportAPI.pdf(draft.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credensa-resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to download PDF'));
    }
  };

  // The Match view is driven by the real result plus an explicit "dismissed"
  // flag — not by the `view` string alone. That way a parent re-render (for
  // example an `onUpdated` callback refreshing the record list) cannot drop us
  // back to the record editor while a fresh match result is on screen. Draft
  // and export views take precedence.
  if (matchResult && !matchDismissed && (view === 'record' || view === 'match')) {
    return <MatchView matchResult={matchResult} jd={jd} record={record} onBack={backToRecord} onDraft={handleDraft} />;
  }
  if (view === 'draft') return <DraftView draft={draft} matchResult={matchResult} record={record!} onBack={() => setView('match')} onReview={handleReview} onApprove={handleApprove} onDownloadPDF={handleDownloadPDF} reviewing={reviewing} review={review} onUpdated={handleDraftUpdated} />;
  if (view === 'export') return <ExportView draft={draft} record={record} onBack={() => setView('draft')} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl text-txt">Career Record</h1>
          <p className="text-txt-2 text-sm">Build your structured career history.</p>
          {/* Completeness score — the record's one "moment". Inline width so Tailwind compiles it. */}
          <div className="mt-4 max-w-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-txt-2">Record completeness</span>
              <span className="meta">{completeness.percent}%  ·  {completeness.filled}/{completeness.total} fields</span>
            </div>
            <div className="w-full bg-void rounded-full h-1.5 border border-line">
              <div
                className="h-1.5 rounded-full bg-ink"
                style={{ width: `${completeness.percent}%`, transition: 'width 360ms var(--ease-out)' }}
              />
            </div>
          </div>
        </div>
        <button onClick={handleSave} className="cred-btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Record'}
        </button>
      </div>

      {/* Personal Info */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-txt mb-1">Full Name</label>
            <input className="input-field" value={record?.personalInfo?.name || ''} onChange={(e) => updatePersonal('name', e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt mb-1">Headline</label>
            <input className="input-field" value={record?.personalInfo?.headline || ''} onChange={(e) => updatePersonal('headline', e.target.value)} placeholder="e.g. Senior Software Engineer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt mb-1">Location</label>
            <input className="input-field" value={record?.personalInfo?.location || ''} onChange={(e) => updatePersonal('location', e.target.value)} placeholder="City, Country" />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt mb-1">Email</label>
            <input className="input-field" type="email" value={record?.personalInfo?.email || ''} onChange={(e) => updatePersonal('email', e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt mb-1">Phone</label>
            <input className="input-field" type="tel" value={record?.personalInfo?.phone || ''} onChange={(e) => updatePersonal('phone', e.target.value)} placeholder="+1 555 000 0000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt mb-1">LinkedIn</label>
            <input className="input-field" value={record?.personalInfo?.linkedin || ''} onChange={(e) => updatePersonal('linkedin', e.target.value)} placeholder="linkedin.com/in/your-handle" />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt mb-1">Portfolio</label>
            <input className="input-field" value={record?.personalInfo?.portfolio || ''} onChange={(e) => updatePersonal('portfolio', e.target.value)} placeholder="https://your-site.com" />
          </div>
        </div>
      </div>

      {/* Experience */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Experience</h2>
          <button onClick={addExperience} className="flex items-center gap-1 text-ink hover:text-txt text-sm font-medium">
            <Plus className="w-3 h-3" /> Add Experience
          </button>
        </div>
        {record?.experience.map((exp, idx) => (
          <div key={exp.id} className="border rounded-lg p-4 mb-3">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <input className="input-field text-sm" value={exp.company} onChange={(e) => updateExp(idx, 'company', e.target.value)} placeholder="Company" />
                <input className="input-field text-sm mt-1" value={exp.role} onChange={(e) => updateExp(idx, 'role', e.target.value)} placeholder="Role/Title" />
              </div>
              <button onClick={() => removeExperience(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input className="input-field text-sm" type="date" value={exp.startDate} onChange={(e) => updateExp(idx, 'startDate', e.target.value)} />
              <input className="input-field text-sm" type="date" value={exp.endDate || ''} onChange={(e) => updateExp(idx, 'endDate', e.target.value || null)} placeholder="End date" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={exp.current} onChange={(e) => updateExp(idx, 'current', e.target.checked)} /> Current
              </label>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-txt-3 mb-1 mb-1">Achievements (add metrics)</label>
              {exp.achievements.map((ach, ai) => (
                <div key={ai} className="flex gap-2 mb-2">
                  <input className="flex-1 input-field text-sm" value={ach.text} onChange={(e) => updateAchievement(idx, ai, 'text', e.target.value)} placeholder="Improved system uptime" />
                  <input className="w-32 input-field text-sm" value={ach.metric || ''} onChange={(e) => updateAchievement(idx, ai, 'metric', e.target.value)} placeholder="98.5% → 99.9%" />
                  <button onClick={() => {
                    const exps = [...record!.experience];
                    exps[idx].achievements = exps[idx].achievements.filter((_, i) => i !== ai);
                    setRecord({ ...record!, experience: exps });
                  }} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => addAchievement(idx)} className="text-xs text-ink hover:text-txt">
                + Add achievement
              </button>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-medium text-txt-3 mb-1">Skills used</label>
              <input className="input-field text-sm" value={exp.skillsUsed.join(', ')} onChange={(e) => updateExp(idx, 'skillsUsed', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="React, TypeScript, Figma" />
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Projects</h2>
          <button onClick={addProject} className="flex items-center gap-1 text-ink hover:text-txt text-sm font-medium">
            <Plus className="w-3 h-3" /> Add Project
          </button>
        </div>
        {record?.projects.map((proj, idx) => (
          <div key={proj.id} className="border rounded-lg p-4 mb-3">
            <div className="flex justify-between items-start mb-3">
              <input className="input-field text-sm" value={proj.name} onChange={(e) => updateProject(idx, 'name', e.target.value)} placeholder="Project Name" />
              <button onClick={() => removeProject(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input className="input-field text-sm mb-2" value={proj.role} onChange={(e) => updateProject(idx, 'role', e.target.value)} placeholder="Your Role" />
            <textarea className="input-field text-sm mb-2" rows={2} value={proj.description} onChange={(e) => updateProject(idx, 'description', e.target.value)} placeholder="Describe the project" />
            <input className="input-field text-sm mb-2" value={proj.techStack.join(', ')} onChange={(e) => updateProject(idx, 'techStack', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="React, Node.js, PostgreSQL" />
            <input className="input-field text-sm" value={proj.link || ''} onChange={(e) => updateProject(idx, 'link', e.target.value)} placeholder="GitHub/Live URL" />
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Education</h2>
          <button onClick={addEducation} className="flex items-center gap-1 text-ink hover:text-txt text-sm font-medium">
            <Plus className="w-3 h-3" /> Add Education
          </button>
        </div>
        {record?.education.map((edu, idx) => (
          <div key={edu.id} className="border rounded-lg p-4 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <input className="input-field text-sm" value={edu.degree} onChange={(e) => updateEdu(idx, 'degree', e.target.value)} placeholder="B.Sc. Data Science" />
              <input className="input-field text-sm" value={edu.institution} onChange={(e) => updateEdu(idx, 'institution', e.target.value)} placeholder="Institution" />
              <input className="input-field text-sm" type="date" value={edu.startDate} onChange={(e) => updateEdu(idx, 'startDate', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
              <input className="input-field text-sm" type="date" value={edu.endDate || ''} onChange={(e) => updateEdu(idx, 'endDate', e.target.value || null)} />
              <input className="input-field text-sm" value={edu.honors} onChange={(e) => updateEdu(idx, 'honors', e.target.value)} placeholder="Honors/Awards" />
            </div>
            <button onClick={() => removeEducation(idx)} className="text-red-500 hover:text-red-700 text-sm">
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Skills</h2>
          <button onClick={addSkill} className="flex items-center gap-1 text-ink hover:text-txt text-sm font-medium">
            <Plus className="w-3 h-3" /> Add Skill
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {record?.skills.map((skill, idx) => (
            <div key={idx} className="flex gap-2">
              <input className="flex-1 input-field text-sm" value={skill.name} onChange={(e) => updateSkill(idx, 'name', e.target.value)} placeholder="Skill name" />
              <select className="input-field text-sm" value={skill.level} onChange={(e) => updateSkill(idx, 'level', e.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
              <input className="w-20 input-field text-sm" type="number" value={skill.years} onChange={(e) => updateSkill(idx, 'years', Number(e.target.value))} />
              <button onClick={() => removeSkill(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Match Section */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Match with Job Description</h2>
        <textarea className="input-field w-full h-32 mb-4" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste a job description here to see how your record matches..." />
        <button onClick={handleMatch} className="cred-btn-primary w-full" disabled={matching || !record?.id || !jd}>
          {matching ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Matching...</span> : <span><Target className="w-4 h-4 mr-2" /> Generate Match Analysis</span>}
        </button>
      </div>
    </div>
  );
}

function MatchView({ matchResult, jd, record, onBack, onDraft }: any) {
  // Real AI responses can omit empty arrays. Default them so the view can
  // never throw mid-render (which would silently abort the transition).
  const matchedSkills: string[] = matchResult?.matchedSkills || [];
  const missingSkills: string[] = matchResult?.missingSkills || [];
  const suggestions: string[] = matchResult?.suggestions || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <button onClick={onBack} className="flex items-center gap-2 text-ink hover:text-txt" style={{ transition: 'color 140ms var(--ease-out)' }}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Record
        </button>
        <h1 className="text-2xl text-txt">Job Match Analysis</h1>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-3xl text-txt tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{matchResult.fitScore}</div>
          <div className="flex-1">
            <div className="text-sm text-txt-2">Fit score</div>
            <div className="w-full bg-void rounded-full h-1.5 mt-2 border border-line">
              <div className={`h-1.5 rounded-full ${matchResult.tier === 'Strong' ? 'bg-ok' : matchResult.tier === 'Ready' ? 'bg-ink' : 'bg-bad'}`} style={{ width: `${matchResult.fitScore}%`, transition: 'width 360ms var(--ease-out)' }}></div>
            </div>
            <span className="badge mt-2">{matchResult.tier}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm text-txt mb-2">Matched skills</h3>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((s: string) => (
                <span key={s} className="badge">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm text-txt mb-2">Missing skills</h3>
            <div className="flex flex-wrap gap-2">
              {missingSkills.map((s: string) => (
                <span key={s} className="badge" style={{ color: 'var(--color-bad)' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm text-txt mb-2">Suggestions</h3>
          <ul className="list-disc list-inside text-txt-2 space-y-1">
            {suggestions.map((s: string) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <button onClick={onDraft} className="cred-btn-primary w-full">
          Generate Tailored Resume →
        </button>
      </div>
    </div>
  );
}

function DraftView({ draft, matchResult, record, onBack, onReview, onApprove, onDownloadPDF, reviewing, review, onUpdated }: any) {
  // Local editable copy of the draft content — edits stay here until "Save Edits".
  const [content, setContent] = useState<any>(() => ({
    summary: draft?.content?.summary || '',
    experience: (draft?.content?.experience || []).map((exp: any) => ({
      ...exp,
      achievements: (exp.achievements || []).map((ach: any) => String(ach)),
    })),
    skills: [...(draft?.content?.skills || [])].map((s: any) => String(s)),
    coverLetter: draft?.content?.coverLetter || '',
    atsKeywords: [...(draft?.content?.atsKeywords || [])],
  }));
  const [savingEdits, setSavingEdits] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const updateAchievement = (expIdx: number, achIdx: number, value: string) =>
    setContent((prev: any) => ({
      ...prev,
      experience: prev.experience.map((exp: any, i: number) =>
        i === expIdx
          ? { ...exp, achievements: exp.achievements.map((a: string, j: number) => (j === achIdx ? value : a)) }
          : exp
      ),
    }));

  const addAchievement = (expIdx: number) =>
    setContent((prev: any) => ({
      ...prev,
      experience: prev.experience.map((exp: any, i: number) =>
        i === expIdx ? { ...exp, achievements: [...exp.achievements, ''] } : exp
      ),
    }));

  const removeAchievement = (expIdx: number, achIdx: number) =>
    setContent((prev: any) => ({
      ...prev,
      experience: prev.experience.map((exp: any, i: number) =>
        i === expIdx
          ? { ...exp, achievements: exp.achievements.filter((_: string, j: number) => j !== achIdx) }
          : exp
      ),
    }));

  const updateSkill = (idx: number, value: string) =>
    setContent((prev: any) => ({ ...prev, skills: prev.skills.map((s: string, i: number) => (i === idx ? value : s)) }));

  const addSkill = () => setContent((prev: any) => ({ ...prev, skills: [...prev.skills, ''] }));

  const removeSkill = (idx: number) =>
    setContent((prev: any) => ({ ...prev, skills: prev.skills.filter((_: string, i: number) => i !== idx) }));

  const handleSaveEdits = async () => {
    if (!draft?.id) return;
    setSavingEdits(true);
    try {
      const { data } = await draftAPI.update(draft.id, { content, status: 'edited' });
      const saved = { ...draft, ...(data && typeof data === 'object' ? data : {}), content, status: 'edited' };
      onUpdated(saved);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to save edits'));
    } finally {
      setSavingEdits(false);
    }
  };

  const handleReject = async () => {
    if (!draft?.id) return;
    setRejecting(true);
    try {
      await draftAPI.update(draft.id, { status: 'rejected' });
      onUpdated({ ...draft, status: 'rejected' });
      onBack(); // return to the match/record view
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to reject draft'));
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <button onClick={onBack} className="flex items-center gap-2 text-ink hover:text-txt font-medium text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Match
        </button>
        <h1 className="text-2xl font-medium text-txt">Tailored Resume Draft</h1>
      </div>

      <StatusStepper status={draft?.status} />

      <div className="bg-surface border border-line p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-txt">Professional Summary</h2>
          <span className="text-xs text-txt-3">Editable</span>
        </div>
        <textarea
          className="input-field w-full h-32"
          value={content.summary}
          onChange={(e) => setContent((prev: any) => ({ ...prev, summary: e.target.value }))}
          placeholder="Edit the tailored professional summary..."
        />
      </div>

      <div className="bg-surface border border-line p-6 rounded-xl">
        <h2 className="text-lg font-medium text-txt mb-4">Experience (AI Tailored)</h2>
        <div className="space-y-4">
          {content.experience.map((exp: any, idx: number) => (
            <div key={idx} className="p-4 bg-void border border-line rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-txt">{exp.role} — {exp.company}</h4>
                <span className="text-xs text-txt-3">{exp.startDate} – {exp.endDate || 'Present'}</span>
              </div>
              <div className="space-y-2">
                {exp.achievements.map((ach: string, ai: number) => (
                  <div key={ai} className="flex gap-2 items-start">
                    <span className="text-ink mt-2.5 text-xs">•</span>
                    <input
                      className="input-field text-sm flex-1"
                      value={ach}
                      onChange={(e) => updateAchievement(idx, ai, e.target.value)}
                      placeholder="Edit achievement bullet..."
                    />
                    <button
                      onClick={() => removeAchievement(idx, ai)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Remove bullet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addAchievement(idx)} className="mt-2 text-xs text-ink hover:text-txt font-medium">
                + Add bullet
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-line p-6 rounded-xl">
        <h2 className="text-lg font-medium text-txt mb-4">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {content.skills.map((skill: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1 bg-void border border-line rounded px-2 py-1">
              <input
                className="bg-transparent text-txt-2 text-xs font-medium outline-none w-28"
                value={skill}
                onChange={(e) => updateSkill(idx, e.target.value)}
                placeholder="Skill"
              />
              <button onClick={() => removeSkill(idx)} className="text-txt-3 hover:text-red-400" title="Remove skill">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addSkill} className="flex items-center gap-1 text-xs text-ink hover:text-txt border border-dashed border-line-strong rounded px-2 py-1">
            <Plus className="w-3 h-3" /> Add skill
          </button>
        </div>
      </div>

      {review && (
        <div className="bg-surface border border-line p-6 rounded-xl">
          <h2 className="text-lg font-medium text-txt mb-4">ATS Review</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-medium text-txt">{review.atsScore}</div>
            <span className="text-sm font-medium text-txt-2">ATS Score</span>
          </div>
          <div className="space-y-2">
            {review.checks.map((check: any) => (
              <div key={check.id} className="flex items-center justify-between p-2 bg-void border border-line rounded">
                <span className="text-sm text-txt-2">{check.name}</span>
                <span className={`text-xs font-medium ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {check.passed ? '✓ Pass' : '✗ Fail'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {review ? (
          <button onClick={onApprove} className="cred-btn-primary w-full">
            <ShieldCheck className="w-4 h-4 mr-2" /> Approve & Export
          </button>
        ) : (
          <button onClick={onReview} className="cred-btn-primary" disabled={reviewing}>
            {reviewing ? 'Reviewing...' : 'Run ATS Review'}
          </button>
        )}
        <button
          onClick={handleSaveEdits}
          disabled={savingEdits}
          className="cred-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingEdits ? 'Saving...' : 'Save Edits'}
        </button>
        <button
          onClick={handleReject}
          disabled={rejecting}
          className="bg-surface border border-bad text-bad px-6 py-3 rounded-lg font-medium hover:bg-bad/10 hover:border-bad transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rejecting ? 'Rejecting...' : 'Reject'}
        </button>
        <button
          onClick={onDownloadPDF}
          className="cred-btn-secondary"
        >
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </button>
      </div>
    </div>
  );
}

// Visual approval flow: Draft → Review → Approved → Exported.
// Derived from draft.status (draft | edited | approved | rejected).
function StatusStepper({ status }: { status?: string }) {
  const steps = ['Draft', 'Review', 'Approved', 'Exported'];
  const activeIndex = status === 'approved' ? 2 : status === 'edited' ? 1 : 0;
  const rejected = status === 'rejected';

  const statusLabel = rejected
    ? 'Rejected'
    : status === 'approved'
      ? 'Approved'
      : status === 'edited'
        ? 'Edited — re-run ATS review'
        : 'Draft';

  const labelColor = rejected
    ? 'text-bad'
    : status === 'approved'
      ? 'text-ok'
      : 'text-ink';

  return (
    <div className="bg-surface border border-line p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-txt-2">Approval flow</span>
        <span className={`text-xs font-medium ${labelColor}`}>Current: {statusLabel}</span>
      </div>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const done = !rejected && i < activeIndex;
          const active = !rejected && i === activeIndex;
          const isApprovedStep = i === 2;
          const circleClass = done || active
            ? isApprovedStep
              ? 'bg-ok border-ok text-txt'
              : 'bg-ink border-ink text-txt'
            : 'bg-void border-line text-txt-3';
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 min-w-[52px]">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-medium ${circleClass} ${active ? (isApprovedStep ? 'ring-4 ring-ok/20' : 'ring-4 ring-ink/20') : ''} ${rejected ? 'opacity-40' : ''}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-[11px] ${active ? 'text-txt font-medium' : done ? 'text-txt-2' : 'text-txt-3'} ${rejected ? 'opacity-40' : ''}`}>
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 ${done ? (i === 1 ? 'bg-ok' : 'bg-ink') : 'bg-void'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ExportView({ draft, record, onBack }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <button onClick={onBack} className="flex items-center gap-2 text-ink hover:text-txt font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-medium text-txt">Export</h1>
      </div>
      <div className="card">
        <p className="text-txt-2">Your resume is ready for download.</p>
      </div>
    </div>
  );
}
