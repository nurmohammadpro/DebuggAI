-- 014_notifications.sql
-- User-facing notification inbox
-- Execution Order: 14th

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT NOT NULL DEFAULT 'info',
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifs_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

COMMENT ON TABLE public.notifications IS 'User-facing notification inbox';
