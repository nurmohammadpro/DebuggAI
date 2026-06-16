import { describe, expect, it } from 'vitest';
import { formatShadcnUiRules, SHADCN_UI_RULES } from '@/lib/agent/shadcn-ui-rules';

describe('shadcn UI generation rules', () => {
  it('requires tokenized shadcn-style UI primitives', () => {
    const rules = formatShadcnUiRules().toLowerCase();

    expect(SHADCN_UI_RULES.length).toBeGreaterThanOrEqual(8);
    expect(rules).toContain('semantic css variables');
    expect(rules).toContain('components/ui');
    expect(rules).toContain('button');
    expect(rules).toContain('card');
    expect(rules).toContain('focus-visible');
    expect(rules).toContain('class-variance-authority');
    expect(rules).toContain('bg-background');
  });

  it('prevents dangling shadcn imports in generated apps', () => {
    const rules = formatShadcnUiRules().toLowerCase();

    expect(rules).toContain('verify that file exists');
    expect(rules).toContain('create the minimal primitive file');
    expect(rules).toContain('never leave dangling @/components/ui imports');
  });
});
