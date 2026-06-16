import { describe, expect, it } from 'vitest';
import { formatUiQualityRules, UI_QUALITY_RULES } from '@/lib/agent/ui-quality-rules';

describe('UI quality generation rules', () => {
  it('covers the visual failures seen in generated landing pages', () => {
    const rules = formatUiQualityRules().toLowerCase();

    expect(UI_QUALITY_RULES.length).toBeGreaterThanOrEqual(6);
    expect(rules).toContain('background');
    expect(rules).toContain('text contrast');
    expect(rules).toContain('pricing cards');
    expect(rules).toContain('hero sections');
    expect(rules).toContain('mostly empty first viewport');
    expect(rules).toContain('distinct surface');
  });

  it('formats as prompt-ready bullets', () => {
    const lines = formatUiQualityRules().split('\n');

    expect(lines).toHaveLength(UI_QUALITY_RULES.length);
    expect(lines.every((line) => line.startsWith('- '))).toBe(true);
  });
});
