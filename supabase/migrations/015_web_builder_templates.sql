-- 011_web_builder_templates.sql
-- Pre-built starter templates
-- Execution Order: 11th

DROP TABLE IF EXISTS public.web_builder_templates CASCADE;

CREATE TABLE public.web_builder_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  category        template_category NOT NULL,
  thumbnail_url   TEXT,
  preview_html    TEXT NOT NULL,
  starter_code    TEXT NOT NULL,
  stack           TEXT NOT NULL DEFAULT 'react',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_official     BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.web_builder_templates IS 'Pre-built starter templates';
