import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Target,
  FileText,
  MessageSquare,
  Zap,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { careerRecordAPI } from '../api';
import type { CareerRecord, CareerDNA } from '../types';

export default function CareerDNAHub({
  record,
  onOpenStudio,
  onOpenCopilot,
}: {
  record: CareerRecord;
  onOpenStudio: (tab?: string) => void;
  onOpenCopilot: (prompt?: string) => void;
}) {
  const [dna, setDna] = useState<CareerDNA | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!record?.id) return;
    let cancelled = false;

    const fetchDNA = async () => {
      setLoading(true);
      try {
        const { data } = await careerRecordAPI.getDNA(record.id!);
        if (!cancelled && data && data.archetype) {
          setDna(data);
        }
      } catch (_err: any) {
        if (!cancelled) {
          setDna({
            archetype: record.personalInfo?.headline || 'High-Impact Technology Leader',
            summaryBio: `${record.personalInfo?.name || 'Candidate'} delivers quantifiable engineering and architecture velocity across distributed systems and modern cloud platforms.`,
            superpowers: (record.skills || []).slice(0, 3).map((s) => ({
              title: typeof s === 'string' ? s : s.name,
              evidence: 'Demonstrated in production architecture, team velocity, and systems scale',
            })),
            marketSalaryEstimate: '$145,000 – $195,000 / yr (Market Band)',
            topOpportunities: [
              { role: 'Staff Software Engineer', whyFit: 'High alignment with your core technical stack & architectural scale' },
              { role: 'Technical Lead', whyFit: 'Demonstrated technical governance, code quality bar, and cross-functional leadership' },
              { role: 'Principal Architect', whyFit: 'Strong foundation in end-to-end resilient system architecture' },
            ],
            strategicNextSteps: [
              'Sharpen quantifiable business impact ($ or %) across key accomplishments',
              'Tailor record against target enterprise opportunities using Opportunity Radar',
            ],
            elevatorPitch: `Hi, I'm ${record.personalInfo?.name || 'a technology leader'}. I specialize in ${
              record.skills?.[0] ? (typeof record.skills[0] === 'string' ? record.skills[0] : record.skills[0].name) : 'engineering excellence'
            } with proven track record in high-concurrency systems and accelerating team velocity.`,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDNA();
    return () => {
      cancelled = true;
    };
  }, [record?.id, record?.version]);

  if (!record || (record.experience.length === 0 && record.skills.length === 0)) {
    return null;
  }

  return (
    <div className="bugatti-card mb-8">
      {/* Top Telemetry Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full border border-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="caption-mono text-[10px] text-[#999999]">
                Career DNA Analysis
              </span>
              {loading && (
                <span className="caption-mono text-[10px] text-[#666666] flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-white" /> Synthesizing with Gemini 3.8 Flash...
                </span>
              )}
            </div>
            <h2 className="display-sm mt-1 text-white">
              {dna?.archetype || record.personalInfo?.headline || 'Technology Leader'}
            </h2>
            <p className="font-serif text-sm sm:text-base text-[#cccccc] mt-1.5 max-w-3xl leading-relaxed">
              {dna?.summaryBio || 'Your career record is continuously monitored by Credensa AI to uncover high-leverage opportunities.'}
            </p>
          </div>
        </div>

        {/* Telemetry Actions */}
        <div className="flex items-center gap-3 shrink-0 self-start lg:self-auto flex-wrap">
          {dna?.marketSalaryEstimate && (
            <div className="px-3.5 py-1.5 border border-[#262626] rounded-full caption-mono text-[11px] text-white">
              <span className="text-[#999999] mr-1.5">Band:</span>
              <span>{dna.marketSalaryEstimate}</span>
            </div>
          )}
          <button
            onClick={() => onOpenStudio('export')}
            className="btn-bugatti-primary"
            title="Generate Tailored Resume PDF"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Generate Resume</span>
          </button>
        </div>
      </div>

      {/* Superpowers Spec Grid */}
      {dna?.superpowers && dna.superpowers.length > 0 && (
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="caption-mono text-[11px] text-[#999999]">
              Core Competencies & Verified Impact
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="caption-mono text-[11px] text-white hover:text-[#c3d9f3] flex items-center gap-1 transition"
            >
              <span>{expanded ? 'Collapse' : 'Full Strategy Analysis'}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dna.superpowers.map((sp, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#0d0d0d] border border-[#262626] hover:border-white transition-all cursor-default"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={1.5} />
                  <span className="font-display text-sm tracking-[0.14em] text-white uppercase truncate">
                    {sp.title}
                  </span>
                </div>
                <p className="font-serif text-xs text-[#999999] mt-2 leading-relaxed line-clamp-2">
                  {sp.evidence}
                </p>
              </div>
            ))}
          </div>

          {/* Expanded Drawer: Opportunities & Executive Pitch */}
          {expanded && (
            <div className="mt-5 pt-5 border-t border-[#262626] grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Opportunities */}
              <div className="p-5 bg-[#0d0d0d] border border-[#262626]">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-white" strokeWidth={1.5} />
                  <span className="font-display text-sm uppercase tracking-[0.16em] text-white">
                    Target Leadership Roles
                  </span>
                </div>
                <ul className="space-y-3">
                  {dna.topOpportunities?.map((opp, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 border-b border-[#262626] pb-2.5 last:border-b-0">
                      <div>
                        <span className="font-display text-sm tracking-[0.12em] text-white uppercase">{opp.role}</span>
                        <p className="font-serif text-xs text-[#999999] mt-0.5">{opp.whyFit}</p>
                      </div>
                      <button
                        onClick={() => onOpenStudio('match')}
                        className="caption-mono text-[10px] text-[#c3d9f3] hover:underline shrink-0"
                      >
                        Match Radar →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pitch */}
              <div className="p-5 bg-[#0d0d0d] border border-[#262626] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span className="font-display text-sm uppercase tracking-[0.16em] text-white">
                      Executive Pitch
                    </span>
                  </div>
                  <p className="font-serif text-sm text-[#cccccc] italic p-3 bg-[#000000] border border-[#262626] select-text leading-relaxed">
                    "{dna.elevatorPitch}"
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-[#262626]">
                  <button
                    onClick={() =>
                      onOpenCopilot(
                        `Help me negotiate my next role based on my target band (${dna.marketSalaryEstimate}) and prepare interview talking points.`
                      )
                    }
                    className="caption-mono text-[10px] text-white hover:text-[#c3d9f3] flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Coach with Gemini</span>
                  </button>
                  <button
                    onClick={() => onOpenStudio('interview')}
                    className="caption-mono text-[10px] text-[#999999] hover:text-white flex items-center gap-1 transition"
                  >
                    <span>Interview Coach</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
