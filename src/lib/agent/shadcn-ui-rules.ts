export const SHADCN_UI_RULES = [
  'Build UI with a shadcn-style system: semantic CSS variables in app/globals.css, Tailwind theme classes in JSX, and reusable primitives in components/ui.',
  'Use the standard shadcn token vocabulary: background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, destructive-foreground, border, input, and ring.',
  'When importing from @/components/ui/*, first verify that file exists. If it does not exist, create the minimal primitive file or avoid the import and use semantic Tailwind directly.',
  'Prefer shadcn-style primitives for common controls: Button, Card, Input, Textarea, Badge, Tabs, Dialog, Select, Label, Separator, Avatar, Alert, Skeleton, Tooltip, and DropdownMenu.',
  'Every primitive or composed component must include default, hover, focus-visible, disabled, loading or pending where relevant, and responsive states.',
  'Use cn(), class-variance-authority variants, and tailwind-merge when the project already has them. Do not introduce a custom styling pattern beside an existing shadcn/cn setup.',
  'Keep component APIs boring and predictable: variant, size, className, children, disabled, asChild where appropriate, and typed props that extend the matching React HTML attributes.',
  'Use semantic classes such as bg-background, text-foreground, bg-card, text-card-foreground, border-border, text-muted-foreground, bg-primary, text-primary-foreground, ring-ring, and focus-visible:ring-ring.',
  'Do not use raw hex, random arbitrary colors, inline style objects for standard UI, decorative gradients, glass effects, or mismatched radii when a tokenized shadcn-style class can express the design.',
  'For generated apps, create complete file blocks for any added UI primitive, its imports, and any utility it needs. Never leave dangling @/components/ui imports.',
];

export function formatShadcnUiRules() {
  return SHADCN_UI_RULES.map((rule) => `- ${rule}`).join('\n');
}
