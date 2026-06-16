export type BuilderModeId = 'auto' | 'refactor' | 'fix' | 'polish';

const EXISTING_CODE_BASELINE_RULES = [
  'Treat existing code as the source of truth. Read relevant files before editing and preserve the current product, routes, data flow, public props, and working imports.',
  'Do not replace the app with a new template, sample app, or unrelated redesign. Modify the smallest set of files that solves the selected mode.',
  'Keep package and config changes rare. Add or change dependencies only when the current code cannot support the request without them.',
  'When moving code, update every import/export path and keep compatibility wrappers when a rename could break callers.',
  'After changes, verify mentally against build/runtime risks: missing imports, client/server boundaries, TypeScript types, CSS token availability, and responsive layout.',
];

const MODE_RULES: Record<BuilderModeId, string[]> = {
  auto: [
    'Choose exactly one dominant path for the turn: Fix for broken behavior, Refactor for maintainability, Polish for visual/UX quality, or Bootstrap only when no substantive files exist.',
    'If existing files are loaded, prefer iterative edits over rebuilds even when the user prompt is short.',
    'When the prompt is ambiguous, preserve behavior first and make the least surprising improvement.',
  ],
  refactor: [
    'Behavior must remain visibly and functionally equivalent unless the user explicitly asks for a product change.',
    'Target structural debt: oversized files, duplicated JSX/data, unclear naming, mixed concerns, repeated style strings, brittle helpers, or tangled state.',
    'Extract cohesive components, hooks, data constants, or pure helpers. Do not fragment code into tiny files that make the app harder to follow.',
    'Preserve visual output, copy, routes, forms, and event behavior. Avoid color, spacing, and content changes unless required by the refactor.',
    'Leave a concise summary of the boundaries changed and any imports updated.',
  ],
  fix: [
    'Start from the observed failure: error message, stack trace, broken screen, missing import, type error, or runtime behavior. Fix root cause before symptoms.',
    'Make the narrowest reliable change. Do not refactor, redesign, rename files, or add new abstractions unless they are required to fix the bug.',
    'Prioritize build and render safety: valid imports, exported components, TypeScript-compatible props, correct client/server component boundaries, and dependency availability.',
    'When code references unavailable libraries or components, either add the missing dependency/file or replace the usage with a local implementation.',
    'Do not add polish while fixing. Once the app builds and renders, stop.',
  ],
  polish: [
    'Preserve the product intent, data flow, routes, and primary interactions. Polish is an upgrade to quality, not a rewrite.',
    'Improve the visible experience through design tokens, contrast, spacing rhythm, responsive layout, card composition, button states, form states, empty/loading/error states, and accessible labels.',
    'Prefer reusable CSS variables, shared classes, and existing components over one-off inline styling.',
    'Keep the page content complete. If the prompt asks for cards, pricing, nav, forms, or sections, make those pieces visible and coherent.',
    'Avoid unrelated architecture work, package churn, decorative effects, and generic AI-looking filler.',
  ],
};

export function formatExistingCodeModeRules(mode: BuilderModeId) {
  return [...EXISTING_CODE_BASELINE_RULES, ...MODE_RULES[mode]]
    .map((rule) => `- ${rule}`)
    .join('\n');
}
