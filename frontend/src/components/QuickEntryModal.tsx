import React, { useState } from 'react';
import {
  X,
  Plus,
  Briefcase,
  GraduationCap,
  Rocket,
  Target,
  Award,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { careerRecordAPI, chatAPI } from '../api';
import type { CareerRecord, Experience, Project, Education, Skill, Certification, CareerAchievement } from '../types';

const CATEGORIES = [
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'skills', label: 'Skill', icon: Target },
  { id: 'projects', label: 'Project', icon: Rocket },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'certifications', label: 'Certification', icon: Award },
  { id: 'achievements', label: 'Achievement', icon: Sparkles },
];

export default function QuickEntryModal({
  isOpen,
  onClose,
  initialCategory = 'experience',
  record,
  userProfile,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  record: CareerRecord | null;
  userProfile: any;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(initialCategory || 'experience');
  const [mode, setMode] = useState<'form' | 'ai'>('form');

  // Form Fields
  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [current, setCurrent] = useState(false);
  const [bullet, setBullet] = useState('');
  const [metric, setMetric] = useState('');
  const [techStack, setTechStack] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [years, setYears] = useState(2);

  // AI Paste State
  const [rawText, setRawText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAIExtract = async () => {
    if (!rawText.trim()) return;
    setAiParsing(true);
    setError(null);
    try {
      const { data } = await chatAPI.sendMessage({
        messages: [
          {
            role: 'user',
            content: `Extract structured fields from this career accomplishment snippet for category "${category}":
"""${rawText}"""

Respond ONLY with valid JSON conforming to:
{
  "title": string,
  "org": string,
  "bullet": string,
  "metric": string,
  "techStack": string,
  "years": number
}`,
          },
        ],
      });

      let jsonStr = data.reply;
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.org) setOrg(parsed.org);
        if (parsed.bullet) setBullet(parsed.bullet);
        if (parsed.metric) setMetric(parsed.metric);
        if (parsed.techStack) setTechStack(parsed.techStack);
        if (parsed.years) setYears(Number(parsed.years) || 2);
        setMode('form');
      }
    } catch (_err) {
      setError('Could not auto-parse text. Please fill in the fields below.');
    } finally {
      setAiParsing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let activeRecord = record;

      // If user has no record yet, create an initial record
      if (!activeRecord || !activeRecord.id) {
        const initialRecord: Omit<CareerRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
          personalInfo: {
            name: userProfile?.displayName || 'Candidate',
            headline: title || 'Professional',
            location: '',
            email: userProfile?.email || 'user@example.com',
            phone: '',
            linkedin: '',
            portfolio: '',
          },
          experience: [],
          projects: [],
          education: [],
          skills: [],
          certifications: [],
          achievements: [],
        };
        const { data: created } = await careerRecordAPI.create(initialRecord);
        activeRecord = created;
      }

      const updated = { ...activeRecord! };

      if (category === 'experience') {
        const newExp: Experience = {
          id: crypto.randomUUID(),
          company: org.trim() || 'Organization',
          role: title.trim() || 'Role',
          startDate: startDate || new Date().toISOString().slice(0, 7),
          endDate: current ? null : endDate || null,
          current: current,
          achievements: bullet.trim()
            ? [{ text: bullet.trim(), metric: metric.trim() || null }]
            : [],
          skillsUsed: techStack
            ? techStack.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        };
        updated.experience = [newExp, ...(updated.experience || [])];
      } else if (category === 'skills') {
        const newSkill: Skill = {
          name: title.trim(),
          level,
          years: Number(years) || 1,
        };
        updated.skills = [newSkill, ...(updated.skills || [])];
      } else if (category === 'projects') {
        const newProj: Project = {
          id: crypto.randomUUID(),
          name: title.trim() || 'Project',
          description: bullet.trim() || '',
          role: 'Contributor',
          techStack: techStack ? techStack.split(',').map((s) => s.trim()).filter(Boolean) : [],
          outcomes: metric.trim() ? [{ text: bullet.trim(), metric: metric.trim() }] : [],
          link: org.trim() || null,
        };
        updated.projects = [newProj, ...(updated.projects || [])];
      } else if (category === 'education') {
        const newEdu: Education = {
          id: crypto.randomUUID(),
          degree: title.trim() || 'Degree',
          institution: org.trim() || 'Institution',
          startDate: startDate || '',
          endDate: endDate || null,
          honors: metric.trim() || '',
        };
        updated.education = [newEdu, ...(updated.education || [])];
      } else if (category === 'certifications') {
        const newCert: Certification = {
          id: crypto.randomUUID(),
          name: title.trim() || 'Certification',
          issuer: org.trim() || '',
          date: startDate || new Date().getFullYear().toString(),
          url: metric.trim() || '',
        };
        updated.certifications = [newCert, ...(updated.certifications || [])];
      } else if (category === 'achievements') {
        const newAch: CareerAchievement = {
          id: crypto.randomUUID(),
          title: title.trim() || 'Achievement',
          issuer: org.trim() || '',
          description: bullet.trim() || '',
          metric: metric.trim() || '',
        };
        updated.achievements = [newAch, ...(updated.achievements || [])];
      }

      await careerRecordAPI.update(activeRecord!.id!, updated);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#000000] border-l border-[#262626] z-50 flex flex-col shadow-2xl overflow-y-auto rounded-none">
        <header className="h-16 px-5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-sm uppercase tracking-[0.2em] text-white">Career Notebook Entry</h3>
              <p className="caption-mono text-[10px] text-[#999999]">Verified record for Gemini 3.8 Flash</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#999999] hover:text-white transition active:scale-95">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Category Selector Tabs */}
        <div className="p-3.5 border-b border-[#262626] flex items-center gap-1.5 overflow-x-auto bg-[#000000]">
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`h-8 px-3 rounded-full text-xs font-mono uppercase tracking-[0.14em] flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
                  active
                    ? 'border border-white text-white bg-transparent'
                    : 'border border-[#262626] text-[#999999] hover:text-white hover:border-[#3a3a3a]'
                }`}
              >
                <cat.icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#999999]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Entry Mode Switch */}
        <div className="px-5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={`px-3 py-1.5 rounded-full uppercase tracking-[0.14em] transition active:scale-95 ${
                mode === 'form' ? 'border border-white text-white' : 'border border-[#262626] text-[#999999] hover:text-white'
              }`}
            >
              Manual Form
            </button>
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`px-3 py-1.5 rounded-full uppercase tracking-[0.14em] flex items-center gap-1.5 transition active:scale-95 ${
                mode === 'ai' ? 'border border-white text-white' : 'border border-[#262626] text-[#999999] hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-white" />
              <span>Smart Paste (Gemini 3.8)</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-bad/10 border border-bad/20 text-xs text-bad flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 flex-1">
          {mode === 'ai' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-void border border-line text-xs text-txt-2 leading-relaxed">
                Paste any unstructured text — a bullet point from LinkedIn, an email snippet, or raw project notes.
                Gemini will parse it into verified fields.
              </div>
              <textarea
                rows={5}
                className="input-field text-xs resize-none"
                placeholder="e.g. Lead Engineer at Stripe from 2021 to 2024. Architected real-time fraud scoring pipeline using Node and Go, reducing false positives by 38% across $40B payment volume."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAIExtract}
                disabled={aiParsing || !rawText.trim()}
                className="cred-btn-primary w-full text-xs h-9 flex items-center justify-center gap-2"
              >
                {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{aiParsing ? 'Extracting with Gemini...' : 'Extract Fields with Gemini AI'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-txt-3 mb-1">
                  {category === 'experience'
                    ? 'Role / Title'
                    : category === 'skills'
                    ? 'Skill Name'
                    : category === 'projects'
                    ? 'Project Name'
                    : category === 'education'
                    ? 'Degree / Program'
                    : 'Title / Credential'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    category === 'experience'
                      ? 'e.g. Staff Distributed Systems Engineer'
                      : category === 'skills'
                      ? 'e.g. Kubernetes, TypeScript, System Design'
                      : 'e.g. Real-Time Telemetry Engine'
                  }
                  className="input-field text-xs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {category !== 'skills' && (
                <div>
                  <label className="block text-xs font-medium text-txt-3 mb-1">
                    {category === 'education' ? 'Institution' : category === 'projects' ? 'Project URL (optional)' : 'Company / Issuer'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation, Stanford, AWS"
                    className="input-field text-xs"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                  />
                </div>
              )}

              {category === 'skills' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-txt-3 mb-1">Proficiency Level</label>
                    <select
                      className="input-field text-xs"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-txt-3 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      className="input-field text-xs"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-txt-3 mb-1">Start Date</label>
                      <input
                        type="month"
                        className="input-field text-xs"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-txt-3 mb-1">End Date</label>
                      <input
                        type="month"
                        disabled={current}
                        className="input-field text-xs disabled:opacity-40"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {category === 'experience' && (
                    <label className="flex items-center gap-2 text-xs text-txt-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={current}
                        onChange={(e) => setCurrent(e.target.checked)}
                      />
                      <span>I currently work in this role</span>
                    </label>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-txt-3 mb-1">
                      Key Accomplishment Bullet
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Architected streaming ingestion pipeline in Go and Kafka, handling 1.2B daily events with zero data loss."
                      className="input-field text-xs resize-none"
                      value={bullet}
                      onChange={(e) => setBullet(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-txt-3 mb-1">
                      Quantifiable Metric (High ATS value)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 42% latency reduction, $120k cloud cost savings"
                      className="input-field text-xs"
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-txt-3 mb-1">
                      Technologies / Skills Used (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Go, Kubernetes, AWS, PostgreSQL"
                      className="input-field text-xs"
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-bugatti-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="btn-bugatti-primary"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{saving ? 'Adding...' : 'Add to Career Record'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
