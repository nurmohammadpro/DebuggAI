-- 018_rls_policies.sql
-- Row Level Security for all tables
-- Execution Order: 18th

-- Enable RLS on every table
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_wallets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_session_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_builder_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_usage_logs    ENABLE ROW LEVEL SECURITY;

-- profiles: Public read, self-only update (prevent privilege escalation)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    AND plan_type = (SELECT plan_type FROM public.profiles WHERE id = auth.uid())
  );

-- credit_wallets: Self-only read, no direct update (use RPC)
CREATE POLICY "wallets_select_own"
  ON public.credit_wallets FOR SELECT USING (auth.uid() = user_id);

-- credit_transactions: Self-only read
CREATE POLICY "transactions_select_own"
  ON public.credit_transactions FOR SELECT
  USING (wallet_id IN (
    SELECT id FROM public.credit_wallets WHERE user_id = auth.uid()
  ));

-- subscription_plans: Public read
CREATE POLICY "plans_select_all"
  ON public.subscription_plans FOR SELECT USING (is_active = true);

-- debug_sessions: Full CRUD for owner
CREATE POLICY "sessions_select_own"
  ON public.debug_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own"
  ON public.debug_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own"
  ON public.debug_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own"
  ON public.debug_sessions FOR DELETE USING (auth.uid() = user_id);

-- debug_session_files: Cascade via session ownership
CREATE POLICY "session_files_select"
  ON public.debug_session_files FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.debug_sessions WHERE user_id = auth.uid()
  ));

-- web_builder_sessions: Owner + public read
CREATE POLICY "wb_select"
  ON public.web_builder_sessions FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "wb_insert_own"
  ON public.web_builder_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wb_update_own"
  ON public.web_builder_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wb_delete_own"
  ON public.web_builder_sessions FOR DELETE USING (auth.uid() = user_id);

-- web_builder_versions: Cascade via session ownership
CREATE POLICY "wb_versions_select"
  ON public.web_builder_versions FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.web_builder_sessions
    WHERE user_id = auth.uid() OR is_public = true
  ));

-- web_builder_templates: Public read
CREATE POLICY "templates_select_public"
  ON public.web_builder_templates FOR SELECT USING (is_active = true);

-- referrals: Involved parties only
CREATE POLICY "referrals_select_involved"
  ON public.referrals FOR SELECT
  USING (auth.uid() IN (referrer_id, referee_id));

-- referral_payouts: Self-only
CREATE POLICY "payouts_select_own"
  ON public.referral_payouts FOR SELECT USING (auth.uid() = user_id);

-- notifications: Self-only
CREATE POLICY "notifs_select_own"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifs_update_own"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- audit_events: Self read (admin via SECURITY DEFINER)
CREATE POLICY "audit_select_own"
  ON public.audit_events FOR SELECT USING (auth.uid() = user_id);

-- abuse_events: Self read
CREATE POLICY "abuse_select_own"
  ON public.abuse_events FOR SELECT USING (auth.uid() = user_id);

-- analytics_usage_logs: Self read
CREATE POLICY "usage_select_own"
  ON public.analytics_usage_logs FOR SELECT USING (auth.uid() = user_id);
