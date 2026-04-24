-- Add referral enhancements and leaderboard function

-- Ensure metadata column is JSONB
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

-- Create leaderboard function
CREATE OR REPLACE FUNCTION public.get_ambassador_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  referrer_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  total_referrals BIGINT,
  total_credits BIGINT,
  ambassador_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.referrer_id,
    p.email,
    p.full_name,
    p.avatar_url,
    COUNT(r.id) FILTER (WHERE r.status = 'completed')::BIGINT AS total_referrals,
    COALESCE(SUM(r.credits_earned) FILTER (WHERE r.status = 'completed'), 0)::BIGINT AS total_credits,
    (p.metadata->>'ambassador_tier')::TEXT AS ambassador_tier
  FROM public.referrals r
  INNER JOIN public.profiles p ON p.id = r.referrer_id
  GROUP BY r.referrer_id, p.email, p.full_name, p.avatar_url, p.metadata
  ORDER BY total_referrals DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_ambassador_leaderboard TO authenticated;

-- Create index for better referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_status_referrer
  ON public.referrals(status, referrer_id)
  WHERE status = 'completed';
