-- ============================================================================
-- AI Orchestration Security Hardening
-- Migration: 20260516 (follow-up)
-- Purpose:
-- - Prevent untrusted callers from leasing arbitrary jobs (multi-tenant risk)
-- - Prevent callers from spending credits on behalf of other users
-- ============================================================================

-- --------------------------------------------------------------------------
-- spend_credits: enforce caller identity unless service_role
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (wallet_id UUID, new_balance INTEGER, tx_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance INTEGER;
  v_tx_id UUID;
  v_role TEXT;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Only allow spending for yourself unless executed as service_role.
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;
    IF auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'cannot spend credits for another user';
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  -- If an idempotency key is provided, short-circuit on repeats.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT cik.tx_id INTO v_tx_id
    FROM public.credit_idempotency_keys cik
    WHERE cik.user_id = p_user_id AND cik.idempotency_key = p_idempotency_key;

    IF v_tx_id IS NOT NULL THEN
      SELECT cw.id, cw.balance INTO v_wallet_id, v_balance
      FROM public.credit_wallets cw
      WHERE cw.user_id = p_user_id;

      RETURN QUERY SELECT v_wallet_id, v_balance, v_tx_id;
      RETURN;
    END IF;
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient credits';
  END IF;

  UPDATE public.credit_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.credit_transactions (wallet_id, amount, type, description, metadata)
  VALUES (
    v_wallet_id,
    -p_amount,
    'credit_spent',
    p_description,
    jsonb_build_object('source', p_source) || COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_tx_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency_keys (user_id, idempotency_key, tx_id)
    VALUES (p_user_id, p_idempotency_key, v_tx_id)
    ON CONFLICT (user_id, idempotency_key) DO UPDATE SET tx_id = EXCLUDED.tx_id;
  END IF;

  RETURN QUERY SELECT v_wallet_id, v_balance, v_tx_id;
END;
$$;

-- --------------------------------------------------------------------------
-- Function execution grants
-- --------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lease_jobs(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_credits(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.lease_jobs(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- If you later want the client to call spend_credits directly, explicitly GRANT
-- it to authenticated *after* verifying your threat model:
-- GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO authenticated;

