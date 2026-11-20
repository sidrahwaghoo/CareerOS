import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Loader2,
  RotateCcw,
  ChevronRight,
  Zap,
  Target,
  MessageSquare,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { chatAPI } from '../api';
import type { CareerRecord } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedActions?: string[];
  timestamp: string;
}

const DEFAULT_PROMPTS = [
  { icon: Zap, text: 'Quantify my experience with high-impact STAR metrics' },
  { icon: Target, text: 'Analyze executive compensation bands for my skillset' },
  { icon: MessageSquare, text: 'Run an adversarial technical interview on systems scale' },
  { icon: FileText, text: 'Draft an executive networking note for target opportunities' },
];

export default function AICopilot({
  isOpen,
  onClose,
  record,
  context,
}: {
  isOpen: boolean;
  onClose: () => void;
  record?: CareerRecord | null;
  context?: any;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `I am your **Credensa Career Intelligence Agent**, powered by Google Gemini 3.8 Flash.

I evaluate your Career Record as a precision asset. I can diagnose ATS vulnerabilities, synthesize executive compensation trajectories, rewrite achievements using quantifiable STAR frameworks, or prepare you for high-stakes leadership interviews.

What strategic objective shall we address?`,
      suggestedActions: [
        'Audit my experience bullets for weak verbs',
        'Help me prepare for an upcoming interview',
        'Analyze market compensation for my profile',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || busy) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setBusy(true);

    try {
      const apiPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data } = await chatAPI.sendMessage({
        messages: apiPayload,
        recordId: record?.id,
        context: {
          ...context,
          candidateName: record?.personalInfo?.name,
          headline: record?.personalInfo?.headline,
        },
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'I analyzed your query against your Career Record. What shall we refine next?',
        suggestedActions: data.suggestedActions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Reasoning Engine Notice: ${
          err?.response?.data?.error || err.message || 'Connecting to Gemini intelligence failed. Please check network connectivity.'
        }`,
        suggestedActions: ['Try again', 'Check backend AI health'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Conversation reset. Your verified Career Record remains loaded. What strategic goal are we tackling?',
        suggestedActions: [
          'Audit my experience bullets',
          'Practice interview questions',
          'Tailor for a target opportunity',
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Bugatti Copilot Panel: Sharp 0px edges, Pitch Black Canvas */}
      <aside
        className="fixed inset-y-0 right-0 w-full sm:max-w-md md:max-w-lg bg-[#000000] border-l border-[#262626] z-50 flex flex-col shadow-2xl rounded-none"
      >
        {/* Bugatti Top-Nav Bar */}
        <header className="h-16 px-5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display uppercase text-sm tracking-[0.2em] text-white">
                  Credensa Copilot
                </h3>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-[#262626] text-[#999999]">
                  Gemini 3.8
                </span>
              </div>
              <p className="caption-mono text-[10px] text-[#666666] truncate max-w-[220px]">
                {record?.personalInfo?.name ? record.personalInfo.name : 'Autonomous Career Intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              className="p-2 text-[#999999] hover:text-white transition active:scale-95"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#999999] hover:text-white transition active:scale-95"
              aria-label="Close Copilot"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Message Flow */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#000000]">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="caption-mono text-[10px] text-[#666666]">
                    {isUser ? 'Candidate' : 'Credensa AI'}
                  </span>
                  <span className="caption-mono text-[9px] text-[#666666]">{m.timestamp}</span>
                </div>

                <div
                  className={`relative group max-w-[92%] p-4 text-xs sm:text-sm leading-relaxed rounded-none ${
                    isUser
                      ? 'bg-[#141414] text-white border border-[#3a3a3a]'
                      : 'bg-[#0d0d0d] text-[#e6e6e6] border border-[#262626]'
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text font-serif leading-relaxed">
                    {m.content}
                  </div>

                  {!isUser && (
                    <button
                      onClick={() => handleCopy(m.content, m.id)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 bg-[#000000] border border-[#262626] text-[#999999] hover:text-white transition"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-[#5fa657]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Bugatti Monospace Suggestion Pills */}
                {!isUser && m.suggestedActions && m.suggestedActions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 max-w-[92%]">
                    {m.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(action)}
                        disabled={busy}
                        className="btn-bugatti-secondary text-[10px] py-1.5 px-3 rounded-full flex items-center gap-1.5"
                      >
                        <ChevronRight className="w-3 h-3 text-white shrink-0" />
                        <span>{action}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-[#999999] p-3 bg-[#0d0d0d] border border-[#262626] max-w-xs font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span className="caption-mono text-[10px]">Reasoning with Gemini 3.8 Flash...</span>
            </div>
          )}
        </div>

        {/* Quick starter prompts */}
        {messages.length === 1 && (
          <div className="px-5 py-3 border-t border-[#262626] bg-[#0d0d0d]">
            <p className="caption-mono text-[10px] text-[#666666] mb-2.5">Strategic Prompts</p>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.text)}
                  disabled={busy}
                  className="p-3 bg-[#000000] border border-[#262626] hover:border-white transition flex items-start gap-2 text-left group cursor-pointer"
                >
                  <p.icon className="w-3.5 h-3.5 text-[#999999] group-hover:text-white shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="caption-mono text-[10px] text-[#999999] group-hover:text-white line-clamp-2">
                    {p.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bugatti Input Section: Underline Hairline, Monospace Button */}
        <footer className="p-4 border-t border-[#262626] bg-[#000000] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-3 bg-[#0d0d0d] border border-[#262626] p-3 focus-within:border-white transition-all"
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Direct your career agent... (Press Enter to send)"
              className="flex-1 bg-transparent text-sm text-white placeholder-[#666666] outline-none resize-none font-serif leading-relaxed"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-bugatti-primary h-9 px-4 text-xs shrink-0 disabled:opacity-30"
              aria-label="Send message"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
          <div className="flex items-center justify-between mt-2.5 px-1 caption-mono text-[9px] text-[#666666]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
              Gemini 3.8 Flash Reasoning Engine
            </span>
            <span>Shift+Enter for newline</span>
          </div>
        </footer>
      </aside>
    </>
  );
}
