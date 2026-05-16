'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeneration } from '@/hooks/use-generation';
import { Send, Loader2, Sparkles, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { StackSelector } from './stack-selector';
import { useShellStore } from '@/store/shell-store';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generation-store';
import { getSession } from '@/hooks/use-session';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
};

interface ChatPanelProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  mode?: 'build' | 'debug';
}

export function ChatPanel({
  height = '600px',
  className,
  chromeless = false,
  mode = 'build',
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentThreadId, accumulated, resetAccumulated } = useGenerationStore();

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
    setMessages(
      list.map((m) => ({
        id: String(m.id),
        role: m.role,
        content: String(m.content || ''),
        created_at: String(m.created_at || new Date().toISOString()),
      })),
    );
  };

  const { generate, ensureThreadId } = useGeneration({
    onDone: async () => {
      setIsLoading(false);
      toast.success('Code generated successfully!');
      const text = (accumulated || '').trim();
      if (text) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local_assistant_${Date.now()}`,
            role: 'assistant',
            content: text,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      resetAccumulated();

      // Background sync for eventual consistency (don’t block UX).
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

  const { setSidebarCollapsed } = useShellStore();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setSidebarCollapsed(true);

    const text = input.trim();
    const nowIso = new Date().toISOString();
    setInput('');
    setIsLoading(true);
    resetAccumulated();

    try {
      const threadId = await ensureThreadId();

      // Persist the user message explicitly (so threads are durable even if generation fails).
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
      // Show the typed message even if generation failed before persistence.
      setMessages((prev) => [
        ...prev,
        { id: `local_user_${Date.now()}`, role: 'user', content: text, created_at: nowIso },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]",
        className
      )}
      style={{ height }}
    >
      {/* Header */}
      {!chromeless && (
        <div className="border-b border-[var(--app-border)] flex items-center justify-between px-4 h-10 shrink-0 bg-[var(--app-panel-2)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--app-text-muted)] uppercase tracking-[0.12em]">AI</span>
          </div>
          <StackSelector>
            <button className="inline-flex items-center gap-1.5 rounded-[6px] h-7 px-2 text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
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
              <Sparkles className="h-10 w-10 text-[var(--app-accent)]/20" />
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

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
              message.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-[6px] px-4 py-3",
                message.role === 'user'
                  ? 'bg-[var(--app-accent)] text-[#071006]'
                  : 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)]'
              )}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
            <span className="text-[10px] text-[var(--app-text-dim)] mt-1.5 px-1 font-medium">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Streaming response */}
        {isLoading && accumulated && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="max-w-[85%] rounded-[6px] px-4 py-3 bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)]">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {accumulated}
                <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--app-accent)] animate-pulse align-middle" />
              </p>
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

      {/* Input */}
      <div className="p-3 shrink-0 bg-[var(--app-panel-2)] border-t border-[var(--app-border)]">
        <div className="flex items-end gap-2 bg-[var(--app-surface)] rounded-[6px] border border-[var(--app-border)] transition-colors p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            data-dashboard-composer
            className="min-h-[0] max-h-[120px] resize-none bg-transparent border-0 text-[13px] leading-relaxed p-1 text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none w-full"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-7 w-7 p-0 rounded-[6px] shrink-0 bg-[var(--app-accent)] text-[#071006] hover:opacity-90 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
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
