-- 002_enums.sql
-- Custom ENUM types for DeBuggAI
-- Execution Order: 2nd (after extensions)

-- Plan tiers
DROP TYPE IF EXISTS public.plan_type CASCADE;
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'team', 'business', 'enterprise');

-- Transaction types (immutable ledger)
DROP TYPE IF EXISTS public.transaction_type CASCADE;
CREATE TYPE public.transaction_type AS ENUM (
  'credit_added',       -- Welcome bonus, purchase, referral
  'credit_spent',       -- AI usage
  'subscription_reset', -- Monthly reset
  'referral_bonus',     -- Referral rewards
  'admin_adjustment',   -- Manual admin changes
  'purchase'            -- Direct credit purchase
);

-- Referral lifecycle
DROP TYPE IF EXISTS public.referral_status CASCADE;
CREATE TYPE public.referral_status AS ENUM (
  'pending', 'completed', 'failed', 'expired'
);

-- Payout states for ambassador program
DROP TYPE IF EXISTS public.payout_status CASCADE;
CREATE TYPE public.payout_status AS ENUM (
  'pending', 'approved', 'processing', 'paid', 'rejected'
);

-- Core product actions
DROP TYPE IF EXISTS public.debug_action_type CASCADE;
CREATE TYPE public.debug_action_type AS ENUM (
  'analyze',     -- Debug analysis
  'reverse',     -- Reverse engineer
  'web_builder'  -- v0.dev-like generation
);

-- Web builder template categories
DROP TYPE IF EXISTS public.template_category CASCADE;
CREATE TYPE public.template_category AS ENUM (
  'landing_page', 'dashboard', 'ecommerce',
  'auth', 'marketing', 'saas', 'portfolio'
);
