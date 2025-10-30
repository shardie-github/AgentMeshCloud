#!/usr/bin/env tsx
import 'dotenv/config';
import { createContextBus } from '../src/context-bus/context_bus.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding database...');

  const contextBus = createContextBus({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/orcamesh',
  });

  try {
    // Create sample agents
    console.log('Creating sample agents...');
    
    const mcpAgent = await contextBus.createAgent({
      name: 'filesystem-mcp',
      type: 'mcp',
      owner: 'system',
      model: 'npx @modelcontextprotocol/server-filesystem',
      access_tier: 'standard',
      trust_level: 0.85,
      metadata: {
        capabilities: ['read', 'write', 'list'],
        description: 'MCP server for filesystem operations',
      },
    });

    const zapierAgent = await contextBus.createAgent({
      name: 'zapier-adapter',
      type: 'zapier',
      owner: 'system',
      access_tier: 'standard',
      trust_level: 0.75,
      metadata: {
        adapter_version: '1.0.0',
      },
    });

    const n8nAgent = await contextBus.createAgent({
      name: 'n8n-adapter',
      type: 'n8n',
      owner: 'system',
      access_tier: 'standard',
      trust_level: 0.78,
      metadata: {
        adapter_version: '1.0.0',
      },
    });

    console.log(`✅ Created 3 agents`);

    // Create sample workflows
    console.log('Creating sample workflows...');

    const zapierWorkflow = await contextBus.createWorkflow({
      name: 'gmail-to-slack',
      source: 'zapier',
      trigger: 'webhook',
      status: 'active',
      last_run_at: new Date(),
      metadata: {
        description: 'Forward Gmail messages to Slack',
      },
    });

    const n8nWorkflow = await contextBus.createWorkflow({
      name: 'github-to-notion',
      source: 'n8n',
      trigger: 'webhook',
      status: 'active',
      last_run_at: new Date(),
      metadata: {
        description: 'Sync GitHub issues to Notion database',
      },
    });

    console.log(`✅ Created 2 workflows`);

    // Create sample events and telemetry
    console.log('Creating sample events and telemetry...');

    const now = new Date();
    const agents = [mcpAgent, zapierAgent, n8nAgent];
    const workflows = [zapierWorkflow, n8nWorkflow];

    // Generate 50 telemetry records
    for (let i = 0; i < 50; i++) {
      const agent = agents[i % agents.length];
      if (!agent) continue;
      const baseTime = new Date(now.getTime() - (50 - i) * 60 * 60 * 1000); // Hourly intervals
      
      await contextBus.createTelemetry({
        agent_id: agent.id,
        ts: baseTime,
        latency_ms: Math.floor(Math.random() * 500) + 100,
        errors: Math.random() > 0.9 ? 1 : 0, // 10% error rate
        policy_violations: Math.random() > 0.95 ? 1 : 0, // 5% violation rate
        success_count: Math.random() > 0.9 ? 0 : 1, // 90% success rate
        metadata: {
          sample: true,
        },
      });
    }

    console.log(`✅ Created 50 telemetry records`);

    // Generate 30 events
    for (let i = 0; i < 30; i++) {
      const workflow = workflows[i % workflows.length];
      if (!workflow) continue;
      const baseTime = new Date(now.getTime() - (30 - i) * 2 * 60 * 60 * 1000); // 2-hour intervals
      
      await contextBus.createEvent({
        workflow_id: workflow.id,
        ts: baseTime,
        kind: i % 10 === 0 ? 'error' : 'execution',
        correlation_id: uuidv4(),
        idempotency_key: uuidv4(),
        payload: {
          sample: true,
          event_number: i + 1,
          status: i % 10 === 0 ? 'error' : 'success',
        },
      });
    }

    console.log(`✅ Created 30 events`);

    // Create initial metrics snapshot
    console.log('Creating initial metrics snapshot...');

    await contextBus.createMetric({
      ts: now,
      trust_score: 0.8245,
      risk_avoided_usd: 2450.50,
      sync_freshness_pct: 95.5,
      drift_rate_pct: 2.1,
      compliance_sla_pct: 99.2,
      active_agents: 3,
      active_workflows: 2,
      total_events: 30,
      metadata: {
        seed: true,
      },
    });

    console.log(`✅ Created metrics snapshot`);

    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await contextBus.close();
  }
}

seed().catch(console.error);
