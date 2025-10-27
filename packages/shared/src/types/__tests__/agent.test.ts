/**
 * Tests for agent types and interfaces
 */

import type {
  Agent,
  AgentStatus,
  AgentCapability,
  CapabilityType,
  CapabilityInput,
  CapabilityOutput,
  CapabilityConstraint,
  AgentMetadata,
  NandaCredentials,
  AgentRegistration,
  AgentCredentials,
  AgentPolicy,
  PolicyRule
} from '../agent';

describe('Agent Types', () => {
  describe('AgentStatus', () => {
    it('should have correct AgentStatus values', () => {
      const statuses: AgentStatus[] = ['online', 'offline', 'processing', 'error', 'maintenance'];
      statuses.forEach(status => {
        expect(['online', 'offline', 'processing', 'error', 'maintenance']).toContain(status);
      });
    });
  });

  describe('CapabilityType', () => {
    it('should have correct CapabilityType values', () => {
      const types: CapabilityType[] = ['llm', 'tool', 'data', 'workflow', 'notification', 'analytics'];
      types.forEach(type => {
        expect(['llm', 'tool', 'data', 'workflow', 'notification', 'analytics']).toContain(type);
      });
    });
  });

  describe('AgentCapability', () => {
    it('should create AgentCapability correctly', () => {
      const capability: AgentCapability = {
        id: 'cap-1',
        name: 'Data Processing',
        description: 'Process and analyze data',
        type: 'data',
        inputs: [
          {
            name: 'input_data',
            type: 'string',
            required: true,
            description: 'Input data to process',
            validation: [
              {
                type: 'required',
                message: 'Input data is required'
              }
            ]
          }
        ],
        outputs: [
          {
            name: 'processed_data',
            type: 'string',
            description: 'Processed output data'
          }
        ],
        constraints: [
          {
            type: 'rate_limit',
            value: 100,
            description: 'Maximum 100 requests per minute'
          },
          {
            type: 'timeout',
            value: 30000,
            description: '30 second timeout'
          }
        ]
      };
      
      expect(capability.id).toBe('cap-1');
      expect(capability.name).toBe('Data Processing');
      expect(capability.description).toBe('Process and analyze data');
      expect(['llm', 'tool', 'data', 'workflow', 'notification', 'analytics']).toContain(capability.type);
      expect(capability.type).toBe('data');
      expect(Array.isArray(capability.inputs)).toBe(true);
      expect(capability.inputs).toHaveLength(1);
      expect(capability.inputs[0].name).toBe('input_data');
      expect(capability.inputs[0].type).toBe('string');
      expect(capability.inputs[0].required).toBe(true);
      expect(capability.inputs[0].description).toBe('Input data to process');
      expect(Array.isArray(capability.inputs[0].validation)).toBe(true);
      expect(capability.inputs[0].validation).toHaveLength(1);
      expect(capability.inputs[0].validation?.[0]?.type).toBe('required');
      expect(capability.inputs[0].validation?.[0]?.message).toBe('Input data is required');
      expect(Array.isArray(capability.outputs)).toBe(true);
      expect(capability.outputs).toHaveLength(1);
      expect(capability.outputs[0].name).toBe('processed_data');
      expect(capability.outputs[0].type).toBe('string');
      expect(capability.outputs[0].description).toBe('Processed output data');
      expect(Array.isArray(capability.constraints)).toBe(true);
      expect(capability.constraints).toHaveLength(2);
      expect(capability.constraints?.[0]?.type).toBe('rate_limit');
      expect(capability.constraints?.[0]?.value).toBe(100);
      expect(capability.constraints?.[0]?.description).toBe('Maximum 100 requests per minute');
      expect(capability.constraints?.[1]?.type).toBe('timeout');
      expect(capability.constraints?.[1]?.value).toBe(30000);
      expect(capability.constraints?.[1]?.description).toBe('30 second timeout');
    });
  });

  describe('AgentMetadata', () => {
    it('should create AgentMetadata correctly', () => {
      const metadata: AgentMetadata = {
        author: 'AgentMesh Team',
        tags: ['ai', 'data', 'processing'],
        category: 'data_processing',
        documentation: 'https://docs.agentmesh.com/agents/data-processor',
        repository: 'https://github.com/agentmesh/data-processor',
        license: 'MIT',
        nandaCredentials: {
          agentId: 'agent-1',
          publicKey: 'public-key-123',
          certificate: 'certificate-123',
          issuedAt: new Date('2024-01-01T00:00:00Z'),
          expiresAt: new Date('2025-01-01T00:00:00Z'),
          issuer: 'AgentMesh CA'
        },
        mcpCompliant: true,
        a2aCompliant: true
      };
      
      expect(metadata.author).toBe('AgentMesh Team');
      expect(Array.isArray(metadata.tags)).toBe(true);
      expect(metadata.tags).toContain('ai');
      expect(metadata.tags).toContain('data');
      expect(metadata.tags).toContain('processing');
      expect(metadata.category).toBe('data_processing');
      expect(metadata.documentation).toBe('https://docs.agentmesh.com/agents/data-processor');
      expect(metadata.repository).toBe('https://github.com/agentmesh/data-processor');
      expect(metadata.license).toBe('MIT');
      expect(metadata.nandaCredentials?.agentId).toBe('agent-1');
      expect(metadata.nandaCredentials?.publicKey).toBe('public-key-123');
      expect(metadata.nandaCredentials?.certificate).toBe('certificate-123');
      expect(metadata.nandaCredentials?.issuedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(metadata.nandaCredentials?.expiresAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(metadata.nandaCredentials?.issuer).toBe('AgentMesh CA');
      expect(metadata.mcpCompliant).toBe(true);
      expect(metadata.a2aCompliant).toBe(true);
    });
  });

  describe('NandaCredentials', () => {
    it('should create NandaCredentials correctly', () => {
      const credentials: NandaCredentials = {
        agentId: 'agent-1',
        publicKey: 'public-key-123',
        certificate: 'certificate-123',
        issuedAt: new Date('2024-01-01T00:00:00Z'),
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        issuer: 'AgentMesh CA'
      };
      
      expect(credentials.agentId).toBe('agent-1');
      expect(credentials.publicKey).toBe('public-key-123');
      expect(credentials.certificate).toBe('certificate-123');
      expect(credentials.issuedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(credentials.expiresAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(credentials.issuer).toBe('AgentMesh CA');
    });
  });

  describe('Agent', () => {
    it('should create Agent correctly', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Data Processor Agent',
        description: 'Advanced AI agent for data processing and analysis',
        version: '2.1.0',
        status: 'online',
        capabilities: [
          {
            id: 'cap-1',
            name: 'Data Processing',
            description: 'Process and analyze data',
            type: 'data',
            inputs: [
              {
                name: 'input_data',
                type: 'string',
                required: true,
                description: 'Input data to process'
              }
            ],
            outputs: [
              {
                name: 'processed_data',
                type: 'string',
                description: 'Processed output data'
              }
            ],
            constraints: [
              {
                type: 'rate_limit',
                value: 100,
                description: 'Maximum 100 requests per minute'
              }
            ]
          }
        ],
        metadata: {
          author: 'AgentMesh Team',
          tags: ['ai', 'data', 'processing'],
          category: 'data_processing',
          documentation: 'https://docs.agentmesh.com/agents/data-processor',
          repository: 'https://github.com/agentmesh/data-processor',
          license: 'MIT',
          mcpCompliant: true,
          a2aCompliant: true
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
        lastSeenAt: new Date('2024-01-15T12:00:00Z')
      };
      
      expect(agent.id).toBe('agent-1');
      expect(agent.name).toBe('Data Processor Agent');
      expect(agent.description).toBe('Advanced AI agent for data processing and analysis');
      expect(agent.version).toBe('2.1.0');
      expect(['online', 'offline', 'processing', 'error', 'maintenance']).toContain(agent.status);
      expect(agent.status).toBe('online');
      expect(Array.isArray(agent.capabilities)).toBe(true);
      expect(agent.capabilities).toHaveLength(1);
      expect(agent.capabilities[0].id).toBe('cap-1');
      expect(agent.capabilities[0].name).toBe('Data Processing');
      expect(agent.capabilities[0].type).toBe('data');
      expect(agent.metadata.author).toBe('AgentMesh Team');
      expect(Array.isArray(agent.metadata.tags)).toBe(true);
      expect(agent.metadata.tags).toContain('ai');
      expect(agent.metadata.tags).toContain('data');
      expect(agent.metadata.tags).toContain('processing');
      expect(agent.metadata.category).toBe('data_processing');
      expect(agent.metadata.documentation).toBe('https://docs.agentmesh.com/agents/data-processor');
      expect(agent.metadata.repository).toBe('https://github.com/agentmesh/data-processor');
      expect(agent.metadata.license).toBe('MIT');
      expect(agent.metadata.mcpCompliant).toBe(true);
      expect(agent.metadata.a2aCompliant).toBe(true);
      expect(agent.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(agent.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(agent.lastSeenAt).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });

  describe('AgentRegistration', () => {
    it('should create AgentRegistration correctly', () => {
      const registration: AgentRegistration = {
        agent: {
          name: 'Data Processor Agent',
          description: 'Advanced AI agent for data processing and analysis',
          version: '2.1.0',
          status: 'online',
          capabilities: [
            {
              id: 'cap-1',
              name: 'Data Processing',
              description: 'Process and analyze data',
              type: 'data',
              inputs: [
                {
                  name: 'input_data',
                  type: 'string',
                  required: true,
                  description: 'Input data to process'
                }
              ],
              outputs: [
                {
                  name: 'processed_data',
                  type: 'string',
                  description: 'Processed output data'
                }
              ]
            }
          ],
          metadata: {
            author: 'AgentMesh Team',
            tags: ['ai', 'data', 'processing'],
            category: 'data_processing',
            mcpCompliant: true,
            a2aCompliant: true
          }
        },
        credentials: {
          apiKey: 'api-key-123',
          secretKey: 'secret-key-123',
          permissions: ['read', 'write', 'execute'],
          scopes: ['data:process', 'data:analyze']
        },
        policies: [
          {
            id: 'policy-1',
            name: 'Data Processing Policy',
            description: 'Policy for data processing operations',
            rules: [
              {
                id: 'rule-1',
                condition: 'user.role === "admin"',
                action: 'allow',
                metadata: { priority: 'high' }
              }
            ],
            enforcement: 'strict'
          }
        ]
      };
      
      expect(registration.agent.name).toBe('Data Processor Agent');
      expect(registration.agent.description).toBe('Advanced AI agent for data processing and analysis');
      expect(registration.agent.version).toBe('2.1.0');
      expect(['online', 'offline', 'processing', 'error', 'maintenance']).toContain(registration.agent.status);
      expect(registration.agent.status).toBe('online');
      expect(Array.isArray(registration.agent.capabilities)).toBe(true);
      expect(registration.agent.capabilities).toHaveLength(1);
      expect(registration.agent.capabilities[0].id).toBe('cap-1');
      expect(registration.agent.capabilities[0].name).toBe('Data Processing');
      expect(registration.agent.capabilities[0].type).toBe('data');
      expect(registration.agent.metadata.author).toBe('AgentMesh Team');
      expect(Array.isArray(registration.agent.metadata.tags)).toBe(true);
      expect(registration.agent.metadata.tags).toContain('ai');
      expect(registration.agent.metadata.tags).toContain('data');
      expect(registration.agent.metadata.tags).toContain('processing');
      expect(registration.agent.metadata.category).toBe('data_processing');
      expect(registration.agent.metadata.mcpCompliant).toBe(true);
      expect(registration.agent.metadata.a2aCompliant).toBe(true);
      expect(registration.credentials.apiKey).toBe('api-key-123');
      expect(registration.credentials.secretKey).toBe('secret-key-123');
      expect(Array.isArray(registration.credentials.permissions)).toBe(true);
      expect(registration.credentials.permissions).toContain('read');
      expect(registration.credentials.permissions).toContain('write');
      expect(registration.credentials.permissions).toContain('execute');
      expect(Array.isArray(registration.credentials.scopes)).toBe(true);
      expect(registration.credentials.scopes).toContain('data:process');
      expect(registration.credentials.scopes).toContain('data:analyze');
      expect(Array.isArray(registration.policies)).toBe(true);
      expect(registration.policies).toHaveLength(1);
      expect(registration.policies[0].id).toBe('policy-1');
      expect(registration.policies[0].name).toBe('Data Processing Policy');
      expect(registration.policies[0].description).toBe('Policy for data processing operations');
      expect(Array.isArray(registration.policies[0].rules)).toBe(true);
      expect(registration.policies[0].rules).toHaveLength(1);
      expect(registration.policies[0].rules[0].id).toBe('rule-1');
      expect(registration.policies[0].rules[0].condition).toBe('user.role === "admin"');
      expect(['allow', 'deny', 'require_approval']).toContain(registration.policies[0].rules[0].action);
      expect(registration.policies[0].rules[0].action).toBe('allow');
      expect(registration.policies[0].rules[0].metadata?.priority).toBe('high');
      expect(['strict', 'warning', 'audit']).toContain(registration.policies[0].enforcement);
      expect(registration.policies[0].enforcement).toBe('strict');
    });
  });

  describe('AgentCredentials', () => {
    it('should create AgentCredentials correctly', () => {
      const credentials: AgentCredentials = {
        apiKey: 'api-key-123',
        secretKey: 'secret-key-123',
        permissions: ['read', 'write', 'execute'],
        scopes: ['data:process', 'data:analyze']
      };
      
      expect(credentials.apiKey).toBe('api-key-123');
      expect(credentials.secretKey).toBe('secret-key-123');
      expect(Array.isArray(credentials.permissions)).toBe(true);
      expect(credentials.permissions).toContain('read');
      expect(credentials.permissions).toContain('write');
      expect(credentials.permissions).toContain('execute');
      expect(Array.isArray(credentials.scopes)).toBe(true);
      expect(credentials.scopes).toContain('data:process');
      expect(credentials.scopes).toContain('data:analyze');
    });
  });

  describe('AgentPolicy', () => {
    it('should create AgentPolicy correctly', () => {
      const policy: AgentPolicy = {
        id: 'policy-1',
        name: 'Data Processing Policy',
        description: 'Policy for data processing operations',
        rules: [
          {
            id: 'rule-1',
            condition: 'user.role === "admin"',
            action: 'allow',
            metadata: { priority: 'high' }
          }
        ],
        enforcement: 'strict'
      };
      
      expect(policy.id).toBe('policy-1');
      expect(policy.name).toBe('Data Processing Policy');
      expect(policy.description).toBe('Policy for data processing operations');
      expect(Array.isArray(policy.rules)).toBe(true);
      expect(policy.rules).toHaveLength(1);
      expect(policy.rules[0].id).toBe('rule-1');
      expect(policy.rules[0].condition).toBe('user.role === "admin"');
      expect(['allow', 'deny', 'require_approval']).toContain(policy.rules[0].action);
      expect(policy.rules[0].action).toBe('allow');
      expect(policy.rules[0].metadata?.priority).toBe('high');
      expect(['strict', 'warning', 'audit']).toContain(policy.enforcement);
      expect(policy.enforcement).toBe('strict');
    });
  });

  describe('PolicyRule', () => {
    it('should create PolicyRule correctly', () => {
      const rule: PolicyRule = {
        id: 'rule-1',
        condition: 'user.role === "admin"',
        action: 'allow',
        metadata: { priority: 'high' }
      };
      
      expect(rule.id).toBe('rule-1');
      expect(rule.condition).toBe('user.role === "admin"');
      expect(['allow', 'deny', 'require_approval']).toContain(rule.action);
      expect(rule.action).toBe('allow');
      expect(rule.metadata?.priority).toBe('high');
    });
  });
});