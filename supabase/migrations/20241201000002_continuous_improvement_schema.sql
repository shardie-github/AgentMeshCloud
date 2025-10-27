-- Continuous Improvement & Growth Engine Schema
-- Phase VII: Continuous Impact & Growth Engine

-- Enable additional extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create feedback types
CREATE TYPE feedback_type AS ENUM ('bug', 'feature_request', 'ux_issue', 'performance', 'general', 'praise');
CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE feedback_status AS ENUM ('new', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate');
CREATE TYPE growth_signal_type AS ENUM ('engagement', 'retention', 'revenue', 'referral', 'feature_adoption', 'support_ticket');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical', 'emergency');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed');
CREATE TYPE optimization_type AS ENUM ('performance', 'cost', 'reliability', 'security', 'user_experience');

-- Product Feedback Table
CREATE TABLE product_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    session_id VARCHAR(100),
    feedback_type feedback_type NOT NULL,
    priority feedback_priority NOT NULL DEFAULT 'medium',
    status feedback_status NOT NULL DEFAULT 'new',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}', -- page, feature, user journey context
    metadata JSONB NOT NULL DEFAULT '{}', -- browser, device, performance metrics
    embedding VECTOR(1536), -- semantic embedding for similarity search
    themes TEXT[], -- AI-generated themes/tags
    sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    urgency_score FLOAT CHECK (urgency_score >= 0 AND urgency_score <= 1),
    assigned_to UUID,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Growth Signals Table
CREATE TABLE growth_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    signal_type growth_signal_type NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    baseline_value FLOAT,
    change_percentage FLOAT,
    time_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    cohort_id VARCHAR(50),
    user_segment VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Credits Table
CREATE TABLE referral_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    referrer_user_id UUID NOT NULL,
    referred_user_id UUID,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    credit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    credit_type VARCHAR(20) NOT NULL DEFAULT 'usage', -- usage, premium, feature
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, awarded, expired, cancelled
    stripe_customer_id VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AIOps Incidents Table
CREATE TABLE aiops_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity incident_severity NOT NULL,
    status incident_status NOT NULL DEFAULT 'open',
    affected_services TEXT[] NOT NULL,
    root_cause TEXT,
    resolution_steps TEXT[],
    auto_resolved BOOLEAN DEFAULT FALSE,
    ai_insights JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}', -- performance, error rates, etc.
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-Optimization Jobs Table
CREATE TABLE auto_optimization_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    job_name VARCHAR(100) NOT NULL,
    optimization_type optimization_type NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    baseline_metrics JSONB NOT NULL DEFAULT '{}',
    optimized_metrics JSONB,
    improvement_percentage FLOAT,
    changes_applied JSONB NOT NULL DEFAULT '[]',
    rollback_plan JSONB,
    execution_log TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Release Review Reports Table
CREATE TABLE release_review_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    release_version VARCHAR(20) NOT NULL,
    report_type VARCHAR(20) NOT NULL DEFAULT 'weekly', -- weekly, monthly, quarterly
    qa_metrics JSONB NOT NULL DEFAULT '{}',
    finops_metrics JSONB NOT NULL DEFAULT '{}',
    user_feedback_summary JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB NOT NULL DEFAULT '[]',
    ai_insights JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cognitive Impact Scorecard Table
CREATE TABLE cognitive_impact_scorecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    scorecard_period VARCHAR(20) NOT NULL, -- monthly, quarterly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    customer_satisfaction_score FLOAT CHECK (customer_satisfaction_score >= 0 AND customer_satisfaction_score <= 100),
    customer_satisfaction_delta FLOAT,
    ai_model_accuracy FLOAT CHECK (ai_model_accuracy >= 0 AND ai_model_accuracy <= 100),
    ai_model_accuracy_delta FLOAT,
    feature_adoption_rate FLOAT CHECK (feature_adoption_rate >= 0 AND feature_adoption_rate <= 100),
    feature_adoption_delta FLOAT,
    infrastructure_efficiency FLOAT CHECK (infrastructure_efficiency >= 0 AND infrastructure_efficiency <= 100),
    infrastructure_efficiency_delta FLOAT,
    cost_reduction_percentage FLOAT,
    carbon_reduction_percentage FLOAT,
    retention_rate FLOAT CHECK (retention_rate >= 0 AND retention_rate <= 100),
    retention_delta FLOAT,
    overall_cognitive_score FLOAT CHECK (overall_cognitive_score >= 0 AND overall_cognitive_score <= 100),
    insights JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Pipeline Table
CREATE TABLE marketing_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(200) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- email, social, content, paid, referral
    target_segment VARCHAR(100),
    conversion_prediction FLOAT CHECK (conversion_prediction >= 0 AND conversion_prediction <= 1),
    actual_conversion FLOAT CHECK (actual_conversion >= 0 AND actual_conversion <= 1),
    ai_optimization_suggestions JSONB NOT NULL DEFAULT '[]',
    budget_allocated DECIMAL(10,2),
    budget_spent DECIMAL(10,2),
    roi FLOAT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding Sessions Table
CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    current_step VARCHAR(50) NOT NULL,
    completed_steps TEXT[] NOT NULL DEFAULT '[]',
    ai_assistance_log JSONB NOT NULL DEFAULT '[]',
    user_satisfaction_score INTEGER CHECK (user_satisfaction_score >= 1 AND user_satisfaction_score <= 5),
    completion_time INTEGER, -- in minutes
    abandoned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_product_feedback_tenant_id ON product_feedback(tenant_id);
CREATE INDEX idx_product_feedback_type ON product_feedback(feedback_type);
CREATE INDEX idx_product_feedback_status ON product_feedback(status);
CREATE INDEX idx_product_feedback_priority ON product_feedback(priority);
CREATE INDEX idx_product_feedback_created_at ON product_feedback(created_at);
CREATE INDEX idx_product_feedback_embedding ON product_feedback USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_product_feedback_themes ON product_feedback USING gin(themes);

CREATE INDEX idx_growth_signals_tenant_id ON growth_signals(tenant_id);
CREATE INDEX idx_growth_signals_type ON growth_signals(signal_type);
CREATE INDEX idx_growth_signals_metric_name ON growth_signals(metric_name);
CREATE INDEX idx_growth_signals_created_at ON growth_signals(created_at);
CREATE INDEX idx_growth_signals_cohort_id ON growth_signals(cohort_id);

CREATE INDEX idx_referral_credits_tenant_id ON referral_credits(tenant_id);
CREATE INDEX idx_referral_credits_referrer ON referral_credits(referrer_user_id);
CREATE INDEX idx_referral_credits_code ON referral_credits(referral_code);
CREATE INDEX idx_referral_credits_status ON referral_credits(status);

CREATE INDEX idx_aiops_incidents_tenant_id ON aiops_incidents(tenant_id);
CREATE INDEX idx_aiops_incidents_severity ON aiops_incidents(severity);
CREATE INDEX idx_aiops_incidents_status ON aiops_incidents(status);
CREATE INDEX idx_aiops_incidents_created_at ON aiops_incidents(created_at);

CREATE INDEX idx_auto_optimization_jobs_tenant_id ON auto_optimization_jobs(tenant_id);
CREATE INDEX idx_auto_optimization_jobs_type ON auto_optimization_jobs(optimization_type);
CREATE INDEX idx_auto_optimization_jobs_status ON auto_optimization_jobs(status);
CREATE INDEX idx_auto_optimization_jobs_created_at ON auto_optimization_jobs(created_at);

CREATE INDEX idx_release_review_reports_tenant_id ON release_review_reports(tenant_id);
CREATE INDEX idx_release_review_reports_version ON release_review_reports(release_version);
CREATE INDEX idx_release_review_reports_generated_at ON release_review_reports(generated_at);

CREATE INDEX idx_cognitive_impact_scorecards_tenant_id ON cognitive_impact_scorecards(tenant_id);
CREATE INDEX idx_cognitive_impact_scorecards_period ON cognitive_impact_scorecards(scorecard_period);
CREATE INDEX idx_cognitive_impact_scorecards_period_dates ON cognitive_impact_scorecards(period_start, period_end);

CREATE INDEX idx_marketing_pipeline_tenant_id ON marketing_pipeline(tenant_id);
CREATE INDEX idx_marketing_pipeline_campaign_id ON marketing_pipeline(campaign_id);
CREATE INDEX idx_marketing_pipeline_type ON marketing_pipeline(campaign_type);
CREATE INDEX idx_marketing_pipeline_status ON marketing_pipeline(status);

CREATE INDEX idx_onboarding_sessions_tenant_id ON onboarding_sessions(tenant_id);
CREATE INDEX idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX idx_onboarding_sessions_session_id ON onboarding_sessions(session_id);
CREATE INDEX idx_onboarding_sessions_created_at ON onboarding_sessions(created_at);

-- Create updated_at triggers
CREATE TRIGGER update_product_feedback_updated_at BEFORE UPDATE ON product_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_credits_updated_at BEFORE UPDATE ON referral_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aiops_incidents_updated_at BEFORE UPDATE ON aiops_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_pipeline_updated_at BEFORE UPDATE ON marketing_pipeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON onboarding_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE aiops_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_optimization_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_impact_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_feedback
CREATE POLICY "Users can view feedback in their tenant" ON product_feedback
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert feedback in their tenant" ON product_feedback
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update feedback in their tenant" ON product_feedback
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for growth_signals
CREATE POLICY "Users can view growth signals in their tenant" ON growth_signals
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert growth signals in their tenant" ON growth_signals
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for referral_credits
CREATE POLICY "Users can view referral credits in their tenant" ON referral_credits
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert referral credits in their tenant" ON referral_credits
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update referral credits in their tenant" ON referral_credits
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for aiops_incidents
CREATE POLICY "Users can view incidents in their tenant" ON aiops_incidents
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert incidents in their tenant" ON aiops_incidents
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update incidents in their tenant" ON aiops_incidents
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for other tables
CREATE POLICY "Users can view auto optimization jobs in their tenant" ON auto_optimization_jobs
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can view release reports in their tenant" ON release_review_reports
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can view scorecards in their tenant" ON cognitive_impact_scorecards
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can view marketing pipeline in their tenant" ON marketing_pipeline
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can view onboarding sessions in their tenant" ON onboarding_sessions
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update onboarding sessions in their tenant" ON onboarding_sessions
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);
