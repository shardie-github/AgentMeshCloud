/**
 * Tests for A2A types and interfaces
 */

import type {
  A2AMessage,
  A2AMessageType,
  MessagePriority,
  MessageHeaders,
  EncryptionInfo,
  AuthenticationInfo,
  RoutingInfo,
  A2ARequest,
  A2AResponse,
  A2AError,
  A2ANotification,
  A2ABroadcast,
  BroadcastScope,
  A2AHeartbeat,
  LoadMetrics,
  A2ADiscovery,
  DiscoveryQuery,
  DiscoveryResponse,
  AgentInfo,
  A2ANegotiation,
  NegotiationPhase,
  NegotiationProposal,
  NegotiationTerms,
  TaskDefinition,
  TaskInput,
  TaskOutput,
  ResourceRequirements,
  Compensation,
  Constraint,
  ServiceLevelAgreement,
  Penalty,
  NegotiationAcceptance,
  NegotiationRejection,
  A2ABroker,
  BrokerType,
  BrokerConfig,
  BrokerSettings,
  SecurityConfig,
  BrokerStatus,
  A2AChannel,
  ChannelType,
  ChannelConfig,
  A2AClient
} from '../a2a';

describe('A2A Types', () => {
  describe('A2AMessageType', () => {
    it('should have correct A2AMessageType values', () => {
      const types: A2AMessageType[] = ['request', 'response', 'notification', 'broadcast', 'heartbeat', 'discovery', 'negotiation', 'error'];
      types.forEach(type => {
        expect(['request', 'response', 'notification', 'broadcast', 'heartbeat', 'discovery', 'negotiation', 'error']).toContain(type);
      });
    });
  });

  describe('MessagePriority', () => {
    it('should have correct MessagePriority values', () => {
      const priorities: MessagePriority[] = ['low', 'normal', 'high', 'critical'];
      priorities.forEach(priority => {
        expect(['low', 'normal', 'high', 'critical']).toContain(priority);
      });
    });
  });

  describe('BroadcastScope', () => {
    it('should have correct BroadcastScope values', () => {
      const scopes: BroadcastScope[] = ['global', 'tenant', 'workflow', 'agent_type', 'custom'];
      scopes.forEach(scope => {
        expect(['global', 'tenant', 'workflow', 'agent_type', 'custom']).toContain(scope);
      });
    });
  });

  describe('NegotiationPhase', () => {
    it('should have correct NegotiationPhase values', () => {
      const phases: NegotiationPhase[] = ['initiate', 'propose', 'counter_propose', 'accept', 'reject', 'timeout'];
      phases.forEach(phase => {
        expect(['initiate', 'propose', 'counter_propose', 'accept', 'reject', 'timeout']).toContain(phase);
      });
    });
  });

  describe('BrokerType', () => {
    it('should have correct BrokerType values', () => {
      const types: BrokerType[] = ['kafka', 'nats', 'rabbitmq', 'redis', 'custom'];
      types.forEach(type => {
        expect(['kafka', 'nats', 'rabbitmq', 'redis', 'custom']).toContain(type);
      });
    });
  });

  describe('BrokerStatus', () => {
    it('should have correct BrokerStatus values', () => {
      const statuses: BrokerStatus[] = ['disconnected', 'connecting', 'connected', 'error', 'maintenance'];
      statuses.forEach(status => {
        expect(['disconnected', 'connecting', 'connected', 'error', 'maintenance']).toContain(status);
      });
    });
  });

  describe('ChannelType', () => {
    it('should have correct ChannelType values', () => {
      const types: ChannelType[] = ['direct', 'fanout', 'topic', 'headers', 'rpc'];
      types.forEach(type => {
        expect(['direct', 'fanout', 'topic', 'headers', 'rpc']).toContain(type);
      });
    });
  });

  describe('A2AMessage', () => {
    it('should create A2AMessage correctly', () => {
      const message: A2AMessage = {
        id: 'msg-1',
        type: 'request',
        from: 'agent-1',
        to: 'agent-2',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        priority: 'normal',
        ttl: 3600,
        correlationId: 'corr-1',
        replyTo: 'agent-1',
        headers: {
          contentType: 'application/json',
          encoding: 'utf-8',
          compression: 'gzip',
          encryption: {
            algorithm: 'AES-256-GCM',
            keyId: 'key-1',
            iv: 'iv-123'
          },
          authentication: {
            method: 'jwt',
            token: 'jwt-token'
          },
          routing: {
            routingKey: 'agent.communication',
            exchange: 'agent-exchange',
            queue: 'agent-queue',
            persistent: true,
            durable: true
          },
          metadata: { version: '1.0' }
        }
      };
      
      expect(message.id).toBe('msg-1');
      expect(['request', 'response', 'notification', 'broadcast', 'heartbeat', 'discovery', 'negotiation', 'error']).toContain(message.type);
      expect(message.type).toBe('request');
      expect(message.from).toBe('agent-1');
      expect(message.to).toBe('agent-2');
      expect(message.payload).toEqual({ data: 'test' });
      expect(message.timestamp).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(['low', 'normal', 'high', 'critical']).toContain(message.priority);
      expect(message.priority).toBe('normal');
      expect(message.ttl).toBe(3600);
      expect(message.correlationId).toBe('corr-1');
      expect(message.replyTo).toBe('agent-1');
      expect(message.headers.contentType).toBe('application/json');
      expect(message.headers.encoding).toBe('utf-8');
      expect(message.headers.compression).toBe('gzip');
      expect(message.headers.encryption?.algorithm).toBe('AES-256-GCM');
      expect(message.headers.encryption?.keyId).toBe('key-1');
      expect(message.headers.encryption?.iv).toBe('iv-123');
      expect(message.headers.authentication?.method).toBe('jwt');
      expect(message.headers.authentication?.token).toBe('jwt-token');
      expect(message.headers.routing?.routingKey).toBe('agent.communication');
      expect(message.headers.routing?.exchange).toBe('agent-exchange');
      expect(message.headers.routing?.queue).toBe('agent-queue');
      expect(message.headers.routing?.persistent).toBe(true);
      expect(message.headers.routing?.durable).toBe(true);
      expect(message.headers.metadata?.version).toBe('1.0');
    });
  });

  describe('A2ARequest', () => {
    it('should create A2ARequest correctly', () => {
      const request: A2ARequest = {
        id: 'req-1',
        type: 'request',
        from: 'agent-1',
        to: 'agent-2',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        priority: 'normal',
        ttl: 3600,
        correlationId: 'corr-1',
        replyTo: 'agent-1',
        headers: {
          contentType: 'application/json',
          encoding: 'utf-8'
        },
        method: 'process_data',
        params: { input: 'test data' },
        timeout: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoff: 'exponential',
          delay: 1000,
          maxDelay: 10000
        }
      };
      
      expect(request.id).toBe('req-1');
      expect(request.type).toBe('request');
      expect(request.method).toBe('process_data');
      expect(request.params).toEqual({ input: 'test data' });
      expect(request.timeout).toBe(30000);
      expect(request.retryPolicy?.maxAttempts).toBe(3);
      expect(request.retryPolicy?.backoff).toBe('exponential');
      expect(request.retryPolicy?.delay).toBe(1000);
      expect(request.retryPolicy?.maxDelay).toBe(10000);
    });
  });

  describe('A2AResponse', () => {
    it('should create A2AResponse correctly', () => {
      const response: A2AResponse = {
        id: 'resp-1',
        type: 'response',
        from: 'agent-2',
        to: 'agent-1',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        priority: 'normal',
        ttl: 3600,
        correlationId: 'corr-1',
        replyTo: 'agent-1',
        headers: {
          contentType: 'application/json',
          encoding: 'utf-8'
        },
        requestId: 'req-1',
        result: { output: 'processed data' },
        statusCode: 200
      };
      
      expect(response.id).toBe('resp-1');
      expect(response.type).toBe('response');
      expect(response.requestId).toBe('req-1');
      expect(response.result).toEqual({ output: 'processed data' });
      expect(response.error).toBeUndefined();
      expect(response.statusCode).toBe(200);
    });
  });

  describe('A2AError', () => {
    it('should create A2AError correctly', () => {
      const error: A2AError = {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process data',
        details: { field: 'input', reason: 'invalid format' },
        stack: 'Error: Failed to process data\n    at processData (agent.js:10:5)'
      };
      
      expect(error.code).toBe('PROCESSING_ERROR');
      expect(error.message).toBe('Failed to process data');
      expect(error.details).toEqual({ field: 'input', reason: 'invalid format' });
      expect(error.stack).toBe('Error: Failed to process data\n    at processData (agent.js:10:5)');
    });
  });

  describe('A2ANotification', () => {
    it('should create A2ANotification correctly', () => {
      const notification: A2ANotification = {
        id: 'notif-1',
        type: 'notification',
        from: 'agent-1',
        to: ['agent-2', 'agent-3'],
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        priority: 'normal',
        ttl: 3600,
        correlationId: 'corr-1',
        replyTo: 'agent-1',
        headers: {
          contentType: 'application/json',
          encoding: 'utf-8'
        },
        event: 'data_updated',
        data: { table: 'users', count: 100 },
        persistent: true
      };
      
      expect(notification.id).toBe('notif-1');
      expect(notification.type).toBe('notification');
      expect(notification.event).toBe('data_updated');
      expect(notification.data).toEqual({ table: 'users', count: 100 });
      expect(notification.persistent).toBe(true);
    });
  });

  describe('A2ABroadcast', () => {
    it('should create A2ABroadcast correctly', () => {
      const broadcast: A2ABroadcast = {
        id: 'broadcast-1',
        type: 'broadcast',
        from: 'agent-1',
        to: 'agent-2',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        priority: 'normal',
        ttl: 3600,
        correlationId: 'corr-1',
        replyTo: 'agent-1',
        headers: {
          contentType: 'application/json',
          encoding: 'utf-8'
        },
        scope: 'global',
        data: { message: 'System maintenance in 1 hour' }
      };
      
      expect(broadcast.id).toBe('broadcast-1');
      expect(broadcast.type).toBe('broadcast');
      expect(['global', 'tenant', 'workflow', 'agent_type', 'custom']).toContain(broadcast.scope);
      expect(broadcast.scope).toBe('global');
      expect(broadcast.data).toEqual({ message: 'System maintenance in 1 hour' });
    });
  });

  describe('A2AHeartbeat', () => {
    it('should create A2AHeartbeat correctly', () => {
      const heartbeat: A2AHeartbeat = {
        id: 'heartbeat-1',
        type: 'heartbeat',
        from: 'agent-1',
        to: 'agent-2',
        payload: { data: 'test' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
        priority: 'normal',
        ttl: 3600,
        correlationId: 'corr-1',
        replyTo: 'agent-1',
        headers: {
          contentType: 'application/json',
          encoding: 'utf-8'
        },
        status: 'online',
        capabilities: ['data_processing', 'text_generation'],
        load: {
          cpu: 75.5,
          memory: 512,
          activeConnections: 10,
          queueSize: 5,
          lastActivity: new Date('2024-01-15T12:00:00Z')
        }
      };
      
      expect(heartbeat.id).toBe('heartbeat-1');
      expect(heartbeat.type).toBe('heartbeat');
      expect(['online', 'offline', 'processing', 'error', 'maintenance']).toContain(heartbeat.status);
      expect(heartbeat.status).toBe('online');
      expect(Array.isArray(heartbeat.capabilities)).toBe(true);
      expect(heartbeat.capabilities).toContain('data_processing');
      expect(heartbeat.capabilities).toContain('text_generation');
      expect(heartbeat.load.cpu).toBe(75.5);
      expect(heartbeat.load.memory).toBe(512);
      expect(heartbeat.load.activeConnections).toBe(10);
      expect(heartbeat.load.queueSize).toBe(5);
      expect(heartbeat.load.lastActivity).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });

  describe('A2ABroker', () => {
    it('should create A2ABroker correctly', () => {
      const broker: A2ABroker = {
        id: 'broker-1',
        type: 'kafka',
        config: {
          endpoints: ['kafka1:9092', 'kafka2:9092'],
          credentials: { username: 'user', password: 'pass' },
          settings: {
            partitions: 3,
            replicationFactor: 2,
            retentionPeriod: 7,
            compressionType: 'gzip',
            batchSize: 16384,
            lingerMs: 5
          },
          security: {
            ssl: true,
            authentication: 'SASL_PLAINTEXT',
            authorization: 'ACL',
            encryption: 'AES-256'
          }
        },
        status: 'connected',
        connections: 25,
        messagesPerSecond: 1000
      };
      
      expect(broker.id).toBe('broker-1');
      expect(['kafka', 'nats', 'rabbitmq', 'redis', 'custom']).toContain(broker.type);
      expect(broker.type).toBe('kafka');
      expect(Array.isArray(broker.config.endpoints)).toBe(true);
      expect(broker.config.endpoints).toContain('kafka1:9092');
      expect(broker.config.endpoints).toContain('kafka2:9092');
      expect(broker.config.credentials.username).toBe('user');
      expect(broker.config.credentials.password).toBe('pass');
      expect(broker.config.settings.partitions).toBe(3);
      expect(broker.config.settings.replicationFactor).toBe(2);
      expect(broker.config.settings.retentionPeriod).toBe(7);
      expect(broker.config.settings.compressionType).toBe('gzip');
      expect(broker.config.settings.batchSize).toBe(16384);
      expect(broker.config.settings.lingerMs).toBe(5);
      expect(broker.config.security.ssl).toBe(true);
      expect(broker.config.security.authentication).toBe('SASL_PLAINTEXT');
      expect(broker.config.security.authorization).toBe('ACL');
      expect(broker.config.security.encryption).toBe('AES-256');
      expect(['disconnected', 'connecting', 'connected', 'error', 'maintenance']).toContain(broker.status);
      expect(broker.status).toBe('connected');
      expect(broker.connections).toBe(25);
      expect(broker.messagesPerSecond).toBe(1000);
    });
  });

  describe('A2AChannel', () => {
    it('should create A2AChannel correctly', () => {
      const channel: A2AChannel = {
        id: 'channel-1',
        name: 'agent-communication',
        type: 'direct',
        config: {
          durable: true,
          exclusive: false,
          autoDelete: false,
          arguments: { 'x-message-ttl': 3600000 },
          routingKey: 'agent.communication',
          exchange: 'agent-exchange'
        },
        subscribers: ['agent-1', 'agent-2', 'agent-3'],
        messageCount: 1500,
        lastMessageAt: new Date('2024-01-15T12:00:00Z')
      };
      
      expect(channel.id).toBe('channel-1');
      expect(channel.name).toBe('agent-communication');
      expect(['direct', 'fanout', 'topic', 'headers', 'rpc']).toContain(channel.type);
      expect(channel.type).toBe('direct');
      expect(channel.config.durable).toBe(true);
      expect(channel.config.exclusive).toBe(false);
      expect(channel.config.autoDelete).toBe(false);
      expect(channel.config.arguments?.['x-message-ttl']).toBe(3600000);
      expect(channel.config.routingKey).toBe('agent.communication');
      expect(channel.config.exchange).toBe('agent-exchange');
      expect(Array.isArray(channel.subscribers)).toBe(true);
      expect(channel.subscribers).toContain('agent-1');
      expect(channel.subscribers).toContain('agent-2');
      expect(channel.subscribers).toContain('agent-3');
      expect(channel.messageCount).toBe(1500);
      expect(channel.lastMessageAt).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });

  describe('A2AClient', () => {
    it('should create A2AClient correctly', () => {
      const broker: A2ABroker = {
        id: 'broker-1',
        type: 'kafka',
        config: {
          endpoints: ['kafka1:9092'],
          credentials: { username: 'user', password: 'pass' },
          settings: {},
          security: {
            ssl: true,
            authentication: 'SASL_PLAINTEXT',
            authorization: 'ACL',
            encryption: 'AES-256'
          }
        },
        status: 'connected',
        connections: 25,
        messagesPerSecond: 1000
      };
      
      const channel: A2AChannel = {
        id: 'channel-1',
        name: 'agent-communication',
        type: 'direct',
        config: {
          durable: true,
          exclusive: false,
          autoDelete: false
        },
        subscribers: ['agent-1'],
        messageCount: 0
      };
      
      const client: A2AClient = {
        id: 'client-1',
        agentId: 'agent-1',
        broker: broker,
        channels: new Map([['channel-1', channel]]),
        status: 'connected',
        connect: async () => {},
        disconnect: async () => {},
        publish: async (channel: string, message: A2AMessage) => {},
        subscribe: async (channel: string, callback: (message: A2AMessage) => void) => {},
        unsubscribe: async (channel: string, callback: (message: A2AMessage) => void) => {},
        request: async (target: string, request: A2ARequest) => {
          return {} as A2AResponse;
        },
        respond: async (requestId: string, response: A2AResponse) => {}
      };
      
      expect(client.id).toBe('client-1');
      expect(client.agentId).toBe('agent-1');
      expect(client.broker).toBe(broker);
      expect(client.channels).toBeInstanceOf(Map);
      expect(client.channels.has('channel-1')).toBe(true);
      expect(client.channels.get('channel-1')).toBe(channel);
      expect(['disconnected', 'connecting', 'connected', 'error']).toContain(client.status);
      expect(client.status).toBe('connected');
      expect(typeof client.connect).toBe('function');
      expect(typeof client.disconnect).toBe('function');
      expect(typeof client.publish).toBe('function');
      expect(typeof client.subscribe).toBe('function');
      expect(typeof client.unsubscribe).toBe('function');
      expect(typeof client.request).toBe('function');
      expect(typeof client.respond).toBe('function');
    });
  });
});