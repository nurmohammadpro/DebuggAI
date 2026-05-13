'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeneration } from '@/hooks/use-generation';
import { Send, Loader2, Sparkles, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { StackSelector } from './stack-selector';
import { useShellStore } from '@/store/shell-store';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

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
  const [accumulatedResponse, setAccumulatedResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { generate } = useGeneration({
    onChunk: (chunk) => {
      setAccumulatedResponse((prev) => prev + chunk);
    },
    onDone: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: accumulatedResponse,
          timestamp: Date.now(),
        },
      ]);
      setAccumulatedResponse('');
      setIsLoading(false);
      toast.success('Code generated successfully!');
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: Date.now(),
        },
      ]);
      setAccumulatedResponse('');
      setIsLoading(false);
      toast.error('Failed to generate code');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, accumulatedResponse]);

  const { setSidebarCollapsed } = useShellStore();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setSidebarCollapsed(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await generate({ prompt: userMessage.content });
    } catch (error) {
      console.error('Generation error:', error);
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
            key={index}
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
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Streaming response */}
        {isLoading && accumulatedResponse && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="max-w-[85%] rounded-[6px] px-4 py-3 bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)]">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {accumulatedResponse}
                <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--app-accent)] animate-pulse align-middle" />
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !accumulatedResponse && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[6px] px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-[var(--app-accent)]/40 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--app-accent)]/60 uppercase tracking-widest">Thinking</span>
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
