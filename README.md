# DeBuggAI

AI-powered debugging and web builder platform. Generate, debug, and preview applications in isolated Docker sandboxes.

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + RLS)
- **State**: Zustand + TanStack React Query
- **Editor**: Monaco Editor (VS Code)
- **Auth**: Supabase Auth (SSR cookie-based)
- **AI**: DeepSeek via OpenAI-compatible API (edge functions)
- **Sandboxes**: Docker containers with resource limits
- **Payments**: Stripe
- **Monitoring**: Sentry

## Getting Started (Development)

### Prerequisites
- Node.js 20+
- Docker Desktop (for sandbox previews)
- Supabase project (local or hosted)
- DeepSeek API key

### Setup

```bash
# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Production build (standalone output) |
| `npm start` | Start production server |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright E2E tests |

## Production Deployment (Hostinger KVM2)

### Architecture
- All-in-one VPS: Next.js app + Docker sandboxes on the same host
- Caddy reverse proxy terminates TLS (Let's Encrypt)
- Supabase remains cloud-hosted (separate from VPS)

### Prerequisites (on VPS)

```bash
# Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Create project directories
sudo mkdir -p /var/lib/debuggai/projects
sudo chown -R 1000:1000 /var/lib/debuggai
```

### Deploy

```bash
# 1. Clone the repo on the VPS
git clone https://github.com/your-org/debuggai /opt/debuggai
cd /opt/debuggai

# 2. Create production env file
cp .env.example .env.production
# Edit .env.production with your secrets

# 3. Build and start
cd deploy
docker compose up -d --build

# 4. Verify health
curl https://debuggaidemo.appbrainer.tech/api/health
```

### Required Environment Variables (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin key for RLS bypass (billing, plan enforcement) |
| `AI_API_KEY` | ✅ | DeepSeek API key |
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical app URL |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (billing) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `ADMIN_EMAILS` | Optional | Comma-separated admin email allowlist |

### Firewall Rules

| Port | Purpose |
|------|---------|
| 22 | SSH (restrict to your IP) |
| 80 | HTTP (redirect to HTTPS) |
| 443 | HTTPS (TLS) |
| 4000+ | Internal sandbox containers (no external access) |

Do **not** expose port 3000 or sandbox ports (4000+) directly.

### Sandbox Security

- Each sandbox runs in a Docker container with resource limits (1 CPU, 1GB RAM, 256 PIDs)
- Containers have `no-new-privileges` and all capabilities dropped (`--cap-drop ALL`)
- Writable `/tmp` is a memory-limited tmpfs (64MB)
- Orphaned containers are reaped on boot and every 5 minutes
- Admin kill-switch: `POST /api/admin/sandbox-config` with `{ "disabled": true }`

### Updating

```bash
cd /opt/debuggai
git pull
cd deploy
docker compose up -d --build --pull always
```

### CI/CD

- GitHub Actions runs lint, typecheck, tests, and build on every PR
- Pushes to `main` trigger the production deploy workflow once the GitHub secrets below are configured
- Supabase migrations and edge functions deploy from `main` branch automatically

#### Production deploy secrets

Set these repository secrets so the deploy workflow can reach the VPS:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`

## Architecture Notes

- **Preview proxy**: `/preview/[id]/*` proxies requests to the sandbox's Docker container, avoiding CORS issues
- **Credit system**: Server-side `spend_credits` RPC (idempotent) for all billable actions
- **Rate limiting**: Per-action rate limits enforced server-side based on plan tier
- **SSE streaming**: AI responses stream via Server-Sent Events through the API proxy

## Project Structure

```
src/
├── app/          # Next.js App Router pages + API routes
│   ├── api/      # API endpoints (generate, debug, sandbox, etc.)
│   └── dashboard/  # Protected dashboard pages
├── components/   # React components (admin, dashboard, web-builder, ui)
├── hooks/        # Custom React hooks
├── lib/          # Utilities, services, and server-only modules
│   ├── sandbox/  # Docker sandbox manager
│   └── server/   # Server-only auth, plan enforcement, API error
├── store/        # Zustand state stores
└── __tests__/    # Unit tests

deploy/           # Production deployment config
├── docker-compose.yml
└── Caddyfile

supabase/         # Database migrations + Edge Functions
├── migrations/   # SQL migrations
└── functions/    # Supabase Edge Functions
```
