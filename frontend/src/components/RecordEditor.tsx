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
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Layers,
  MessageSquare,
  Check,
  ChevronRight,
  Briefcase,
  GraduationCap,
  Award,
  Sliders,
} from 'lucide-react';
import {
  careerRecordAPI,
  matchAPI,
  draftAPI,
  reviewAPI,
  interviewAPI,
  exportAPI,
  resumeAPI,
} from '../api';
import AICopilot from './AICopilot';
import type {
  CareerRecord,
  Experience,
  Project,
  Education,
  Skill,
  Achievement,
  MatchResult,
  ResumeDraft,
  InterviewPrepSession,
  ResumeTemplateType,
} from '../types';

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { error?: string } }; message?: string };
  const status = e?.response?.status;
  const serverMessage = e?.response?.data?.error;
  if (status === 401) return 'Sign in required';
  if (status === 403) return 'You do not have access to this record';
  if (serverMessage && /api[_ -]?key|gemini|not configured|credential|auth/i.test(serverMessage)) {
    return 'AI service unconfigured — contact administrator';
  }
  return serverMessage || e?.message || fallback;
}

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
  });

  const education = record.education || [];
  check(education.length > 0);
  education.forEach((edu) => {
    check(edu.degree);
    check(edu.institution);
  });

  const skills = record.skills || [];
  check(skills.length > 0);
  check(skills.some((s) => (s?.name || '').trim() !== ''));

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
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftStyle, setDraftStyle] = useState<'modern' | 'executive' | 'tech'>('modern');
  const [review, setReview] = useState<any>(null);
  const [reviewing, setReviewing] = useState(false);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrepSession | null>(null);
  const [generatingInterview, setGeneratingInterview] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'match' | 'draft' | 'review' | 'interview' | 'export'>('record');
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateType>('modern');
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Resume upload state
  const [parsedRecord, setParsedRecord] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const completeness = computeCompleteness(record);

  useEffect(() => {
    if (recordId) {
      loadRecord(recordId);
    } else {
      setRecord(getEmptyRecord());
    }
  }, [recordId]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const showToast = (msg: string) => setToastMessage(msg);

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
      showToast('Career record saved');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to save record'));
    } finally {
      setSaving(false);
    }
  };

  const updatePersonal = (field: string, value: string) => {
    if (!record) return;
    setRecord({
      ...record,
      personalInfo: { ...record.personalInfo, [field]: value },
    });
  };

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

  const addSkill = () => {
    if (!record) return;
    const newSkill: Skill = { name: '', level: 'Intermediate', years: 1 };
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

  // Agent Actions
  const handleMatch = async () => {
    if (!record?.id || !jd) {
      if (!record?.id) showToast('Save your record first to match against opportunities');
      return;
    }
    setMatching(true);
    try {
      const { data } = await matchAPI.create({ recordId: record.id, jobDescription: jd });
      setMatchResult(data);
      setActiveTab('match');
      showToast('Opportunity fit calculated');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to generate match analysis'));
    } finally {
      setMatching(false);
    }
  };

  const handleDraft = async () => {
    if (!record?.id || !matchResult?.id) return;
    setDrafting(true);
    try {
      const { data } = await draftAPI.create({
        recordId: record.id,
        matchId: matchResult.id,
        jobDescription: jd,
        style: draftStyle,
      });
      setDraft(data);
      setActiveTab('draft');
      showToast('Tailored resume drafted');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to generate tailored resume'));
    } finally {
      setDrafting(false);
    }
  };

  const handleReview = async () => {
    if (!draft?.id) return;
    setReviewing(true);
    try {
      const { data } = await reviewAPI.create({
        draftId: draft.id,
        jobDescription: jd,
      });
      setReview(data.reviewResult);
      setActiveTab('review');
      showToast('ATS review complete');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to run ATS review'));
    } finally {
      setReviewing(false);
    }
  };

  const handleInterviewPrep = async () => {
    if (!record?.id || !matchResult?.id) return;
    setGeneratingInterview(true);
    try {
      const { data } = await interviewAPI.generate({
        recordId: record.id,
        matchId: matchResult.id,
        jobDescription: jd,
      });
      setInterviewPrep(data);
      setActiveTab('interview');
      showToast('Interview coach session generated');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to generate interview prep'));
    } finally {
      setGeneratingInterview(false);
    }
  };

  const handleApprove = async () => {
    if (!draft?.id) return;
    try {
      await exportAPI.approve(draft.id);
      setDraft({ ...draft, status: 'approved' });
      setActiveTab('export');
      showToast('Draft approved and ready for PDF export');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to approve draft'));
    }
  };

  const handleDownloadPDF = async () => {
    if (!draft?.id) return;
    try {
      const { data } = await exportAPI.pdf(draft.id, selectedTemplate);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credensa_${(record?.personalInfo?.name || 'resume').replace(/\s+/g, '_')}_${selectedTemplate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Resume PDF downloaded');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to download PDF'));
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!draft?.id) return;
    try {
      const { data } = await exportAPI.coverLetter(draft.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover_letter_${(record?.personalInfo?.name || 'candidate').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Cover letter PDF downloaded');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to download Cover Letter PDF'));
    }
  };

  const handleResumeUpload = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const { data } = await resumeAPI.parse(file);
      setParsedRecord(data);
      applyParsedRecord(data);
      showToast(`Resume extracted (${data.source === 'gemini-ai' ? 'Gemini 2.0 AI' : 'Regex parser'})`);
    } catch (err) {
      setParseError(getErrorMessage(err, 'Failed to parse resume'));
    } finally {
      setIsParsing(false);
    }
  };

  const applyParsedRecord = (data: any) => {
    if (!record) return;
    setRecord({
      ...record,
      personalInfo: {
        name: data.name || record.personalInfo.name,
        headline: data.headline || record.personalInfo.headline,
        location: data.location || record.personalInfo.location,
        email: data.email || record.personalInfo.email,
        phone: data.phone || record.personalInfo.phone,
        linkedin: data.linkedin || record.personalInfo.linkedin,
        portfolio: record.personalInfo.portfolio,
      },
      experience: [
        ...record.experience,
        ...(data.experience || []).map((e: any) => ({
          id: crypto.randomUUID(),
          company: e.company || '',
          role: e.role || '',
          startDate: e.startDate || '',
          endDate: e.endDate || null,
          current: e.current || false,
          achievements: (e.achievements || []).map((ach: string) => ({ text: ach, metric: null })),
          skillsUsed: e.skillsUsed || [],
        })),
      ],
      education: [
        ...record.education,
        ...(data.education || []).map((e: any) => ({
          id: crypto.randomUUID(),
          degree: e.degree || '',
          institution: e.institution || '',
          startDate: e.startDate || '',
          endDate: e.endDate || null,
          honors: e.honors || '',
        })),
      ],
      skills: [
        ...record.skills,
        ...(data.skills || []).map((s: string) => ({
          id: crypto.randomUUID(),
          name: s,
          level: 'Intermediate',
          years: 1,
        })),
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Navigation Bar */}
      <div className="border-b border-line pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav aria-label="Studio navigation" className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {[
            { id: 'record', label: 'Record', icon: FileText },
            { id: 'match', label: 'Opportunity Radar', icon: Target, disabled: !matchResult && !jd },
            { id: 'draft', label: 'Tailored Studio', icon: Layers, disabled: !draft },
            { id: 'review', label: 'ATS Review', icon: ShieldCheck, disabled: !draft },
            { id: 'interview', label: 'Interview Coach', icon: MessageSquare, disabled: !matchResult },
            { id: 'export', label: 'Export', icon: Download, disabled: !draft },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={tab.disabled}
                className={`h-9 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 shrink-0 focus-ring transition-colors ${
                  active
                    ? 'bg-raised text-txt border border-line-strong'
                    : tab.disabled
                    ? 'text-txt-3 opacity-40 cursor-not-allowed'
                    : 'text-txt-2 hover:bg-raised hover:text-txt'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${active ? 'text-ink' : 'text-txt-3'}`} strokeWidth={1.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="h-9 px-2.5 sm:px-3 rounded-lg border border-line-strong bg-raised hover:bg-page text-txt text-xs flex items-center gap-1.5 focus-ring"
          >
            <Sparkles className="w-3.5 h-3.5 text-ink" strokeWidth={1.5} />
            <span>Ask Copilot</span>
          </button>
          {activeTab === 'record' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="cred-btn-primary h-9 px-3 sm:px-4 text-xs sm:text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
              <span>{saving ? 'Saving' : 'Save record'}</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="rounded-lg bg-raised border border-line-strong text-txt text-xs px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-ok shrink-0" strokeWidth={1.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CAREER RECORD */}
      {activeTab === 'record' && (
        <div className="space-y-6">
          {/* Completeness Card */}
          <div className="card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-base font-medium text-txt">Career Record</h2>
                <p className="text-xs text-txt-2 mt-0.5">The ground truth for your experience. AI only sharpens what is recorded here.</p>
              </div>
              <div className="text-right meta">
                {completeness.percent}%  ·  {completeness.filled}/{completeness.total} fields
              </div>
            </div>
            <div className="w-full bg-void rounded-full h-1.5 border border-line mt-3">
              <div
                className="h-1.5 rounded-full bg-ink transition-all duration-300"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>

          {/* Resume Import */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-txt">Import from resume</h3>
              <span className="meta">PDF or Word DOCX</span>
            </div>

            <label className="flex flex-col items-center justify-center p-6 rounded-xl border border-line-strong border-dashed hover:bg-raised cursor-pointer transition">
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleResumeUpload(e.target.files[0]);
                }}
              />
              <Upload className="w-5 h-5 text-txt-3 mb-2" strokeWidth={1.5} />
              <span className="text-sm text-txt font-medium">Upload resume file</span>
              <span className="text-xs text-txt-3 mt-1">Extracts contact information, roles, projects, and skills into your record</span>
            </label>

            {isParsing && (
              <div className="mt-3 flex items-center gap-2 text-xs text-txt-2">
                <Loader2 className="w-4 h-4 animate-spin text-ink" />
                <span>Extracting career data from document</span>
              </div>
            )}

            {parseError && (
              <div className="mt-3 text-xs text-bad flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{parseError}</span>
              </div>
            )}

            {parsedRecord && (
              <div className="mt-4 p-4 bg-void border border-line rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-txt">Imported fields</span>
                  <button onClick={() => setParsedRecord(null)} className="text-xs text-txt-3 hover:text-txt">
                    Dismiss
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="badge">{parsedRecord.name || 'Name found'}</span>
                  <span className="badge">{parsedRecord.email || 'Email found'}</span>
                  <span className="badge">{parsedRecord.skills?.length || 0} skills</span>
                  <span className="badge">{parsedRecord.experience?.length || 0} positions</span>
                </div>
              </div>
            )}
          </div>

          {/* Personal Info */}
          <div className="card">
            <h3 className="text-sm font-medium text-txt mb-4">Personal information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-txt-3 mb-1">Full name</label>
                <input
                  className="input-field"
                  placeholder="e.g. Alex Morgan"
                  value={record?.personalInfo.name || ''}
                  onChange={(e) => updatePersonal('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-txt-3 mb-1">Headline</label>
                <input
                  className="input-field"
                  placeholder="e.g. Senior Distributed Systems Engineer"
                  value={record?.personalInfo.headline || ''}
                  onChange={(e) => updatePersonal('headline', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-txt-3 mb-1">Email</label>
                <input
                  className="input-field"
                  placeholder="alex@example.com"
                  value={record?.personalInfo.email || ''}
                  onChange={(e) => updatePersonal('email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-txt-3 mb-1">Phone</label>
                <input
                  className="input-field"
                  placeholder="+1 (555) 012-3456"
                  value={record?.personalInfo.phone || ''}
                  onChange={(e) => updatePersonal('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-txt-3 mb-1">Location</label>
                <input
                  className="input-field"
                  placeholder="San Francisco, CA"
                  value={record?.personalInfo.location || ''}
                  onChange={(e) => updatePersonal('location', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-txt-3 mb-1">LinkedIn profile</label>
                <input
                  className="input-field"
                  placeholder="https://linkedin.com/in/alexmorgan"
                  value={record?.personalInfo.linkedin || ''}
                  onChange={(e) => updatePersonal('linkedin', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-txt">Experience</h3>
              <button onClick={addExperience} className="flex items-center gap-1 text-xs text-ink hover:text-txt font-medium">
                <Plus className="w-3.5 h-3.5" /> Add role
              </button>
            </div>

            {record?.experience.map((exp, idx) => (
              <div key={exp.id || idx} className="p-4 bg-void border border-line rounded-lg mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 mr-3">
                    <div>
                      <label className="block text-[11px] text-txt-3 mb-1">Role</label>
                      <input
                        className="input-field text-sm"
                        placeholder="Staff Engineer"
                        value={exp.role}
                        onChange={(e) => updateExp(idx, 'role', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-txt-3 mb-1">Company</label>
                      <input
                        className="input-field text-sm"
                        placeholder="Acme Corp"
                        value={exp.company}
                        onChange={(e) => updateExp(idx, 'company', e.target.value)}
                      />
                    </div>
                  </div>
                  <button onClick={() => removeExperience(idx)} className="text-bad hover:text-txt p-2" aria-label="Remove experience">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-txt-3 mb-1">Start date</label>
                    <input
                      className="input-field text-xs"
                      type="date"
                      value={exp.startDate}
                      onChange={(e) => updateExp(idx, 'startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-txt-3 mb-1">End date</label>
                    <input
                      className="input-field text-xs"
                      type="date"
                      value={exp.endDate || ''}
                      disabled={exp.current}
                      onChange={(e) => updateExp(idx, 'endDate', e.target.value || null)}
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-txt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => updateExp(idx, 'current', e.target.checked)}
                      />
                      <span>Current role</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 mb-2">
                  <label className="block text-xs text-txt-3">Achievements and metrics</label>
                  {(exp.achievements || []).map((ach, ai) => (
                    <div key={ai} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input
                        className="input-field text-xs flex-1"
                        placeholder="Led migration of data warehouse, improving query performance..."
                        value={typeof ach === 'string' ? ach : ach.text}
                        onChange={(e) => updateAchievement(idx, ai, 'text', e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          className="input-field text-xs flex-1 sm:w-44"
                          placeholder="Metric (e.g. 40% latency drop)"
                          value={typeof ach === 'string' ? '' : ach.metric || ''}
                          onChange={(e) => updateAchievement(idx, ai, 'metric', e.target.value)}
                        />
                        <button
                          onClick={() => {
                            const exps = [...record!.experience];
                            exps[idx].achievements = exps[idx].achievements.filter((_, i) => i !== ai);
                            setRecord({ ...record!, experience: exps });
                          }}
                          className="text-bad hover:text-txt p-2 shrink-0"
                          aria-label="Remove achievement"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addAchievement(idx)} className="text-xs text-ink hover:text-txt font-medium">
                    + Add achievement
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Match Trigger Card */}
          <div className="card">
            <h3 className="text-base font-medium text-txt mb-1">Match with job description</h3>
            <p className="text-xs text-txt-2 mb-4">Paste the target job posting to analyze fit and uncover gaps.</p>
            <textarea
              className="input-field w-full h-36 mb-4 text-xs font-mono"
              placeholder="Paste requirements, responsibilities, and qualifications..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
            <button
              onClick={handleMatch}
              disabled={matching || !jd}
              className="cred-btn-primary w-full disabled:opacity-50"
            >
              {matching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" strokeWidth={1.5} />}
              {matching ? 'Analyzing fit against record' : 'Generate Opportunity Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* 2. OPPORTUNITY RADAR */}
      {activeTab === 'match' && matchResult && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-medium text-txt">Opportunity fit analysis</h2>
              <span className={`badge ${matchResult.tier === 'Strong' ? 'text-ok' : matchResult.tier === 'Ready' ? 'text-ink' : 'text-bad'}`}>
                {matchResult.tier} Fit
              </span>
            </div>

            {/* Score Centerpiece */}
            <div className="flex items-center gap-6 mb-6 pb-6 border-b border-line">
              <div className="text-4xl text-txt font-mono tabular-nums">{matchResult.fitScore}</div>
              <div className="flex-1">
                <div className="text-xs text-txt-3 mb-2">Overall match score</div>
                <div className="w-full bg-void rounded-full h-2 border border-line">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      matchResult.fitScore >= 80 ? 'bg-ok' : matchResult.fitScore >= 60 ? 'bg-ink' : 'bg-bad'
                    }`}
                    style={{ width: `${matchResult.fitScore}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-txt-2 leading-relaxed mb-6">{matchResult.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-void border border-line rounded-lg">
                <h4 className="text-xs font-medium text-txt mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-ok" strokeWidth={1.5} /> Matched competencies ({matchResult.matchedSkills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(matchResult.matchedSkills || []).map((s) => (
                    <span key={s} className="badge">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-void border border-line rounded-lg">
                <h4 className="text-xs font-medium text-txt mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-bad" strokeWidth={1.5} /> Gaps to address ({matchResult.missingSkills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(matchResult.missingSkills || []).map((s) => (
                    <span key={s} className="badge text-bad">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-line">
              <h4 className="text-xs font-medium text-txt mb-2">Key suggestions</h4>
              <ul className="space-y-1.5 text-xs text-txt-2">
                {(matchResult.suggestions || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-ink">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-txt-3">Resume style:</span>
              <select
                value={draftStyle}
                onChange={(e) => setDraftStyle(e.target.value as any)}
                className="input-field text-xs max-w-xs"
              >
                <option value="modern">Modern Clean (ATS standard)</option>
                <option value="executive">Classic Executive (Leadership)</option>
                <option value="tech">Tech Minimal (Engineering)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleInterviewPrep}
                disabled={generatingInterview}
                className="cred-btn-secondary text-sm"
              >
                {generatingInterview ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <MessageSquare className="w-4 h-4 mr-1.5" strokeWidth={1.5} />}
                Interview Coach
              </button>
              <button
                onClick={handleDraft}
                disabled={drafting}
                className="cred-btn-primary text-sm"
              >
                {drafting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Layers className="w-4 h-4 mr-1.5" strokeWidth={1.5} />}
                Draft Tailored Assets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAILORED DRAFT STUDIO */}
      {activeTab === 'draft' && draft && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-medium text-txt">Tailored Resume Draft</h2>
              <p className="text-xs text-txt-2">Aligned with the job requirements. Edit any line before final approval.</p>
            </div>
            <span className="badge">Status: {draft.status}</span>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-txt mb-2">Professional summary</h3>
            <textarea
              className="input-field w-full h-24 text-sm"
              value={draft.content.summary}
              onChange={(e) => setDraft({
                ...draft,
                content: { ...draft.content, summary: e.target.value },
              })}
            />
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-txt mb-3">Tailored experience bullets</h3>
            <div className="space-y-4">
              {draft.content.experience.map((exp: any, ei: number) => (
                <div key={ei} className="p-4 bg-void border border-line rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-txt font-medium">{exp.role} — {exp.company}</span>
                    <span className="meta">{exp.startDate} – {exp.endDate || 'Present'}</span>
                  </div>
                  <div className="space-y-2">
                    {(exp.achievements || []).map((ach: string, ai: number) => (
                      <div key={ai} className="flex items-center gap-2">
                        <span className="text-ink text-xs">•</span>
                        <input
                          className="input-field text-xs flex-1"
                          value={ach}
                          onChange={(e) => {
                            const newExp = [...draft.content.experience];
                            newExp[ei].achievements[ai] = e.target.value;
                            setDraft({ ...draft, content: { ...draft.content, experience: newExp } });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-txt mb-2">Tailored cover letter</h3>
            <textarea
              className="input-field w-full h-44 text-xs font-mono"
              value={draft.content.coverLetter}
              onChange={(e) => setDraft({
                ...draft,
                content: { ...draft.content, coverLetter: e.target.value },
              })}
            />
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setActiveTab('match')} className="cred-btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4 mr-1" strokeWidth={1.5} /> Back to match
            </button>
            <button
              onClick={handleReview}
              disabled={reviewing}
              className="cred-btn-primary text-sm"
            >
              {reviewing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ShieldCheck className="w-4 h-4 mr-1.5" strokeWidth={1.5} />}
              Run ATS Review & Quality Check
            </button>
          </div>
        </div>
      )}

      {/* 4. ATS REVIEW */}
      {activeTab === 'review' && review && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-txt">ATS Quality Review</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono tabular-nums text-txt">{review.atsScore}</span>
                <span className="meta">ATS Compatibility</span>
              </div>
            </div>

            <p className="text-xs text-txt-2 mb-6">{review.summary}</p>

            <div className="space-y-2 mb-6">
              {(review.checks || []).map((check: any) => (
                <div key={check.id} className="p-3 bg-void border border-line rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-txt font-medium">{check.name}</span>
                    {check.suggestion && (
                      <p className="text-[11px] text-txt-3 mt-0.5">{check.suggestion}</p>
                    )}
                  </div>
                  <span className={`badge text-xs ${check.passed ? 'text-ok' : 'text-bad'}`}>
                    {check.passed ? 'Pass' : 'Fix suggested'}
                  </span>
                </div>
              ))}
            </div>

            {/* STAR Rewrites */}
            {review.actionableRewrites && review.actionableRewrites.length > 0 && (
              <div className="mt-6 pt-6 border-t border-line">
                <h4 className="text-xs font-medium text-txt mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ink" strokeWidth={1.5} /> High-impact metric upgrades
                </h4>
                <div className="space-y-3">
                  {review.actionableRewrites.map((rw: any, i: number) => (
                    <div key={i} className="p-3.5 bg-surface border border-line rounded-lg">
                      <div className="text-xs text-txt-3 line-through mb-1">Previous: {rw.original}</div>
                      <div className="text-xs text-txt font-medium mb-1">Upgraded: {rw.improved}</div>
                      <p className="text-[11px] text-txt-3 mb-2">{rw.reason}</p>
                      <button
                        onClick={() => {
                          if (!draft) return;
                          const newExp = draft.content.experience.map((exp: any) => ({
                            ...exp,
                            achievements: exp.achievements.map((ach: string) =>
                              ach === rw.original ? rw.improved : ach
                            ),
                          }));
                          setDraft({ ...draft, content: { ...draft.content, experience: newExp } });
                          showToast('Applied bullet upgrade to draft');
                        }}
                        className="cred-btn-secondary text-xs h-7 px-2.5"
                      >
                        <Check className="w-3.5 h-3.5 mr-1 text-ok" strokeWidth={1.5} /> Apply rewrite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-txt">Human approval</h4>
              <p className="text-xs text-txt-3">Review and approve to unlock PDF generation.</p>
            </div>
            <button
              onClick={handleApprove}
              className="cred-btn-primary text-sm"
            >
              <ShieldCheck className="w-4 h-4 mr-2" strokeWidth={1.5} /> Approve and proceed
            </button>
          </div>
        </div>
      )}

      {/* 5. INTERVIEW COACH */}
      {activeTab === 'interview' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-medium text-txt">Interview Coach</h2>
                <p className="text-xs text-txt-2">Predicted technical and situational questions mapped to your record.</p>
              </div>
              <button
                onClick={handleInterviewPrep}
                disabled={generatingInterview}
                className="cred-btn-secondary text-xs"
              >
                {generatingInterview ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />}
                Regenerate
              </button>
            </div>

            {interviewPrep ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-medium text-txt mb-3">Role-specific technical questions</h3>
                  <div className="space-y-3">
                    {(interviewPrep.technicalQuestions || []).map((tq, i) => (
                      <div key={i} className="p-4 bg-void border border-line rounded-lg">
                        <div className="text-xs font-medium text-txt mb-1">{tq.question}</div>
                        <div className="meta mb-2">Context: {tq.context}</div>
                        <div className="text-xs text-txt-2">
                          <span className="text-ink">Talking points: </span>
                          {(tq.talkingPoints || []).join('  ·  ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-txt mb-3">Behavioral STAR response blueprints</h3>
                  <div className="space-y-3">
                    {(interviewPrep.behavioralQuestions || []).map((bq, i) => (
                      <div key={i} className="p-4 bg-void border border-line rounded-lg">
                        <div className="text-xs font-medium text-txt mb-1">{bq.question}</div>
                        <div className="meta mb-3">Competency: {bq.competency}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-txt-2">
                          <div><strong className="text-txt">Situation:</strong> {bq.starFramework?.situation}</div>
                          <div><strong className="text-txt">Task:</strong> {bq.starFramework?.task}</div>
                          <div><strong className="text-txt">Action:</strong> {bq.starFramework?.action}</div>
                          <div><strong className="text-txt">Result:</strong> {bq.starFramework?.result}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-txt mb-2">Questions to ask the interviewer</h3>
                  <ul className="space-y-1 text-xs text-txt-2">
                    {(interviewPrep.questionsToAskInterviewer || []).map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-ink">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-8 h-8 text-txt-3 mx-auto mb-2" strokeWidth={1.5} />
                <h4 className="text-sm font-medium text-txt mb-1">No interview prep generated</h4>
                <p className="text-xs text-txt-3 mb-4">Synthesize tailored interview intelligence from your record and target role.</p>
                <button
                  onClick={handleInterviewPrep}
                  disabled={generatingInterview}
                  className="cred-btn-primary text-xs"
                >
                  {generatingInterview ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} />}
                  Generate Interview Coach
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. EXPORT */}
      {activeTab === 'export' && draft && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-base font-medium text-txt mb-1">Export verified assets</h2>
            <p className="text-xs text-txt-2 mb-6">Select layout template and download ATS-compliant documents.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  id: 'modern' as ResumeTemplateType,
                  name: 'Modern Clean',
                  desc: 'High readability, balanced margins, subtle dividers. Suited for technology and product roles.',
                },
                {
                  id: 'executive' as ResumeTemplateType,
                  name: 'Classic Executive',
                  desc: 'Traditional Times serif styling, centered header, formal line work. Suited for leadership and management.',
                },
                {
                  id: 'tech' as ResumeTemplateType,
                  name: 'Tech Minimal',
                  desc: 'Compact layout with monospace technical accents and high information density.',
                },
              ].map((tmpl) => {
                const active = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      active ? 'bg-raised border-ink active-rule' : 'bg-surface border-line hover:border-line-strong'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-txt">{tmpl.name}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-ink" strokeWidth={1.5} />}
                    </div>
                    <p className="text-xs text-txt-3 leading-relaxed">{tmpl.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                className="cred-btn-primary text-sm"
              >
                <Download className="w-4 h-4 mr-2" strokeWidth={1.5} /> Download resume PDF
              </button>
              <button
                onClick={handleDownloadCoverLetter}
                className="cred-btn-secondary text-sm"
              >
                <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} /> Download cover letter PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Conversational Agentic Copilot */}
      <AICopilot
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        record={record}
        context={{ activeTab, matchResult, draft, jd }}
      />
    </div>
  );
}
