/**
 * Tests for workflow types and interfaces
 */

import type {
  Workflow,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowNode,
  NodeType,
  WorkflowExecution,
  ExecutionStatus,
  WorkflowEdge,
  WorkflowVariable,
  WorkflowTrigger,
  TriggerType,
  WorkflowSettings,
  WorkflowMetadata,
  ResourceRequirements,
  ExecutionLog,
  ExecutionMetrics,
  ResourceUsage
} from '../workflow';

describe('Workflow Types', () => {
  describe('WorkflowStatus', () => {
    it('should have correct WorkflowStatus values', () => {
      const statuses: WorkflowStatus[] = ['draft', 'active', 'paused', 'archived', 'error'];
      statuses.forEach(status => {
        expect(['draft', 'active', 'paused', 'archived', 'error']).toContain(status);
      });
    });
  });

  describe('NodeType', () => {
    it('should have correct NodeType values', () => {
      const types: NodeType[] = ['agent', 'condition', 'parallel', 'merge', 'delay', 'webhook', 'data_transform', 'notification'];
      types.forEach(type => {
        expect(['agent', 'condition', 'parallel', 'merge', 'delay', 'webhook', 'data_transform', 'notification']).toContain(type);
      });
    });
  });

  describe('WorkflowNode', () => {
    it('should create WorkflowNode correctly', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        name: 'Process Data',
        type: 'agent',
        position: { x: 100, y: 200 },
        config: {
          inputs: {
            data: '{{input.data}}'
          },
          outputs: {
            result: '{{output.result}}'
          },
          settings: {
            timeout: 30000,
            retries: 3
          },
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            baseDelay: 1000,
            maxDelay: 10000
          },
          timeout: 30000
        },
        agentId: 'agent-1',
        capabilities: ['data_processing']
      };
      
      expect(node.id).toBe('node-1');
      expect(node.name).toBe('Process Data');
      expect(node.type).toBe('agent');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.config.inputs).toEqual({ data: '{{input.data}}' });
      expect(node.config.outputs).toEqual({ result: '{{output.result}}' });
      expect(node.config.settings.timeout).toBe(30000);
      expect(node.config.settings.retries).toBe(3);
      expect(node.config.retryPolicy?.maxAttempts).toBe(3);
      expect(node.config.retryPolicy?.backoffStrategy).toBe('exponential');
      expect(node.config.retryPolicy?.baseDelay).toBe(1000);
      expect(node.config.retryPolicy?.maxDelay).toBe(10000);
      expect(node.config.timeout).toBe(30000);
      expect(node.agentId).toBe('agent-1');
      expect(Array.isArray(node.capabilities)).toBe(true);
      expect(node.capabilities).toContain('data_processing');
    });

    it('should handle different node types correctly', () => {
      const conditionNode: WorkflowNode = {
        id: 'condition-1',
        name: 'Check Condition',
        type: 'condition',
        position: { x: 200, y: 100 },
        config: {
          inputs: {
            value: '{{data.value}}'
          },
          outputs: {
            result: '{{condition.result}}'
          },
          settings: {
            condition: '{{data.value}} > 100'
          }
        }
      };
      
      expect(conditionNode.type).toBe('condition');
      expect(conditionNode.config.settings.condition).toBe('{{data.value}} > 100');
      
      const webhookNode: WorkflowNode = {
        id: 'webhook-1',
        name: 'Webhook Call',
        type: 'webhook',
        position: { x: 300, y: 100 },
        config: {
          inputs: {
            url: 'https://api.example.com/webhook',
            method: 'POST'
          },
          outputs: {
            response: '{{webhook.response}}'
          },
          settings: {
            timeout: 5000
          }
        }
      };
      
      expect(webhookNode.type).toBe('webhook');
      expect(webhookNode.config.inputs.url).toBe('https://api.example.com/webhook');
      expect(webhookNode.config.inputs.method).toBe('POST');
    });
  });

  describe('WorkflowEdge', () => {
    it('should create WorkflowEdge correctly', () => {
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        condition: '{{data.value}} > 0',
        label: 'Success Path'
      };
      
      expect(edge.id).toBe('edge-1');
      expect(edge.source).toBe('node-1');
      expect(edge.target).toBe('node-2');
      expect(edge.condition).toBe('{{data.value}} > 0');
      expect(edge.label).toBe('Success Path');
    });
  });

  describe('WorkflowVariable', () => {
    it('should create WorkflowVariable correctly', () => {
      const variable: WorkflowVariable = {
        name: 'input_data',
        type: 'string',
        value: 'sample data',
        description: 'Input data for processing',
        required: true
      };
      
      expect(variable.name).toBe('input_data');
      expect(variable.type).toBe('string');
      expect(variable.value).toBe('sample data');
      expect(variable.description).toBe('Input data for processing');
      expect(variable.required).toBe(true);
    });
  });

  describe('WorkflowTrigger', () => {
    it('should create WorkflowTrigger correctly', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'schedule',
        config: {
          schedule: '0 0 * * *'
        },
        enabled: true
      };
      
      expect(trigger.id).toBe('trigger-1');
      expect(['schedule', 'webhook', 'event', 'manual', 'api']).toContain(trigger.type);
      expect(trigger.type).toBe('schedule');
      expect(trigger.config.schedule).toBe('0 0 * * *');
      expect(trigger.enabled).toBe(true);
    });
  });

  describe('TriggerType', () => {
    it('should have correct TriggerType values', () => {
      const types: TriggerType[] = ['schedule', 'webhook', 'event', 'manual', 'api'];
      types.forEach(type => {
        expect(['schedule', 'webhook', 'event', 'manual', 'api']).toContain(type);
      });
    });
  });

  describe('WorkflowSettings', () => {
    it('should create WorkflowSettings correctly', () => {
      const settings: WorkflowSettings = {
        timeout: 300000,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1000,
          maxDelay: 10000
        },
        concurrency: 5,
        errorHandling: 'retry',
        logging: {
          level: 'info',
          retention: 30,
          includePayloads: true
        }
      };
      
      expect(settings.timeout).toBe(300000);
      expect(settings.retryPolicy.maxAttempts).toBe(3);
      expect(settings.retryPolicy.backoffStrategy).toBe('exponential');
      expect(settings.retryPolicy.baseDelay).toBe(1000);
      expect(settings.retryPolicy.maxDelay).toBe(10000);
      expect(settings.concurrency).toBe(5);
      expect(['stop', 'continue', 'retry', 'fallback']).toContain(settings.errorHandling);
      expect(settings.errorHandling).toBe('retry');
      expect(settings.logging.level).toBe('info');
      expect(settings.logging.retention).toBe(30);
      expect(settings.logging.includePayloads).toBe(true);
    });
  });

  describe('WorkflowMetadata', () => {
    it('should create WorkflowMetadata correctly', () => {
      const metadata: WorkflowMetadata = {
        author: 'Workflow Designer',
        tags: ['data', 'processing', 'workflow'],
        category: 'data_processing',
        documentation: 'https://docs.example.com/workflow',
        estimatedDuration: 300000,
        resourceRequirements: {
          cpu: '1000m',
          memory: '512Mi',
          storage: '10Gi',
          network: '100Mbps'
        }
      };
      
      expect(metadata.author).toBe('Workflow Designer');
      expect(Array.isArray(metadata.tags)).toBe(true);
      expect(metadata.tags).toContain('data');
      expect(metadata.tags).toContain('processing');
      expect(metadata.tags).toContain('workflow');
      expect(metadata.category).toBe('data_processing');
      expect(metadata.documentation).toBe('https://docs.example.com/workflow');
      expect(metadata.estimatedDuration).toBe(300000);
      expect(metadata.resourceRequirements?.cpu).toBe('1000m');
      expect(metadata.resourceRequirements?.memory).toBe('512Mi');
      expect(metadata.resourceRequirements?.storage).toBe('10Gi');
      expect(metadata.resourceRequirements?.network).toBe('100Mbps');
    });
  });

  describe('ResourceRequirements', () => {
    it('should create ResourceRequirements correctly', () => {
      const requirements: ResourceRequirements = {
        cpu: '1000m',
        memory: '512Mi',
        storage: '10Gi',
        network: '100Mbps'
      };
      
      expect(requirements.cpu).toBe('1000m');
      expect(requirements.memory).toBe('512Mi');
      expect(requirements.storage).toBe('10Gi');
      expect(requirements.network).toBe('100Mbps');
    });
  });

  describe('WorkflowDefinition', () => {
    it('should create WorkflowDefinition correctly', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'node-1',
            name: 'Process Data',
            type: 'agent',
            position: { x: 100, y: 200 },
            config: {
              inputs: { data: '{{input.data}}' },
              outputs: { result: '{{output.result}}' },
              settings: { timeout: 30000 }
            },
            agentId: 'agent-1',
            capabilities: ['data_processing']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            condition: '{{data.value}} > 0',
            label: 'Success Path'
          }
        ],
        variables: [
          {
            name: 'input_data',
            type: 'string',
            value: 'sample data',
            description: 'Input data for processing',
            required: true
          }
        ],
        triggers: [
          {
            id: 'trigger-1',
            type: 'schedule',
            config: { schedule: '0 0 * * *' },
            enabled: true
          }
        ],
        settings: {
          timeout: 300000,
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            baseDelay: 1000,
            maxDelay: 10000
          },
          concurrency: 5,
          errorHandling: 'retry',
          logging: {
            level: 'info',
            retention: 30,
            includePayloads: true
          }
        }
      };
      
      expect(Array.isArray(definition.nodes)).toBe(true);
      expect(definition.nodes).toHaveLength(1);
      expect(definition.nodes[0].id).toBe('node-1');
      expect(Array.isArray(definition.edges)).toBe(true);
      expect(definition.edges).toHaveLength(1);
      expect(definition.edges[0].id).toBe('edge-1');
      expect(Array.isArray(definition.variables)).toBe(true);
      expect(definition.variables).toHaveLength(1);
      expect(definition.variables[0].name).toBe('input_data');
      expect(Array.isArray(definition.triggers)).toBe(true);
      expect(definition.triggers).toHaveLength(1);
      expect(definition.triggers[0].id).toBe('trigger-1');
      expect(definition.settings.timeout).toBe(300000);
      expect(definition.settings.concurrency).toBe(5);
    });
  });

  describe('WorkflowExecution', () => {
    it('should create WorkflowExecution correctly', () => {
      const execution: WorkflowExecution = {
        id: 'exec-1',
        workflowId: 'workflow-1',
        status: 'running',
        startedAt: new Date('2024-01-15T12:00:00Z'),
        completedAt: undefined,
        duration: undefined,
        inputs: { data: 'test data' },
        outputs: undefined,
        logs: [
          {
            id: 'log-1',
            timestamp: new Date('2024-01-15T12:00:00Z'),
            level: 'info',
            message: 'Workflow started',
            nodeId: 'node-1',
            agentId: 'agent-1',
            metadata: { step: 1 }
          }
        ],
        metrics: {
          totalNodes: 3,
          completedNodes: 1,
          failedNodes: 0,
          averageLatency: 150,
          totalLatency: 150,
          resourceUsage: {
            cpu: 50,
            memory: 256,
            network: 10,
            storage: 100
          }
        }
      };
      
      expect(execution.id).toBe('exec-1');
      expect(execution.workflowId).toBe('workflow-1');
      expect(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']).toContain(execution.status);
      expect(execution.status).toBe('running');
      expect(execution.startedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(execution.completedAt).toBeUndefined();
      expect(execution.duration).toBeUndefined();
      expect(execution.inputs).toEqual({ data: 'test data' });
      expect(execution.outputs).toBeUndefined();
      expect(Array.isArray(execution.logs)).toBe(true);
      expect(execution.logs).toHaveLength(1);
      expect(execution.logs[0].id).toBe('log-1');
      expect(execution.logs[0].level).toBe('info');
      expect(execution.logs[0].message).toBe('Workflow started');
      expect(execution.logs[0].nodeId).toBe('node-1');
      expect(execution.logs[0].agentId).toBe('agent-1');
      expect(execution.logs[0].metadata).toEqual({ step: 1 });
      expect(execution.metrics.totalNodes).toBe(3);
      expect(execution.metrics.completedNodes).toBe(1);
      expect(execution.metrics.failedNodes).toBe(0);
      expect(execution.metrics.averageLatency).toBe(150);
      expect(execution.metrics.totalLatency).toBe(150);
      expect(execution.metrics.resourceUsage.cpu).toBe(50);
      expect(execution.metrics.resourceUsage.memory).toBe(256);
      expect(execution.metrics.resourceUsage.network).toBe(10);
      expect(execution.metrics.resourceUsage.storage).toBe(100);
    });
  });

  describe('ExecutionStatus', () => {
    it('should have correct ExecutionStatus values', () => {
      const statuses: ExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'];
      statuses.forEach(status => {
        expect(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']).toContain(status);
      });
    });
  });

  describe('ExecutionLog', () => {
    it('should create ExecutionLog correctly', () => {
      const log: ExecutionLog = {
        id: 'log-1',
        timestamp: new Date('2024-01-15T12:00:00Z'),
        level: 'info',
        message: 'Workflow started',
        nodeId: 'node-1',
        agentId: 'agent-1',
        metadata: { step: 1 }
      };
      
      expect(log.id).toBe('log-1');
      expect(log.timestamp).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(['debug', 'info', 'warn', 'error']).toContain(log.level);
      expect(log.level).toBe('info');
      expect(log.message).toBe('Workflow started');
      expect(log.nodeId).toBe('node-1');
      expect(log.agentId).toBe('agent-1');
      expect(log.metadata).toEqual({ step: 1 });
    });
  });

  describe('ExecutionMetrics', () => {
    it('should create ExecutionMetrics correctly', () => {
      const metrics: ExecutionMetrics = {
        totalNodes: 5,
        completedNodes: 3,
        failedNodes: 1,
        averageLatency: 200,
        totalLatency: 1000,
        resourceUsage: {
          cpu: 75,
          memory: 512,
          network: 50,
          storage: 200
        }
      };
      
      expect(metrics.totalNodes).toBe(5);
      expect(metrics.completedNodes).toBe(3);
      expect(metrics.failedNodes).toBe(1);
      expect(metrics.averageLatency).toBe(200);
      expect(metrics.totalLatency).toBe(1000);
      expect(metrics.resourceUsage.cpu).toBe(75);
      expect(metrics.resourceUsage.memory).toBe(512);
      expect(metrics.resourceUsage.network).toBe(50);
      expect(metrics.resourceUsage.storage).toBe(200);
    });
  });

  describe('ResourceUsage', () => {
    it('should create ResourceUsage correctly', () => {
      const usage: ResourceUsage = {
        cpu: 80,
        memory: 1024,
        network: 100,
        storage: 500
      };
      
      expect(usage.cpu).toBe(80);
      expect(usage.memory).toBe(1024);
      expect(usage.network).toBe(100);
      expect(usage.storage).toBe(500);
    });
  });

  describe('Workflow', () => {
    it('should create Workflow correctly', () => {
      const workflow: Workflow = {
        id: 'workflow-1',
        name: 'Data Processing Workflow',
        description: 'Complete data processing workflow',
        version: '1.2.0',
        status: 'active',
        definition: {
          nodes: [
            {
              id: 'node-1',
              name: 'Process Data',
              type: 'agent',
              position: { x: 100, y: 200 },
              config: {
                inputs: { data: '{{input.data}}' },
                outputs: { result: '{{output.result}}' },
                settings: { timeout: 30000 }
              },
              agentId: 'agent-1',
              capabilities: ['data_processing']
            }
          ],
          edges: [],
          variables: [],
          triggers: [],
          settings: {
            timeout: 300000,
            retryPolicy: {
              maxAttempts: 3,
              backoffStrategy: 'exponential',
              baseDelay: 1000,
              maxDelay: 10000
            },
            concurrency: 5,
            errorHandling: 'retry',
            logging: {
              level: 'info',
              retention: 30,
              includePayloads: true
            }
          }
        },
        metadata: {
          author: 'Workflow Designer',
          tags: ['data', 'processing', 'workflow'],
          category: 'data_processing',
          documentation: 'https://docs.example.com/workflow',
          estimatedDuration: 300000,
          resourceRequirements: {
            cpu: '1000m',
            memory: '512Mi',
            storage: '10Gi',
            network: '100Mbps'
          }
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
        lastExecutedAt: new Date('2024-01-15T12:00:00Z')
      };
      
      expect(workflow.id).toBe('workflow-1');
      expect(workflow.name).toBe('Data Processing Workflow');
      expect(workflow.description).toBe('Complete data processing workflow');
      expect(workflow.version).toBe('1.2.0');
      expect(['draft', 'active', 'paused', 'archived', 'error']).toContain(workflow.status);
      expect(workflow.status).toBe('active');
      expect(workflow.definition.nodes).toHaveLength(1);
      expect(workflow.definition.nodes[0].id).toBe('node-1');
      expect(workflow.metadata.author).toBe('Workflow Designer');
      expect(Array.isArray(workflow.metadata.tags)).toBe(true);
      expect(workflow.metadata.tags).toContain('data');
      expect(workflow.metadata.tags).toContain('processing');
      expect(workflow.metadata.tags).toContain('workflow');
      expect(workflow.metadata.category).toBe('data_processing');
      expect(workflow.metadata.documentation).toBe('https://docs.example.com/workflow');
      expect(workflow.metadata.estimatedDuration).toBe(300000);
      expect(workflow.metadata.resourceRequirements?.cpu).toBe('1000m');
      expect(workflow.metadata.resourceRequirements?.memory).toBe('512Mi');
      expect(workflow.metadata.resourceRequirements?.storage).toBe('10Gi');
      expect(workflow.metadata.resourceRequirements?.network).toBe('100Mbps');
      expect(workflow.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(workflow.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
      expect(workflow.lastExecutedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
  });
});