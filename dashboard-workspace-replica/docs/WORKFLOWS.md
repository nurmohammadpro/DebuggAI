# DeBuggAI — User + Admin Workflows (v1)

## Client (User) workflow

### Auth
1. User signs up on `/register`.
2. Supabase sends confirmation email → user clicks verify link.
3. User lands on `/auth/callback` and is redirected to `/dashboard/home`.
4. User can sign out from the dashboard topbar account menu.

### Projects (v1 = `public.generations`)
1. User opens `/dashboard/home`.
2. Creates a project (creates a `generations` row).
3. Selects **Open** → navigates to `/dashboard?project=<generation_id>`.
4. Projects hub also supports rename / duplicate / delete.

### Workspace IDE (`/dashboard`)
1. Topbar shows: logo → project switcher → mode chips (**Build / Debug**) → credits → actions (save version / share / run) → account menu.
2. User drags splitters to resize explorer/editor/right-panel (persisted in `localStorage`).
3. **Build mode**
   - Default right tab is **Preview**.
   - “Run” refreshes preview.
4. **Debug mode**
   - Default right tab is **Console**.
   - User uses chat + console to iterate on errors.
5. Versions
   - “Save version” creates a new `generations` row under the same `metadata.project_key`.
   - “Versions” tab shows server-backed history for that project key.
6. Share
   - Copies `/dashboard?project=<id>` link.

### History + credits
- `/dashboard/debug/history` shows user’s debug sessions (`public.debug_sessions`).
- `/dashboard/settings/transactions` shows wallet + transaction history (`public.credit_wallets`, `public.credit_transactions`).

---

## Admin workflow (v1)

### “Who is admin?”
- While DB schema is still being finalized, admin is controlled by **env allowlist**:
  - `ADMIN_EMAILS` (server) and `NEXT_PUBLIC_ADMIN_EMAILS` (client UI).
- Admin UI is visible/accessible only if the signed-in user’s email is in the allowlist.

### Admin navigation
1. Admin opens `/dashboard/admin`.
2. AdminShell renders sidebar + topbar:
   - Analytics
   - Users
   - Credits
   - Monitoring (placeholder until backend is connected)

### Admin capabilities
- **Users**: search/filter users, edit plan/admin flag, delete user.
- **Credits**: list transactions and manually adjust user credits.
- **Analytics**: view platform usage metrics (server-backed endpoints).

