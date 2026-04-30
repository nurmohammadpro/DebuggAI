'use client';

/**
 * Debug Screen (Client Dashboard)
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bug, Loader2, Sparkles, History, Code2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { DEBUG_LANGUAGES } from '@/lib/constants';
import { useDebugStore } from '@/store/debug-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DebugScreen() {
  const router = useRouter();
  const { currentLanguage, setCurrentLanguage, addSession } = useDebugStore();

  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
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

      // Keep a local session snapshot (recent list)
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">AI Debugger</h1>
          <Badge variant="green" className="ml-2">
            Beta
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Paste code and an error. Get an explanation and a suggested fix.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="font-medium flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                Code + error
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Choose a language or leave auto-detect on.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select
                value={currentLanguage}
                onValueChange={(v) => setCurrentLanguage(v as any)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select language (auto-detect if not specified)" />
                </SelectTrigger>
                <SelectContent>
                  {DEBUG_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/debug/history')}
                className="w-full sm:w-auto"
              >
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">History</span>
                <span className="sm:hidden">History</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="debugCode">Code</Label>
              <Textarea
                id="debugCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                className="mt-1 font-mono text-xs min-h-[200px] sm:min-h-[240px]"
              />
            </div>

            <div>
              <Label htmlFor="debugError">Error (optional)</Label>
              <Textarea
                id="debugError"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="Paste the error message you're seeing..."
                className="mt-1 font-mono text-xs min-h-[80px] sm:min-h-[92px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Credits: <span className="text-foreground">1</span> per analysis
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full sm:w-auto min-w-[180px]"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isAnalyzing ? 'Analyzing…' : 'Analyze'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="font-medium flex items-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Result
            {detectedLanguage ? (
              <Badge variant="outline" className="ml-2 text-xs">
                {detectedLanguage}
              </Badge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Explanation + suggested fix (when available).
          </div>

          <div className="mt-4">
            {analysis ? (
              <div className="prose prose-invert max-w-none text-sm">
                <pre className="whitespace-pre-wrap break-words bg-muted/30 border border-border rounded-md p-4 text-xs leading-relaxed overflow-x-auto">
                  {analysis}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Run an analysis to see results here.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
