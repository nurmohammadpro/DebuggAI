import { describe, expect, it } from 'vitest';
import { formatExistingCodeModeRules } from '@/lib/agent/builder-mode-rules';

describe('existing-code builder mode rules', () => {
  it('keeps refactors behavior-preserving and structural', () => {
    const rules = formatExistingCodeModeRules('refactor').toLowerCase();

    expect(rules).toContain('existing code as the source of truth');
    expect(rules).toContain('do not replace the app');
    expect(rules).toContain('behavior must remain');
    expect(rules).toContain('oversized files');
    expect(rules).toContain('preserve visual output');
  });

  it('keeps fixes narrow and root-cause oriented', () => {
    const rules = formatExistingCodeModeRules('fix').toLowerCase();

    expect(rules).toContain('observed failure');
    expect(rules).toContain('fix root cause');
    expect(rules).toContain('narrowest reliable change');
    expect(rules).toContain('do not add polish');
    expect(rules).toContain('client/server component boundaries');
  });

  it('keeps polish focused on UX quality without rewrites', () => {
    const rules = formatExistingCodeModeRules('polish').toLowerCase();

    expect(rules).toContain('preserve the product intent');
    expect(rules).toContain('not a rewrite');
    expect(rules).toContain('design tokens');
    expect(rules).toContain('card composition');
    expect(rules).toContain('generic ai-looking filler');
  });
});
