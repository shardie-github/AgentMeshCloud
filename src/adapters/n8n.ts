import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ContextBus } from '../context-bus/context_bus.js';
import { RegistryService } from '../registry/registry.service.js';

export interface N8NWebhookPayload {
  workflow_id?: string;
  workflow_name?: string;
  execution_id?: string;
  event?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export class N8NAdapter {
  private contextBus: ContextBus;
  private registry: RegistryService;

  constructor(contextBus: ContextBus, registry: RegistryService) {
    this.contextBus = contextBus;
    this.registry = registry;
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as N8NWebhookPayload;
      const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || uuidv4();

      // Normalize to mesh event schema
      const meshEvent = {
        source: 'n8n',
        event_type: payload.event || 'webhook',
        workflow_id: payload.workflow_id,
        workflow_name: payload.workflow_name,
        execution_id: payload.execution_id,
        timestamp: payload.timestamp || new Date().toISOString(),
        data: payload.data || {},
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
      };

      // Ensure agent exists
      const agents = await this.contextBus.getAgents();
      let n8nAgent = agents.find(a => a.name === 'n8n-adapter' && a.type === 'n8n');

      if (!n8nAgent) {
        n8nAgent = await this.registry.registerAgent({
          name: 'n8n-adapter',
          type: 'n8n',
          owner: 'system',
          access_tier: 'standard',
          trust_level: 0.75,
          metadata: {
            adapter_version: '1.0.0',
          },
        });
      }

      // Ensure workflow exists
      const workflows = await this.contextBus.getWorkflows();
      let workflow = workflows.find(
        w => w.source === 'n8n' && w.name === (payload.workflow_name || 'unnamed-workflow')
      );

      if (!workflow) {
        workflow = await this.registry.registerWorkflow({
          name: payload.workflow_name || 'unnamed-workflow',
          source: 'n8n',
          trigger: 'webhook',
          status: 'active',
          metadata: {
            workflow_id: payload.workflow_id,
            execution_id: payload.execution_id,
          },
        });
      } else {
        // Update last run timestamp
        await this.registry.updateWorkflowStatus(workflow.id, 'active');
      }

      // Store event
      await this.contextBus.createEvent({
        workflow_id: workflow.id,
        ts: new Date(),
        kind: 'webhook',
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        payload: meshEvent,
      });

      // Record telemetry
      await this.contextBus.createTelemetry({
        agent_id: n8nAgent.id,
        ts: new Date(),
        latency_ms: 0,
        errors: 0,
        policy_violations: 0,
        success_count: 1,
        metadata: {
          event: payload.event,
          execution_id: payload.execution_id,
        },
      });

      res.status(200).json({
        status: 'success',
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        message: 'n8n webhook processed',
      });
    } catch (error) {
      console.error('n8n webhook error:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
