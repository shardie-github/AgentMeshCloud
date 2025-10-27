/**
 * Knowledge Graph types for AgentMesh Cloud
 * Implements agentic knowledge graph with vector search capabilities
 */

export interface KnowledgeNode {
  id: string;
  type: NodeType;
  content: string;
  embedding?: number[];
  metadata: NodeMetadata;
  relationships: Relationship[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tenantId: string;
  userId?: string;
  tags: string[];
  confidence: number;
  source: string;
}

export type NodeType = 
  | 'concept' 
  | 'entity' 
  | 'relationship' 
  | 'document' 
  | 'conversation' 
  | 'workflow' 
  | 'agent' 
  | 'tool' 
  | 'data' 
  | 'insight';

export interface NodeMetadata {
  title?: string;
  description?: string;
  category?: string;
  language?: string;
  domain?: string;
  complexity?: 'low' | 'medium' | 'high';
  importance?: number;
  accessibility?: 'public' | 'private' | 'restricted';
  lastAccessed?: Date;
  accessCount?: number;
  custom?: Record<string, any>;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  weight: number;
  direction: 'directed' | 'undirected' | 'bidirectional';
  metadata: RelationshipMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type RelationshipType = 
  | 'is_a' 
  | 'part_of' 
  | 'related_to' 
  | 'causes' 
  | 'influences' 
  | 'depends_on' 
  | 'similar_to' 
  | 'opposite_of' 
  | 'contains' 
  | 'generates' 
  | 'uses' 
  | 'creates' 
  | 'modifies' 
  | 'replaces' 
  | 'extends';

export interface RelationshipMetadata {
  description?: string;
  strength?: number;
  confidence?: number;
  context?: string;
  temporal?: TemporalInfo;
  spatial?: SpatialInfo;
  custom?: Record<string, any>;
}

export interface TemporalInfo {
  startDate?: Date;
  endDate?: Date;
  duration?: number;
  frequency?: 'once' | 'recurring' | 'continuous';
  pattern?: string;
}

export interface SpatialInfo {
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  region?: string;
  country?: string;
}

export interface KnowledgeQuery {
  id: string;
  text: string;
  type: QueryType;
  filters?: QueryFilters;
  options?: QueryOptions;
  context?: QueryContext;
  tenantId: string;
  userId?: string;
  createdAt: Date;
}

export type QueryType = 
  | 'semantic' 
  | 'vector' 
  | 'keyword' 
  | 'hybrid' 
  | 'graph' 
  | 'temporal' 
  | 'spatial';

export interface QueryFilters {
  nodeTypes?: NodeType[];
  relationshipTypes?: RelationshipType[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  confidence?: {
    min: number;
    max: number;
  };
  importance?: {
    min: number;
    max: number;
  };
  accessibility?: string[];
  custom?: Record<string, any>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'confidence' | 'importance';
  sortOrder?: 'asc' | 'desc';
  includeEmbeddings?: boolean;
  includeRelationships?: boolean;
  maxDepth?: number;
  similarityThreshold?: number;
}

export interface QueryContext {
  conversationId?: string;
  sessionId?: string;
  workflowId?: string;
  agentId?: string;
  previousQueries?: string[];
  userPreferences?: UserPreferences;
  domainContext?: string;
}

export interface UserPreferences {
  preferredLanguages?: string[];
  complexityLevel?: 'low' | 'medium' | 'high';
  includeTechnical?: boolean;
  includeExamples?: boolean;
  maxResults?: number;
  sortBy?: string;
}

export interface KnowledgeSearchResult {
  node: KnowledgeNode;
  score: number;
  explanation?: string;
  matchedFields?: string[];
  context?: string;
  relationships?: Relationship[];
}

export interface KnowledgeSearchResponse {
  query: KnowledgeQuery;
  results: KnowledgeSearchResult[];
  total: number;
  took: number;
  suggestions?: string[];
  relatedQueries?: string[];
  facets?: SearchFacets;
}

export interface SearchFacets {
  nodeTypes: Record<string, number>;
  tags: Record<string, number>;
  domains: Record<string, number>;
  dateRanges: Record<string, number>;
  confidence: Record<string, number>;
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  description: string;
  version: string;
  status: GraphStatus;
  statistics: GraphStatistics;
  configuration: GraphConfiguration;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

export type GraphStatus = 'active' | 'inactive' | 'maintenance' | 'error';

export interface GraphStatistics {
  totalNodes: number;
  totalRelationships: number;
  nodeTypes: Record<NodeType, number>;
  relationshipTypes: Record<RelationshipType, number>;
  averageConnectivity: number;
  lastIndexed: Date;
  storageSize: number;
  queryCount: number;
  averageQueryTime: number;
}

export interface GraphConfiguration {
  embeddingModel: string;
  vectorDimensions: number;
  similarityThreshold: number;
  maxConnections: number;
  indexingStrategy: IndexingStrategy;
  caching: CachingConfig;
  security: SecurityConfig;
}

export interface IndexingStrategy {
  type: 'incremental' | 'full' | 'hybrid';
  batchSize: number;
  interval: number;
  parallel: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'ttl';
  preload: boolean;
}

export interface SecurityConfig {
  encryption: boolean;
  accessControl: boolean;
  auditLogging: boolean;
  dataRetention: number;
  anonymization: boolean;
}

export interface EmbeddingService {
  id: string;
  name: string;
  model: string;
  dimensions: number;
  maxTokens: number;
  supportedLanguages: string[];
  status: ServiceStatus;
  performance: ServicePerformance;
  pricing: ServicePricing;
}

export type ServiceStatus = 'active' | 'inactive' | 'maintenance' | 'error';

export interface ServicePerformance {
  latency: number;
  throughput: number;
  accuracy: number;
  availability: number;
  lastChecked: Date;
}

export interface ServicePricing {
  type: 'per_token' | 'per_request' | 'subscription';
  cost: number;
  currency: string;
  limits: {
    monthly: number;
    daily: number;
    hourly: number;
  };
}

export interface KnowledgeIndex {
  id: string;
  name: string;
  type: IndexType;
  status: IndexStatus;
  configuration: IndexConfiguration;
  statistics: IndexStatistics;
  createdAt: Date;
  updatedAt: Date;
}

export type IndexType = 'vector' | 'fulltext' | 'semantic' | 'hybrid';

export type IndexStatus = 'building' | 'ready' | 'error' | 'maintenance';

export interface IndexConfiguration {
  fields: string[];
  analyzer: string;
  similarity: string;
  dimensions?: number;
  model?: string;
  settings: Record<string, any>;
}

export interface IndexStatistics {
  totalDocuments: number;
  indexSize: number;
  buildTime: number;
  lastBuilt: Date;
  queryCount: number;
  averageQueryTime: number;
}

export interface KnowledgeService {
  initialize(): Promise<void>;
  createNode(node: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<KnowledgeNode>;
  getNode(id: string): Promise<KnowledgeNode | null>;
  updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode>;
  deleteNode(id: string): Promise<void>;
  search(query: KnowledgeQuery): Promise<KnowledgeSearchResponse>;
  createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Relationship>;
  getRelationship(id: string): Promise<Relationship | null>;
  updateRelationship(id: string, updates: Partial<Relationship>): Promise<Relationship>;
  deleteRelationship(id: string): Promise<void>;
  getGraphStatistics(): Promise<GraphStatistics>;
  getNodeNeighbors(nodeId: string, maxDepth?: number): Promise<KnowledgeNode[]>;
  getShortestPath(sourceId: string, targetId: string): Promise<KnowledgeNode[]>;
  getRecommendations(nodeId: string, limit?: number): Promise<KnowledgeNode[]>;
  cleanup(): Promise<void>;
}