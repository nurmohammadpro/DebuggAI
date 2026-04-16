/**
 * Debug Screen Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import { useState } from 'react';
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
import { Bug, Loader2, Sparkles, History, Code2 } from 'lucide-react';
import { DEBUG_LANGUAGES } from '@/lib/constants';
import { useDebugStore } from '@/store/debug-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function DebugScreenPage() {
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
      const response = await fetch('/api/debug-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          errorMessage: errorMessage || undefined,
          language: currentLanguage !== 'typescript' ? currentLanguage : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setDetectedLanguage(data.language);

      // Save to store
      addSession({
        id: data.sessionId || Date.now().toString(),
        language: data.language,
        code,
        errorMessage,
        fix: data.analysis,
        explanation: data.analysis,
        timestamp: Date.now(),
        tags: [data.language, errorMessage ? 'error' : 'review'],
      });

      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze code');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const quickPrompts = [
    { label: 'Find potential bugs', code: 'const arr = null;\narr.push(1);' },
    { label: 'Review for best practices', code: 'function fetchData() {\n  var data = [];\n  for(var i=0; i<10; i++) {\n    data.push(i);\n  }\n  return data;\n}' },
    { label: 'Analyze error', code: 'TypeError: Cannot read property "map" of undefined', error: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
            <h1 className="h2">Debug Code</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/debug/history')}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <div className="p-6 space-y-6">
                {/* Language Selector */}
                <div className="space-y-2">
                  <Label>Programming Language</Label>
                  <Select value={currentLanguage} onValueChange={(v) => setCurrentLanguage(v as typeof currentLanguage)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language (auto-detect if not specified)" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEBUG_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">{lang.icon}</Badge>
                            {lang.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detectedLanguage && (
                    <p className="text-xs text-text2">
                      Detected: <Badge variant="green" className="text-xs">{detectedLanguage}</Badge>
                    </p>
                  )}
                </div>

                {/* Code Input */}
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Textarea
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your code here..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                {/* Error Message */}
                <div className="space-y-2">
                  <Label htmlFor="error">Error Message (Optional)</Label>
                  <Textarea
                    id="error"
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="Paste the error message you're seeing..."
                    className="min-h-[80px] font-mono text-sm"
                  />
                </div>

                {/* Quick Prompts */}
                <div className="space-y-2">
                  <Label>Quick Examples</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {quickPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCode(prompt.code);
                          if (prompt.error) {
                            setErrorMessage('Analyze this code for issues');
                          } else {
                            setErrorMessage('');
                          }
                        }}
                        className="text-xs"
                      >
                        {prompt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !code.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Analyze Code
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            <Card>
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="h3">Analysis Results</h2>
                  {detectedLanguage && (
                    <Badge variant="green">{detectedLanguage}</Badge>
                  )}
                </div>
              </div>
              <div className="p-6">
                {analysis ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap">{analysis}</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center text-text2">
                    <Code2 className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-2 text-text">Ready to analyze</p>
                    <p className="text-sm">
                      Paste your code and optionally an error message, then click &quot;Analyze Code&quot; to get AI-powered debugging insights.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
