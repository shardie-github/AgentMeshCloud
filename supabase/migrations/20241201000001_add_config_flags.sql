-- Create config_flags table for feature flags and kill switches
CREATE TABLE IF NOT EXISTS config_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  environment VARCHAR(20) NOT NULL DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_config_flags_key ON config_flags(key);
CREATE INDEX IF NOT EXISTS idx_config_flags_environment ON config_flags(environment);
CREATE INDEX IF NOT EXISTS idx_config_flags_enabled ON config_flags(enabled);

-- Enable RLS
ALTER TABLE config_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to config flags" ON config_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow service role to modify config flags
CREATE POLICY "Allow service role to modify config flags" ON config_flags
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_config_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_config_flags_updated_at
  BEFORE UPDATE ON config_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_config_flags_updated_at();

-- Insert default feature flags
INSERT INTO config_flags (key, value, description, environment) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "System maintenance in progress. Please try again later."}', 'Global maintenance mode toggle', 'production'),
  ('feature_new_dashboard', '{"enabled": true, "rollout_percentage": 100}', 'New dashboard feature flag', 'production'),
  ('feature_ai_insights', '{"enabled": true, "rollout_percentage": 50}', 'AI insights feature flag', 'production'),
  ('kill_switch_api', '{"enabled": true, "reason": null}', 'API kill switch', 'production'),
  ('kill_switch_database', '{"enabled": true, "reason": null}', 'Database kill switch', 'production'),
  ('rate_limit_multiplier', '{"value": 1.0, "description": "Rate limit multiplier for load testing"}', 'Rate limiting configuration', 'production')
ON CONFLICT (key) DO NOTHING;
