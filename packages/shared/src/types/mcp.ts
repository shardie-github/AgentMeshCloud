/**
 * Model Context Protocol (MCP) types for AgentMesh Cloud
 * Implements the MCP standard for agent communication and tool access
 */

import type { RetryPolicy, CapabilityInput, CapabilityOutput, CapabilityConstraint, ValidationRule } from './common';

export interface MCPMessage {
  id: string;
  type: MCPMessageType;
  payload: any;
  timestamp: Date;
  source: string;
  target?: string;
  correlationId?: string;
}

export type MCPMessageType = 
  | 'request' 
  | 'response' 
  | 'notification' 
  | 'error';

export interface MCPRequest extends MCPMessage {
  type: 'request';
  method: string;
  params: Record<string, any>;
  timeout?: number;
}

export interface MCPResponse extends MCPMessage {
  type: 'response';
  requestId: string;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification extends MCPMessage {
  type: 'notification';
  event: string;
  data: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPAdapter {
  id: string;
  name: string;
  type: AdapterType;
  config: AdapterConfig;
  capabilities: AdapterCapability[];
  status: AdapterStatus;
}

export type AdapterType = 
  | 'llm' 
  | 'database' 
  | 'api' 
  | 'file' 
  | 'message_queue' 
  | 'storage';

export interface AdapterConfig {
  endpoint?: string;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface AdapterCapability {
  name: string;
  description: string;
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  constraints?: CapabilityConstraint[];
}

export type AdapterStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'maintenance';

export interface LLMAdapter extends MCPAdapter {
  type: 'llm';
  provider: LLMProvider;
  model: string;
  config: LLMConfig;
}

export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'cohere' 
  | 'huggingface' 
  | 'custom';

export interface LLMConfig extends AdapterConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences?: string[];
}

export interface DatabaseAdapter extends MCPAdapter {
  type: 'database';
  provider: DatabaseProvider;
  config: DatabaseConfig;
}

export type DatabaseProvider = 
  | 'postgresql' 
  | 'mysql' 
  | 'mongodb' 
  | 'redis' 
  | 'supabase' 
  | 'custom';

export interface DatabaseConfig extends AdapterConfig {
  host: string;
  port: number;
  database: string;
  schema?: string;
  ssl: boolean;
  connectionPool: ConnectionPoolConfig;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
  acquireTimeout: number;
}

export interface APITransport {
  send(message: MCPMessage): Promise<MCPResponse>;
  subscribe(event: string, callback: (message: MCPMessage) => void): void;
  unsubscribe(event: string, callback: (message: MCPMessage) => void): void;
  close(): Promise<void>;
}

export interface MCPClient {
  id: string;
  adapters: Map<string, MCPAdapter>;
  transport: APITransport;
  status: ClientStatus;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendRequest<T = any>(adapterId: string, method: string, params: any): Promise<T>;
  subscribe(adapterId: string, event: string, callback: (data: any) => void): void;
  unsubscribe(adapterId: string, event: string, callback: (data: any) => void): void;
}

export type ClientStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error';

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  adapterId: string;
  inputs: ToolInput[];
  outputs: ToolOutput[];
  category: string;
  tags: string[];
}

export interface ToolInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: ValidationRule[];
}

export interface ToolOutput {
  name: string;
  type: string;
  description?: string;
}

export interface MCPDataSource {
  id: string;
  name: string;
  description: string;
  adapterId: string;
  schema: DataSchema;
  permissions: DataPermission[];
  indexing: IndexingConfig;
}

export interface DataSchema {
  tables: TableSchema[];
  relationships: Relationship[];
  indexes: IndexSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  constraints?: Constraint[];
}

export interface Constraint {
  type: 'unique' | 'check' | 'not_null' | 'foreign_key';
  value?: any;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'cascade' | 'set_null' | 'restrict';
  onUpdate: 'cascade' | 'set_null' | 'restrict';
}

export interface Relationship {
  from: string;
  to: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  foreignKey: string;
}

export interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface DataPermission {
  role: string;
  operations: PermissionOperation[];
  conditions?: string;
}

export type PermissionOperation = 
  | 'select' 
  | 'insert' 
  | 'update' 
  | 'delete' 
  | 'create' 
  | 'drop' 
  | 'alter';

export interface IndexingConfig {
  enabled: boolean;
  strategy: 'full_text' | 'vector' | 'semantic';
  fields: string[];
  settings: Record<string, any>;
}