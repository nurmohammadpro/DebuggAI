export const UI_QUALITY_RULES = [
  'Before writing UI code, choose a clear visual scene and palette strategy. Define theme tokens in app/globals.css for background, surface, card, border, primary text, muted text, accent, and accent foreground.',
  'Do not leave the page on default browser white with default dark text unless the user explicitly asks for a plain document. Background, text, border, and card colors must look intentionally paired.',
  'Keep text contrast strong: headings and body text must be easy to read, muted text must remain legible, and CTAs must have readable foreground/background contrast.',
  'When the user asks for specific structures such as pricing cards, feature cards, testimonials, forms, stats, or navigation, implement every requested structure as visible, complete UI in the first generated version.',
  'Hero sections should not create a mostly empty first viewport. Put meaningful content, a CTA, or the next requested section close enough that users immediately understand the page has more than a headline.',
  'Cards need real composition: distinct surface or subtle border, clear title/body/action hierarchy, consistent padding, responsive grid behavior, and hover/focus states when interactive.',
  'Avoid generic AI output: no decorative gradients, no glassmorphism, no nested cards, no oversized empty spacing, no placeholder-only sections, and no repeated identical cards without differentiated content.',
  'Use semantic Tailwind classes and CSS variables in JSX. Raw color values belong in CSS tokens, not inline JSX.',
];

export function formatUiQualityRules() {
  return UI_QUALITY_RULES.map((rule) => `- ${rule}`).join('\n');
}
