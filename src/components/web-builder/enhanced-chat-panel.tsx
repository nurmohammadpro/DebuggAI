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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { StackSelector } from './stack-selector';
import { PromptTemplates } from '@/components/visual-editor/prompt-templates';
import { useShellStore } from '@/store/shell-store';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generation-store';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';
import { getSession } from '@/hooks/use-session';
import { extractCodeBlocks } from '@/lib/utils/code-extraction';
import { useCodeBlocksStore } from '@/store/code-blocks-store';

// ── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

type StepType = 'thought' | 'explore' | 'action' | 'code' | 'completion';

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
}

interface EnhancedChatPanelProps {
  className?: string;
  chromeless?: boolean;
  mode?: 'build' | 'debug';
}

// ── Step Parser ──────────────────────────────────────────────────────────────

function parseStepsFromText(text: string): { steps: StepData[]; remaining: string } {
  const steps: StepData[] = [];

  // Try to parse structured XML-like steps
  const thoughtRegex = /<thought\s*(?:duration="([^"]*)")?\s*>([\s\S]*?)<\/thought>/gi;
  const exploreRegex = /<explore\s*(?:files="([^"]*)")?\s*>([\s\S]*?)<\/explore>/gi;
  const actionRegex = /<action\s*(?:type="([^"]*)")?\s*>([\s\S]*?)<\/action>/gi;
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

  // Detect lines that look like action descriptions
  const actionPatterns = [
    /^(defined|built|created|added|updated|fixed|removed|implemented|set up|configured|installed|initialized)\s+.+/i,
    /^(let me|i'll|i will|now let|first|next|then|finally|after that)\s+.+/i,
  ];

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isAction = actionPatterns.some((pattern) => pattern.test(trimmed));
    if (isAction) {
      steps.push({ type: 'action', content: trimmed, action: 'build' });
    }
  }

  return steps;
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
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-[12px] text-[var(--app-text)] leading-relaxed">{step.content}</p>
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Ref gate — prevents empty state flash during thread sync
  const threadBootedRef = useRef(false);

  const { currentThreadId, accumulated, resetAccumulated } = useGenerationStore();
  const { addCodeBlocks, setStreaming, reset: resetCodeBlocks } = useCodeBlocksStore();
  const { setSidebarCollapsed } = useShellStore();

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
    const list = (j?.messages || []) as Array<any>;

    const serverMessages: ChatMessage[] = list.map((m) => {
      const content = String(m.content || '');
      const { text, codeBlocks } = extractCodeBlocks(content);
      if (codeBlocks.length > 0) addCodeBlocks(codeBlocks);
      const { steps } = parseStepsFromText(content);
      const implicitSteps = steps.length === 0 ? detectImplicitSteps(text) : [];
      return {
        id: String(m.id),
        role: m.role as MessageRole,
        content: text,
        steps: steps.length > 0 ? steps : implicitSteps,
        created_at: String(m.created_at || new Date().toISOString()),
        fileCount: codeBlocks.length > 0 ? codeBlocks.length : undefined,
      };
    });

    // Merge: keep local messages not yet synced to server
    setMessages((prev) => {
      const pendingLocal = prev.filter((m) => {
        if (!m.id.startsWith('local_')) return false;
        if (m.role === 'user') {
          return !serverMessages.some((s) => s.role === 'user' && s.content === m.content);
        }
        if (m.role === 'assistant') {
          const lastServerAsst = serverMessages.find((s) => s.role === 'assistant');
          if (!lastServerAsst) return true;
          return new Date(m.created_at).getTime() > new Date(lastServerAsst.created_at).getTime();
        }
        return false;
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
      const { currentProjectId, files } = state;
      if (!currentProjectId || !files || Object.keys(files.files).length === 0) return;

      // Serialize current files and save to generations table
      const serializedCode = serializeVirtualFiles(files);
      if (!serializedCode || serializedCode.length < 20) return;

      const session = await getSession();
      const token = session.session?.access_token;
      if (!token) return;

      const prompt = state.accumulated?.slice(0, 200) || undefined;

      await fetch(`/api/projects/${currentProjectId}/save-code`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: serializedCode,
          prompt,
          description: `Auto-saved ${new Date().toLocaleString()}`,
          stack: undefined,
        }),
      }).catch(() => {
        // Silent fail — manual save via button still works
      });
    } catch {
      // Silent fail
    }
  }, []);

  const { generate, ensureThreadId } = useGeneration({
    onDone: async () => {
      setIsLoading(false);
      setStreaming(false);

      const { accumulated: latestAccumulated, files: currentFiles } = useGenerationStore.getState();
      const fullText = (latestAccumulated || '').trim();

      // Count files that were generated
      const generatedFileCount = currentFiles
        ? Object.values(currentFiles.files).filter((f) => f.status === 'added').length
        : 0;

      if (fullText) {
        const { text: cleanedText, codeBlocks } = extractCodeBlocks(fullText);
        const { steps } = parseStepsFromText(fullText);
        const implicitSteps = steps.length === 0 ? detectImplicitSteps(cleanedText) : [];
        const resolvedSteps = steps.length > 0 ? steps : implicitSteps;

        const displayContent = cleanedText || fullText;

        setMessages((prev) => [
          ...prev,
          {
            id: `local_assistant_${Date.now()}`,
            role: 'assistant',
            content: displayContent,
            steps: resolvedSteps,
            created_at: new Date().toISOString(),
            fileCount: codeBlocks.length > 0 ? codeBlocks.length : undefined,
          },
        ]);

        if (codeBlocks.length > 0) addCodeBlocks(codeBlocks);
      } else if (generatedFileCount > 0) {
        // Fallback: no accumulated text but files were generated.
        // Show a summary message so the user knows something happened.
        const fileNames = currentFiles
          ? Object.entries(currentFiles.files)
              .filter(([, f]) => f.status === 'added')
              .slice(0, 5)
              .map(([p]) => `\`${p}\``)
              .join(', ')
          : '';

        const summaryContent = `I generated ${generatedFileCount} file${generatedFileCount !== 1 ? 's' : ''}${
          fileNames ? `: ${fileNames}${generatedFileCount > 5 ? ' and more' : ''}` : '.'
        } View them in the editor panel.`;

        setMessages((prev) => [
          ...prev,
          {
            id: `local_assistant_${Date.now()}`,
            role: 'assistant',
            content: summaryContent,
            steps: [{ type: 'completion', content: summaryContent }],
            created_at: new Date().toISOString(),
            fileCount: generatedFileCount,
          },
        ]);
      }

      resetAccumulated();
      const tid = currentThreadId;

      // Auto-save generated code to generations table for project persistence
      await autoSaveCode();

      if (tid) setTimeout(() => void loadThreadMessages(tid), 1500);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Something went wrong\n\n${error.message}`,
          created_at: new Date().toISOString(),
          hasError: true,
        },
      ]);
      setIsLoading(false);
      setStreaming(false);
      toast.error('Generation failed');
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setSidebarCollapsed(true);
    resetCodeBlocks();
    setHasSentFirstMessage(true);

    const text = input.trim();
    setInput('');
    setIsLoading(true);
    resetAccumulated();
    setStreaming(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `local_user_${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
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
          },
          body: JSON.stringify({ role: 'user', content: text, metadata: { source: 'chat-panel' } }),
        });
      }
      await generate({ prompt: text, persistUserMessage: false });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
      setIsLoading(false);
      setStreaming(false);
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

  const streamingText = (() => {
    if (!accumulated) return '';
    const { text, codeBlocks } = extractCodeBlocks(accumulated);
    if (text) return text;
    if (codeBlocks.length > 0) {
      return `Generating ${codeBlocks.length} file${codeBlocks.length !== 1 ? 's' : ''}...`;
    }
    const openFences = (accumulated.match(/```/g) || []).length;
    if (openFences > 0 && openFences % 2 === 1) {
      return null;
    }
    return '';
  })();

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
              className="inline-flex items-center gap-1.5 rounded-[6px] h-7 px-2 text-[11px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              Templates
            </button>
          </StackSelector>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
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
                  className="w-full text-left p-3 rounded-[8px] bg-[var(--app-panel)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/40 hover:bg-[var(--app-surface)] transition-all group"
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
          const hasSteps = message.steps && message.steps.length > 0;

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
                          className="h-6 px-2 text-[10px] font-medium rounded bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]"
                        >Cancel</button>
                        <button
                          onClick={handleSaveEdit}
                          className="h-6 px-2 text-[10px] font-semibold rounded bg-[var(--app-accent)] text-white flex items-center gap-1"
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-row-reverse">
                    <button
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      title="Copy"
                    >
                      {copiedMessageId === message.id ? <Check className="h-3 w-3 text-[var(--app-success)]" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => handleEditMessage(message.id, message.content)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-danger)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}

              {/* Assistant message — steps or text */}
              {!isUser && (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--app-surface)] border border-[var(--app-border)]">
                      <Bot className="h-3 w-3 text-[var(--app-text-muted)]" />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--app-text-dim)]">DeBuggAI</span>
                  </div>

                  {message.hasError && (
                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[var(--app-danger-soft)] border border-[var(--app-danger)]/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-[var(--app-danger)]" />
                        <span className="text-[11px] font-semibold text-[var(--app-danger)]">Error</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-[var(--app-text)] whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}

                  {/* Render steps if available */}
                  {!message.hasError && hasSteps && (
                    <div className="max-w-[90%] space-y-2.5 w-full">
                      {message.steps!.map((step, stepIdx) => {
                        if (step.type === 'thought') return <ThoughtStep key={stepIdx} step={step} />;
                        if (step.type === 'explore') return <ExploreStep key={stepIdx} step={step} />;
                        if (step.type === 'action') return <ActionStep key={stepIdx} step={step} index={stepIdx} />;
                        if (step.type === 'code') return null; // Code goes to file tree, not chat
                        if (step.type === 'completion') return <CompletionStep key={stepIdx} step={step} fileCount={message.fileCount} />;
                        return null;
                      })}
                      {/* Show file count summary when code was generated silently */}
                      {message.fileCount && message.fileCount > 0 && message.steps!.some(s => s.type === 'code') && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--app-text-muted)] border-t border-[var(--app-border)] pt-2 mt-2">
                          <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{message.fileCount} file{message.fileCount !== 1 ? 's' : ''} generated → view in code panel</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback: rich text when no structured steps */}
                  {!message.hasError && !hasSteps && (
                    <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[var(--app-panel)] border border-[var(--app-border)]">
                      <RichTextContent content={message.content} />
                      {message.fileCount && message.fileCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--app-border)] flex items-center gap-1.5 text-[10px] text-[var(--app-text-dim)]">
                          <FileCode2 className="h-3 w-3" />
                          {message.fileCount} file{message.fileCount !== 1 ? 's' : ''} sent to code pane
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assistant message actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      title="Copy"
                    >
                      {copiedMessageId === message.id ? <Check className="h-3 w-3 text-[var(--app-success)]" /> : <Copy className="h-3 w-3" />}
                    </button>
                    {canRegen && (
                      <button
                        onClick={handleRegenerate}
                        className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                        title="Regenerate"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-danger)] transition-colors"
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

        {/* Streaming response */}
        {isLoading && accumulated && (
          <div className="flex flex-col items-start gap-1 animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--app-surface)] border border-[var(--app-border)]">
                <Bot className="h-3 w-3 text-[var(--app-text-muted)]" />
              </div>
              <span className="text-[10px] font-medium text-[var(--app-text-dim)]">DeBuggAI</span>
            </div>
            <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[var(--app-panel)] border border-[var(--app-border)]">
              {streamingText ? (
                <div className="text-[13px] leading-relaxed text-[var(--app-text)] whitespace-pre-wrap break-words">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--app-accent)] animate-pulse align-middle rounded-[2px]" />
                </div>
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        )}

        {/* Typing indicator (before first stream chunk) */}
        {isLoading && !accumulated && (
          <div className="flex flex-col items-start gap-1 animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--app-surface)] border border-[var(--app-border)]">
                <Bot className="h-3 w-3 text-[var(--app-text-muted)]" />
              </div>
              <span className="text-[10px] font-medium text-[var(--app-text-dim)]">DeBuggAI</span>
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-[10px] w-[680px] max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--app-border)] sticky top-0 bg-[var(--app-panel)]">
              <span className="text-[12px] font-semibold text-[var(--app-text)]">Prompt Templates</span>
              <button
                onClick={() => setShowTemplates(false)}
                className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <PromptTemplates
              onSelect={(prompt) => {
                setInput(prompt);
                setShowTemplates(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 shrink-0 border-t border-[var(--app-border)] bg-[var(--app-panel)]">
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
            className="flex-1 min-h-[40px] max-h-[160px] resize-none bg-transparent text-[13px] leading-relaxed text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 rounded-lg shrink-0 bg-[var(--app-accent)] text-white hover:opacity-90 disabled:opacity-40 transition-all inline-flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[var(--app-text-dim)] mt-1.5 px-1">
          Press <kbd className="px-1 py-0.5 rounded bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono">Shift+Enter</kbd> for newline
        </p>
      </div>
    </div>
  );
}
