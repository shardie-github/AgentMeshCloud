/**
 * Knowledge Graph Service for AgentMesh Cloud Ecosystem
 * Implements agentic knowledge graph with Supabase pgvector integration
 */

import { logger } from '@/utils/logger';
import { config } from '@/config';
import { createClient } from '@supabase/supabase-js';
import {
  KnowledgeNode,
  KnowledgeQuery,
  KnowledgeSearchResponse,
  KnowledgeSearchResult,
  Relationship,
  GraphStatistics,
  NodeType,
  RelationshipType,
  QueryType,
  KnowledgeService
} from '@agentmesh/shared';

export class KnowledgeGraphService implements KnowledgeService {
  private supabase: any;
  private isInitialized = false;
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Knowledge Graph Service...');
      
      // Initialize Supabase client
      this.supabase = createClient(
        config.supabase.url,
        config.supabase.serviceKey
      );

      // Initialize knowledge graph components
      await this.initializeKnowledgeGraph();
      
      // Create database tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      logger.info('Knowledge Graph Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Knowledge Graph Service:', error);
      throw error;
    }
  }

  private async initializeKnowledgeGraph(): Promise<void> {
    // Initialize knowledge graph components
    logger.info('Knowledge graph components initialized');
  }

  private async createTables(): Promise<void> {
    try {
      // Create knowledge_nodes table
      const { error: nodesError } = await this.supabase.rpc('create_knowledge_nodes_table');
      if (nodesError) {
        logger.warn('Knowledge nodes table creation failed:', nodesError);
      }

      // Create knowledge_relationships table
      const { error: relationshipsError } = await this.supabase.rpc('create_knowledge_relationships_table');
      if (relationshipsError) {
        logger.warn('Knowledge relationships table creation failed:', relationshipsError);
      }

      // Create knowledge_embeddings table
      const { error: embeddingsError } = await this.supabase.rpc('create_knowledge_embeddings_table');
      if (embeddingsError) {
        logger.warn('Knowledge embeddings table creation failed:', embeddingsError);
      }

      logger.info('Knowledge graph tables created/verified');
    } catch (error) {
      logger.error('Failed to create knowledge graph tables:', error);
      throw error;
    }
  }

  async createNode(node: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<KnowledgeNode> {
    try {
      const id = this.generateId();
      const now = new Date();
      
      const knowledgeNode: KnowledgeNode = {
        ...node,
        id,
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      // Generate embedding if content is provided
      if (node.content) {
        const embedding = await this.generateEmbedding(node.content);
        knowledgeNode.embedding = embedding;
        this.embeddings.set(id, embedding);
      }

      // Store in memory
      this.nodes.set(id, knowledgeNode);

      // Store in database
      await this.storeNodeInDatabase(knowledgeNode);

      logger.info('Created knowledge node', {
        nodeId: id,
        type: node.type,
        tenantId: node.tenantId
      });

      return knowledgeNode;
    } catch (error) {
      logger.error('Failed to create knowledge node:', error);
      throw error;
    }
  }

  async getNode(id: string): Promise<KnowledgeNode | null> {
    try {
      // Check memory first
      let node = this.nodes.get(id);
      if (node) {
        return node;
      }

      // Load from database
      node = await this.loadNodeFromDatabase(id);
      if (node) {
        this.nodes.set(id, node);
        if (node.embedding) {
          this.embeddings.set(id, node.embedding);
        }
      }

      return node;
    } catch (error) {
      logger.error(`Failed to get knowledge node ${id}:`, error);
      throw error;
    }
  }

  async updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode> {
    try {
      const existingNode = await this.getNode(id);
      if (!existingNode) {
        throw new Error(`Node ${id} not found`);
      }

      const updatedNode: KnowledgeNode = {
        ...existingNode,
        ...updates,
        id,
        updatedAt: new Date(),
        version: existingNode.version + 1
      };

      // Regenerate embedding if content changed
      if (updates.content && updates.content !== existingNode.content) {
        const embedding = await this.generateEmbedding(updates.content);
        updatedNode.embedding = embedding;
        this.embeddings.set(id, embedding);
      }

      // Update in memory
      this.nodes.set(id, updatedNode);

      // Update in database
      await this.updateNodeInDatabase(updatedNode);

      logger.info('Updated knowledge node', {
        nodeId: id,
        version: updatedNode.version
      });

      return updatedNode;
    } catch (error) {
      logger.error(`Failed to update knowledge node ${id}:`, error);
      throw error;
    }
  }

  async deleteNode(id: string): Promise<void> {
    try {
      // Remove from memory
      this.nodes.delete(id);
      this.embeddings.delete(id);

      // Remove from database
      await this.deleteNodeFromDatabase(id);

      // Remove related relationships
      const relatedRelationships = Array.from(this.relationships.values())
        .filter(rel => rel.sourceId === id || rel.targetId === id);
      
      for (const rel of relatedRelationships) {
        this.relationships.delete(rel.id);
        await this.deleteRelationshipFromDatabase(rel.id);
      }

      logger.info('Deleted knowledge node', { nodeId: id });
    } catch (error) {
      logger.error(`Failed to delete knowledge node ${id}:`, error);
      throw error;
    }
  }

  async search(query: KnowledgeQuery): Promise<KnowledgeSearchResponse> {
    const startTime = Date.now();
    
    try {
      let results: KnowledgeSearchResult[] = [];

      switch (query.type) {
        case 'semantic':
          results = await this.semanticSearch(query);
          break;
        case 'vector':
          results = await this.vectorSearch(query);
          break;
        case 'keyword':
          results = await this.keywordSearch(query);
          break;
        case 'hybrid':
          results = await this.hybridSearch(query);
          break;
        case 'graph':
          results = await this.graphSearch(query);
          break;
        default:
          results = await this.semanticSearch(query);
      }

      // Apply filters
      if (query.filters) {
        results = this.applyFilters(results, query.filters);
      }

      // Apply sorting
      if (query.options?.sortBy) {
        results = this.sortResults(results, query.options.sortBy, query.options.sortOrder);
      }

      // Apply pagination
      const limit = query.options?.limit || 10;
      const offset = query.options?.offset || 0;
      const paginatedResults = results.slice(offset, offset + limit);

      const response: KnowledgeSearchResponse = {
        query,
        results: paginatedResults,
        total: results.length,
        took: Date.now() - startTime,
        suggestions: this.generateSuggestions(query),
        relatedQueries: this.generateRelatedQueries(query),
        facets: this.generateFacets(results)
      };

      logger.info('Knowledge search completed', {
        queryId: query.id,
        queryType: query.type,
        resultCount: results.length,
        took: response.took
      });

      return response;
    } catch (error) {
      logger.error('Knowledge search failed:', error);
      throw error;
    }
  }

  private async semanticSearch(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query.text);
    
    // Find similar nodes using vector similarity
    const results: KnowledgeSearchResult[] = [];
    
    for (const [nodeId, node] of this.nodes) {
      if (!node.embedding) continue;
      
      const similarity = this.calculateSimilarity(queryEmbedding, node.embedding);
      
      if (similarity >= (query.options?.similarityThreshold || 0.7)) {
        results.push({
          node,
          score: similarity,
          explanation: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`,
          matchedFields: ['content'],
          context: this.extractContext(node, query.text)
        });
      }
    }

    return results;
  }

  private async vectorSearch(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    // Use pgvector for efficient vector search
    try {
      const queryEmbedding = await this.generateEmbedding(query.text);
      
      const { data, error } = await this.supabase.rpc('search_knowledge_vectors', {
        query_embedding: queryEmbedding,
        similarity_threshold: query.options?.similarityThreshold || 0.7,
        match_count: query.options?.limit || 10
      });

      if (error) {
        throw error;
      }

      const results: KnowledgeSearchResult[] = [];
      
      for (const row of data || []) {
        const node = await this.getNode(row.node_id);
        if (node) {
          results.push({
            node,
            score: row.similarity,
            explanation: `Vector similarity: ${(row.similarity * 100).toFixed(1)}%`,
            matchedFields: ['embedding'],
            context: this.extractContext(node, query.text)
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Vector search failed:', error);
      return [];
    }
  }

  private async keywordSearch(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    const results: KnowledgeSearchResult[] = [];
    const queryTerms = query.text.toLowerCase().split(/\s+/);
    
    for (const [nodeId, node] of this.nodes) {
      const content = node.content.toLowerCase();
      const title = node.metadata.title?.toLowerCase() || '';
      const description = node.metadata.description?.toLowerCase() || '';
      
      let score = 0;
      const matchedFields: string[] = [];
      
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1;
          if (!matchedFields.includes('content')) matchedFields.push('content');
        }
        if (title.includes(term)) {
          score += 2;
          if (!matchedFields.includes('title')) matchedFields.push('title');
        }
        if (description.includes(term)) {
          score += 1.5;
          if (!matchedFields.includes('description')) matchedFields.push('description');
        }
      }
      
      if (score > 0) {
        results.push({
          node,
          score: score / queryTerms.length,
          explanation: `Keyword match: ${score} terms`,
          matchedFields,
          context: this.extractContext(node, query.text)
        });
      }
    }

    return results;
  }

  private async hybridSearch(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    // Combine semantic and keyword search
    const semanticResults = await this.semanticSearch(query);
    const keywordResults = await this.keywordSearch(query);
    
    // Merge and deduplicate results
    const resultMap = new Map<string, KnowledgeSearchResult>();
    
    for (const result of semanticResults) {
      resultMap.set(result.node.id, {
        ...result,
        score: result.score * 0.7 // Weight semantic search
      });
    }
    
    for (const result of keywordResults) {
      const existing = resultMap.get(result.node.id);
      if (existing) {
        existing.score = existing.score + (result.score * 0.3);
        existing.explanation = `Hybrid: ${existing.explanation} + ${result.explanation}`;
      } else {
        resultMap.set(result.node.id, {
          ...result,
          score: result.score * 0.3 // Weight keyword search
        });
      }
    }

    return Array.from(resultMap.values());
  }

  private async graphSearch(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    // Find nodes connected to query terms
    const results: KnowledgeSearchResult[] = [];
    const queryTerms = query.text.toLowerCase().split(/\s+/);
    
    for (const [nodeId, node] of this.nodes) {
      const content = node.content.toLowerCase();
      let score = 0;
      
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1;
        }
      }
      
      if (score > 0) {
        // Find connected nodes
        const neighbors = await this.getNodeNeighbors(nodeId, 2);
        const neighborScore = neighbors.length * 0.1;
        
        results.push({
          node,
          score: score + neighborScore,
          explanation: `Graph search: ${score} direct matches, ${neighbors.length} connected nodes`,
          matchedFields: ['content', 'relationships'],
          context: this.extractContext(node, query.text),
          relationships: node.relationships
        });
      }
    }

    return results;
  }

  private applyFilters(results: KnowledgeSearchResult[], filters: any): KnowledgeSearchResult[] {
    return results.filter(result => {
      const node = result.node;
      
      if (filters.nodeTypes && !filters.nodeTypes.includes(node.type)) {
        return false;
      }
      
      if (filters.tags && !filters.tags.some((tag: string) => node.tags.includes(tag))) {
        return false;
      }
      
      if (filters.confidence) {
        const confidence = node.confidence;
        if (confidence < filters.confidence.min || confidence > filters.confidence.max) {
          return false;
        }
      }
      
      if (filters.importance) {
        const importance = node.metadata.importance || 0;
        if (importance < filters.importance.min || importance > filters.importance.max) {
          return false;
        }
      }
      
      if (filters.accessibility && !filters.accessibility.includes(node.metadata.accessibility || 'public')) {
        return false;
      }
      
      return true;
    });
  }

  private sortResults(results: KnowledgeSearchResult[], sortBy: string, sortOrder: string = 'desc'): KnowledgeSearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = a.score - b.score;
          break;
        case 'date':
          comparison = a.node.createdAt.getTime() - b.node.createdAt.getTime();
          break;
        case 'confidence':
          comparison = a.node.confidence - b.node.confidence;
          break;
        case 'importance':
          const importanceA = a.node.metadata.importance || 0;
          const importanceB = b.node.metadata.importance || 0;
          comparison = importanceA - importanceB;
          break;
        default:
          comparison = a.score - b.score;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private generateSuggestions(query: KnowledgeQuery): string[] {
    // Generate search suggestions based on query
    const suggestions: string[] = [];
    
    // Add common query patterns
    if (query.text.length < 3) {
      suggestions.push('Try a longer search term');
    }
    
    // Add domain-specific suggestions
    if (query.context?.domainContext) {
      suggestions.push(`Search in ${query.context.domainContext} domain`);
    }
    
    return suggestions;
  }

  private generateRelatedQueries(query: KnowledgeQuery): string[] {
    // Generate related queries based on current query
    const relatedQueries: string[] = [];
    
    // Add variations of the current query
    const terms = query.text.split(' ');
    if (terms.length > 1) {
      relatedQueries.push(terms.slice(0, -1).join(' '));
    }
    
    return relatedQueries;
  }

  private generateFacets(results: KnowledgeSearchResult[]): any {
    const facets = {
      nodeTypes: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      domains: {} as Record<string, number>,
      dateRanges: {} as Record<string, number>,
      confidence: {} as Record<string, number>
    };
    
    for (const result of results) {
      const node = result.node;
      
      // Count node types
      facets.nodeTypes[node.type] = (facets.nodeTypes[node.type] || 0) + 1;
      
      // Count tags
      for (const tag of node.tags) {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      }
      
      // Count domains
      if (node.metadata.domain) {
        facets.domains[node.metadata.domain] = (facets.domains[node.metadata.domain] || 0) + 1;
      }
      
      // Count confidence ranges
      const confidenceRange = Math.floor(node.confidence * 10) / 10;
      facets.confidence[confidenceRange.toString()] = (facets.confidence[confidenceRange.toString()] || 0) + 1;
    }
    
    return facets;
  }

  private extractContext(node: KnowledgeNode, query: string): string {
    const content = node.content;
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // Find the best context around query terms
    let bestContext = '';
    let maxScore = 0;
    
    const sentences = content.split(/[.!?]+/);
    for (const sentence of sentences) {
      let score = 0;
      for (const term of queryTerms) {
        if (sentence.toLowerCase().includes(term)) {
          score++;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestContext = sentence.trim();
      }
    }
    
    return bestContext || content.substring(0, 200) + '...';
  }

  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simulate embedding generation
    // In a real implementation, this would call an embedding service
    const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
    return embedding;
  }

  async createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Relationship> {
    try {
      const id = this.generateId();
      const now = new Date();
      
      const newRelationship: Relationship = {
        ...relationship,
        id,
        createdAt: now,
        updatedAt: now
      };

      // Store in memory
      this.relationships.set(id, newRelationship);

      // Store in database
      await this.storeRelationshipInDatabase(newRelationship);

      logger.info('Created knowledge relationship', {
        relationshipId: id,
        type: relationship.type,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId
      });

      return newRelationship;
    } catch (error) {
      logger.error('Failed to create knowledge relationship:', error);
      throw error;
    }
  }

  async getRelationship(id: string): Promise<Relationship | null> {
    try {
      // Check memory first
      let relationship = this.relationships.get(id);
      if (relationship) {
        return relationship;
      }

      // Load from database
      relationship = await this.loadRelationshipFromDatabase(id);
      if (relationship) {
        this.relationships.set(id, relationship);
      }

      return relationship;
    } catch (error) {
      logger.error(`Failed to get knowledge relationship ${id}:`, error);
      throw error;
    }
  }

  async updateRelationship(id: string, updates: Partial<Relationship>): Promise<Relationship> {
    try {
      const existingRelationship = await this.getRelationship(id);
      if (!existingRelationship) {
        throw new Error(`Relationship ${id} not found`);
      }

      const updatedRelationship: Relationship = {
        ...existingRelationship,
        ...updates,
        id,
        updatedAt: new Date()
      };

      // Update in memory
      this.relationships.set(id, updatedRelationship);

      // Update in database
      await this.updateRelationshipInDatabase(updatedRelationship);

      logger.info('Updated knowledge relationship', {
        relationshipId: id,
        type: updatedRelationship.type
      });

      return updatedRelationship;
    } catch (error) {
      logger.error(`Failed to update knowledge relationship ${id}:`, error);
      throw error;
    }
  }

  async deleteRelationship(id: string): Promise<void> {
    try {
      // Remove from memory
      this.relationships.delete(id);

      // Remove from database
      await this.deleteRelationshipFromDatabase(id);

      logger.info('Deleted knowledge relationship', { relationshipId: id });
    } catch (error) {
      logger.error(`Failed to delete knowledge relationship ${id}:`, error);
      throw error;
    }
  }

  async getGraphStatistics(): Promise<GraphStatistics> {
    try {
      const totalNodes = this.nodes.size;
      const totalRelationships = this.relationships.size;
      
      const nodeTypes: Record<NodeType, number> = {} as Record<NodeType, number>;
      const relationshipTypes: Record<RelationshipType, number> = {} as Record<RelationshipType, number>;
      
      for (const node of this.nodes.values()) {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      }
      
      for (const relationship of this.relationships.values()) {
        relationshipTypes[relationship.type] = (relationshipTypes[relationship.type] || 0) + 1;
      }
      
      const statistics: GraphStatistics = {
        totalNodes,
        totalRelationships,
        nodeTypes,
        relationshipTypes,
        averageConnectivity: totalRelationships / Math.max(totalNodes, 1),
        lastIndexed: new Date(),
        storageSize: 0, // Calculate actual storage size
        queryCount: 0, // Track query count
        averageQueryTime: 0 // Track average query time
      };

      return statistics;
    } catch (error) {
      logger.error('Failed to get graph statistics:', error);
      throw error;
    }
  }

  async getNodeNeighbors(nodeId: string, maxDepth: number = 1): Promise<KnowledgeNode[]> {
    try {
      const neighbors: KnowledgeNode[] = [];
      const visited = new Set<string>();
      const queue: { nodeId: string; depth: number }[] = [{ nodeId, depth: 0 }];
      
      while (queue.length > 0) {
        const { nodeId: currentId, depth } = queue.shift()!;
        
        if (visited.has(currentId) || depth > maxDepth) {
          continue;
        }
        
        visited.add(currentId);
        
        if (depth > 0) {
          const node = await this.getNode(currentId);
          if (node) {
            neighbors.push(node);
          }
        }
        
        // Find connected nodes
        for (const relationship of this.relationships.values()) {
          if (relationship.sourceId === currentId && !visited.has(relationship.targetId)) {
            queue.push({ nodeId: relationship.targetId, depth: depth + 1 });
          }
          if (relationship.targetId === currentId && !visited.has(relationship.sourceId)) {
            queue.push({ nodeId: relationship.sourceId, depth: depth + 1 });
          }
        }
      }
      
      return neighbors;
    } catch (error) {
      logger.error(`Failed to get neighbors for node ${nodeId}:`, error);
      throw error;
    }
  }

  async getShortestPath(sourceId: string, targetId: string): Promise<KnowledgeNode[]> {
    try {
      // Simple BFS to find shortest path
      const visited = new Set<string>();
      const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceId, path: [sourceId] }];
      
      while (queue.length > 0) {
        const { nodeId, path } = queue.shift()!;
        
        if (nodeId === targetId) {
          const nodes: KnowledgeNode[] = [];
          for (const id of path) {
            const node = await this.getNode(id);
            if (node) {
              nodes.push(node);
            }
          }
          return nodes;
        }
        
        if (visited.has(nodeId)) {
          continue;
        }
        
        visited.add(nodeId);
        
        // Find connected nodes
        for (const relationship of this.relationships.values()) {
          if (relationship.sourceId === nodeId && !visited.has(relationship.targetId)) {
            queue.push({ nodeId: relationship.targetId, path: [...path, relationship.targetId] });
          }
          if (relationship.targetId === nodeId && !visited.has(relationship.sourceId)) {
            queue.push({ nodeId: relationship.sourceId, path: [...path, relationship.sourceId] });
          }
        }
      }
      
      return []; // No path found
    } catch (error) {
      logger.error(`Failed to find path from ${sourceId} to ${targetId}:`, error);
      throw error;
    }
  }

  async getRecommendations(nodeId: string, limit: number = 5): Promise<KnowledgeNode[]> {
    try {
      const neighbors = await this.getNodeNeighbors(nodeId, 2);
      
      // Sort by relevance and return top recommendations
      return neighbors
        .sort((a, b) => (b.metadata.importance || 0) - (a.metadata.importance || 0))
        .slice(0, limit);
    } catch (error) {
      logger.error(`Failed to get recommendations for node ${nodeId}:`, error);
      throw error;
    }
  }

  // Database helper methods
  private async storeNodeInDatabase(node: KnowledgeNode): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_nodes')
        .insert({
          id: node.id,
          type: node.type,
          content: node.content,
          embedding: node.embedding,
          metadata: node.metadata,
          relationships: node.relationships,
          created_at: node.createdAt,
          updated_at: node.updatedAt,
          version: node.version,
          tenant_id: node.tenantId,
          user_id: node.userId,
          tags: node.tags,
          confidence: node.confidence,
          source: node.source
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to store node in database:', error);
      throw error;
    }
  }

  private async loadNodeFromDatabase(id: string): Promise<KnowledgeNode | null> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return {
        id: data.id,
        type: data.type,
        content: data.content,
        embedding: data.embedding,
        metadata: data.metadata,
        relationships: data.relationships || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        version: data.version,
        tenantId: data.tenant_id,
        userId: data.user_id,
        tags: data.tags || [],
        confidence: data.confidence,
        source: data.source
      };
    } catch (error) {
      logger.error(`Failed to load node ${id} from database:`, error);
      throw error;
    }
  }

  private async updateNodeInDatabase(node: KnowledgeNode): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_nodes')
        .update({
          type: node.type,
          content: node.content,
          embedding: node.embedding,
          metadata: node.metadata,
          relationships: node.relationships,
          updated_at: node.updatedAt,
          version: node.version,
          tags: node.tags,
          confidence: node.confidence,
          source: node.source
        })
        .eq('id', node.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to update node ${node.id} in database:`, error);
      throw error;
    }
  }

  private async deleteNodeFromDatabase(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_nodes')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to delete node ${id} from database:`, error);
      throw error;
    }
  }

  private async storeRelationshipInDatabase(relationship: Relationship): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_relationships')
        .insert({
          id: relationship.id,
          type: relationship.type,
          source_id: relationship.sourceId,
          target_id: relationship.targetId,
          weight: relationship.weight,
          direction: relationship.direction,
          metadata: relationship.metadata,
          created_at: relationship.createdAt,
          updated_at: relationship.updatedAt
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to store relationship in database:', error);
      throw error;
    }
  }

  private async loadRelationshipFromDatabase(id: string): Promise<Relationship | null> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_relationships')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return {
        id: data.id,
        type: data.type,
        sourceId: data.source_id,
        targetId: data.target_id,
        weight: data.weight,
        direction: data.direction,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      logger.error(`Failed to load relationship ${id} from database:`, error);
      throw error;
    }
  }

  private async updateRelationshipInDatabase(relationship: Relationship): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_relationships')
        .update({
          type: relationship.type,
          source_id: relationship.sourceId,
          target_id: relationship.targetId,
          weight: relationship.weight,
          direction: relationship.direction,
          metadata: relationship.metadata,
          updated_at: relationship.updatedAt
        })
        .eq('id', relationship.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to update relationship ${relationship.id} in database:`, error);
      throw error;
    }
  }

  private async deleteRelationshipFromDatabase(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_relationships')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to delete relationship ${id} from database:`, error);
      throw error;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async cleanup(): Promise<void> {
    this.nodes.clear();
    this.relationships.clear();
    this.embeddings.clear();
    this.isInitialized = false;
    logger.info('Knowledge Graph Service cleaned up');
  }
}