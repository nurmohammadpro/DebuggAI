/**
 * Minimal Debug Content
 * Simplified version that works with the minimal layout
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles, History, Copy, Check, LayoutPanelTop } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { DEBUG_LANGUAGES } from '@/lib/constants';
import { useDebugStore } from '@/store/debug-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DebugSectionId = 'summary' | 'root-cause' | 'fix' | 'tests' | 'raw';

export function MinimalDebugContent() {
  const router = useRouter();
  const {
    currentLanguage,
    setCurrentLanguage,
    currentCode: storedCode,
    currentError: storedError,
    setCurrentCode,
    setCurrentError,
    addSession,
  } = useDebugStore();

  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (storedCode || storedError) {
      setCode(storedCode);
      setErrorMessage(storedError);
      setCurrentCode('');
      setCurrentError('');
    }
    initialized.current = true;
  }, [storedCode, storedError, setCurrentCode, setCurrentError]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [activeSection, setActiveSection] = useState<DebugSectionId>('summary');
  const [mobileView, setMobileView] = useState<'input' | 'results'>('input');

  const sections = useMemo(() => {
    const parsed = parseDebugSections(analysis);
    return [
      { id: 'summary' as const, label: 'Summary', content: parsed.summary },
      { id: 'root-cause' as const, label: 'Root Cause', content: parsed.rootCause },
      { id: 'fix' as const, label: 'Fix', content: parsed.fix },
      { id: 'tests' as const, label: 'Tests', content: parsed.tests },
      { id: 'raw' as const, label: 'Raw', content: analysis || '' },
    ];
  }, [analysis]);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');
    setDetectedLanguage('');
    setActiveSection('summary');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in again');
        return;
      }
      const response = await fetch('/api/debug-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code,
          errorMessage: errorMessage || undefined,
          language:
            currentLanguage !== 'typescript' ? currentLanguage : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setDetectedLanguage(data.language);
      setActiveSection('summary');
      setMobileView('results');

      try {
        addSession({
          id: crypto.randomUUID(),
          language: (data.language || currentLanguage) as any,
          code,
          errorMessage: errorMessage || undefined,
          fix: data.fix || undefined,
          explanation: data.analysis || undefined,
          timestamp: Date.now(),
          tags: [],
        });
      } catch {
        // Non-blocking
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Analysis failed'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHistory = () => {
    router.push('/dashboard/debug/history');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Mobile: view toggle */}
      <div className="lg:hidden border-b border-[var(--border-default)] bg-[var(--bg-primary)] p-2">
        <div className="inline-flex rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
          <button
            type="button"
            onClick={() => setMobileView('input')}
            className={`h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${
              mobileView === 'input'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Input
          </button>
          <button
            type="button"
            onClick={() => setMobileView('results')}
            className={`h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${
              mobileView === 'results'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Results
          </button>
        </div>
      </div>

      {/* Left Panel: Input */}
      <div
        className={`w-full lg:w-[420px] border-r border-[var(--border-default)] flex flex-col bg-[var(--bg-secondary)] ${
          mobileView === 'results' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[14px] font-medium text-[var(--text-primary)]">AI Debug Assistant</h1>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Paste code and get AI-powered analysis
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">Language</label>
            </div>
            <Select
              value={currentLanguage}
              onValueChange={(v) => setCurrentLanguage(v as any)}
            >
              <SelectTrigger className="w-full rounded-[var(--radius-md)] border-[var(--border-default)] bg-[var(--bg-primary)] text-[12px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="rounded-[var(--radius-md)] border-[var(--border-default)] bg-[var(--bg-primary)]">
                {DEBUG_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="debugCode" className="text-[12px] font-medium text-[var(--text-secondary)]">Code</label>
            <textarea
              id="debugCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="mt-1 w-full font-mono text-[11px] min-h-[200px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--text-tertiary)] resize-y"
            />
          </div>

          <div>
            <label htmlFor="debugError" className="text-[12px] font-medium text-[var(--text-secondary)]">Error (optional)</label>
            <textarea
              id="debugError"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Paste the error message..."
              className="mt-1 w-full font-mono text-[11px] min-h-[80px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--text-tertiary)] resize-y"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              onClick={handleHistory}
              className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] px-4 py-2 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
            >
              <History className="h-4 w-4" />
              View History
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-tertiary)] text-center">
            Credits: <span className="text-[var(--text-primary)]">1</span> per analysis
          </div>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className={`flex-1 flex flex-col bg-[var(--bg-primary)] ${mobileView === 'input' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--text-primary)]">Results</span>
            {detectedLanguage && (
              <span className="px-2 py-0.5 rounded-[6px] border border-[var(--border-default)] text-[10px] text-[var(--text-secondary)]">
                {detectedLanguage}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleHistory}
                className="h-8 w-8 rounded-[6px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center justify-center"
                title="History"
                aria-label="History"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                disabled={!analysis}
                onClick={async () => {
                  if (!analysis) return;
                  try {
                    await navigator.clipboard.writeText(analysis);
                    toast.success('Copied');
                  } catch {
                    toast.message('Copy failed');
                  }
                }}
                className="h-8 px-3 rounded-[6px] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 flex-wrap">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={[
                  'h-8 px-2.5 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
                  activeSection === s.id
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!analysis ? (
            <div className="text-[12px] text-[var(--text-secondary)]">
              Run an analysis to see results here.
            </div>
          ) : (
            <div className="space-y-3">
              {activeSection !== 'raw' && (
                <div className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                      {sections.find((s) => s.id === activeSection)?.label}
                    </span>
                    <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                      Structured
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {sections.find((s) => s.id === activeSection)?.content?.trim() || '(no content)'}
                  </div>
                </div>
              )}

              {activeSection === 'raw' && (
                <pre className="whitespace-pre-wrap break-words bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-[6px] p-4 text-[11px] leading-relaxed text-[var(--text-primary)] font-mono">
                  {analysis}
                </pre>
              )}

              <div className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[var(--success)]" />
                  <div className="text-[12px] font-medium text-[var(--text-primary)]">
                    Next action
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Add an “Apply fix in Workspace” action here once we connect debug sessions to threads/projects.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseDebugSections(text: string) {
  const t = (text || '').trim();
  if (!t) return { summary: '', rootCause: '', fix: '', tests: '' };

  // Heuristic parser for the format we request from the edge function.
  // Supports headings like:
  // **Root Cause:** ...  **Fix:** ...  **Explanation:** ...
  const pick = (label: string) => {
    const re = new RegExp(`\\*\\*${escapeRe(label)}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\*\\*\\w|$)`, 'i');
    const m = t.match(re);
    return (m?.[1] || '').trim();
  };

  const rootCause = pick('Root Cause');
  const fix = pick('Fix');
  const tests = pick('Tests');
  const explanation = pick('Explanation');

  const summaryParts = [
    rootCause ? `Cause: ${rootCause.split('\n')[0].slice(0, 220)}` : '',
    fix ? `Fix: ${fix.split('\n')[0].slice(0, 220)}` : '',
  ].filter(Boolean);

  return {
    summary: summaryParts.join('\n'),
    rootCause: rootCause || explanation || t,
    fix: fix || t,
    tests: tests || '',
  };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
