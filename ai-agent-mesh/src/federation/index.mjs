#!/usr/bin/env node

/**
 * AI-Agent Mesh Context Federation Service
 * 
 * Shares knowledge, embeddings, and session state across agents.
 * Implements deduplication and caching for cost reduction.
 * 
 * @version 1.0.0
 * @module federation
 */

import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// ============================================================================
// IN-MEMORY STORAGE (Replace with Redis + FAISS in production)
// ============================================================================

const embeddingCache = new Map(); // key -> {embedding, metadata, expires}
const sessionStore = new Map();   // session_id -> {state, updated_at}
const knowledgeGraph = new Map(); // entity -> {facts, relations}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate simple hash for text
 */
function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'federation',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      cached_embeddings: embeddingCache.size,
      active_sessions: sessionStore.size,
      knowledge_entities: knowledgeGraph.size
    }
  });
});

// Store embedding
app.post('/api/v1/embeddings', (req, res) => {
  const { text, embedding, metadata, ttl_hours } = req.body;
  
  if (!text || !embedding) {
    return res.status(400).json({ error: 'Text and embedding required' });
  }
  
  const key = hashText(text);
  const ttl = (ttl_hours || 24) * 60 * 60 * 1000; // Convert to ms
  
  embeddingCache.set(key, {
    text,
    embedding,
    metadata: metadata || {},
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttl).toISOString(),
    hit_count: 0
  });
  
  res.status(201).json({
    key,
    status: 'cached',
    expires_at: embeddingCache.get(key).expires_at
  });
});

// Retrieve embedding
app.get('/api/v1/embeddings/:key', (req, res) => {
  const cached = embeddingCache.get(req.params.key);
  
  if (!cached) {
    return res.status(404).json({ error: 'Embedding not found' });
  }
  
  // Check expiration
  if (new Date() > new Date(cached.expires_at)) {
    embeddingCache.delete(req.params.key);
    return res.status(404).json({ error: 'Embedding expired' });
  }
  
  // Increment hit count
  cached.hit_count++;
  
  res.json({
    key: req.params.key,
    embedding: cached.embedding,
    metadata: cached.metadata,
    hit_count: cached.hit_count,
    expires_at: cached.expires_at
  });
});

// Search similar embeddings
app.post('/api/v1/embeddings/search', (req, res) => {
  const { embedding, threshold, limit } = req.body;
  
  if (!embedding) {
    return res.status(400).json({ error: 'Embedding required' });
  }
  
  const similarityThreshold = threshold || 0.95;
  const maxResults = limit || 10;
  
  const results = [];
  
  for (const [key, cached] of embeddingCache.entries()) {
    // Skip expired
    if (new Date() > new Date(cached.expires_at)) {
      embeddingCache.delete(key);
      continue;
    }
    
    const similarity = cosineSimilarity(embedding, cached.embedding);
    
    if (similarity >= similarityThreshold) {
      results.push({
        key,
        text: cached.text,
        similarity,
        metadata: cached.metadata
      });
    }
  }
  
  // Sort by similarity (descending)
  results.sort((a, b) => b.similarity - a.similarity);
  
  res.json({
    count: results.length,
    results: results.slice(0, maxResults)
  });
});

// Store session state
app.post('/api/v1/sessions', (req, res) => {
  const { session_id, state, metadata } = req.body;
  
  if (!session_id || !state) {
    return res.status(400).json({ error: 'Session ID and state required' });
  }
  
  sessionStore.set(session_id, {
    state,
    metadata: metadata || {},
    created_at: sessionStore.has(session_id) ? 
      sessionStore.get(session_id).created_at : 
      new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  res.status(201).json({
    session_id,
    status: 'stored'
  });
});

// Retrieve session state
app.get('/api/v1/sessions/:sessionId', (req, res) => {
  const session = sessionStore.get(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    session_id: req.params.sessionId,
    ...session
  });
});

// Add to knowledge graph
app.post('/api/v1/knowledge', (req, res) => {
  const { entity, fact, relation, confidence } = req.body;
  
  if (!entity || !fact) {
    return res.status(400).json({ error: 'Entity and fact required' });
  }
  
  if (!knowledgeGraph.has(entity)) {
    knowledgeGraph.set(entity, {
      facts: [],
      relations: []
    });
  }
  
  const entityData = knowledgeGraph.get(entity);
  
  entityData.facts.push({
    id: crypto.randomUUID(),
    fact,
    confidence: confidence || 0.9,
    added_at: new Date().toISOString()
  });
  
  if (relation) {
    entityData.relations.push({
      id: crypto.randomUUID(),
      ...relation,
      added_at: new Date().toISOString()
    });
  }
  
  knowledgeGraph.set(entity, entityData);
  
  res.status(201).json({
    entity,
    status: 'added',
    total_facts: entityData.facts.length
  });
});

// Query knowledge graph
app.get('/api/v1/knowledge/:entity', (req, res) => {
  const entityData = knowledgeGraph.get(req.params.entity);
  
  if (!entityData) {
    return res.status(404).json({ error: 'Entity not found' });
  }
  
  res.json({
    entity: req.params.entity,
    ...entityData
  });
});

// Get cache statistics
app.get('/api/v1/stats', (req, res) => {
  let totalHits = 0;
  let expiredCount = 0;
  
  for (const cached of embeddingCache.values()) {
    totalHits += cached.hit_count;
    if (new Date() > new Date(cached.expires_at)) {
      expiredCount++;
    }
  }
  
  const stats = {
    timestamp: new Date().toISOString(),
    embeddings: {
      total: embeddingCache.size,
      expired: expiredCount,
      total_hits: totalHits,
      cache_hit_rate: embeddingCache.size > 0 ? 
        (totalHits / embeddingCache.size).toFixed(2) : 0
    },
    sessions: {
      total: sessionStore.size
    },
    knowledge: {
      entities: knowledgeGraph.size,
      total_facts: Array.from(knowledgeGraph.values())
        .reduce((sum, e) => sum + e.facts.length, 0)
    }
  };
  
  res.json(stats);
});

// Cleanup expired entries
app.post('/api/v1/cleanup', (req, res) => {
  const now = new Date();
  let cleaned = 0;
  
  for (const [key, cached] of embeddingCache.entries()) {
    if (now > new Date(cached.expires_at)) {
      embeddingCache.delete(key);
      cleaned++;
    }
  }
  
  res.json({
    status: 'cleanup_complete',
    cleaned_entries: cleaned,
    remaining_entries: embeddingCache.size
  });
});

// ============================================================================
// STARTUP
// ============================================================================

const PORT = process.env.FEDERATION_PORT || 3004;

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║   AI-Agent Mesh Federation Service v1.0.0      ║`);
  console.log(`║   Port: ${PORT}                                    ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
  console.log(`🔗 Federation API: http://localhost:${PORT}/api/v1`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
});

// Periodic cleanup (every hour)
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  for (const [key, cached] of embeddingCache.entries()) {
    if (now > new Date(cached.expires_at)) {
      embeddingCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired embeddings`);
  }
}, 60 * 60 * 1000);

export { app, embeddingCache, sessionStore, knowledgeGraph };
