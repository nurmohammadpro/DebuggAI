-- Combined rate-limit check + log in a single RPC.
-- Replaces four sequential REST calls (INSERT log, SELECT profile,
-- SELECT throttle_config, COUNT logs) with one DB round-trip.
-- Mimics logic from plan-enforcement.ts:checkRateLimit + logUsage.

CREATE OR REPLACE FUNCTION public.check_and_log_rate_limit(
  p_user_id      UUID,
  p_action_type  debug_action_type,
  p_ip_address   TEXT DEFAULT NULL,
  p_credits_used INTEGER DEFAULT 1,
  p_model_used   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_type          TEXT;
  v_plan_rate_limit    INTEGER;
  v_throttle_override  INTEGER;
  v_effective_limit    INTEGER;
  v_current_count      INTEGER;
  v_allowed            BOOLEAN;
BEGIN
  -- 1. Log usage first (matches existing TOCTOU-minimizing order:
  --    logUsage inserts before checkRateLimit counts)
  INSERT INTO public.analytics_usage_logs
    (user_id, action_type, ip_address, credits_used, model_used)
  VALUES
    (p_user_id, p_action_type,
     CASE WHEN p_ip_address IS NOT NULL AND p_ip_address != ''
          THEN p_ip_address::inet ELSE NULL END,
     p_credits_used,
     COALESCE(NULLIF(p_model_used, ''), NULL));

  -- 2. Read plan_type from profiles
  SELECT COALESCE(plan_type, 'FREE') INTO v_plan_type
  FROM public.profiles WHERE id = p_user_id;

  -- 3. Map plan_type → per-minute rate limit
  --    Must stay in sync with src/lib/constants.ts PLANS
  SELECT CASE
    WHEN v_plan_type = 'FREE'       THEN 10
    WHEN v_plan_type = 'PRO'        THEN 30
    WHEN v_plan_type = 'TEAM'       THEN 60
    WHEN v_plan_type = 'BUSINESS'   THEN 120
    WHEN v_plan_type = 'ENTERPRISE' THEN -1
    ELSE 10
  END INTO v_plan_rate_limit;

  -- 4. Check admin throttle_config override
  v_throttle_override := NULL;
  BEGIN
    SELECT value::integer INTO v_throttle_override
    FROM public.throttle_config
    WHERE key = 'rate_limit_per_minute';
  EXCEPTION WHEN OTHERS THEN
    v_throttle_override := NULL;
  END;

  -- 5. Compute effective limit (global override caps plan rate)
  IF v_plan_rate_limit = -1 THEN
    v_effective_limit := -1;  -- ENTERPRISE: unlimited
  ELSIF v_throttle_override IS NOT NULL AND v_throttle_override > 0 THEN
    v_effective_limit := LEAST(v_plan_rate_limit, v_throttle_override);
  ELSE
    v_effective_limit := v_plan_rate_limit;
  END IF;

  -- 6. Count recent usage in the 60-second sliding window
  --    This count INCLUDES the row we just inserted (same as current JS logic)
  SELECT COUNT(*) INTO v_current_count
  FROM public.analytics_usage_logs
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at >= (now() - INTERVAL '1 minute');

  -- 7. Check against limit
  --    Current JS uses: current < effectiveLimit (strict inequality)
  --    This means with a limit of 10, the 10th request is denied
  v_allowed := (v_effective_limit = -1) OR (v_current_count < v_effective_limit);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current', v_current_count,
    'limit',   v_effective_limit,
    'plan',    v_plan_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_log_rate_limit(
  UUID, debug_action_type, TEXT, INTEGER, TEXT
) TO authenticated;
