/**
 * Tests for MCP types and interfaces
 */

import type {
  MCPMessage,
  MCPMessageType,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPAdapter,
  AdapterType,
  AdapterConfig,
  AdapterCapability,
  AdapterStatus,
  LLMAdapter,
  LLMProvider,
  LLMConfig,
  DatabaseAdapter,
  DatabaseProvider,
  DatabaseConfig,
  ConnectionPoolConfig,
  APITransport,
  MCPClient,
  ClientStatus,
  MCPTool,
  ToolInput,
  ToolOutput,
  MCPDataSource,
  DataSchema,
  TableSchema,
  ColumnSchema,
  Constraint,
  ForeignKey,
  Relationship,
  IndexSchema,
  DataPermission,
  PermissionOperation,
  IndexingConfig
} from '../mcp';

describe('MCP Types', () => {
  describe('MCPMessageType', () => {
    it('should have correct MCPMessageType values', () => {
      const types: MCPMessageType[] = ['request', 'response', 'notification', 'error'];
      types.forEach(type => {
        expect(['request', 'response', 'notification', 'error']).toContain(type);
      });
    });
  });

  describe('AdapterType', () => {
    it('should have correct AdapterType values', () => {
      const types: AdapterType[] = ['llm', 'database', 'api', 'file', 'message_queue', 'storage'];
      types.forEach(type => {
        expect(['llm', 'database', 'api', 'file', 'message_queue', 'storage']).toContain(type);
      });
    });
  });

  describe('AdapterStatus', () => {
    it('should have correct AdapterStatus values', () => {
      const statuses: AdapterStatus[] = ['connected', 'disconnected', 'error', 'maintenance'];
      statuses.forEach(status => {
        expect(['connected', 'disconnected', 'error', 'maintenance']).toContain(status);
      });
    });
  });

  describe('ClientStatus', () => {
    it('should have correct ClientStatus values', () => {
      const statuses: ClientStatus[] = ['disconnected', 'connecting', 'connected', 'error'];
      statuses.forEach(status => {
        expect(['disconnected', 'connecting', 'connected', 'error']).toContain(status);
      });
    });
  });

  describe('LLMProvider', () => {
    it('should have correct LLMProvider values', () => {
      const providers: LLMProvider[] = ['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'custom'];
      providers.forEach(provider => {
        expect(['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'custom']).toContain(provider);
      });
    });
  });

  describe('DatabaseProvider', () => {
    it('should have correct DatabaseProvider values', () => {
      const providers: DatabaseProvider[] = ['postgresql', 'mysql', 'mongodb', 'redis', 'supabase', 'custom'];
      providers.forEach(provider => {
        expect(['postgresql', 'mysql', 'mongodb', 'redis', 'supabase', 'custom']).toContain(provider);
      });
    });
  });

  describe('PermissionOperation', () => {
    it('should have correct PermissionOperation values', () => {
      const operations: PermissionOperation[] = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter'];
      operations.forEach(operation => {
        expect(['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter']).toContain(operation);
      });
    });
  });

  describe('MCPMessage', () => {
    it('should create MCPMessage correctly', () => {
      const message: MCPMessage = {
        id: 'msg-1',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        source: 'client-1',
        target: 'server-1',
        correlationId: 'corr-1'
      };
      
      expect(message.id).toBe('msg-1');
      expect(['request', 'response', 'notification', 'error']).toContain(message.type);
      expect(message.type).toBe('request');
      expect(message.payload).toEqual({ data: 'test' });
      expect(message.timestamp).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(message.source).toBe('client-1');
      expect(message.target).toBe('server-1');
      expect(message.correlationId).toBe('corr-1');
    });
  });

  describe('MCPRequest', () => {
    it('should create MCPRequest correctly', () => {
      const request: MCPRequest = {
        id: 'req-1',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        source: 'client-1',
        target: 'server-1',
        correlationId: 'corr-1',
        method: 'process_data',
        params: { input: 'test data' },
        timeout: 30000
      };
      
      expect(request.id).toBe('req-1');
      expect(request.type).toBe('request');
      expect(request.method).toBe('process_data');
      expect(request.params).toEqual({ input: 'test data' });
      expect(request.timeout).toBe(30000);
    });
  });

  describe('MCPResponse', () => {
    it('should create MCPResponse correctly', () => {
      const response: MCPResponse = {
        id: 'resp-1',
        type: 'response',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        source: 'server-1',
        target: 'client-1',
        correlationId: 'corr-1',
        requestId: 'req-1',
        result: { output: 'processed data' }
      };
      
      expect(response.id).toBe('resp-1');
      expect(response.type).toBe('response');
      expect(response.requestId).toBe('req-1');
      expect(response.result).toEqual({ output: 'processed data' });
      expect(response.error).toBeUndefined();
    });
  });

  describe('MCPNotification', () => {
    it('should create MCPNotification correctly', () => {
      const notification: MCPNotification = {
        id: 'notif-1',
        type: 'notification',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        source: 'server-1',
        event: 'data_updated',
        data: { table: 'users', count: 100 }
      };
      
      expect(notification.id).toBe('notif-1');
      expect(notification.type).toBe('notification');
      expect(notification.event).toBe('data_updated');
      expect(notification.data).toEqual({ table: 'users', count: 100 });
    });
  });

  describe('MCPError', () => {
    it('should create MCPError correctly', () => {
      const error: MCPError = {
        code: 400,
        message: 'Invalid request',
        data: { field: 'email', reason: 'invalid format' }
      };
      
      expect(error.code).toBe(400);
      expect(error.message).toBe('Invalid request');
      expect(error.data).toEqual({ field: 'email', reason: 'invalid format' });
    });
  });

  describe('MCPAdapter', () => {
    it('should create MCPAdapter correctly', () => {
      const adapter: MCPAdapter = {
        id: 'adapter-1',
        name: 'OpenAI Adapter',
        type: 'llm',
        config: {
          endpoint: 'https://api.openai.com/v1',
          credentials: { apiKey: 'sk-...' },
          settings: { model: 'gpt-4' },
          timeout: 30000,
          retryPolicy: {
            maxAttempts: 3,
            backoff: 'exponential',
            delay: 1000,
            maxDelay: 10000
          }
        },
        capabilities: [
          {
            name: 'text_generation',
            description: 'Generate text using OpenAI models',
            inputs: [
              {
                name: 'prompt',
                type: 'string',
                description: 'Input prompt',
                required: true
              }
            ],
            outputs: [
              {
                name: 'text',
                type: 'string',
                description: 'Generated text'
              }
            ]
          }
        ],
        status: 'connected'
      };
      
      expect(adapter.id).toBe('adapter-1');
      expect(adapter.name).toBe('OpenAI Adapter');
      expect(['llm', 'database', 'api', 'file', 'message_queue', 'storage']).toContain(adapter.type);
      expect(adapter.type).toBe('llm');
      expect(adapter.config.endpoint).toBe('https://api.openai.com/v1');
      expect(adapter.config.credentials.apiKey).toBe('sk-...');
      expect(adapter.config.settings.model).toBe('gpt-4');
      expect(adapter.config.timeout).toBe(30000);
      expect(adapter.config.retryPolicy.maxAttempts).toBe(3);
      expect(adapter.config.retryPolicy.backoff).toBe('exponential');
      expect(adapter.config.retryPolicy.delay).toBe(1000);
      expect(adapter.config.retryPolicy.maxDelay).toBe(10000);
      expect(Array.isArray(adapter.capabilities)).toBe(true);
      expect(adapter.capabilities).toHaveLength(1);
      expect(adapter.capabilities[0].name).toBe('text_generation');
      expect(adapter.capabilities[0].description).toBe('Generate text using OpenAI models');
      expect(Array.isArray(adapter.capabilities[0].inputs)).toBe(true);
      expect(adapter.capabilities[0].inputs).toHaveLength(1);
      expect(adapter.capabilities[0].inputs[0].name).toBe('prompt');
      expect(adapter.capabilities[0].inputs[0].type).toBe('string');
      expect(adapter.capabilities[0].inputs[0].description).toBe('Input prompt');
      expect(adapter.capabilities[0].inputs[0].required).toBe(true);
      expect(Array.isArray(adapter.capabilities[0].outputs)).toBe(true);
      expect(adapter.capabilities[0].outputs).toHaveLength(1);
      expect(adapter.capabilities[0].outputs[0].name).toBe('text');
      expect(adapter.capabilities[0].outputs[0].type).toBe('string');
      expect(adapter.capabilities[0].outputs[0].description).toBe('Generated text');
      expect(['connected', 'disconnected', 'error', 'maintenance']).toContain(adapter.status);
      expect(adapter.status).toBe('connected');
    });
  });

  describe('LLMAdapter', () => {
    it('should create LLMAdapter correctly', () => {
      const llmAdapter: LLMAdapter = {
        id: 'llm-1',
        name: 'OpenAI GPT-4',
        type: 'llm',
        provider: 'openai',
        model: 'gpt-4',
        config: {
          endpoint: 'https://api.openai.com/v1',
          credentials: { apiKey: 'sk-...' },
          settings: { model: 'gpt-4' },
          timeout: 30000,
          retryPolicy: {
            maxAttempts: 3,
            backoff: 'exponential',
            delay: 1000,
            maxDelay: 10000
          },
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1.0,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
          stopSequences: ['\n\n']
        },
        capabilities: [],
        status: 'connected'
      };
      
      expect(llmAdapter.id).toBe('llm-1');
      expect(llmAdapter.name).toBe('OpenAI GPT-4');
      expect(llmAdapter.type).toBe('llm');
      expect(['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'custom']).toContain(llmAdapter.provider);
      expect(llmAdapter.provider).toBe('openai');
      expect(llmAdapter.model).toBe('gpt-4');
      expect(llmAdapter.config.model).toBe('gpt-4');
      expect(llmAdapter.config.temperature).toBe(0.7);
      expect(llmAdapter.config.maxTokens).toBe(2048);
      expect(llmAdapter.config.topP).toBe(1.0);
      expect(llmAdapter.config.frequencyPenalty).toBe(0.0);
      expect(llmAdapter.config.presencePenalty).toBe(0.0);
      expect(Array.isArray(llmAdapter.config.stopSequences)).toBe(true);
      expect(llmAdapter.config.stopSequences).toContain('\n\n');
    });
  });

  describe('DatabaseAdapter', () => {
    it('should create DatabaseAdapter correctly', () => {
      const dbAdapter: DatabaseAdapter = {
        id: 'db-1',
        name: 'PostgreSQL Database',
        type: 'database',
        provider: 'postgresql',
        config: {
          endpoint: 'postgresql://localhost:5432/mydb',
          credentials: { username: 'user', password: 'pass' },
          settings: { ssl: true },
          timeout: 30000,
          retryPolicy: {
            maxAttempts: 3,
            backoff: 'exponential',
            delay: 1000,
            maxDelay: 10000
          },
          host: 'localhost',
          port: 5432,
          database: 'mydb',
          schema: 'public',
          ssl: true,
          connectionPool: {
            min: 2,
            max: 10,
            idleTimeout: 30000,
            acquireTimeout: 60000
          }
        },
        capabilities: [],
        status: 'connected'
      };
      
      expect(dbAdapter.id).toBe('db-1');
      expect(dbAdapter.name).toBe('PostgreSQL Database');
      expect(dbAdapter.type).toBe('database');
      expect(['postgresql', 'mysql', 'mongodb', 'redis', 'supabase', 'custom']).toContain(dbAdapter.provider);
      expect(dbAdapter.provider).toBe('postgresql');
      expect(dbAdapter.config.host).toBe('localhost');
      expect(dbAdapter.config.port).toBe(5432);
      expect(dbAdapter.config.database).toBe('mydb');
      expect(dbAdapter.config.schema).toBe('public');
      expect(dbAdapter.config.ssl).toBe(true);
      expect(dbAdapter.config.connectionPool.min).toBe(2);
      expect(dbAdapter.config.connectionPool.max).toBe(10);
      expect(dbAdapter.config.connectionPool.idleTimeout).toBe(30000);
      expect(dbAdapter.config.connectionPool.acquireTimeout).toBe(60000);
    });
  });

  describe('MCPTool', () => {
    it('should create MCPTool correctly', () => {
      const tool: MCPTool = {
        id: 'tool-1',
        name: 'text_generator',
        description: 'Generate text using AI models',
        adapterId: 'adapter-1',
        inputs: [
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: 'Input prompt for text generation',
            defaultValue: 'Hello, world!'
          }
        ],
        outputs: [
          {
            name: 'text',
            type: 'string',
            description: 'Generated text output'
          }
        ],
        category: 'text_generation',
        tags: ['ai', 'text', 'generation']
      };
      
      expect(tool.id).toBe('tool-1');
      expect(tool.name).toBe('text_generator');
      expect(tool.description).toBe('Generate text using AI models');
      expect(tool.adapterId).toBe('adapter-1');
      expect(Array.isArray(tool.inputs)).toBe(true);
      expect(tool.inputs).toHaveLength(1);
      expect(tool.inputs[0].name).toBe('prompt');
      expect(tool.inputs[0].type).toBe('string');
      expect(tool.inputs[0].required).toBe(true);
      expect(tool.inputs[0].description).toBe('Input prompt for text generation');
      expect(tool.inputs[0].defaultValue).toBe('Hello, world!');
      expect(Array.isArray(tool.outputs)).toBe(true);
      expect(tool.outputs).toHaveLength(1);
      expect(tool.outputs[0].name).toBe('text');
      expect(tool.outputs[0].type).toBe('string');
      expect(tool.outputs[0].description).toBe('Generated text output');
      expect(tool.category).toBe('text_generation');
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(tool.tags).toContain('ai');
      expect(tool.tags).toContain('text');
      expect(tool.tags).toContain('generation');
    });
  });

  describe('MCPDataSource', () => {
    it('should create MCPDataSource correctly', () => {
      const dataSource: MCPDataSource = {
        id: 'ds-1',
        name: 'knowledge_base',
        description: 'Knowledge base data source',
        adapterId: 'adapter-1',
        schema: {
          tables: [
            {
              name: 'documents',
              columns: [
                {
                  name: 'id',
                  type: 'uuid',
                  nullable: false,
                  defaultValue: 'gen_random_uuid()',
                  constraints: [
                    {
                      type: 'unique',
                      value: true
                    }
                  ]
                },
                {
                  name: 'title',
                  type: 'text',
                  nullable: false
                },
                {
                  name: 'content',
                  type: 'text',
                  nullable: false
                }
              ],
              primaryKey: ['id'],
              foreignKeys: []
            }
          ],
          relationships: [],
          indexes: [
            {
              name: 'idx_documents_title',
              table: 'documents',
              columns: ['title'],
              unique: false,
              type: 'btree'
            }
          ]
        },
        permissions: [
          {
            role: 'user',
            operations: ['select'],
            conditions: 'user_id = current_user_id()'
          }
        ],
        indexing: {
          enabled: true,
          strategy: 'full_text',
          fields: ['title', 'content'],
          settings: { language: 'english' }
        }
      };
      
      expect(dataSource.id).toBe('ds-1');
      expect(dataSource.name).toBe('knowledge_base');
      expect(dataSource.description).toBe('Knowledge base data source');
      expect(dataSource.adapterId).toBe('adapter-1');
      expect(Array.isArray(dataSource.schema.tables)).toBe(true);
      expect(dataSource.schema.tables).toHaveLength(1);
      expect(dataSource.schema.tables[0].name).toBe('documents');
      expect(Array.isArray(dataSource.schema.tables[0].columns)).toBe(true);
      expect(dataSource.schema.tables[0].columns).toHaveLength(3);
      expect(dataSource.schema.tables[0].columns[0].name).toBe('id');
      expect(dataSource.schema.tables[0].columns[0].type).toBe('uuid');
      expect(dataSource.schema.tables[0].columns[0].nullable).toBe(false);
      expect(dataSource.schema.tables[0].columns[0].defaultValue).toBe('gen_random_uuid()');
      expect(Array.isArray(dataSource.schema.tables[0].columns[0].constraints)).toBe(true);
      expect(dataSource.schema.tables[0].columns[0].constraints).toHaveLength(1);
      expect(dataSource.schema.tables[0].columns[0].constraints?.[0]?.type).toBe('unique');
      expect(dataSource.schema.tables[0].columns[0].constraints?.[0]?.value).toBe(true);
      expect(Array.isArray(dataSource.schema.tables[0].primaryKey)).toBe(true);
      expect(dataSource.schema.tables[0].primaryKey).toContain('id');
      expect(Array.isArray(dataSource.schema.tables[0].foreignKeys)).toBe(true);
      expect(dataSource.schema.tables[0].foreignKeys).toHaveLength(0);
      expect(Array.isArray(dataSource.schema.relationships)).toBe(true);
      expect(dataSource.schema.relationships).toHaveLength(0);
      expect(Array.isArray(dataSource.schema.indexes)).toBe(true);
      expect(dataSource.schema.indexes).toHaveLength(1);
      expect(dataSource.schema.indexes[0].name).toBe('idx_documents_title');
      expect(dataSource.schema.indexes[0].table).toBe('documents');
      expect(Array.isArray(dataSource.schema.indexes[0].columns)).toBe(true);
      expect(dataSource.schema.indexes[0].columns).toContain('title');
      expect(dataSource.schema.indexes[0].unique).toBe(false);
      expect(['btree', 'hash', 'gin', 'gist']).toContain(dataSource.schema.indexes[0].type);
      expect(dataSource.schema.indexes[0].type).toBe('btree');
      expect(Array.isArray(dataSource.permissions)).toBe(true);
      expect(dataSource.permissions).toHaveLength(1);
      expect(dataSource.permissions[0].role).toBe('user');
      expect(Array.isArray(dataSource.permissions[0].operations)).toBe(true);
      expect(dataSource.permissions[0].operations).toContain('select');
      expect(dataSource.permissions[0].conditions).toBe('user_id = current_user_id()');
      expect(dataSource.indexing.enabled).toBe(true);
      expect(['full_text', 'vector', 'semantic']).toContain(dataSource.indexing.strategy);
      expect(dataSource.indexing.strategy).toBe('full_text');
      expect(Array.isArray(dataSource.indexing.fields)).toBe(true);
      expect(dataSource.indexing.fields).toContain('title');
      expect(dataSource.indexing.fields).toContain('content');
      expect(dataSource.indexing.settings.language).toBe('english');
    });
  });
});