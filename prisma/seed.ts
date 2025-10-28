import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a default tenant for development
  const defaultTenantId = '00000000-0000-0000-0000-000000000001';

  // Create sample agents
  const agent1 = await prisma.agent.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'AI Assistant',
      description: 'General purpose AI assistant for customer support',
      version: '1.0.0',
      status: 'online',
      capabilities: ['llm', 'conversation', 'task_execution'],
      metadata: {
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.7,
      },
      tenantId: defaultTenantId,
    },
  });

  const agent2 = await prisma.agent.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Data Analyst',
      description: 'Specialized agent for data analysis and reporting',
      version: '1.0.0',
      status: 'online',
      capabilities: ['data_analysis', 'visualization', 'reporting'],
      metadata: {
        tools: ['pandas', 'matplotlib', 'sql'],
        maxDataSize: '1GB',
      },
      tenantId: defaultTenantId,
    },
  });

  // Create agent capabilities
  await prisma.agentCapability.createMany({
    data: [
      {
        agentId: agent1.id,
        name: 'conversation',
        description: 'Natural language conversation capabilities',
        type: 'llm',
        inputs: ['user_message', 'context'],
        outputs: ['response', 'confidence_score'],
      },
      {
        agentId: agent1.id,
        name: 'task_execution',
        description: 'Execute structured tasks and workflows',
        type: 'workflow',
        inputs: ['task_definition', 'parameters'],
        outputs: ['result', 'status'],
      },
      {
        agentId: agent2.id,
        name: 'data_analysis',
        description: 'Analyze structured and unstructured data',
        type: 'data',
        inputs: ['data_source', 'analysis_type'],
        outputs: ['insights', 'metrics'],
      },
    ],
    skipDuplicates: true,
  });

  // Create sample workflows
  const workflow1 = await prisma.workflow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Customer Support Flow',
      description: 'Automated customer support workflow',
      version: '1.0.0',
      status: 'active',
      definition: {
        nodes: [
          {
            id: 'start',
            type: 'trigger',
            config: { event: 'customer_message' },
          },
          {
            id: 'classify',
            type: 'llm',
            config: { model: 'gpt-4', prompt: 'Classify customer intent' },
          },
          {
            id: 'route',
            type: 'router',
            config: { rules: ['urgent', 'general', 'billing'] },
          },
        ],
        edges: [
          { from: 'start', to: 'classify' },
          { from: 'classify', to: 'route' },
        ],
      },
      metadata: {
        category: 'customer_support',
        priority: 'high',
      },
      tenantId: defaultTenantId,
    },
  });

  // Create sample MCP adapter
  await prisma.mcpAdapter.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'File System Adapter',
      type: 'filesystem',
      config: {
        rootPath: '/workspace',
        allowedExtensions: ['.txt', '.md', '.json'],
        maxFileSize: '10MB',
      },
      capabilities: ['read_file', 'write_file', 'list_directory'],
      status: 'connected',
      tenantId: defaultTenantId,
    },
  });

  // Create sample A2A broker
  const broker = await prisma.a2aBroker.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Main Message Broker',
      type: 'redis',
      config: {
        host: 'localhost',
        port: 6379,
        password: 'secret',
      },
      status: 'connected',
      connections: 5,
      messagesPerSecond: 100,
      tenantId: defaultTenantId,
    },
  });

  // Create sample A2A channel
  await prisma.a2aChannel.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'agent-communication',
      type: 'pubsub',
      config: {
        pattern: 'agent.*',
        retention: '24h',
      },
      subscribers: ['agent-1', 'agent-2', 'agent-3'],
      messageCount: 1250,
      lastMessageAt: new Date(),
      brokerId: broker.id,
      tenantId: defaultTenantId,
    },
  });

  // Create sample product feedback
  await prisma.productFeedback.createMany({
    data: [
      {
        tenantId: defaultTenantId,
        feedbackType: 'feature_request',
        priority: 'medium',
        status: 'new',
        title: 'Add dark mode support',
        description: 'The application would benefit from a dark mode theme option for better user experience during night usage.',
        context: {
          page: '/dashboard',
          feature: 'theme_switcher',
          userJourney: 'first_time_user',
        },
        metadata: {
          browser: 'Chrome 120',
          device: 'Desktop',
          screenResolution: '1920x1080',
        },
        sentimentScore: 0.8,
        urgencyScore: 0.6,
      },
      {
        tenantId: defaultTenantId,
        feedbackType: 'bug',
        priority: 'high',
        status: 'triaged',
        title: 'Login form not submitting on mobile',
        description: 'The login form freezes when trying to submit on mobile devices, specifically iOS Safari.',
        context: {
          page: '/login',
          feature: 'authentication',
          userJourney: 'returning_user',
        },
        metadata: {
          browser: 'Safari Mobile',
          device: 'iPhone 14',
          screenResolution: '390x844',
        },
        sentimentScore: -0.3,
        urgencyScore: 0.9,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${await prisma.agent.count()} agents`);
  console.log(`Created ${await prisma.workflow.count()} workflows`);
  console.log(`Created ${await prisma.mcpAdapter.count()} MCP adapters`);
  console.log(`Created ${await prisma.a2aBroker.count()} A2A brokers`);
  console.log(`Created ${await prisma.productFeedback.count()} feedback entries`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });