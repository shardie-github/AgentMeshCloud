/**
 * Zapier Adapter - ORCA Core
 * Normalizes Zapier webhooks/events to Mesh Event Contract
 */

import { createLogger } from '@/common/logger';
import { MeshEvent, EventType, AdapterType } from '@/common/types';
import { v4 as uuidv4 } from 'uuid';
import { withSpan } from '@/telemetry/tracer';

const logger = createLogger('adapter-zapier');

export interface ZapierWebhook {
  id: string;
  zap_id: string;
  trigger_type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Zapier Adapter
 * Transforms Zapier events to ORCA Mesh events
 */
export class ZapierAdapter {
  /**
   * Transform Zapier webhook to Mesh event
   */
  async transformToMeshEvent(webhook: ZapierWebhook): Promise<MeshEvent> {
    return withSpan('zapier_transform', async () => {
      logger.debug('Transforming Zapier webhook', { zap_id: webhook.zap_id });

      const event: MeshEvent = {
        event_id: uuidv4(),
        correlation_id: webhook.id,
        event_type: this.mapEventType(webhook.trigger_type),
        source: {
          adapter: AdapterType.ZAPIER,
          agent_id: webhook.zap_id,
          integration_type: 'zapier',
        },
        timestamp: new Date(webhook.timestamp),
        version: '1.0.0',
        data: webhook.data,
        telemetry: {
          trace_id: uuidv4(),
        },
      };

      logger.info('Zapier webhook transformed', { event_id: event.event_id });

      return event;
    });
  }

  /**
   * Map Zapier trigger type to Mesh event type
   */
  private mapEventType(triggerType: string): EventType | string {
    const typeMap: Record<string, EventType> = {
      'workflow.started': EventType.WORKFLOW_STARTED,
      'workflow.completed': EventType.WORKFLOW_COMPLETED,
      'workflow.failed': EventType.WORKFLOW_FAILED,
      'data.synced': EventType.DATA_SYNCHRONIZED,
    };

    return typeMap[triggerType] || triggerType;
  }

  /**
   * Validate webhook signature
   */
  validateSignature(payload: string, signature: string, secret: string): boolean {
    // HMAC signature validation
    // In production, use crypto.createHmac
    return true; // Simplified
  }
}

export const zapierAdapter = new ZapierAdapter();
