-- 006_subscription_plans.sql
-- Static plan definitions with seed data
-- Execution Order: 6th

DROP TABLE IF EXISTS public.subscription_plans CASCADE;

CREATE TABLE public.subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            plan_type NOT NULL UNIQUE,
  stripe_price_id TEXT UNIQUE,
  price_monthly   NUMERIC(8,2) NOT NULL DEFAULT 0,
  credits_per_month INTEGER NOT NULL,
  history_days    INTEGER NOT NULL DEFAULT 30,
  features        JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data for plans
INSERT INTO public.subscription_plans (name, price_monthly, credits_per_month, history_days, features)
VALUES
  ('free',       0,   30,        30,  '["analyze","reverse"]'::jsonb),
  ('pro',        9,   300,       365, '["analyze","reverse","web_builder","zero_knowledge","priority_ai"]'::jsonb),
  ('team',       99,  2500,      365, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","team_dashboard","export"]'::jsonb),
  ('business',   299, 10000,     730, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","team_dashboard","export","github","vercel","analytics"]'::jsonb),
  ('enterprise', 999, 40000,     730, '["analyze","reverse","web_builder","zero_knowledge","priority_ai","team_dashboard","export","github","vercel","analytics","admin_controls","sla","private_deployment"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.subscription_plans IS 'Static seed data defining tiers';
