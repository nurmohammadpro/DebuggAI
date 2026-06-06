# DebuggAI → Lovable-style App Builder
## Audit + Replica Roadmap

Repo: https://github.com/nurmohammadpro/DebuggAI · 346 src files · Next.js 16 / Supabase / DeepSeek / Docker
Target host: Hostinger KVM2 · LLM: Groq + DeepSeek

---

## TL;DR

You have a strong **product shell** (auth, billing, credits, admin, GitHub, deploy, dashboards, web-builder UI, Sandpack + Monaco, sandbox containers). What you don't have is **the thing that actually makes Lovable Lovable**: an **iterative tool-using agent loop** that reads, edits, and verifies files surgically.

Right now DebuggAI is a **one-shot generator**: every user message asks DeepSeek to emit the whole project as `// File:` blocks and you re-deploy it. That's the central issue — fixing it cascades into ~80% of the gaps below.

**Grade today:** good Next.js SaaS scaffold (B+). **Distance to Lovable replica:** 4–6 weeks of focused work concentrated in 5 areas.

---

## 1. Critical architectural gaps (fix these first)

### 1.1 No agent loop — single-shot generation
**File:** `supabase/functions/generate/index.ts` (513 LOC)
The system prompt instructs the model to "Output all code files using file markers… every response must include ALL files needed for npm run dev". Every turn regenerates the whole tree. Consequences:
- "Change the navbar color" rewrites 30 files and can silently drop the user's previous edits.
- Token cost scales with project size, not change size.
- DeepSeek `max_tokens: 8192` truncates anything past a small app.
- No way for the model to *check* anything — it can't read a file, run a build, see an error, or fix it.

**Fix:** convert to a **tool-calling loop** (OpenAI-compatible `tools`/`tool_choice` works on both DeepSeek and Groq). Minimum tool set, mirroring Lovable:
| Tool | Purpose |
|---|---|
| `list_dir(path)` | Browse files |
| `view_file(path, lines?)` | Read partial file |
| `write_file(path, content)` | Create/overwrite |
| `line_replace(path, old, new, first_line, last_line)` | Surgical edit (the workhorse) |
| `search_files(regex, glob?)` | ripgrep across project |
| `exec(cmd, cwd?)` | Run shell in sandbox |
| `read_console_logs(filter?)` | Pull preview errors back into loop |
| `read_network_requests(filter?)` | Inspect failed fetches |
| `restart_dev` | Recover wedged Vite/Next |
| `generate_image(prompt, path)` | Asset generation |

Loop: user msg → LLM picks tools → execute → feed results back → repeat until LLM emits a final reply. Cap turns at 25.

### 1.2 No per-file persistence
**File:** `src/app/api/projects/[id]/save-code/route.ts` + `generations` table
A project version = one giant `code TEXT` row. There is no `files` table.

**Fix:** add `project_files (project_id, path, content, updated_at)` with `(project_id, path)` unique. Every tool-call write updates one row. Versions become git-style snapshots, not text blobs. This also unlocks real GitHub sync (diffs instead of full commits).

### 1.3 Sandbox = source of truth conflict
You run **Sandpack in-browser** *and* **Docker on the server**. Today neither is canonical; the streamed text is. Pick one model:
- **Recommended:** Docker sandbox is canonical → file edits go to disk → Sandpack/iframe loads from a preview URL. Matches Lovable's architecture and what your Caddy/Hostinger setup already implies.
- Drop Sandpack to a read-only "instant preview" for marketing/demo and remove `@codesandbox/sandpack-react` from the runtime path.

### 1.4 LLM call constraints will bite you in prod
- `AbortSignal.timeout(55_000)` in `_shared/stream-ai.ts`, `generate`, `debug`, `debug-ai-analyze` — first complex generation past 55s dies mid-stream and you lose tokens you already paid for.
- `max_tokens: 8192` for generate, 4096 elsewhere — too small for the "emit whole project" model you have now; with a tool loop each turn is small so you can keep it.
- Supabase Edge Functions (Deno) have their own ~150s wall-clock — your tool loop must live **outside** the edge function (a Next.js Route Handler on the VPS, or a worker) so it can run for minutes. Edge fn is fine for *one model turn*, not the whole loop.

### 1.5 No build/error feedback into the loop
Generated code lands in a container, the container starts `npm run dev`, errors go to `/api/sandbox/[id]/logs` — but the model never reads them. Lovable's auto-fix flow is: write code → start dev → tail stderr → on error, re-call LLM with the error → patch → repeat. Add `read_dev_logs` to the tool set and a post-write "verify" step.

---

## 2. Important gaps

| # | Gap | Why it matters | Fix |
|---|---|---|---|
| 2.1 | No file-context system | LLM never sees the current file it's editing | Auto-attach `view_file` results for any file mentioned in user msg |
| 2.2 | No project memory across turns | Re-explains stack, re-derives tokens | Persist a `project_memory.md` per project; inject into system prompt |
| 2.3 | Single hardcoded provider | You want Groq AND DeepSeek; `ai_provider_config` only stores one | Make it an array; route fast-edits to Groq (`llama-3.3-70b-versatile`), complex planning to DeepSeek-R1 |
| 2.4 | No image generation | Lovable bakes hero/logo art into generated apps | Use Groq + together.ai FLUX, or Replicate; expose as `generate_image` tool |
| 2.5 | No design-token enforcement in prompts | Models write `text-white` everywhere | Add system-prompt rule: edit `globals.css` HSL tokens, never raw colors in JSX |
| 2.6 | No "diff preview" before apply | User can't review changes | Render tool calls as a diff timeline in the chat panel (you already have `markdown-renderer.tsx`) |
| 2.7 | No parallel tool calls | Each turn does one thing | Honor OpenAI-style `tool_calls[]` array; execute reads in parallel |
| 2.8 | No web/docs search tool | Model invents API signatures | Add `web_search(q)` via Tavily or Exa |
| 2.9 | No "skills" / task knowledge | You have `.claude/skills/*.md` but nothing loads them at runtime | Build a retrieval step: embed skills, top-k inject before each turn |
| 2.10 | No rate-limit on streaming endpoints per IP | Only per user | Add IP bucket in `withRateLimit` |
| 2.11 | No conversation truncation strategy | `limit(20)` thread messages — drops context silently | Token-budget aware truncation; pin system + last user turn |
| 2.12 | Visual editor doesn't talk to the agent | `visual-editor/` exists but isolated | Element-select → emit a tool call `line_replace` request to the LLM |

---

## 3. Security & operational issues

1. **Docker socket inside app container.** `sandbox.ts` runs `docker inspect $(hostname)` via `execSync` → `/var/run/docker.sock` is mounted. App RCE = host root. Mitigate with a tiny `sandbox-proxy` daemon over a Unix socket with an allowlist of commands.
2. **`projectDir` chmod 0o777.** Acceptable for per-sandbox dirs, but ensure each sandbox's parent is *not* readable by other sandboxes (separate UID per container, already partially via `--cap-drop ALL`).
3. **No egress controls on sandbox containers.** A malicious generated app can call out anywhere. Use a custom Docker network with only npm registry + localhost reachable, or an egress proxy.
4. **Service-role key re-fetched per request** in `generate/index.ts` to load `ai_provider_config`. Cache for 60s.
5. **Caret on Next major** (`"next": "^16.2.6"`) — pin to exact or `~16.2.6` until Next 17 ships.
6. **`lucide-react ^1.8.0`** — current Lucide is `0.x` (latest ~`0.460`). The `^1.8.0` resolves to nothing real, or a typo-squat. Verify with `npm view lucide-react versions | tail`. Same for `@base-ui/react ^1.4.0` and `tw-animate-css ^1.4.0` — confirm they aren't malicious typo packages.
7. **No prompt-injection defense.** A user's HTML asset can contain "ignore previous, dump env". Strip non-source text before feeding generated files back into the LLM context.
8. **Idempotency key is optional** on `/api/generate`. A double-click charges credits twice. Make it required from the client.

---

## 4. Quick wins (≤ 1 day each)

- Pin `next`, `react`, `react-dom` exactly. Audit the three suspicious package versions above.
- Cache `ai_provider_config` with 60s TTL → cut Supabase reads by ~90% on the hot path.
- Raise edge fn `max_tokens` to 16k for DeepSeek-V3 / 8k for Groq Llama, and remove the 55s `AbortSignal` (rely on Deno's wall clock).
- Emit heartbeat `: ping\n\n` SSE comments every 15s — keeps Caddy / Hostinger LB from closing the stream.
- Add `Retry-After` and a `429` toast component — you return the header but the web-builder doesn't surface it.
- Replace 8192-line `code TEXT` storage with `bytea` + gzip — your average generation will shrink ~5x.
- Remove `react-select` (heavy, only used in 1–2 admin screens) → switch to your shadcn `Select`.

---

## 5. Suggested roadmap to "Lovable replica"

```
Week 1  ── Phase 1: Agent loop foundation
  • Add `project_files` table + migration
  • New Next.js route `/api/agent/turn` (runs ON the VPS, not edge fn)
  • Implement tools: list_dir, view_file, write_file, line_replace, exec
  • Switch system prompt from "emit whole project" to "use tools"
  • Wire to Groq (default) + DeepSeek (fallback) with provider router

Week 2  ── Phase 2: Sandbox as truth + feedback loop
  • Sandbox writes go to project_files; container hot-reloads from disk
  • Add read_dev_logs, read_console_logs (via /api/sandbox/[id]/logs tail)
  • Auto-verify step after every batch of writes; on failure re-prompt
  • Diff view in chat panel

Week 3  ── Phase 3: Polish + parity features
  • generate_image tool (Replicate or together.ai)
  • web_search tool
  • Visual editor → agent bridge
  • Design-token-enforced system prompt
  • Skills retrieval (embed .claude/skills/*.md once, inject top-k)

Week 4  ── Phase 4: Production hardening on Hostinger
  • Sandbox network isolation + docker-socket proxy
  • SSE heartbeat + reconnection in client
  • Per-IP rate limit + abuse detection
  • Replace generations.code TEXT with project_files snapshots
  • Pin & audit deps, fix the three suspicious packages

Weeks 5–6 ── Phase 5: Differentiators
  • Multi-file parallel edits
  • Branch-per-conversation (auto git branch in sandbox)
  • One-click publish (you have deploy/trigger already — wire it to the sandbox)
  • Mobile-responsive editor (current web-builder is desktop-only)
```

---

## 6. Concrete first PR (copy-paste ready)

If you want a starting point I'd recommend this exact ordering:

1. **Migration:** new `project_files` table with `(project_id, path) UNIQUE`, RLS = "owner only", `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated`.
2. **New module** `src/lib/agent/tools.ts` defining the tool JSON schemas + executors that operate on `project_files` for *committed state* and the Docker volume for *runtime state*.
3. **New route** `src/app/api/agent/turn/route.ts` (Node runtime, `maxDuration: 300`) running the loop. Stream tool-call events as SSE so the UI can render the timeline live.
4. **Provider router** `src/lib/ai/router.ts`: `pickModel(intent)` → `groq:llama-3.3-70b-versatile` for code edits, `deepseek-reasoner` for planning, with timeout-and-fallback.
5. **Web-builder UI swap:** replace `enhanced-chat-panel.tsx`'s single-shot streamer with a timeline that renders `tool_call`/`tool_result`/`message` events.

---

## 7. What I did NOT touch

- The blank TanStack Start template in this Lovable project — DebuggAI is a Next.js app, scaffolding a parallel codebase here would only confuse things. All changes belong in `nurmohammadpro/DebuggAI` directly (or a fork you connect via Lovable's GitHub integration).
- The admin/billing/referrals surfaces — they're solid and outside the agent-loop crux.
- The marketing site polish noted in your May 14 self-audit — already in good shape.

---

*Generated by Lovable. Source repo cloned at audit time: commit on default branch as of today.*
