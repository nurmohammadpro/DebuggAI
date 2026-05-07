import { Check, X } from 'lucide-react';

export function PricingTableCell({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 mx-auto text-[var(--app-success)]" />
    ) : (
      <X className="h-4 w-4 mx-auto text-[var(--app-text-dim)]" />
    );
  }

  return <span className="text-[13px] text-[var(--app-text-muted)]">{value}</span>;
}

