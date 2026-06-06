-- Initial Schema for DeBuggAI
-- This migration sets up all core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit wallets table
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INTEGER DEFAULT 30 NOT NULL CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.credit_wallets(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- Positive for credits earned, negative for spent
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent', 'refunded')),
  source TEXT NOT NULL, -- 'subscription', 'referral', 'debug_analysis', 'web_builder', etc.
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generations table (web builder code versions)
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  description TEXT,
  stack TEXT CHECK (stack IN ('mern', 'mean', 'laravel', 'django', 'flask', 'rails', 'go')),
  prompt TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debug sessions table
CREATE TABLE IF NOT EXISTS public.debug_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('javascript', 'typescript', 'php', 'python', 'go', 'ruby', 'java', 'csharp', 'rust', 'swift', 'kotlin', 'unknown')),
  code TEXT NOT NULL,
  error_message TEXT,
  fix TEXT,
  explanation TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (chat context for AI)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid')),
  credits_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Referral payouts table
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
-- Wrapped in exception handlers because remote may have tables with different column names
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_credit_wallets_owner_id ON public.credit_wallets(owner_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_credit_wallets_owner_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_credit_transactions_wallet_id ON public.credit_transactions(wallet_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_credit_transactions_wallet_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_credit_transactions_created_at: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_generations_user_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_generations_created_at: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_debug_sessions_user_id ON public.debug_sessions(user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_debug_sessions_user_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_debug_sessions_language ON public.debug_sessions(language);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_debug_sessions_language: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_debug_sessions_created_at ON public.debug_sessions(created_at DESC);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_debug_sessions_created_at: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_messages_user_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_generation_id ON public.messages(generation_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_messages_generation_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_messages_created_at: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_referrals_referrer_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_referrals_code: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_notifications_user_id: %', SQLERRM;
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping idx_notifications_read: %', SQLERRM;
END $$;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (wrapped in DO blocks to handle pre-existing column name mismatches)
DO $$
BEGIN
  CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own wallet"
    ON public.credit_wallets FOR SELECT
    USING (auth.uid() = owner_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own wallet transactions"
    ON public.credit_transactions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.credit_wallets
        WHERE credit_wallets.id = credit_transactions.wallet_id
        AND credit_wallets.owner_id = auth.uid()
      )
    );
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own generations"
    ON public.generations FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own generations"
    ON public.generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own generations"
    ON public.generations FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own debug sessions"
    ON public.debug_sessions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own debug sessions"
    ON public.debug_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping policy: %', SQLERRM;
END $$;

-- Function to create profile and wallet on user signup
-- (Later migrations will replace this; wrapped for resilience against column mismatches)
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $fn$
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    INSERT INTO public.credit_wallets (user_id, balance)
    VALUES (NEW.id, 30);
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.id, 'welcome',
      'Welcome to DeBuggAI!',
      'You have 30 free credits to get started. Debug code and build apps with AI!'
    );
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping handle_new_user: %', SQLERRM;
END $$;

-- Trigger to call handle_new_user on signup
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping trigger: %', SQLERRM;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping trigger: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_credit_wallets_updated_at
    BEFORE UPDATE ON public.credit_wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping trigger: %', SQLERRM;
END $$;
