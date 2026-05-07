import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function DashboardQuickLink({
  href,
  icon: Icon,
  label,
  highlight = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] transition-colors ${
        highlight
          ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
          : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 opacity-50" />
    </Link>
  );
}
