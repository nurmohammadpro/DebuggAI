/**
 * Enhanced Chat Panel v4 — v0.dev-style step-by-step messages
 *
 * Renders AI responses as structured steps:
 *   Thought → Explore → Action → Code → Completion
 *
 * Falls back to plain text + code blocks for non-structured responses.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGeneration } from '@/hooks/use-generation';
import {
  Send,
  Loader2,
  Sparkles,
  X,
  Copy,
  RotateCcw,
  Trash2,
  Check,
  Edit2,
  CheckCheck,
  FileCode2,
  Bot,
  User,
  Layers,
  AlertTriangle,
  ChevronRight,
  Brain,
  CircleCheck,
  Wand,
  Hammer,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { StackSelector } from './stack-selector';
import { PromptTemplates } from '@/components/visual-editor/prompt-templates';
import { MarkdownRenderer } from './markdown-renderer';
import { useShellStore } from '@/store/shell-store';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generation-store';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';
import { getSession } from '@/hooks/use-session';
import { extractCodeBlocks, sanitizeChatContent } from '@/lib/utils/code-extraction';
import { useCodeBlocksStore } from '@/store/code-blocks-store';
import { BRAND_NAME, Logo } from '@/components/logo';
import { csrfHeader } from '@/lib/csrf-client';

// ── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
type MessageStatus = 'thinking' | 'streaming' | 'done' | 'error';

type StepType = 'thought' | 'explore' | 'action' | 'code' | 'completion';
type BuilderMode = 'auto' | 'refactor' | 'fix' | 'polish';

interface StepData {
  type: StepType;
  content: string;
  // For thought steps
  duration?: string;
  // For explore steps
  files?: string[];
  // For action steps
  action?: string;
  // For code steps
  fileName?: string;
  language?: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  steps?: StepData[];
  created_at: string;
  fileCount?: number;
  hasError?: boolean;
  status?: MessageStatus;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

interface ServerChatMessage {
  id: string;
  role: string;
  content?: string | null;
  created_at?: string | null;
  metadata?: unknown;
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  output?: string;
  isError?: boolean;
}

interface EnhancedChatPanelProps {
  className?: string;
  chromeless?: boolean;
  mode?: 'build' | 'debug';
}

const BUILDER_MODES: Array<{
  id: BuilderMode;
  label: string;
  description: string;
  icon: typeof Wand;
}> = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Plan, edit, and verify the right workflow',
    icon: Wand,
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Improve architecture without changing behavior',
    icon: Hammer,
  },
  {
    id: 'fix',
    label: 'Fix',
    description: 'Repair build/runtime issues first',
    icon: AlertTriangle,
  },
  {
    id: 'polish',
    label: 'Polish',
    description: 'Upgrade visual quality and UX details',
    icon: Eye,
  },
];

function buildGenerationDirective(builderMode: BuilderMode, hasExistingFiles: boolean) {
  const projectContext = hasExistingFiles
    ? 'Existing project files are already loaded. Treat this as an iterative edit unless the user explicitly asks for a rebuild.'
    : 'No existing files are loaded. Bootstrap a complete, production-ready project.';

  const architecture = hasExistingFiles
    ? [
        'Maintain a clean multi-file architecture. When adding meaningful UI or behavior, extract it into focused files instead of growing app/page.tsx.',
        'Recommended folders: components/ for reusable UI, hooks/ for stateful logic, lib/ for pure helpers/data/constants, types/ for shared TypeScript types, and app/ for routes/layouts only.',
        'Keep app/page.tsx thin: compose imported sections/components there; do not put a full application in one page file unless the user explicitly asks for a single-file demo.',
      ]
    : [
        'Generate a multi-file Next.js App Router project, not a single giant page file.',
        'Required architecture: app/page.tsx should be a thin route that imports composed UI; app/layout.tsx owns document shell; app/globals.css owns theme/base styles.',
        'Place reusable UI in components/, stateful feature logic in hooks/, pure helpers/constants/sample data in lib/, and shared interfaces in types/.',
        'For small apps, still create at least 5 meaningful source files: app/page.tsx, app/layout.tsx, app/globals.css, one component file, and one hook/lib/type file.',
        'Use complete file blocks with // File: path markers for every file. Do not collapse everything into app/page.tsx.',
      ];

  const shared = [
    projectContext,
    ...architecture,
    'Operate like a senior product engineer: inspect the current project, choose the smallest high-leverage edits, and preserve user intent.',
    'Preserve working structure, imports, route names, package versions, and design tokens unless changing them is required.',
    'Return complete file blocks for every changed file so the editor can apply the update deterministically. Never return partial snippets.',
    'Keep responses concise but useful: say what changed, why it matters, and which files were touched.',
    'Use short status lines before meaningful phases: First, Inspecting, Editing, Verifying, Done, Warning, or Error.',
  ];

  if (builderMode === 'refactor') {
    return [
      'Mode: restructure existing app.',
      ...shared,
      'Goal: improve maintainability, naming, composition, and file boundaries without changing the visible product behavior.',
      'Prefer extracting duplicated UI/data/helpers into components/, hooks/, lib/, or types/ over replacing whole pages.',
      'Preserve public props and routes unless the user explicitly asks for API changes.',
      'If adding layout UI such as nav, mount it in the right layout file and keep client state isolated to client components.',
    ].join('\n');
  }

  if (builderMode === 'fix') {
    return [
      'Mode: resolve runtime or build errors.',
      ...shared,
      'Goal: make the app build and render reliably before improving anything else.',
      'Prioritize root cause, TypeScript correctness, missing dependencies, invalid imports, hydration issues, invalid client/server boundaries, and asset paths.',
      'If an import is broken, either add the missing file/export or replace the import with a local implementation. Do not leave dangling shadcn/ui imports.',
      'Do not add visual polish until the app can build and render.',
    ].join('\n');
  }

  if (builderMode === 'polish') {
    return [
      'Mode: UX polish.',
      ...shared,
      'Goal: make the current UI feel finished, legible, responsive, and intentional without changing product intent or rewriting the app.',
      'Improve background/text contrast, card surfaces, spacing rhythm, section hierarchy, button states, empty/loading states, mobile layout, keyboard focus, and accessible labels.',
      'Prefer app/globals.css design tokens and reusable component class improvements over one-off inline styles.',
      'Avoid decorative gradients, glass effects, nested cards, raw hex colors in JSX, and generic AI-looking bloat.',
    ].join('\n');
  }

  return [
    'Mode: auto.',
    ...shared,
    'Infer whether the user wants a new build, a restructure, error resolution, or a UX polish pass from the prompt and current files.',
    'If the user reports a failure, choose Fix. If they ask for visual quality, choose Polish. If they ask for structure/cleanup, choose Refactor. If the project is empty, choose Bootstrap.',
  ].join('\n');
}

// ── Step Parser ──────────────────────────────────────────────────────────────

function parseStepsFromText(text: string): { steps: StepData[]; remaining: string } {
  const steps: StepData[] = [];

  // Try to parse structured XML-like steps
  const thoughtRegex = /<thought\s*(?:duration="([^"]*)")?\s*>([\s\S]*?)<\/thought>/gi;
  const codeRegex = /<code_block\s*(?:file="([^"]*)"|language="([^"]*)"|\s)*>([\s\S]*?)<\/code_block>/gi;

  let remaining = text;

  // Extract thought steps
  let m: RegExpExecArray | null;
  while ((m = thoughtRegex.exec(text)) !== null) {
    steps.push({ type: 'thought', content: m[2].trim(), duration: m[1] || undefined });
    remaining = remaining.replace(m[0], '');
  }

  // Extract explore steps
  const exploreRegex2 = /<explore\s*(?:files="([^"]*)")?\s*>([\s\S]*?)<\/explore>/gi;
  while ((m = exploreRegex2.exec(text)) !== null) {
    const files = m[1] ? m[1].split(',').map((f) => f.trim()) : undefined;
    steps.push({ type: 'explore', content: m[2].trim(), files });
    remaining = remaining.replace(m[0], '');
  }

  // Extract action steps
  const actionRegex2 = /<action\s*(?:type="([^"]*)")?\s*>([\s\S]*?)<\/action>/gi;
  while ((m = actionRegex2.exec(text)) !== null) {
    steps.push({ type: 'action', content: m[2].trim(), action: m[1] || undefined });
    remaining = remaining.replace(m[0], '');
  }

  // Extract code blocks (markdown-style) as code steps
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  while ((m = codeBlockRegex.exec(text)) !== null) {
    const codeContent = m[2].trim();
    const lang = m[1] || undefined;
    // Try to detect filename from first line comment
    const firstLine = codeContent.split('\n')[0] || '';
    const fileMatch = firstLine.match(/\/\/\s*(.+\.(tsx?|jsx?|css|html))/);
    steps.push({
      type: 'code',
      content: codeContent,
      language: lang,
      fileName: fileMatch ? fileMatch[1] : undefined,
    });
    remaining = remaining.replace(m[0], '');
  }

  // Also try to parse XML code blocks
  while ((m = codeRegex.exec(text)) !== null) {
    const file = m[1] || undefined;
    const lang = m[2] || undefined;
    steps.push({ type: 'code', content: m[3].trim(), fileName: file, language: lang });
    remaining = remaining.replace(m[0], '');
  }

  return { steps, remaining: remaining.trim() };
}

/**
 * Auto-detect steps from plain text when no XML structure is present.
 * Heuristically identifies action-like lines and code blocks.
 */
function detectImplicitSteps(text: string): StepData[] {
  const steps: StepData[] = [];

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isImplicitStepLine(trimmed)) {
      const type = inferImplicitStepType(trimmed);
      steps.push({ type, content: trimmed, action: inferActionKind(trimmed) });
    }
  }

  return steps;
}

function isImplicitStepLine(line: string) {
  return [
    /^(first|next|then|now|finally|after that|before that),?\s+/i,
    /^(i'll|i will|let me|i’m going to|i'm going to|i’ll)\s+/i,
    /^(created|added|updated|fixed|removed|implemented|configured|installed|initialized|refactored|wired|connected|moved|renamed|cleaned up)\s+.+/i,
    /^(done|all set|finished|complete|completed)\b/i,
    /^(warning|error|note):\s+/i,
  ].some((pattern) => pattern.test(line));
}

function inferImplicitStepType(line: string): StepType {
  if (/^(done|all set|finished|complete|completed)\b/i.test(line)) return 'completion';
  if (/^(warning|error):\s+/i.test(line)) return 'thought';
  if (/\b(check|inspect|look at|read|scan|found|noticed|see)\b/i.test(line)) return 'explore';
  return 'action';
}

function inferActionKind(line: string) {
  if (/^(first|let me|i'll start|i will start|i’m going to start|i'm going to start)/i.test(line)) return 'plan';
  if (/\b(check|inspect|look at|read|scan|found|noticed|see)\b/i.test(line)) return 'inspect';
  if (/^(done|all set|finished|complete|completed)\b/i.test(line)) return 'complete';
  if (/\b(fix|error|warning|debug)\b/i.test(line)) return 'fix';
  return 'build';
}

function removeImplicitStepLines(text: string) {
  return text
    .split('\n')
    .filter((line) => !isImplicitStepLine(line.trim()))
    .join('\n')
    .trim();
}

function normalizeToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const argsValue = record.arguments ?? record.args ?? record.input ?? {};
      const args =
        argsValue && typeof argsValue === 'object' && !Array.isArray(argsValue)
          ? (argsValue as Record<string, unknown>)
          : {};
      return {
        id: typeof record.id === 'string' ? record.id : `tool_${index}`,
        name: typeof record.name === 'string'
          ? record.name
          : typeof record.tool_name === 'string'
            ? record.tool_name
            : 'tool',
        args,
        output: typeof record.output === 'string' ? record.output : undefined,
        isError: typeof record.is_error === 'boolean' ? record.is_error : typeof record.error === 'string',
      } satisfies ToolCall;
    })
    .filter(Boolean) as ToolCall[];
}

function summarizeToolArgs(args: Record<string, unknown>): string {
  const preferredKeys = ['path', 'query', 'prompt', 'name', 'file', 'filename', 'tool', 'type'];
  for (const key of preferredKeys) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) {
      return value.length > 90 ? `${value.slice(0, 90)}…` : value;
    }
  }

  const firstString = Object.values(args).find((value) => typeof value === 'string' && value.trim());
  if (typeof firstString === 'string') {
    return firstString.length > 90 ? `${firstString.slice(0, 90)}…` : firstString;
  }

  const entries = Object.entries(args).slice(0, 3);
  if (entries.length === 0) return 'No arguments';
  return entries
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' · ')
    .slice(0, 110);
}

function ToolCallCard({
  call,
  result,
}: {
  call: ToolCall;
  result?: { content: string; isError?: boolean };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--app-surface)]/70 transition-colors"
      >
        <div
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            call.isError || result?.isError ? 'bg-rose-400' : 'bg-emerald-400',
          )}
        />
        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--app-text)] capitalize truncate">
              {call.name.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] text-[var(--app-text-dim)] font-mono truncate">
              {summarizeToolArgs(call.args)}
            </span>
          </div>
        </div>
        <ChevronRight className={cn('h-3 w-3 shrink-0 text-[var(--app-text-dim)] transition-transform', expanded && 'rotate-90')} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--app-border)] px-3 py-2 space-y-2">
          <div className="space-y-1">
            {Object.entries(call.args).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[10px] leading-relaxed">
                <span className="shrink-0 text-[var(--app-text-dim)]">{key}:</span>
                <span className="min-w-0 break-words text-[var(--app-text-muted)] font-mono">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
          {result?.content && (
            <div className={cn(
              'rounded-[8px] border px-2.5 py-2 text-[11px] leading-relaxed whitespace-pre-wrap break-words',
              result.isError
                ? 'border-rose-500/20 bg-rose-500/10 text-rose-100'
                : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)]',
            )}>
              {result.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rich Text Renderer ─────────────────────────────────────────────────────

function RichTextContent({ content }: { content: string }) {
  if (!content || !content.trim()) {
    return <p className="text-[13px] text-[var(--app-text-dim)] italic">Done.</p>;
  }

  // Strip code blocks (they go to the file tree, not the chat)
  const displayContent = content.replace(/```[\s\S]*?```/g, '').trim();
  if (!displayContent) {
    return <p className="text-[13px] text-[var(--app-text-dim)] italic">Code generated — view in the editor panel.</p>;
  }

  // Split content into paragraphs, preserve inline code and basic formatting
  const paragraphs = displayContent.split(/\n{2,}/);

  return (
    <div className="text-[13px] leading-relaxed text-[var(--app-text)] space-y-2">
      {paragraphs.map((para, i) => {
        if (!para.trim()) return null;

        // Check if this paragraph is a heading
        const headingMatch = para.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
          return (
            <h3 key={i} className="text-[14px] font-bold text-[var(--app-text)] mt-3 first:mt-0">
              {formatInline(headingMatch[1])}
            </h3>
          );
        }

        // Check if this is a list item
        if (/^[-*+]\s/.test(para.trim())) {
          const items = para.split(/\n/).filter((l) => /^[-*+]\s/.test(l.trim()));
          return (
            <ul key={i} className="space-y-0.5 pl-4">
              {items.map((item, j) => (
                <li key={j} className="text-[13px] leading-relaxed flex items-start gap-1.5">
                  <span className="text-[var(--app-text-dim)] mt-0.5 shrink-0">•</span>
                  <span>{formatInline(item.replace(/^[-*+]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraph with inline formatting
        return <p key={i}>{formatInline(para)}</p>;
      })}
    </div>
  );
}

/** Format bold, inline code, and links within a text fragment */
function formatInline(text: string): React.ReactNode {
  // Split on inline elements and reconstruct
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const found = match[1];
    if (found.startsWith('`') && found.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 rounded-[3px] bg-[var(--app-surface)] text-[11px] font-mono text-[var(--app-accent)]">
          {found.slice(1, -1)}
        </code>
      );
    } else if (found.startsWith('**') && found.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {found.slice(2, -2)}
        </strong>
      );
    } else if (match[2] && match[3]) {
      // Link: [text](url)
      parts.push(
        <span key={match.index} className="text-[var(--app-accent)] underline cursor-pointer">
          {match[2]}
        </span>
      );
    }

    lastIndex = match.index + found.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

// ── Step Renderers ───────────────────────────────────────────────────────────

function ThoughtStep({ step, defaultExpanded }: { step: StepData; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-0 py-1 text-left transition-colors"
      >
        <span className="text-[11px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider">
          {step.duration ? `Thought · ${step.duration}` : 'Thought'}
        </span>
        <span className="flex-1" />
        <ChevronRight className={`h-3 w-3 text-[var(--app-text-dim)] transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <p className="text-[12px] text-[var(--app-text-muted)] leading-relaxed whitespace-pre-wrap px-0 py-1">{step.content}</p>
      )}
    </div>
  );
}

function ExploreStep({ step }: { step: StepData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-0 py-1 text-left transition-colors"
      >
        <span className="text-[11px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider">
          Explore{step.files ? ` · ${step.files.length} file${step.files.length !== 1 ? 's' : ''}` : ''}
        </span>
        <span className="flex-1" />
        <ChevronRight className={`h-3 w-3 text-[var(--app-text-dim)] transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-1">
          {step.files && step.files.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {step.files.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--app-surface)] text-[10px] font-mono text-[var(--app-text-muted)]"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
          {step.content && (
            <p className="text-[12px] text-[var(--app-text-muted)] leading-relaxed">{step.content}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ActionStep({ step, index }: { step: StepData; index: number }) {
  const Icon =
    step.action === 'plan'
      ? Wand
      : step.action === 'inspect'
        ? Eye
        : step.action === 'complete'
          ? CircleCheck
          : Hammer;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-start gap-2 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--app-accent)]/20 bg-[var(--app-accent)]/10 text-[var(--app-accent)]">
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0">
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
          Step {index + 1}
        </div>
        <p className="text-[12px] text-[var(--app-text)] leading-relaxed">{step.content}</p>
      </div>
    </div>
  );
}

function CodeStep({ step, onCopy }: { step: StepData; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(step.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="rounded-[8px] border border-[var(--app-border)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 bg-[var(--app-panel-2)]">
      {step.fileName && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--app-border)]">
          <FileCode2 className="h-3 w-3 text-[var(--app-text-dim)]" />
          <span className="text-[11px] font-mono text-[var(--app-text-muted)]">{step.fileName}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-3 text-[12px] leading-relaxed font-mono text-[var(--app-text)] overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
          {step.content}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 h-7 w-7 rounded-[6px] flex items-center justify-center bg-[var(--app-panel)] hover:bg-[var(--app-surface)] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-[var(--app-success)]" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

function CompletionStep({ step, fileCount }: { step: StepData; fileCount?: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-start gap-2 rounded-[8px] border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <div className="min-w-0">
      <p className="text-[12px] text-[var(--app-text)] leading-relaxed">{step.content}</p>
      {fileCount && fileCount > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          <FileCode2 className="h-3 w-3 text-[var(--app-text-dim)] shrink-0" />
          <span className="text-[11px] font-medium text-[var(--app-text-muted)]">
            {fileCount} file{fileCount !== 1 ? 's' : ''} generated
          </span>
        </div>
      )}
      </div>
    </div>
  );
}

function AssistantResponseContent({
  content,
  fileCount,
}: {
  content: string;
  fileCount?: number;
}) {
  const parsed = parseStepsFromText(content);
  const implicitSteps = parsed.steps.length > 0 ? [] : detectImplicitSteps(content);
  const steps = parsed.steps.length > 0 ? parsed.steps : implicitSteps;
  const remaining = parsed.steps.length > 0 ? parsed.remaining : removeImplicitStepLines(content);

  if (steps.length === 0) {
    return <MarkdownRenderer content={content} />;
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        if (step.type === 'thought') return <ThoughtStep key={`${step.type}-${index}`} step={step} />;
        if (step.type === 'explore') return <ExploreStep key={`${step.type}-${index}`} step={step} />;
        if (step.type === 'code') return <CodeStep key={`${step.type}-${index}`} step={step} />;
        if (step.type === 'completion') {
          return <CompletionStep key={`${step.type}-${index}`} step={step} fileCount={fileCount} />;
        }
        return <ActionStep key={`${step.type}-${index}`} step={step} index={index} />;
      })}
      {remaining.trim() && (
        <div className="pt-1">
          <MarkdownRenderer content={remaining} />
        </div>
      )}
    </div>
  );
}

// ── Tool Timeline (agent loop diff view) ─────────────────────────────────
type ToolEvent = { type: 'tool_call'; id: string; name: string; args: Record<string, unknown> } | { type: 'tool_result'; tool_call_id: string; output: string; is_error?: boolean };

function ToolTimeline({ events }: { events: ToolEvent[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!events.length) return null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-[8px] border border-[var(--app-border)] overflow-hidden bg-[var(--app-panel-2)] animate-in fade-in duration-300">
      <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
          Changes
        </span>
        <span className="text-[9px] text-[var(--app-text-dim)] ml-auto">{events.filter(e => e.type === 'tool_call').length} action{events.filter(e => e.type === 'tool_call').length !== 1 ? 's' : ''}</span>
      </div>
      <div className="max-h-[200px] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
        {events.map((evt, i) => {
          if (evt.type === 'tool_call') {
            const result = events.find((r): r is Extract<ToolEvent, { type: 'tool_result' }> => r.type === 'tool_result' && r.tool_call_id === evt.id);
            const isExpanded = expanded.has(evt.id);
            const hasError = result ? result.is_error : false;
            return (
              <div key={i} className="border-b border-[var(--app-border)] last:border-b-0">
                <button
                  onClick={() => toggleExpand(evt.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--app-surface)] transition-colors"
                >
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    evt.name === 'write_file' || evt.name === 'line_replace' ? 'bg-amber-400' :
                    evt.name === 'view_file' || evt.name === 'list_dir' ? 'bg-blue-400' :
                    evt.name === 'search_files' ? 'bg-purple-400' :
                    hasError ? 'bg-rose-400' : 'bg-emerald-400'
                  )} />
                  <span className="text-[11px] font-medium text-[var(--app-text)] capitalize truncate">{evt.name.replace(/_/g, ' ')}</span>
                  {typeof evt.args?.path === 'string' && (
                    <span className="text-[10px] text-[var(--app-text-dim)] font-mono truncate">{String(evt.args.path)}</span>
                  )}
                  <ChevronRight className={cn('h-3 w-3 text-[var(--app-text-dim)] ml-auto shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {Object.entries(evt.args).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[10px]">
                        <span className="text-[var(--app-text-dim)] shrink-0">{k}:</span>
                        <span className="text-[var(--app-text-muted)] font-mono truncate">{typeof v === 'string' ? (v.length > 80 ? v.slice(0, 80) + '…' : v) : JSON.stringify(v)}</span>
                      </div>
                    ))}
                    {result && (
                      <div className={cn('mt-1 text-[10px]', result.is_error ? 'text-[var(--app-danger)]' : 'text-[var(--app-text-dim)]')}>
                        {result.output.slice(0, 200)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[8px] w-fit">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold text-[var(--app-accent)]/70 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function AssistantActivityList({
  status,
  hasFiles,
  fileCount,
}: {
  status?: MessageStatus;
  hasFiles: boolean;
  fileCount?: number;
}) {
  const isActive = status === 'thinking' || status === 'streaming';
  const tasks = [
    {
      label: status === 'thinking' ? 'Reading your request' : 'Writing the response',
      icon: Brain,
      active: status === 'thinking' || status === 'streaming',
      done: status === 'done' || status === 'streaming',
    },
    {
      label: hasFiles || fileCount ? `${fileCount || ''} file${fileCount === 1 ? '' : 's'} prepared`.trim() : 'Preparing project files',
      icon: Hammer,
      active: isActive && !hasFiles,
      done: hasFiles || Boolean(fileCount),
    },
    {
      label: 'Code is available in the editor pane',
      icon: Eye,
      active: false,
      done: hasFiles || Boolean(fileCount),
    },
  ];

  return (
    <div className="space-y-1.5">
      {tasks.map((task) => {
        const Icon = task.icon;
        return (
          <div key={task.label} className="flex items-center gap-2 text-[11px] text-[var(--app-text-muted)]">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                task.done
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                  : task.active
                    ? 'border-[var(--app-accent)]/30 bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-dim)]',
              )}
            >
              {task.done ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className={cn('h-3 w-3', task.active && 'animate-pulse')} />
              )}
            </span>
            <span>{task.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  hasContent,
  hasFiles,
}: {
  status: MessageStatus;
  hasContent: boolean;
  hasFiles: boolean;
}) {
  const iconClass = 'h-2.5 w-2.5';

  if (status === 'thinking') {
    return (
      <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
        <Brain className={iconClass} />
        Thinking
      </span>
    );
  }

  if (status === 'streaming') {
    return (
      <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
        <Wand className={iconClass} />
        {hasContent ? 'Writing' : 'Generating'}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--app-danger)]">
        <AlertTriangle className={iconClass} />
        Error
      </span>
    );
  }

  // done
  return (
    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
      <CircleCheck className={cn(iconClass, hasFiles ? 'text-emerald-400' : '')} />
      {hasFiles ? 'Complete' : 'Done'}
    </span>
  );
}

// ── Skeleton Streaming Content ───────────────────────────────────────────────

function SkeletonStreamingContent({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      {content && (
        <div className="animate-fade-in">
          <MarkdownRenderer content={content} />
        </div>
      )}
      <div className="space-y-2 pt-1">
        <div
          className="h-3 rounded-[4px] bg-gradient-to-r from-[var(--app-surface)] via-[var(--app-panel-2)] to-[var(--app-surface)] bg-[length:200%_100%] animate-shimmer"
          style={{ width: '70%' }}
        />
        <div
          className="h-3 rounded-[4px] bg-gradient-to-r from-[var(--app-surface)] via-[var(--app-panel-2)] to-[var(--app-surface)] bg-[length:200%_100%] animate-shimmer"
          style={{ width: '85%', animationDelay: '0.15s' }}
        />
        <div
          className="h-3 rounded-[4px] bg-gradient-to-r from-[var(--app-surface)] via-[var(--app-panel-2)] to-[var(--app-surface)] bg-[length:200%_100%] animate-shimmer"
          style={{ width: '60%', animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
}

// ── Generated Files Badge ────────────────────────────────────────────────────

function GeneratedFilesBadge({ codeBlocks }: { codeBlocks: Array<{ fileName?: string; language?: string }> }) {
  const fileNames = codeBlocks.map((b) => b.fileName).filter(Boolean) as string[];
  const displayText = fileNames.length > 0
    ? fileNames.slice(0, 3).join(', ') + (fileNames.length > 3 ? ` +${fileNames.length - 3}` : '')
    : `${codeBlocks.length} files`;

  return (
    <div className="mt-2 pt-2 border-t border-[var(--app-border)] flex items-center gap-1.5 text-[10px] text-[var(--app-text-dim)]">
      <FileCode2 className="h-3 w-3 shrink-0" />
      <span className="truncate">{displayText}</span>
      <span className="shrink-0 opacity-60">· view in code pane</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function EnhancedChatPanel({
  className,
  chromeless = false,
  mode = 'build',
}: EnhancedChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  // Ref gate — prevents empty state flash during thread sync
  const threadBootedRef = useRef(false);

  const { currentThreadId, accumulated, resetAccumulated, files } = useGenerationStore();
  const { addCodeBlocks, setStreaming, reset: resetCodeBlocks } = useCodeBlocksStore();
  const { setSidebarCollapsed } = useShellStore();
  const hasExistingFiles = Boolean(files && Object.values(files.files).some((file) => file.status !== 'deleted'));

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, accumulated]);

  // Clear chat when switching projects (thread truly gone)
  useEffect(() => {
    if (currentThreadId) {
      threadBootedRef.current = true;
      return;
    }
    // Only clear if we previously had a thread (project switch, not initial mount)
    if (threadBootedRef.current) {
      setMessages([]);
      setHasSentFirstMessage(false);
      resetAccumulated();
      resetCodeBlocks();
      setStreaming(false);
      threadBootedRef.current = false;
    }
  }, [currentThreadId, resetAccumulated, resetCodeBlocks, setStreaming]);

  const loadThreadMessages = useCallback(async (threadId: string) => {
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/threads/${threadId}/messages?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const j = await res.json().catch(() => ({}));
    const list = (j?.messages || []) as ServerChatMessage[];

    const serverMessages: ChatMessage[] = list.map((m) => {
      const rawContent = String(m.content || '');
      const { text: content, codeBlocks } = extractCodeBlocks(rawContent);
      if (codeBlocks.length > 0) addCodeBlocks(codeBlocks);
      const metadata = m && typeof m.metadata === 'object' && m.metadata ? (m.metadata as Record<string, unknown>) : {};
      const toolCalls = normalizeToolCalls(metadata.tool_calls ?? metadata.toolCalls);
      const toolCallId = typeof metadata.tool_call_id === 'string' ? metadata.tool_call_id : undefined;
      const toolName = typeof metadata.tool_name === 'string' ? metadata.tool_name : undefined;
      const resolvedToolCalls = toolCalls.length > 0
        ? toolCalls
        : toolName
          ? [{
              id: toolCallId || String(m.id),
              name: toolName,
              args: {},
              output: content,
            }]
          : undefined;
      return {
        id: String(m.id),
        role: m.role as MessageRole,
        content,
        created_at: String(m.created_at || new Date().toISOString()),
        fileCount: codeBlocks.length > 0 ? codeBlocks.length : undefined,
        toolCalls: resolvedToolCalls,
        toolCallId,
        status: m.role === 'assistant' ? 'done' : undefined,
        hasError: Boolean(metadata.has_error),
      };
    });

    // Merge: keep local user messages not yet synced to server.
    setMessages((prev) => {
      const pendingLocal = prev.filter((m) => {
        if (!m.id.startsWith('local_')) return false;
        if (m.role === 'assistant') {
          return m.id === streamingMessageIdRef.current || m.status === 'thinking' || m.status === 'streaming';
        }
        return m.role === 'user'
          ? !serverMessages.some((s) => s.role === 'user' && s.content === m.content)
          : false;
      });
      return [...serverMessages, ...pendingLocal].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, [addCodeBlocks]);

  // Load thread on boot
  useEffect(() => {
    if (!currentThreadId) return;
    threadBootedRef.current = true;
    loadThreadMessages(currentThreadId).catch(() => {});
  }, [currentThreadId, loadThreadMessages]);

  // Real-time streaming: extract code blocks from partial response
  useEffect(() => {
    if (isLoading && accumulated) {
      setStreaming(true);
      const { codeBlocks } = extractCodeBlocks(accumulated);
      if (codeBlocks.length > 0) addCodeBlocks(codeBlocks);
    }
  }, [accumulated, isLoading, addCodeBlocks, setStreaming]);

  const autoSaveCode = useCallback(async () => {
    try {
      const state = useGenerationStore.getState();
      const { currentProjectId, currentThreadId, files } = state;
      if (!currentProjectId || !files || Object.keys(files.files).length === 0) return;

      // Serialize current files and save to generations table
      const serializedCode = serializeVirtualFiles(files);
      if (!serializedCode || serializedCode.length < 20) return;

      const session = await getSession();
      const token = session.session?.access_token;
      if (!token) return;

      const promptText = state.accumulated?.slice(0, 200) || undefined;

      await fetch(`/api/projects/${currentProjectId}/save-code`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...csrfHeader(),
        },
        body: JSON.stringify({
          code: serializedCode,
          prompt: promptText,
          description: `Auto-saved ${new Date().toLocaleString()}`,
          stack: undefined,
          threadId: currentThreadId || undefined,
        }),
      }).catch(() => {
        // Silent fail — manual save via button still works
      });
    } catch {
      // Silent fail
    }
  }, []);

  const updateStreamingAssistant = useCallback((updater: (message: ChatMessage) => ChatMessage) => {
    const streamingId = streamingMessageIdRef.current;
    if (!streamingId) return;
    setMessages((prev) => prev.map((message) => (message.id === streamingId ? updater(message) : message)));
  }, []);

  const appendStreamingChunk = useCallback((chunk: string) => {
    if (!chunk) return;
    const rawAccumulated = useGenerationStore.getState().accumulated || chunk;
    const displayContent = sanitizeChatContent(rawAccumulated);
    updateStreamingAssistant((message) => ({
      ...message,
      content: displayContent,
      status: 'streaming', // Transition thinking→streaming on first chunk
      fileCount: undefined, // Will be updated on done
    }));
  }, [updateStreamingAssistant]);

  const { generate, agentTurn, ensureThreadId, cancel } = useGeneration({
    onChunk: appendStreamingChunk,
    onDone: async () => {
      setIsLoading(false);
      setStreaming(false);

      const { accumulated: latestAccumulated, files: currentFiles } = useGenerationStore.getState();
      const fullText = (latestAccumulated || '').trim();
      const streamingId = streamingMessageIdRef.current;
      const parsedCodeBlocks = fullText ? extractCodeBlocks(fullText).codeBlocks : [];

      // Count files that were generated
      const generatedFileCount = currentFiles
        ? Object.values(currentFiles.files).filter(
            (file) => file.status !== 'deleted' && file.content.trim().length > 0,
          ).length
        : parsedCodeBlocks.length;

      if (parsedCodeBlocks.length > 0) {
        addCodeBlocks(parsedCodeBlocks);
      }

      const sanitizedText = sanitizeChatContent(fullText);
      const finalContent = sanitizedText || (
        generatedFileCount > 0
          ? 'I prepared the project files. You can review them in the editor pane.'
          : 'Done.'
      );
      const threadIdForPersistence = useGenerationStore.getState().currentThreadId;

      if (streamingId) {
        updateStreamingAssistant((message) => ({
          ...message,
          content: finalContent,
          status: 'done',
          fileCount: generatedFileCount > 0 ? generatedFileCount : message.fileCount,
        }));
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `local_assistant_${Date.now()}`,
            role: 'assistant',
            content: finalContent,
            created_at: new Date().toISOString(),
            status: 'done',
            fileCount: generatedFileCount > 0 ? generatedFileCount : undefined,
          },
        ]);
      }

      resetAccumulated();
      // Auto-save generated code to generations table for project persistence
      await autoSaveCode();
      if (threadIdForPersistence) {
        try {
          const session = await getSession();
          const token = session.session?.access_token;
          if (token) {
            await fetch(`/api/threads/${threadIdForPersistence}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...csrfHeader(),
              },
              body: JSON.stringify({
                role: 'assistant',
                content: fullText || finalContent,
                metadata: {
                  source: 'chat-panel',
                  fileCount: generatedFileCount,
                },
              }),
            });
          }
        } catch {
          // Chat history persistence is best-effort; project code is already saved.
        }
      }
      streamingMessageIdRef.current = null;
    },
    onError: (error) => {
      const streamingId = streamingMessageIdRef.current;
      if (streamingId) {
        updateStreamingAssistant((message) => ({
          ...message,
          content: `Something went wrong\n\n${error.message}`,
          hasError: true,
          status: 'error',
        }));
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `Something went wrong\n\n${error.message}`,
            created_at: new Date().toISOString(),
            hasError: true,
            status: 'error',
          },
        ]);
      }
      setIsLoading(false);
      setStreaming(false);
      streamingMessageIdRef.current = null;
      toast.error('Generation failed');
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setSidebarCollapsed(true);
    resetCodeBlocks();
    setHasSentFirstMessage(true);
    setToolEvents([]); // Reset tool events for new agent turn

    const text = input.trim();
    setInput('');
    setIsLoading(true);
    resetAccumulated();
    setStreaming(true);

    const assistantId = `local_assistant_${Date.now()}`;
    streamingMessageIdRef.current = assistantId;

    setMessages((prev) => [
      ...prev,
      {
        id: `local_user_${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        status: 'thinking',
      },
    ]);

    try {
      const threadId = await ensureThreadId();
      const session = await getSession();
      const token = session.session?.access_token;
      if (token) {
        await fetch(`/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...csrfHeader(),
          },
          body: JSON.stringify({ role: 'user', content: text, metadata: { source: 'chat-panel' } }),
        });
      }

      // When existing project files are loaded, include them as context so the AI
      // can make targeted edits instead of guessing the current code. This is
      // essential for refactor/fix/polish to produce correct file blocks.
      let fullPrompt = text;
      if (hasExistingFiles && files) {
        const serialized = serializeVirtualFiles(files);
        const tokenEstimate = serialized.length / 4; // rough: ~4 chars per token
        // Fallback generation is an emergency path; keep context compact so
        // Groq/DeepSeek free-tier limits do not reject polish/refactor prompts.
        const truncated = tokenEstimate > 2500
          ? serialized.slice(0, 10000) + '\n// ... (truncated for length)'
          : serialized;
        fullPrompt = `${text}\n\n--- CURRENT PROJECT FILES ---\n${truncated}\n--- END PROJECT FILES ---\n\nApply the changes above to the existing project. Return complete file blocks for every changed file using the // File: path format.`;
      }

      const generationDirective = buildGenerationDirective(builderMode, hasExistingFiles);

      // Try agent loop first (tool-calling, surgical edits).
      // ANY failure — 404, 500, network error, parse error — falls back to
      // single-shot generate. The user should never lose code generation
      // just because the agent route isn't deployed yet.
      let agentResult: string | null = null;
      const toolEventsAccum: ToolEvent[] = [];
      try {
        agentResult = await agentTurn(
          { prompt: text, persistUserMessage: false, generationDirective },
          (evt) => { toolEventsAccum.push(evt); setToolEvents([...toolEventsAccum]); },
        );
      } catch {
        // Agent loop failed (not deployed, Supabase down, etc.) → fall through
        agentResult = null;
      }

      if (agentResult === null) {
        // Agent route not available — fall back to single-shot generate
        await generate({
          prompt: fullPrompt,
          persistUserMessage: false,
          generationDirective,
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
      updateStreamingAssistant((message) => ({
        ...message,
        content: `Something went wrong\n\n${error instanceof Error ? error.message : 'Generation failed'}`,
        hasError: true,
        status: 'error',
      }));
    } finally {
      setIsLoading(false);
      setStreaming(false);
      streamingMessageIdRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content).catch(() => {});
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleEditMessage = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditingContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessageId ? { ...m, content: editingContent } : m
      )
    );
    setEditingMessageId(null);
    setEditingContent('');
    toast.success('Message updated');
  };

  const handleRegenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setMessages((prev) => {
      const lastAiIdx = [...prev].reverse().findIndex((m) => m.role === 'assistant');
      if (lastAiIdx === -1) return prev;
      return prev.slice(0, prev.length - 1 - lastAiIdx);
    });
    setInput(lastUser.content);
    setTimeout(() => handleSend(), 100);
  };

  const starterPrompts =
    mode === 'debug'
      ? [
          'My app crashes with: TypeError — fix it and explain.',
          'Review this function for bugs and edge cases.',
          'I get a hydration error in Next.js — help me fix it.',
        ]
      : [
          'Build a landing page with hero section and pricing cards',
          'Create a dashboard with stats cards and charts',
          'Build a todo app with drag-and-drop reordering',
        ];
  const activeBuilderMode = BUILDER_MODES.find((option) => option.id === builderMode) || BUILDER_MODES[0]!;
  const ActiveBuilderModeIcon = activeBuilderMode.icon;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-[var(--app-bg)]',
        className
      )}
    >
      {/* Header */}
      {!chromeless && (
        <div className="flex items-center justify-between px-4 h-11 shrink-0 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--app-accent)]" />
            <span className="text-[12px] font-semibold text-[var(--app-text)]">
              {mode === 'debug' ? 'Debug Assistant' : 'AI Builder'}
            </span>
          </div>
          <StackSelector>
            <button
              onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-1.5 rounded-[6px] h-10 sm:h-7 px-3 sm:px-2 text-[12px] sm:text-[11px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] active:scale-[0.98] transition-colors touch-manipulation"
            >
              <Layers className="h-3.5 w-3.5" />
              Templates
            </button>
          </StackSelector>
        </div>
      )}

      {/* Messages — scrollable but no visible scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Empty state — only on first visit, never after sending a message */}
        {!hasSentFirstMessage && messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-8">
            <div className="mb-5 p-4 rounded-2xl bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20">
              <Sparkles className="h-10 w-10 text-[var(--app-accent)]" />
            </div>
            <h3 className="text-[15px] font-bold text-[var(--app-text)] mb-2">
              {mode === 'debug' ? 'Debug your code' : 'What do you want to build?'}
            </h3>
            <p className="text-[12px] text-[var(--app-text-muted)] mb-6 max-w-[260px] leading-relaxed">
              {mode === 'debug'
                ? 'Paste your error or describe the bug you are seeing.'
                : 'Describe the app you want and I will build it step by step.'}
            </p>
            <div className="w-full max-w-[320px] space-y-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="w-full min-h-11 text-left p-3 rounded-[8px] bg-[var(--app-panel)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/40 hover:bg-[var(--app-surface)] active:scale-[0.99] transition-all group touch-manipulation"
                >
                  <p className="text-[11px] text-[var(--app-text-muted)] group-hover:text-[var(--app-text)] transition-colors">
                    {p}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const canRegen = message.role === 'assistant' && isLast && !isLoading;
          const isUser = message.role === 'user';
          const { text: extractedText, codeBlocks: extractedCodeBlocks } = message.content
            ? extractCodeBlocks(message.content)
            : { text: '', codeBlocks: [] as Array<{ fileName?: string; language?: string }> };
          const displayText = sanitizeChatContent(extractedText);

          return (
            <div
              key={message.id}
              className={cn(
                'flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200 group',
                isUser ? 'items-end' : 'items-start'
              )}
            >
              {/* User message — simple bubble */}
              {isUser && (
                <>
                  <div className="flex items-center gap-1.5 flex-row-reverse">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[var(--app-accent)]/15 text-[var(--app-accent)]">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--app-text-dim)]">You</span>
                  </div>
                  {editingMessageId === message.id ? (
                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 border-2 border-[var(--app-accent)]/50 bg-[var(--app-panel)]">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                          if (e.key === 'Escape') { setEditingMessageId(null); setEditingContent(''); }
                        }}
                        className="w-full bg-transparent text-[13px] leading-relaxed resize-none outline-none text-[var(--app-text)]"
                        rows={Math.max(2, editingContent.split('\n').length)}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setEditingMessageId(null); setEditingContent(''); }}
                        className="h-10 sm:h-7 px-3 sm:px-2 text-[12px] sm:text-[10px] font-medium rounded bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] touch-manipulation"
                        >Cancel</button>
                        <button
                          onClick={handleSaveEdit}
                          className="h-10 sm:h-7 px-3 sm:px-2 text-[12px] sm:text-[10px] font-semibold rounded bg-[var(--app-accent)] text-white flex items-center gap-1 touch-manipulation"
                        >
                          <CheckCheck className="h-3 w-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[var(--app-accent)]/12 border border-[var(--app-accent)]/20 text-[var(--app-text)]">
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  )}
                  {/* User message actions */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-row-reverse">
                    <button
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className="h-10 w-10 sm:h-6 sm:w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation"
                      title="Copy"
                    >
                      {copiedMessageId === message.id ? <Check className="h-3 w-3 text-[var(--app-success)]" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => handleEditMessage(message.id, message.content)}
                      className="h-10 w-10 sm:h-6 sm:w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="h-10 w-10 sm:h-6 sm:w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-danger)] transition-colors touch-manipulation"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}

              {/* Assistant message */}
              {!isUser && (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--app-surface)] border border-[var(--app-border)]">
                      <Logo className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--app-text-dim)]">{BRAND_NAME}</span>
                    {message.status && (
                      <StatusBadge
                        status={message.status}
                        hasContent={!!extractedText.trim()}
                        hasFiles={extractedCodeBlocks.length > 0}
                      />
                    )}
                  </div>

                  {message.hasError && (
                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[var(--app-danger-soft)] border border-[var(--app-danger)]/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-[var(--app-danger)]" />
                        <span className="text-[11px] font-semibold text-[var(--app-danger)]">Error</span>
                      </div>
                      <div className="text-[13px] leading-relaxed text-[var(--app-text)]">
                        <MarkdownRenderer content={message.content} />
                      </div>
                    </div>
                  )}

                  <div className="max-w-[90%] space-y-2 w-full">
                    {message.toolCalls?.length ? (
                      <div className="space-y-2">
                        {message.toolCalls.map((call) => (
                          <ToolCallCard
                            key={call.id}
                            call={call}
                            result={call.output ? { content: call.output, isError: call.isError } : undefined}
                          />
                        ))}
                      </div>
                    ) : null}

                    {message.role === 'tool' ? (
                      <ToolCallCard
                        call={{
                          id: message.toolCallId || message.id,
                          name: 'tool result',
                          args: message.toolCallId ? { tool_call_id: message.toolCallId } : {},
                          output: message.content,
                          isError: message.hasError,
                        }}
                        result={{ content: message.content, isError: message.hasError }}
                      />
                    ) : (
                      <div className="rounded-[10px] px-4 py-3 bg-[var(--app-panel)] border border-[var(--app-border)]">
                        {message.status === 'thinking' && !message.content.trim() ? (
                          <div className="space-y-3">
                            <TypingIndicator label="Thinking" />
                            <AssistantActivityList status={message.status} hasFiles={false} fileCount={message.fileCount} />
                          </div>
                        ) : message.status === 'streaming' ? (
                          <div className="space-y-3">
                            <SkeletonStreamingContent content={displayText} />
                            <AssistantActivityList status={message.status} hasFiles={extractedCodeBlocks.length > 0 || Boolean(message.fileCount)} fileCount={message.fileCount || extractedCodeBlocks.length || undefined} />
                          </div>
                        ) : displayText.trim() ? (
                          <AssistantResponseContent content={displayText} fileCount={message.fileCount} />
                        ) : null}

                        {message.status === 'done' && (message.fileCount || extractedCodeBlocks.length > 0) && (
                          <div className="mt-2 pt-2 border-t border-[var(--app-border)] flex items-center gap-1.5 text-[10px]">
                            <CircleCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                            <span className="text-emerald-400">
                              {message.fileCount || extractedCodeBlocks.length} file{(message.fileCount || extractedCodeBlocks.length) !== 1 ? 's' : ''} ready · check the code pane
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assistant message actions */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className="h-10 w-10 sm:h-6 sm:w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation"
                      title="Copy"
                    >
                      {copiedMessageId === message.id ? <Check className="h-3 w-3 text-[var(--app-success)]" /> : <Copy className="h-3 w-3" />}
                    </button>
                    {canRegen && (
                      <button
                        onClick={handleRegenerate}
                        className="h-10 w-10 sm:h-6 sm:w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation"
                        title="Regenerate"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="h-10 w-10 sm:h-6 sm:w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-danger)] transition-colors touch-manipulation"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-[10px] w-[min(680px,calc(100vw-24px))] max-h-[82dvh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--app-border)] sticky top-0 bg-[var(--app-panel)]">
              <span className="text-[12px] font-semibold text-[var(--app-text)]">Prompt Templates</span>
              <button
                onClick={() => setShowTemplates(false)}
                className="h-10 w-10 sm:h-7 sm:w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <PromptTemplates
              onSelect={(selectedPrompt) => {
                setInput(selectedPrompt);
                setShowTemplates(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0 border-t border-[var(--app-border)] bg-[var(--app-panel)]">
        {mode === 'build' && (
          <div className="mb-2 space-y-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
              {BUILDER_MODES.map((option) => {
                const Icon = option.icon;
                const active = builderMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBuilderMode(option.id)}
                    disabled={isLoading}
                    title={option.description}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      active
                        ? 'border-[var(--app-accent)]/30 bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-[0_0_0_1px_rgba(0,200,83,0.08)]'
                        : 'border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-[10px] text-[var(--app-text-muted)]">
              <ActiveBuilderModeIcon className="h-3 w-3 shrink-0 text-[var(--app-accent)]" />
              <span className="font-medium text-[var(--app-text)]">{activeBuilderMode.label}</span>
              <span className="truncate">{activeBuilderMode.description}</span>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-[var(--app-border)] focus-within:border-[var(--app-accent)]/50 focus-within:shadow-[0_0_0_2px_rgba(0,200,83,0.08)] transition-all bg-[var(--app-bg)] p-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'debug'
                ? 'Describe the bug or paste the error...'
                : 'What do you want to build?'
            }
            data-dashboard-composer
            className="flex-1 min-h-[44px] max-h-[180px] resize-none bg-transparent text-[16px] sm:text-[13px] leading-relaxed text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              onClick={() => {
                cancel();
                updateStreamingAssistant((message) => ({
                  ...message,
                  content: message.content || 'Generation stopped.',
                  status: 'done',
                }));
                setIsLoading(false);
                setStreaming(false);
                streamingMessageIdRef.current = null;
              }}
              type="button"
              className="h-11 w-11 sm:h-9 sm:w-9 rounded-lg shrink-0 bg-rose-500 text-white hover:bg-rose-600 active:scale-[0.96] transition-all inline-flex items-center justify-center touch-manipulation animate-in fade-in"
              title="Stop generation"
            >
              <div className="h-3.5 w-3.5 bg-white rounded-sm" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-11 w-11 sm:h-9 sm:w-9 rounded-lg shrink-0 bg-[var(--app-accent)] text-white hover:opacity-90 active:scale-[0.96] disabled:opacity-40 transition-all inline-flex items-center justify-center touch-manipulation"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="hidden sm:block text-[10px] text-[var(--app-text-dim)] mt-1.5 px-1">
          Press <kbd className="px-1 py-0.5 rounded bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono">Shift+Enter</kbd> for newline
        </p>
      </div>
    </div>
  );
}
