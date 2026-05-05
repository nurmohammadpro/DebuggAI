/**
 * Chat Panel Component
 *
 * Chat interface for AI code generation.
 * Streams responses in real-time.
 */

'use client';

import { useState, useRef, useEffect, type ElementType } from 'react';
import { useGeneration } from '@/hooks/use-generation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
      // Add complete response to messages
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, accumulatedResponse]);

  const { setSidebarCollapsed } = useShellStore();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Automatically collapse sidebar when starting a chat
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
      // Error is handled in the onError callback
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
          'I get a hydration error in Next.js — help me fix it.',
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

  const Container: ElementType = chromeless ? 'div' : Card;

  return (
    <Container
      className={cn(
        "flex flex-col overflow-hidden bg-card/60 backdrop-blur-xl border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        !chromeless && "rounded-2xl border",
        className
      )}
      style={{ height }}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b border-white/[0.05] flex items-center justify-between px-4 h-12 bg-white/[0.02] backdrop-blur-md shrink-0",
          chromeless ? "" : "rounded-t-2xl"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <div className="absolute inset-0 bg-emerald-400/20 blur-sm rounded-full animate-pulse" />
          </div>
          <h3 className="text-[13px] font-bold tracking-tight uppercase">AI Assistant</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">
            {mode === 'debug' ? 'Debug' : 'Build'}
          </span>
        </div>
        {!chromeless && (
          <StackSelector>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.05] gap-2">
              <Layers className="h-3.5 w-3.5" />
              Templates
            </Button>
          </StackSelector>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/[0.05] scroll-smooth">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative mb-6">
              <Sparkles className="h-16 w-16 text-emerald-500/20" />
              <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
            </div>
            <h4 className="text-xl font-bold mb-3 tracking-tight">
              {mode === 'debug' ? 'System Debugger' : 'Engine Architect'}
            </h4>
            <p className="text-sm text-muted-foreground/60 mb-8 max-w-[280px] leading-relaxed">
              {mode === 'debug'
                ? 'Paste your error logs or describe the bug to begin diagnosis.'
                : 'Describe your vision, and I will architect the codebase in real-time.'}
            </p>
            <div className="w-full max-w-[320px] space-y-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group"
                >
                  <p className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
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
                "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                message.role === 'user'
                  ? 'bg-emerald-600 text-white shadow-emerald-950/20'
                  : 'bg-white/[0.03] border border-white/[0.05] text-foreground shadow-black/20'
              )}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground/40 mt-1.5 px-1 font-medium">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Streaming response */}
        {isLoading && accumulatedResponse && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.05] text-foreground shadow-black/20">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {accumulatedResponse}
                <span className="inline-block w-1.5 h-4 ml-1 bg-emerald-500 animate-pulse align-middle" />
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !accumulatedResponse && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-full px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Thinking</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={cn(
        "p-4 shrink-0 bg-white/[0.01] backdrop-blur-md border-t border-white/[0.05]",
        chromeless ? "" : "rounded-b-2xl"
      )}>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-linear-to-r from-emerald-500/20 to-emerald-500/0 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex flex-col gap-2 bg-black/20 rounded-xl border border-white/[0.08] group-focus-within:border-emerald-500/30 transition-all p-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[60px] max-h-[160px] resize-none bg-transparent border-0 focus-visible:ring-0 text-[13px] leading-relaxed p-3"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between px-2 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/40 font-medium">
                  {input.length} chars
                </span>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
                className={cn(
                  "h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950/20",
                  (!input.trim() || isLoading) && "opacity-50 grayscale"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider">
                    <span>Generate</span>
                    <Send className="h-3 w-3" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center mt-3 gap-4 opacity-40">
          <div className="flex items-center gap-1">
            <kbd className="text-[9px] bg-white/[0.05] border border-white/[0.1] rounded px-1 min-w-[16px] h-4 flex items-center justify-center font-sans">⏎</kbd>
            <span className="text-[9px] font-medium uppercase tracking-tighter">Send</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="text-[9px] bg-white/[0.05] border border-white/[0.1] rounded px-1 min-w-[16px] h-4 flex items-center justify-center font-sans">⇧</kbd>
            <kbd className="text-[9px] bg-white/[0.05] border border-white/[0.1] rounded px-1 min-w-[16px] h-4 flex items-center justify-center font-sans">⏎</kbd>
            <span className="text-[9px] font-medium uppercase tracking-tighter">Newline</span>
          </div>
        </div>
      </div>
    </Container>
  );
}
