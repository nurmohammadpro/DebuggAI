'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match;

    if (isInline) {
      return (
        <code
          className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[4px] px-1.5 py-0.5 text-[13px] font-mono text-[var(--app-text)]"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[6px] overflow-x-auto my-3">
        {match && (
          <div className="px-4 pt-2 pb-1 text-[10px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider select-none">
            {match[1]}
          </div>
        )}
        <code className={`px-4 pb-3 pt-1 block text-[13px] font-mono leading-relaxed ${className || ''}`} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  p({ children }) {
    return <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words mb-3 last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="text-[13px] leading-relaxed list-disc pl-5 mb-3 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="text-[13px] leading-relaxed list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-[13px] leading-relaxed">{children}</li>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-[var(--app-text)]">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  h1({ children }) {
    return <h1 className="text-base font-semibold text-[var(--app-text)] mb-2 mt-4 first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-[15px] font-semibold text-[var(--app-text)] mb-2 mt-4 first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-[14px] font-semibold text-[var(--app-text)] mb-1 mt-3 first:mt-0">{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-[var(--app-border)] pl-4 my-3 text-[var(--app-text-muted)] italic">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="border-[var(--app-border)] my-4" />;
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-[13px] border-collapse">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left font-medium text-[var(--app-text)]">{children}</th>;
  },
  td({ children }) {
    return <td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{children}</td>;
  },
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
