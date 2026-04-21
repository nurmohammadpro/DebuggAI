import { Check, X } from 'lucide-react';

export function PricingTableCell({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 mx-auto" style={{ color: 'var(--ds-green)' }} />
    ) : (
      <X className="h-4 w-4 mx-auto" style={{ color: 'var(--ds-text3)' }} />
    );
  }

  return <span style={{ color: 'var(--ds-text2)' }}>{value}</span>;
}

