# RCA Library & Suggestion Engine

AI-powered incident knowledge base with semantic search and intelligent mitigation recommendations.

## Overview

The RCA (Root Cause Analysis) library captures incident postmortems, indexes them using embeddings for semantic search, and suggests relevant past solutions when new incidents occur.

```
Incident Postmortem → Ingest → Embedding Generation → Vector Index (pgvector)
                                                            ↓
New Anomaly/Incident → Query → Similarity Search → Mitigation Suggestions
```

## Components

### 1. Incident Ingest (`rca/incident_ingest.ts`)

Captures and stores incident postmortems in structured format.

**Incident Structure:**
```typescript
interface Incident {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  started_at: string;
  resolved_at?: string;
  affected_services: string[];
  root_cause: string;
  contributing_factors?: string[];
  resolution: string;
  preventive_actions: string[];
  tags: string[];
  postmortem_url?: string;
}
```

**Usage:**
```typescript
import { createIncidentIngestor } from './rca/incident_ingest';

const ingestor = createIncidentIngestor();

await ingestor.ingestIncident({
  title: 'Database Connection Pool Exhaustion',
  description: 'API experienced 503 errors due to connection pool exhaustion',
  severity: 'high',
  started_at: '2024-01-15T14:30:00Z',
  resolved_at: '2024-01-15T15:45:00Z',
  affected_services: ['api', 'database'],
  root_cause: 'Connection leak in payment processing service',
  resolution: 'Implemented connection timeout and proper cleanup',
  preventive_actions: [
    'Add connection pool monitoring',
    'Implement circuit breaker',
    'Add alerts for connection count'
  ],
  tags: ['database', 'connections', 'performance']
});
```

### 2. Embedding Index (`rca/embedding_index.ts`)

Generates vector embeddings for semantic search using OpenAI or fallback method.

**Embedding Strategy:**
- **Primary:** OpenAI `text-embedding-ada-002` (1536 dimensions)
- **Fallback:** Simple frequency-based embedding (384 dimensions)

**Indexed Content:**
```
Title: [incident title]
Description: [incident description]
Root Cause: [root cause]
Resolution: [resolution steps]
Contributing Factors: [factors]
Preventive Actions: [actions]
```

**Usage:**
```typescript
import { createEmbeddingIndexer } from './rca/embedding_index';

const indexer = createEmbeddingIndexer();

// Index a single incident
await indexer.indexIncident('incident_123');

// Process pending embeddings
await indexer.processPendingEmbeddings(10);

// Search for similar incidents
const similar = await indexer.searchSimilar(
  'Database connections are timing out',
  5
);

// Re-index all incidents
await indexer.reindexAll();
```

### 3. Suggestion Engine (`rca/suggestion_engine.ts`)

Provides intelligent mitigation recommendations based on similar past incidents.

**Recommendation Features:**
- Similarity scoring with context awareness
- Relevance scoring (similarity + recency + service match)
- Confidence calculation
- Immediate action generation
- Playbook recommendation

**Usage:**
```typescript
import { createSuggestionEngine } from './rca/suggestion_engine';

const engine = createSuggestionEngine();

// Get suggestions for new incident
const suggestions = await engine.getSuggestions(
  'API is returning 503 errors due to high database load',
  {
    severity: 'high',
    affected_services: ['api', 'database']
  }
);

console.log('Confidence:', suggestions.confidence);
console.log('Recommended Playbook:', suggestions.recommended_playbook);
console.log('Immediate Actions:');
suggestions.immediate_actions.forEach(action => {
  console.log(`  - ${action}`);
});

console.log('\nSimilar Incidents:');
suggestions.suggestions.forEach((suggestion, i) => {
  console.log(`${i + 1}. ${suggestion.incident_title} (${suggestion.relevance_score}% match)`);
  console.log(`   Root Cause: ${suggestion.root_cause}`);
  console.log(`   Resolution: ${suggestion.resolution}`);
  console.log(`   Time to Resolve: ${suggestion.time_to_resolve_minutes} minutes`);
});

// Learn from resolution
await engine.learnFromResolution('incident_123', true, 'Very helpful!');
```

### 4. Anomaly Integration

Automatically get suggestions when anomalies are detected:

```typescript
// In anomaly detector
detector.on('anomaly_detected', async (anomaly) => {
  const suggestions = await engine.getSuggestionForAnomaly(anomaly);
  
  // Send to Slack/PagerDuty with suggestions
  await alertChannel.send({
    title: 'Anomaly Detected',
    description: anomaly.description,
    suggestions: suggestions.immediate_actions,
    runbook: suggestions.recommended_playbook
  });
});
```

## Database Schema

```sql
-- Incidents table
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  affected_services TEXT[] NOT NULL,
  root_cause TEXT NOT NULL,
  contributing_factors TEXT[],
  resolution TEXT NOT NULL,
  preventive_actions TEXT[] NOT NULL,
  tags TEXT[] NOT NULL,
  postmortem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embedding queue
CREATE TABLE embedding_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Incident embeddings (requires pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE incident_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) UNIQUE,
  embedding vector(1536), -- OpenAI ada-002 dimension
  text_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_incidents(
  query_embedding vector(1536),
  match_limit INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE(
  incident_id UUID,
  similarity FLOAT,
  title TEXT,
  root_cause TEXT,
  resolution TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    1 - (e.embedding <=> query_embedding) as similarity,
    i.title,
    i.root_cause,
    i.resolution
  FROM incident_embeddings e
  JOIN incidents i ON i.id = e.incident_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- Suggestion feedback
CREATE TABLE suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id),
  was_helpful BOOLEAN NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Workflows

### Post-Incident Process

1. **Write Postmortem:** Document incident details, root cause, resolution
2. **Ingest Incident:** Use incident ingestor to add to RCA library
3. **Embedding Generation:** Automatic via queue processing
4. **Index Verification:** Confirm incident is searchable
5. **Team Review:** Share learnings in weekly incident review

### On-Call Runbook

When incident occurs:

1. **Get Suggestions:** Query RCA library with incident description
2. **Review Similar Incidents:** Check top 3 matches
3. **Apply Solutions:** Try recommended mitigations
4. **Document Outcome:** Record if suggestions were helpful
5. **Update if New:** Create new postmortem if novel incident

## Integration Examples

### Slack Bot

```typescript
// Slack slash command: /incident-help
app.command('/incident-help', async ({ command, ack, say }) => {
  await ack();
  
  const suggestions = await engine.getSuggestions(command.text);
  
  await say({
    text: 'Similar Incidents Found',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Confidence:* ${suggestions.confidence}%\n*Recommended Playbook:* ${suggestions.recommended_playbook}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Immediate Actions:*\n' + suggestions.immediate_actions.map(a => `• ${a}`).join('\n')
        }
      }
    ]
  });
});
```

### PagerDuty Integration

```typescript
// Enrich PagerDuty alerts with suggestions
pagerduty.on('incident.triggered', async (incident) => {
  const suggestions = await engine.getSuggestions(incident.description);
  
  await pagerduty.addNote(incident.id, {
    content: `Suggested Actions:\n${suggestions.immediate_actions.join('\n')}\n\nRunbook: ${suggestions.recommended_playbook}`
  });
});
```

## Metrics & KPIs

Track RCA library effectiveness:

- **Library Size:** Total incidents indexed
- **Search Accuracy:** % of searches returning relevant results
- **MTTR Impact:** Reduction in mean time to resolve
- **Suggestion Helpfulness:** % of suggestions marked as helpful
- **Coverage:** % of incidents with past matches

## Best Practices

1. **Comprehensive Postmortems:** Include all key details for better matching
2. **Consistent Tags:** Use standardized tags (database, api, network, etc.)
3. **Timely Indexing:** Index incidents within 24h of resolution
4. **Regular Reviews:** Monthly review of suggestion accuracy
5. **Feedback Loop:** Always mark suggestions as helpful/not helpful

## Advanced: Custom Embeddings

For domain-specific improvements, fine-tune embeddings:

```typescript
// Use custom embedding model
import { CustomEmbedding } from './custom-embedding';

const indexer = new EmbeddingIndexer(
  supabaseUrl,
  supabaseKey,
  new CustomEmbedding({
    model: 'fine-tuned-incident-model',
    dimension: 768
  })
);
```

## References

- [pgvector](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Incident Postmortem Template](https://postmortems.pagerduty.com/)
