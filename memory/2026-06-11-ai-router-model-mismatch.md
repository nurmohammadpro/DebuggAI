# Debug Report: AI router model mismatch

- Date: 2026-06-11
- Symptom: Agent generation failed with `AI API error (400): {"code":"1211","message":"Unknown Model"}`.
- Root cause: `.env.local` configured a custom OpenAI-compatible Z.ai endpoint with `AI_MODEL=glm-4.6`, but `src/lib/ai/router.ts` always routed `AI_API_KEY` requests as DeepSeek and sent `deepseek-chat` / `deepseek-reasoner` to that endpoint.
- Fix: Provider configs now carry an optional configured model, and the agent route passes `AI_MODEL` through after trimming `AI_BASE_URL`.
- Regression test: `src/__tests__/ai-router.test.ts` verifies custom configured models are respected and DeepSeek defaults still work when no model is configured.
- Verification: `npx tsc --noEmit`, focused `eslint`, and `npx vitest run src/__tests__/ai-router.test.ts src/__tests__/preview-normalizer.test.ts src/__tests__/generation-store.test.ts` passed.
- Status: DONE.
