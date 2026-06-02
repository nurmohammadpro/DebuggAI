/**
 * Enhanced Chat Panel v3
 *
 * Google AI Studio-style chat pane:
 * - Plain-text assistant rendering with code blocks stripped into the code pane
 * - Streaming prose shown live (code blocks removed, shown in code pane)
 * - "N files generated" badge when generation completes
 * - Animated typing indicator
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
} from 'lucide-react';
import { toast } from 'sonner';
import { StackSelector } from './stack-selector';
import { PromptTemplates } from '@/components/visual-editor/prompt-templates';
import { useShellStore } from '@/store/shell-store';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generation-store';
import { getSession } from '@/hooks/use-session';
import { extractCodeBlocks } from '@/lib/utils/code-extraction';
import { useCodeBlocksStore } from '@/store/code-blocks-store';

type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string; // text-only (code blocks stripped)
  created_at: string;
  fileCount?: number; // How many code blocks were extracted
  hasError?: boolean;
};

interface EnhancedChatPanelProps {
  className?: string;
  chromeless?: boolean;
  mode?: 'build' | 'debug';
}

// ── Markdown renderer ─────────────────────────────────────────────────────
function toPlainText(content: string) {
  return (content || '')
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function MarkdownContent({ content }: { content: string }) {
  // Chat pane should be clean, plain text. Code is extracted into the code pane.
  const lines = toPlainText(content).split('\n');
  return (
    <div className="text-[13px] leading-relaxed text-[var(--app-text)] whitespace-pre-wrap break-words">
      {lines.join('\n').trim()}
    </div>
  );
}

// ── File generated badge ──────────────────────────────────────────────────
function FileBadge({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-2 p-2 rounded-[6px] bg-[var(--app-accent)]/8 border border-[var(--app-accent)]/20">
      <FileCode2 className="h-3.5 w-3.5 text-[var(--app-accent)] shrink-0" />
      <span className="text-[11px] font-semibold text-[var(--app-accent)]">
        {count} file{count !== 1 ? 's' : ''} generated → code pane
      </span>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────
function TypingIndicator() {
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
        Coding
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // When switching to a project without a thread, clear the chat UI.
  useEffect(() => {
    if (currentThreadId) return;
    setMessages([]);
    resetAccumulated();
    resetCodeBlocks();
    setStreaming(false);
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

    const processedMessages: ChatMessage[] = list.map((m) => {
      const content = String(m.content || '');
      const { text, codeBlocks } = extractCodeBlocks(content);
      if (codeBlocks.length > 0) addCodeBlocks(codeBlocks);
      return {
        id: String(m.id),
        role: m.role as MessageRole,
        content: text,
        created_at: String(m.created_at || new Date().toISOString()),
        fileCount: codeBlocks.length > 0 ? codeBlocks.length : undefined,
      };
    });

    setMessages(processedMessages);
  }, [addCodeBlocks]);

  useEffect(() => {
    if (!currentThreadId) return;
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

  const { generate, ensureThreadId } = useGeneration({
    onDone: async () => {
      setIsLoading(false);
      setStreaming(false);

      const { accumulated: latestAccumulated } = useGenerationStore.getState();
      const fullText = (latestAccumulated || '').trim();

      if (fullText) {
        const { text: cleanedText, codeBlocks } = extractCodeBlocks(fullText);
        const fileCount = codeBlocks.length;

        setMessages((prev) => [
          ...prev,
          {
            id: `local_assistant_${Date.now()}`,
            role: 'assistant',
            content: cleanedText || (fileCount > 0
              ? `I've generated **${fileCount} file${fileCount !== 1 ? 's'  : ''}** for your project. Check the code pane on the right to view and edit them, and hit **Preview** to see it live.`
              : 'Done! Check the code and preview panes.'),
            created_at: new Date().toISOString(),
            fileCount: fileCount > 0 ? fileCount : undefined,
          },
        ]);

        if (codeBlocks.length > 0) addCodeBlocks(codeBlocks);
      }

      resetAccumulated();
      const tid = currentThreadId;
      if (tid) setTimeout(() => void loadThreadMessages(tid), 1500);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `**Something went wrong**\n\n${error.message}`,
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
    // If there's prose, show it. If only code blocks, generate a summary.
    if (text) return text;
    if (codeBlocks.length > 0) {
      return `Generating **${codeBlocks.length} file${codeBlocks.length !== 1 ? 's' : ''}**…`;
    }
    // Check if we're inside an unclosed code block (streaming in progress)
    const openFences = (accumulated.match(/```/g) || []).length;
    if (openFences > 0 && openFences % 2 === 1) {
      return null; // still inside a code block, show indicator
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
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-8">
            <div className="mb-5 p-4 rounded-2xl bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20">
              <Sparkles className="h-10 w-10 text-[var(--app-accent)]" />
            </div>
            <h3 className="text-[15px] font-bold text-[var(--app-text)] mb-2">
              {mode === 'debug' ? 'Debug your code' : 'Build something amazing'}
            </h3>
            <p className="text-[12px] text-[var(--app-text-muted)] mb-6 max-w-[260px] leading-relaxed">
              {mode === 'debug'
                ? 'Paste your error or describe the bug you are seeing.'
                : 'Describe what you want to build. I will generate a complete Next.js project.'}
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

          return (
            <div
              key={message.id}
              className={cn(
                'flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200 group',
                isUser ? 'items-end' : 'items-start'
              )}
            >
              {/* Avatar + role */}
              <div className={cn('flex items-center gap-1.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                    isUser
                      ? 'bg-[var(--app-accent)]/15 text-[var(--app-accent)]'
                      : 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)]'
                  )}
                >
                  {isUser ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                </div>
                <span className="text-[10px] font-medium text-[var(--app-text-dim)]">
                  {isUser ? 'You' : 'DeBuggAI'}
                </span>
              </div>

              {/* Bubble */}
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
                <div
                  className={cn(
                    'max-w-[85%] rounded-[10px] px-4 py-3',
                    isUser
                      ? 'bg-[var(--app-accent)]/12 border border-[var(--app-accent)]/20 text-[var(--app-text)]'
                      : message.hasError
                      ? 'bg-[var(--app-danger-soft)] border border-[var(--app-danger)]/20'
                      : 'bg-[var(--app-panel)] border border-[var(--app-border)]'
                  )}
                >
                  {isUser ? (
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <>
                      {message.hasError && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--app-danger)]" />
                          <span className="text-[11px] font-semibold text-[var(--app-danger)]">Error</span>
                        </div>
                      )}
                      <MarkdownContent content={message.content} />
                      {message.fileCount && message.fileCount > 0 && (
                        <FileBadge count={message.fileCount} />
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Action buttons (hover) */}
              <div
                className={cn(
                  'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                  isUser ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <button
                  onClick={() => handleCopyMessage(message.content, message.id)}
                  className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                  title="Copy"
                >
                  {copiedMessageId === message.id ? <Check className="h-3 w-3 text-[var(--app-success)]" /> : <Copy className="h-3 w-3" />}
                </button>
                {isUser && (
                  <button
                    onClick={() => handleEditMessage(message.id, message.content)}
                    className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
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
        <div className="flex items-end gap-2 rounded-[10px] border border-[var(--app-border)] focus-within:border-[var(--app-accent)]/50 transition-colors bg-[var(--app-bg)] p-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'debug'
                ? 'Describe the bug or paste the error...'
                : 'Describe what you want to build...'
            }
            data-dashboard-composer
            className="flex-1 min-h-[40px] max-h-[160px] resize-none bg-transparent text-[13px] leading-relaxed text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 rounded-[8px] shrink-0 bg-[var(--app-accent)] text-white hover:opacity-90 disabled:opacity-40 transition-all inline-flex items-center justify-center"
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
