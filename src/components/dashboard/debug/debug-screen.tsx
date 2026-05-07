'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bug, Loader2, Sparkles, History, Code2 } from 'lucide-react';

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

export function DebugScreen() {
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

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');
    setDetectedLanguage('');

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

  return (
    <div className="flex flex-col">
      {/* Code Input Section */}
      <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl border border-[var(--app-border)] m-4 sm:m-6 p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">AI Debugger</h1>
            <span className="inline-flex rounded-[6px] border-0 bg-[var(--app-success-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-success)]">
              Beta
            </span>
          </div>
          <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
            Paste code and an error. Get an explanation and a suggested fix.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[var(--app-text)] flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[var(--app-text-dim)]" />
              Code + error
            </div>
            <div className="text-xs text-[var(--app-text-muted)] mt-1">
              Choose a language or leave auto-detect on.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select
              value={currentLanguage}
              onValueChange={(v) => setCurrentLanguage(v as any)}
            >
              <SelectTrigger className="w-full sm:w-[200px] rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)] text-[13px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
                {DEBUG_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => router.push('/dashboard/debug/history')}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="debugCode" className="text-[13px] font-medium text-[var(--app-text-muted)]">Code</label>
            <textarea
              id="debugCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="mt-1 w-full font-mono text-xs min-h-[200px] sm:min-h-[240px] rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3 text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 resize-y"
            />
          </div>

          <div>
            <label htmlFor="debugError" className="text-[13px] font-medium text-[var(--app-text-muted)]">Error (optional)</label>
            <textarea
              id="debugError"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Paste the error message you're seeing..."
              className="mt-1 w-full font-mono text-xs min-h-[80px] sm:min-h-[92px] rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3 text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-[var(--app-text-muted)]">
              Credits: <span className="text-[var(--app-text)]">1</span> per analysis
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-black transition-colors hover:opacity-90 disabled:opacity-50 w-full sm:w-auto min-w-[180px] justify-center"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="rounded-[8px] bg-[var(--app-panel-2)] backdrop-blur-xl border border-[var(--app-border)] mx-4 sm:mx-6 mb-4 sm:mb-6 p-4 sm:p-6">
        <div className="text-[13px] font-medium text-[var(--app-text)] flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-[var(--app-text-dim)]" />
          Result
          {detectedLanguage ? (
            <span className="inline-flex rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
              {detectedLanguage}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-[var(--app-text-muted)] mt-1">
          Explanation + suggested fix (when available).
        </div>

        <div className="mt-4">
          {analysis ? (
            <pre className="whitespace-pre-wrap break-words bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[8px] p-4 text-xs leading-relaxed overflow-x-auto text-[var(--app-text)] font-mono">
              {analysis}
            </pre>
          ) : (
            <div className="text-[13px] text-[var(--app-text-muted)]">
              Run an analysis to see results here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
