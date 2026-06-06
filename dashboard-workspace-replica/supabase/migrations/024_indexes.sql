-- 020_indexes.sql
-- Performance indexes
-- Execution Order: 20th

-- profiles (additional)
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code    ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer  ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type        ON public.profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_profiles_username         ON public.profiles(username);

-- credit_wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id           ON public.credit_wallets(user_id);

-- credit_transactions
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id    ON public.credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at   ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type         ON public.credit_transactions(type);

-- debug_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id          ON public.debug_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created     ON public.debug_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_action_type      ON public.debug_sessions(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_sessions_tags             ON public.debug_sessions USING GIN(tags);

-- debug_session_files
CREATE INDEX IF NOT EXISTS idx_session_files_session     ON public.debug_session_files(session_id);

-- web_builder_sessions
CREATE INDEX IF NOT EXISTS idx_wb_user_id                ON public.web_builder_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wb_public                 ON public.web_builder_sessions(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_wb_created_at             ON public.web_builder_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wb_forked                 ON public.web_builder_sessions(forked_from);

-- web_builder_versions
CREATE INDEX IF NOT EXISTS idx_wb_versions_session       ON public.web_builder_versions(session_id, version_number DESC);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer        ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee         ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code            ON public.referrals(referral_code);

-- analytics_usage_logs (critical for rate limiting)
CREATE INDEX IF NOT EXISTS idx_usage_rate_limit
  ON public.analytics_usage_logs(user_id, action_type, created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifs_user_unread
  ON public.notifications(user_id, is_read) WHERE is_read = false;

-- audit_events
CREATE INDEX IF NOT EXISTS idx_audit_user_id             ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at          ON public.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action              ON public.audit_events(action);

-- abuse_events
CREATE INDEX IF NOT EXISTS idx_abuse_user_id             ON public.abuse_events(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_created_at          ON public.abuse_events(created_at DESC);
