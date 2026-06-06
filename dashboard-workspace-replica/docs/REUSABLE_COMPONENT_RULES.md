# Reusable Components Rules (Frontend)

## Non-negotiable
- No inline component definitions inside `src/app/**/page.tsx`.
- No duplicated UI blocks across pages; extract to `src/components/**`.
- Shared shells live in:
  - `src/components/workspace/*` (client dashboard IDE)
  - `src/components/dashboard/*` (client overview pages)
  - `src/components/admin/*` (admin shell + widgets)

## Quick checklist before shipping
- If the same UI appears twice, it becomes a component.
- If a component has multiple variants (workspace vs page), add a prop (e.g. `chromeless`) instead of copying.
- Keep borders/separators consistent (`border-border/40`) and avoid double borders.

