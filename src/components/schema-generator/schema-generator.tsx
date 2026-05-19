'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Database, Code2, Loader2, Sparkles, Copy, Check, ChevronDown,
  ChevronRight, FileText, Table, Route, Settings2, Terminal, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type GenType = 'schema' | 'api' | 'full';
type GenFormat = 'supabase' | 'prisma' | 'drizzle' | 'raw';

interface SchemaGenResult {
  schema: string;
  apiCode: string;
  tables: string[];
  endpoints: string[];
  warning?: string;
}

export function SchemaGenerator() {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<GenType>('full');
  const [format, setFormat] = useState<GenFormat>('supabase');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SchemaGenResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    schema: true,
    api: true,
  });

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        setIsGenerating(false);
        return;
      }

      const res = await fetch('/api/generate/schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type,
          format,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Generation failed');
        setIsGenerating(false);
        return;
      }

      setResult({
        schema: data.schema || '',
        apiCode: data.apiCode || '',
        tables: data.tables || [],
        endpoints: data.endpoints || [],
        warning: data.warning,
      });

      toast.success('Schema & API generated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, type, format]);

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 h-11 flex items-center justify-between border-b border-[var(--app-border)] shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
          Schema &amp; API Generator
        </h3>
      </div>

      {/* Input Section */}
      <div className="p-4 space-y-4 shrink-0 border-b border-[var(--app-border)]">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'schema' as GenType, label: 'Schema', icon: Database },
            { id: 'api' as GenType, label: 'API Routes', icon: Route },
            { id: 'full' as GenType, label: 'Full Stack', icon: Settings2 },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                'h-8 rounded-[6px] text-[11px] font-medium border transition-colors flex items-center justify-center gap-1.5',
                type === t.id
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                  : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Format selector */}
        <div className="flex gap-2">
          {(['supabase', 'prisma', 'drizzle', 'raw'] as GenFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'h-7 px-2.5 rounded-[4px] text-[9px] font-medium uppercase tracking-wider border transition-colors',
                format === f
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                  : 'border-[var(--app-border)] text-[var(--app-text-dim)] hover:text-[var(--app-text)]'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Prompt input */}
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your data model and API needs...&#10;e.g. 'A blog with posts, comments, and authors. Each post has a title, body, and tags.'"
            className="w-full h-24 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="h-9 w-full rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Schema &amp; API
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isGenerating && !result && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--app-accent)]" />
            <p className="text-[12px] text-[var(--app-text-muted)]">Generating your schema and API routes...</p>
          </div>
        )}

        {result && (
          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="flex gap-3">
              {result.tables.length > 0 && (
                <div className="flex-1 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Table className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                    <span className="text-[10px] font-semibold text-[var(--app-text-dim)] uppercase tracking-wider">Tables</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.tables.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[10px] font-mono text-[var(--app-text-muted)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.endpoints.length > 0 && (
                <div className="flex-1 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Route className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                    <span className="text-[10px] font-semibold text-[var(--app-text-dim)] uppercase tracking-wider">Endpoints</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.endpoints.map((ep) => (
                      <span key={ep} className="px-1.5 py-0.5 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[10px] font-mono text-[var(--app-text-muted)]">
                        {ep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Warning */}
            {result.warning && (
              <div className="flex items-start gap-2 p-3 rounded-[6px] bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700">{result.warning}</p>
              </div>
            )}

            {/* Schema Code */}
            {result.schema && (
              <CodeBlock
                title="Database Schema"
                icon={<Database className="h-3.5 w-3.5 text-[var(--app-accent)]" />}
                code={result.schema}
                language={format === 'prisma' ? 'prisma' : 'sql'}
                isExpanded={expandedSections.schema}
                onToggle={() => setExpandedSections((s) => ({ ...s, schema: !s.schema }))}
                copied={copied === 'schema'}
                onCopy={() => handleCopy(result.schema!, 'schema')}
              />
            )}

            {/* API Code */}
            {result.apiCode && (
              <CodeBlock
                title="API Routes"
                icon={<FileText className="h-3.5 w-3.5 text-[var(--app-accent)]" />}
                code={result.apiCode}
                language="typescript"
                isExpanded={expandedSections.api}
                onToggle={() => setExpandedSections((s) => ({ ...s, api: !s.api }))}
                copied={copied === 'api'}
                onCopy={() => handleCopy(result.apiCode!, 'api')}
              />
            )}

            {/* Empty state */}
            {!result.schema && !result.apiCode && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Code2 className="h-10 w-10 text-[var(--app-text-dim)] mb-3" />
                <p className="text-[12px] text-[var(--app-text-muted)]">No output generated. Try a different prompt.</p>
              </div>
            )}
          </div>
        )}

        {!result && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-12 h-12 rounded-[10px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center mb-4">
              <Database className="h-6 w-6 text-[var(--app-text-dim)]" />
            </div>
            <h4 className="text-[13px] font-medium text-[var(--app-text)] mb-2">Generate from Prompts</h4>
            <p className="text-[11px] text-[var(--app-text-muted)] max-w-[240px] leading-relaxed mb-4">
              Describe your data model in natural language and get production-ready schemas and API routes.
            </p>
            <div className="space-y-1.5 w-full max-w-[280px]">
              {[
                'A task management app with projects, tasks, and comments',
                'An e-commerce platform with products, orders, and reviews',
                'A social network with users, posts, likes, and followers',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="w-full text-left p-2 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] hover:bg-[var(--app-surface)] transition-colors text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({
  title,
  icon,
  code,
  language,
  isExpanded,
  onToggle,
  copied,
  onCopy,
}: {
  title: string;
  icon: React.ReactNode;
  code: string;
  language: string;
  isExpanded: boolean;
  onToggle: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 h-8 bg-[var(--app-panel)] hover:bg-[var(--app-surface)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[var(--app-text-dim)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />}
          {icon}
          <span className="text-[11px] font-medium text-[var(--app-text)]">{title}</span>
          <span className="text-[9px] text-[var(--app-text-dim)] uppercase tracking-wider font-mono">{language}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="h-6 px-2 rounded-[4px] text-[10px] text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors flex items-center gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </button>

      {/* Code */}
      {isExpanded && (
        <div className="max-h-[400px] overflow-y-auto bg-[#0C0F0C]">
          <pre className="p-4 text-[11px] font-mono leading-relaxed text-[#e2e8f0] whitespace-pre-wrap">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
