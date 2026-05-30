/**
 * Enhanced Chat Panel
 *
 * Chat interface that extracts code blocks from LLM responses
 * and displays them separately in the code pane
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeneration } from '@/hooks/use-generation';
import { Send, Loader2, Sparkles, Layers, X, Copy, RotateCcw, Trash2, Check, Edit2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { StackSelector } from './stack-selector';
import { PromptTemplates } from '@/components/visual-editor/prompt-templates';
import { useShellStore } from '@/store/shell-store';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generation-store';
import { getSession } from '@/hooks/use-session';
import { extractCodeBlocks } from '@/lib/utils/code-extraction';
import { useCodeBlocksStore } from '@/store/code-blocks-store';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
};

interface EnhancedChatPanelProps {
  className?: string;
  chromeless?: boolean;
  mode?: 'build' | 'debug';
}

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

  const { currentThreadId, accumulated, resetAccumulated } = useGenerationStore();
  const { addCodeBlocks, setStreaming, reset: resetCodeBlocks } = useCodeBlocksStore();

  const loadThreadMessages = async (threadId: string) => {
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/threads/${threadId}/messages?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const j = await res.json().catch(() => ({}));
    const list = (j?.messages || []) as Array<any>;

    // Process messages to extract code blocks
    const processedMessages = list.map((m) => {
      const content = String(m.content || '');
      const { text, codeBlocks } = extractCodeBlocks(content);

      // Add code blocks to the store
      if (codeBlocks.length > 0) {
        addCodeBlocks(codeBlocks);
      }

      return {
        id: String(m.id),
        role: m.role,
        content: text, // Store only the text without code blocks
        originalContent: content, // Keep original for reference
        created_at: String(m.created_at || new Date().toISOString()),
      };
    });

    setMessages(processedMessages);
  };

  const { generate, ensureThreadId } = useGeneration({
    onDone: async () => {
      setIsLoading(false);
      setStreaming(false);
      toast.success('Code generated successfully!');

      const text = (accumulated || '').trim();
      if (text) {
        const { text: cleanedText, codeBlocks } = extractCodeBlocks(text);

        setMessages((prev) => [
          ...prev,
          {
            id: `local_assistant_${Date.now()}`,
            role: 'assistant',
            content: cleanedText,
            created_at: new Date().toISOString(),
          },
        ]);

        // Add code blocks to store for display in code pane
        if (codeBlocks.length > 0) {
          addCodeBlocks(codeBlocks);
        }
      }

      resetAccumulated();

      // Background sync for eventual consistency
      const tid = currentThreadId;
      if (tid) setTimeout(() => void loadThreadMessages(tid), 1500);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${error.message}`,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
      setStreaming(false);
      toast.error('Failed to generate code');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, accumulated]);

  useEffect(() => {
    if (!currentThreadId) return;
    loadThreadMessages(currentThreadId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentThreadId]);

  useEffect(() => {
    // Update code blocks store during streaming
    if (isLoading && accumulated) {
      setStreaming(true);
      const { codeBlocks } = extractCodeBlocks(accumulated);
      if (codeBlocks.length > 0) {
        addCodeBlocks(codeBlocks);
      }
    }
  }, [accumulated, isLoading, addCodeBlocks, setStreaming]);

  const { setSidebarCollapsed } = useShellStore();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setSidebarCollapsed(true);
    resetCodeBlocks(); // Clear previous code blocks

    const text = input.trim();
    const nowIso = new Date().toISOString();
    setInput('');
    setIsLoading(true);
    resetAccumulated();
    setStreaming(true);

    try {
      const threadId = await ensureThreadId();

      // Persist the user message
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

      setMessages((prev) => [
        ...prev,
        { id: `local_user_${Date.now()}`, role: 'user', content: text, created_at: nowIso },
      ]);

      await generate({ prompt: text, persistUserMessage: false });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
      setMessages((prev) => [
        ...prev,
        { id: `local_user_${Date.now()}`, role: 'user', content: text, created_at: nowIso },
      ]);
      setIsLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success('Message copied');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  const handleRetryMessage = async (originalPrompt: string) => {
    setInput(originalPrompt);
    setMessages((prev) => prev.filter(m => m.role !== 'assistant' || !m.content.startsWith('Error')));
    await new Promise(resolve => setTimeout(resolve, 100));
    handleSend();
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter(m => m.id !== messageId));
    toast.success('Message deleted');
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    // Update the message in the list
    setMessages((prev) =>
      prev.map(m =>
        m.id === editingMessageId
          ? { ...m, content: editingContent }
          : m
      )
    );

    // Sync to server
    try {
      const session = await getSession();
      const token = session.session?.access_token;
      if (token && currentThreadId) {
        await fetch(`/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'user',
            content: editingContent,
            metadata: { source: 'chat-panel', edited: true },
          }),
        });
      }
      toast.success('Message updated');
    } catch {
      toast.error('Failed to update message');
    }

    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleRegenerate = async () => {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      toast.error('No message to regenerate');
      return;
    }

    // Remove the last assistant message
    setMessages((prev) => {
      const lastAssistantIndex = prev.findLastIndex(m => m.role === 'assistant');
      if (lastAssistantIndex !== -1) {
        return prev.slice(0, lastAssistantIndex);
      }
      return prev;
    });

    // Retry with the same prompt
    await handleRetryMessage(lastUserMessage.content);
  };

  const starterPrompts =
    mode === 'debug'
      ? [
          'My app crashes with: TypeError ... Fix it and explain.',
          'Review this function for bugs and edge cases.',
          'I get a hydration error in Next.js -- help me fix it.',
        ]
      : [
          'Create a login form with email + password',
          'Create a todo list with add/delete',
          'Create a dashboard with stats cards and a chart',
        ];

  const placeholder =
    mode === 'debug'
      ? 'Describe the bug / paste the error...'
      : 'Describe what you want to build...';

  // Render streaming response without code blocks
  const renderStreamingContent = () => {
    if (!accumulated) return null;
    const { text } = extractCodeBlocks(accumulated);
    return text;
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[6px] bg-[var(--app-panel)]",
        className
      )}
    >
      {/* Header */}
      {!chromeless && (
        <div className="flex items-center justify-between px-4 h-10 shrink-0 bg-[var(--app-panel-2)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--app-text-muted)] uppercase tracking-[0.12em]">AI</span>
          </div>
          <StackSelector>
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-1.5 rounded-[6px] h-7 px-2 text-[11px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              Templates
            </button>
          </StackSelector>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-5">
              <Sparkles className="h-10 w-10 text-[var(--app-accent)]/35" />
            </div>
            <h4 className="text-[13px] font-medium text-[var(--app-text)] mb-2">
              {mode === 'debug' ? 'Debug mode' : 'Build mode'}
            </h4>
            <p className="text-xs text-[var(--app-text-muted)] mb-6 max-w-[260px] leading-relaxed">
              {mode === 'debug'
                ? 'Paste your error or describe the bug.'
                : 'Describe what you want to build.'}
            </p>
            <div className="w-full max-w-[320px] space-y-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="w-full text-left p-3 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] hover:bg-[var(--app-surface)] transition-colors group"
                >
                  <p className="text-[11px] text-[var(--app-text-muted)] group-hover:text-[var(--app-text)] transition-colors line-clamp-1">
                    {p}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          const canRegenerate = message.role === 'assistant' && isLastMessage && !isLoading;

          return (
            <div
              key={message.id}
              className={cn(
                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 group",
                message.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              {/* Message Actions */}
              <div className={cn(
                "flex items-center gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                {message.role === 'assistant' && (
                  <>
                    <button
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    {canRegenerate && (
                      <button
                        onClick={handleRegenerate}
                        className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                        title="Regenerate response"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
                {message.role === 'user' && (
                  <>
                    <button
                      onClick={() => handleEditMessage(message.id, message.content)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      title="Edit message"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleRetryMessage(message.content)}
                      className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      title="Retry with this message"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-danger)] transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Message Content */}
              {editingMessageId === message.id ? (
                <div className={cn(
                  "max-w-[85%] rounded-[6px] px-4 py-3 border-2 border-[var(--app-accent)]",
                  message.role === 'user'
                    ? 'bg-[var(--app-accent)]/10'
                    : 'bg-[var(--app-surface)]'
                )}>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    className="w-full bg-transparent text-[13px] leading-relaxed whitespace-pre-wrap break-words resize-none outline-none text-[var(--app-text)]"
                    rows={Math.max(2, editingContent.split('\n').length)}
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={handleCancelEdit}
                      className="h-7 px-3 rounded-[4px] text-[10px] font-medium bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="h-7 px-3 rounded-[4px] text-[10px] font-medium bg-[var(--app-accent)] text-white hover:opacity-90 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[85%] rounded-[6px] px-4 py-3",
                    message.role === 'user'
                      ? 'bg-[var(--app-accent)]/10 text-[var(--app-text)]'
                      : 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)]'
                  )}
                >
                  {message.role === 'user' ? (
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {message.content || (
                        <span className="text-[var(--app-text-muted)] italic">
                          Code blocks extracted to code pane →
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <span className="text-[10px] text-[var(--app-text-dim)] mt-1.5 px-1 font-medium">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* Streaming response - without code blocks */}
        {isLoading && accumulated && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="max-w-[85%] rounded-[6px] px-4 py-3 bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)]">
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {renderStreamingContent() || (
                  <span className="text-[var(--app-text-muted)] italic">
                    Generating code...
                  </span>
                )}
                <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--app-accent)] animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !accumulated && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[6px] px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[var(--app-accent)]/55 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-[var(--app-accent)]/55 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-[var(--app-accent)]/55 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--app-accent)]/80 uppercase tracking-widest">Thinking</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Template Picker Dialog */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-[8px] w-[680px] max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--app-border)] sticky top-0 bg-[var(--app-panel)] z-10">
              <span className="text-[11px] font-medium text-[var(--app-text-muted)] uppercase tracking-[0.12em]">
                Prompt Templates
              </span>
              <button
                onClick={() => setShowTemplates(false)}
                className="h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
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

      {/* Input */}
      <div className="p-3 pt-0 shrink-0">
        <div className="flex items-center gap-2 rounded-[8px] border border-[var(--app-border)] transition-all duration-150 p-2 focus-within:border-[var(--app-accent)]/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            data-dashboard-composer
            className="min-h-[0] max-h-[160px] resize-none bg-transparent border-0 text-[13px] leading-relaxed p-1 text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 w-full"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 p-0 rounded-[6px] shrink-0 bg-[var(--app-accent)] text-white hover:opacity-90 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
