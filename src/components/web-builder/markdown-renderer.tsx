'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
      <div className="my-3 overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[#0f172a]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-white/60">
          <span>{match?.[1] || 'code'}</span>
        </div>
        <SyntaxHighlighter
          language={match?.[1] || 'text'}
          style={oneDark as any}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: 'transparent',
            padding: '12px',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            className: 'font-mono',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
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
    <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-li:my-0 prose-strong:text-[var(--app-text)] prose-a:text-[var(--app-accent)] prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
