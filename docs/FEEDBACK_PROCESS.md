# Feedback & Issue Intelligence Process

Automated feedback collection, triaging, and insights generation for continuous product improvement.

## Overview

```
User Feedback → Capture API → Triage Bot → Insights Report → Stakeholders
                                  ↓
                          Auto-classification
                          Sentiment analysis
                          Priority assignment
```

## Components

### 1. Feedback Capture API

Already implemented in `/feedback` directory with Express endpoints.

**Endpoints:**
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/:id` - Get feedback by ID
- `GET /api/feedback` - List feedback with filters

**Example Submission:**
```json
{
  "user_id": "user_123",
  "content": "The dashboard is very slow to load",
  "type": "bug",
  "metadata": {
    "page": "/dashboard",
    "browser": "Chrome"
  }
}
```

### 2. Triage Bot (`feedback/src/services/TriageBotService.ts`)

Automatically classifies and labels feedback using keyword matching and heuristics.

**Classification Categories:**
- `ops`: Operational issues (downtime, errors, performance)
- `ux`: User experience issues
- `bug`: Functional bugs
- `feature`: Feature requests
- `performance`: Performance issues
- `security`: Security concerns

**Priority Levels:**
- `critical`: Blockers, urgent issues
- `high`: Important, blocking work
- `medium`: Should be addressed
- `low`: Nice to have

**Sentiment:**
- `positive`: Happy users
- `neutral`: Factual reports
- `negative`: Unhappy users

**Usage:**
```typescript
import { TriageBotService } from './feedback/src/services/TriageBotService';

const triageBot = new TriageBotService(supabase);

// Triage a single feedback item
const result = await triageBot.triageFeedback('feedback_123');

// Batch triage untriaged feedback
const count = await triageBot.triageUntriaged(100);

// Get triage statistics
const stats = await triageBot.getTriageStats();
```

**Customization:**

Edit keyword dictionaries in `TriageBotService.ts`:
```typescript
private readonly CATEGORY_KEYWORDS = {
  ops: ['down', 'outage', 'unavailable', ...],
  ux: ['confusing', 'unclear', ...],
  // Add more keywords
};
```

### 3. Insights Report (`feedback/src/services/InsightsReportService.ts`)

Generates weekly sentiment and pain points summary.

**Report Contents:**
- Total feedback volume and trends
- Sentiment distribution (positive/neutral/negative)
- Top pain points by category
- Feature request summary
- Week-over-week comparisons
- Actionable recommendations

**Usage:**
```typescript
import { InsightsReportService } from './feedback/src/services/InsightsReportService';

const insights = new InsightsReportService(supabase);

// Generate weekly report
const report = await insights.generateWeeklyReport();

// Email to stakeholders
await insights.emailReport(report, ['product@company.com', 'eng@company.com']);
```

**Schedule:**

Add to cron or use GitHub Actions:
```yaml
- cron: '0 9 * * 1'  # Every Monday at 9 AM
  run: tsx feedback/src/services/InsightsReportService.ts
```

## Database Schema

```sql
-- Feedback table (extended from existing)
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS labels TEXT[];
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS triaged_at TIMESTAMPTZ;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS triage_confidence FLOAT;

-- Insights reports
CREATE TABLE insights_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_feedback INTEGER NOT NULL,
  by_category JSONB NOT NULL,
  by_priority JSONB NOT NULL,
  by_sentiment JSONB NOT NULL,
  top_pain_points JSONB NOT NULL,
  trends JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage statistics function
CREATE OR REPLACE FUNCTION get_triage_stats()
RETURNS TABLE(
  category TEXT,
  count BIGINT,
  avg_confidence FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.category,
    COUNT(*) as count,
    AVG(f.triage_confidence) as avg_confidence
  FROM feedback f
  WHERE f.triaged_at IS NOT NULL
  GROUP BY f.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;
```

## Workflows

### Daily Triage

Runs automatically via cron or manually:

```bash
# Triage all untriaged feedback
pnpm tsx feedback/src/services/TriageBotService.ts --batch

# Triage specific feedback
pnpm tsx feedback/src/services/TriageBotService.ts --id feedback_123
```

### Weekly Insights

```bash
# Generate and email weekly report
pnpm tsx feedback/src/services/InsightsReportService.ts --email
```

## Integration with UI

Add feedback widget to your application:

```typescript
// Submit feedback from UI
const response = await fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: currentUser.id,
    content: feedbackText,
    metadata: {
      page: window.location.pathname,
      userAgent: navigator.userAgent
    }
  })
});
```

## Metrics & KPIs

Track feedback system effectiveness:

- **Response Rate:** % of users providing feedback
- **Triage Accuracy:** Confidence scores by category
- **Resolution Time:** Time from feedback to fix
- **Sentiment Trend:** Week-over-week sentiment change
- **Action Rate:** % of feedback resulting in action

## Best Practices

1. **Prompt Feedback:** Show widget on key pages
2. **Follow Up:** Respond to critical/negative feedback within 24h
3. **Close the Loop:** Notify users when issues are fixed
4. **Regular Review:** Weekly stakeholder meetings to review insights
5. **Continuous Improvement:** Refine classification keywords based on accuracy

## Advanced: ML-Based Classification

For higher accuracy, replace keyword matching with ML:

```typescript
// Use OpenAI for classification
const classification = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{
    role: 'system',
    content: 'Classify feedback into: ops, ux, bug, feature, performance, security'
  }, {
    role: 'user',
    content: feedbackContent
  }]
});
```

Update `TriageBotService.ts` to use OpenAI API for classification.
