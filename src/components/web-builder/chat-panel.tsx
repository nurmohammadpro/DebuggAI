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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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
      className={`flex flex-col overflow-hidden ${className || ''} ${chromeless ? '' : ''}`}
      style={{ height }}
    >
      {/* Header */}
      <div
        className={`border-b flex items-center justify-between ${
          chromeless ? 'border-border/40 px-3 h-11 bg-card' : 'px-4 py-2 bg-muted/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">AI Assistant</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/50 bg-muted/40 text-muted-foreground">
            {mode === 'debug' ? 'Debug' : 'Build'}
          </span>
        </div>
        {!chromeless && (
          <StackSelector>
            <Button variant="outline" size="sm" className="h-8">
              <Layers className="mr-2 h-3 w-3" />
              New Project
            </Button>
          </StackSelector>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-sm">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-2">
                {mode === 'debug' ? 'Start Debugging' : 'Start Building'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {mode === 'debug'
                  ? 'Describe the issue, paste the error, and we’ll fix it.'
                  : 'Describe what you want to build, or start with a new project template.'}
              </p>
              {!chromeless && (
                <StackSelector>
                  <Button variant="default" size="sm">
                    <Layers className="mr-2 h-4 w-4" />
                    Create New Project
                  </Button>
                </StackSelector>
              )}
              <div className="mt-4 space-y-2">
                {starterPrompts.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setInput(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <span className="text-xs opacity-70 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isLoading && accumulatedResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
              <p className="text-sm whitespace-pre-wrap break-words">
                {accumulatedResponse}
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !accumulatedResponse && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-full p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`${chromeless ? 'border-t border-border/40' : 'border-t'} p-4`}>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </Container>
  );
}
