/**
 * Minimal Debug Content
 * Simplified version that works with the minimal layout
 */

'use client';

import { useState, useEffect, useRef } from 'react';
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

export function MinimalDebugContent() {
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null;
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

  const handleHistory = () => {
    if (router) {
      router.push('/dashboard/debug/history');
    } else {
      window.location.href = '/dashboard/debug/history';
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel: Input */}
      <div className="w-[400px] border-r border-[var(--border-default)] flex flex-col bg-[var(--bg-secondary)]">
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
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
        <div className="p-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--text-primary)]">Debug Results</span>
            {detectedLanguage && (
              <span className="px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[10px] text-[var(--text-secondary)]">
                {detectedLanguage}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {analysis ? (
            <pre className="whitespace-pre-wrap break-words bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-4 text-[11px] leading-relaxed text-[var(--text-primary)] font-mono">
              {analysis}
            </pre>
          ) : (
            <div className="text-[12px] text-[var(--text-secondary)]">
              Run an analysis to see results here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
