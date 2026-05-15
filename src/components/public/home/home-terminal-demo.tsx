'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useState } from 'react';

export function HomeTerminalDemo() {
  const [terminalReplay, setTerminalReplay] = useState(0);

  return (
    <div className="fade-up max-w-3xl mx-auto">
      <div
        className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] overflow-hidden"
        key={terminalReplay}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--app-border)] bg-[var(--app-panel-2)]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[11px] text-[var(--app-text-dim)] ml-2">
            debuggai session
          </span>
          <div className="ml-auto flex gap-1.5">
            <span className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono bg-[var(--app-surface)] text-[var(--app-text-dim)] border border-[var(--app-border)]">
              ⌘K
            </span>
            <span className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono bg-[var(--app-surface)] text-[var(--app-text-dim)] border border-[var(--app-border)]">
              Esc
            </span>
          </div>
        </div>
        <div className="p-4 font-mono text-[12px] leading-relaxed space-y-1">
          <div className="typing-line" style={{ animationDelay: '0.3s' }}>
            <span className="text-[var(--app-accent)]">$ </span>
            <span className="text-[var(--app-text)]">debuggai analyze</span>
          </div>
          <div className="typing-line" style={{ animationDelay: '0.8s' }}>
            <span className="text-[var(--app-text-muted)]">
              → Language detected:{' '}
              <span className="text-[var(--app-info)]">Python</span>
            </span>
          </div>
          <div className="typing-line" style={{ animationDelay: '1.2s' }}>
            <span className="text-[var(--app-text-muted)]">
              → Error type:{' '}
              <span className="text-[var(--app-danger)]">TypeError</span>,
              unsupported operand
            </span>
          </div>
          <div className="typing-line" style={{ animationDelay: '1.8s' }}>
            <span className="text-[var(--app-text-muted)]">
              → Analyzing stack trace...
            </span>
          </div>
          <div className="typing-line" style={{ animationDelay: '2.5s' }}>
            <span className="text-[var(--app-success)] flex items-center gap-1">
              <Check className="w-3 h-3" /> Root cause found: str + int
              concatenation
            </span>
          </div>
          <div className="typing-line" style={{ animationDelay: '3.0s' }}>
            <span className="text-[var(--app-text-muted)]">→ Generating fix...</span>
          </div>
          <div className="typing-line" style={{ animationDelay: '3.6s' }}>
            <div className="rounded-[6px] bg-[var(--app-success-soft)] border border-[var(--app-success)]/15 p-2 mt-1">
              <span className="text-[var(--app-text-dim)] line-through">
                total = &quot;Price: &quot; + 49.99
              </span>
              <br />
              <span className="text-[var(--app-success)]">
                total = f&quot;Price: &#123;49.99&#125;&quot;
              </span>
            </div>
          </div>
          <div className="typing-line" style={{ animationDelay: '4.2s' }}>
            <span className="text-[var(--app-success)] flex items-center gap-1">
              <Check className="w-3 h-3" /> Fix applied · 1 credit used · 2.1s
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[var(--app-accent)]">$ </span>
            <span className="inline-block w-2 h-[14px] bg-[var(--app-accent)] animate-pulse align-text-bottom" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-center mt-4">
        <button
          onClick={() => setTerminalReplay((prev) => prev + 1)}
          className="inline-flex items-center rounded-[6px] px-3 py-1.5 text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
        >
          ↻ Replay
        </button>
        <Link href="/signup">
          <button className="inline-flex items-center rounded-[6px] px-3 py-1.5 text-[11px] font-medium bg-[var(--app-accent)] text-[#071006] hover:opacity-90 transition-opacity">
            Try It Yourself →
          </button>
        </Link>
      </div>
    </div>
  );
}

