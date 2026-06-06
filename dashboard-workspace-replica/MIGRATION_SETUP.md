# Database Migration Setup Guide

## Problem
The dashboard is showing errors because the required database tables (`generations`, `debug_sessions`, `credit_wallets`) don't exist in your Supabase database.

## Solution

You need to run the database migrations on your Supabase database. Here are the options:

### Option 1: Run Migrations via Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Link your local project to Supabase**:
   ```bash
   supabase link --project-ref gaelygqwuzcoyduzedkm
   ```

3. **Run all migrations**:
   ```bash
   supabase db push
   ```

### Option 2: Run via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/gaelygqwuzcoyduzedkm/migrations

2. Click "New Migration" and upload each migration file in order:
   - `001_initial_schema.sql`
   - `002_add_stripe_columns.sql`
   - `003_add_referral_ambassador.sql`
   - `004_is_admin_function.sql`
   - `005_extensions.sql`
   - `006_enums.sql`
   - `007_profiles.sql`
   - `008_credit_wallets.sql`
   - `009_credit_transactions.sql`
   - `010_subscription_plans.sql`
   - And continue with the rest...

### Option 3: Run Combined Migration (Quick Fix)

For immediate testing, you can run the combined migration:

1. Go to https://supabase.com/dashboard/project/gaelygqwuzcoyduzedkm/sql/new

2. Copy the contents of `supabase/migrations/COMBINED_ALL_MIGRATIONS.sql`

3. Paste and execute the SQL

## Verification

After running migrations, verify tables exist:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('generations', 'debug_sessions', 'credit_wallets', 'profiles');

-- Should return:
-- generations
-- debug_sessions
-- credit_wallets
-- profiles
```

## Common Issues

### Issue: "relation already exists"
This means some tables were partially created. You can either:
1. Drop existing tables and re-run migrations
2. Skip the migration that created the table

### Issue: "permission denied"
Make sure you're using the service_role key or have admin permissions in Supabase.

## Next Steps

After migrations are complete:
1. Refresh the dashboard page
2. The API errors should be resolved
3. You should be able to create projects and use the platform

## Database Schema Overview

The key tables created:

- **generations**: Web builder code versions and projects
- **debug_sessions**: AI debugging sessions
- **credit_wallets**: User credit balances
- **credit_transactions**: Credit transaction history
- **profiles**: Extended user profiles
- **referrals**: Referral program data
- **messages**: Chat context for AI interactions
