-- ============================================================================
-- DeBuggAI Enterprise-Grade Project Management
-- Enhanced project settings, environment variables, domains, and integrations
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Project Settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Index for quick project settings lookup
CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);

-- ============================================================================
-- Environment Variables
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, key)
);

-- Indexes for environment variables
CREATE INDEX IF NOT EXISTS idx_project_env_vars_project_id ON project_env_vars(project_id);
CREATE INDEX IF NOT EXISTS idx_project_env_vars_key ON project_env_vars(key);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_env_vars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS env_vars_updated_at ON project_env_vars;
CREATE TRIGGER env_vars_updated_at
  BEFORE UPDATE ON project_env_vars
  FOR EACH ROW
  EXECUTE FUNCTION update_env_vars_updated_at();

-- ============================================================================
-- Custom Domains
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  ssl_enabled BOOLEAN NOT NULL DEFAULT false,
  ssl_expires_at TIMESTAMPTZ,
  primary_domain BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for domains
CREATE INDEX IF NOT EXISTS idx_project_domains_project_id ON project_domains(project_id);
CREATE INDEX IF NOT EXISTS idx_project_domains_domain ON project_domains(domain);

-- Ensure only one primary domain per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_domains_primary
  ON project_domains(project_id)
  WHERE primary_domain = true;

-- ============================================================================
-- Integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, integration_type)
);

-- Supported integration types
ALTER TABLE project_integrations DROP CONSTRAINT IF EXISTS valid_integration_type;
ALTER TABLE project_integrations
  ADD CONSTRAINT valid_integration_type
  CHECK (integration_type IN (
    'vercel',
    'netlify',
    'github',
    'gitlab',
    'bitbucket',
    'stripe',
    'sendgrid',
    'twilio',
    'firebase',
    'supabase'
  ));

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_project_integrations_project_id ON project_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_integrations_type ON project_integrations(integration_type);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS integrations_updated_at ON project_integrations;
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON project_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_env_vars_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Project Settings RLS
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settings for their own projects"
  ON project_settings FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update settings for their own projects"
  ON project_settings FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert settings for their own projects"
  ON project_settings FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

-- Environment Variables RLS
ALTER TABLE project_env_vars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view env vars for their own projects"
  ON project_env_vars FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage env vars for their own projects"
  ON project_env_vars FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

-- Custom Domains RLS
ALTER TABLE project_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view domains for their own projects"
  ON project_domains FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage domains for their own projects"
  ON project_domains FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

-- Integrations RLS
ALTER TABLE project_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integrations for their own projects"
  ON project_integrations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage integrations for their own projects"
  ON project_integrations FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get project settings with defaults
CREATE OR REPLACE FUNCTION get_project_settings(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  settings JSONB;
BEGIN
  SELECT COALESCE(settings, '{}'::JSONB)
  INTO settings
  FROM project_settings
  WHERE project_id = p_project_id;

  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set or update project setting
CREATE OR REPLACE FUNCTION set_project_setting(
  p_project_id UUID,
  p_key TEXT,
  p_value JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO project_settings (project_id, settings)
  VALUES (p_project_id, jsonb_build_object(p_key, p_value))
  ON CONFLICT (project_id)
  DO UPDATE SET
    settings = jsonb_set(COALESCE(project_settings.settings, '{}'::JSONB), ARRAY[p_key], p_value),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE project_settings IS 'Stores project-specific settings and preferences';
COMMENT ON TABLE project_env_vars IS 'Environment variables for projects with secret masking';
COMMENT ON TABLE project_domains IS 'Custom domain configuration with SSL support';
COMMENT ON TABLE project_integrations IS 'Third-party service integrations (Vercel, GitHub, etc.)';
