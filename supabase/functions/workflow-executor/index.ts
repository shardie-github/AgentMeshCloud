/**
 * Workflow Executor Edge Function
 * Handles workflow execution and orchestration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowExecutionRequest {
  workflowId: string;
  inputs: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: any;
  agentId?: string;
  capabilities?: string[];
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: any[];
  variables: any[];
  triggers: any[];
  settings: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Route handling
    if (method === 'POST' && path.endsWith('/execute')) {
      // Execute workflow
      const body: WorkflowExecutionRequest = await req.json();
      
      // Get workflow definition
      const { data: workflow, error: workflowError } = await supabaseClient
        .from('workflows')
        .select('*')
        .eq('id', body.workflowId)
        .single();

      if (workflowError || !workflow) {
        return new Response(
          JSON.stringify({ error: 'Workflow not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create execution record
      const { data: execution, error: execError } = await supabaseClient
        .from('workflow_executions')
        .insert({
          workflow_id: body.workflowId,
          status: 'pending',
          inputs: body.inputs,
          tenant_id: user.id,
        })
        .select()
        .single();

      if (execError) {
        throw execError;
      }

      // Start execution asynchronously
      executeWorkflow(execution.id, workflow.definition, body.inputs, supabaseClient);

      return new Response(
        JSON.stringify({ execution }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'GET' && path.includes('/executions/')) {
      // Get execution status
      const executionId = path.split('/executions/')[1];
      
      const { data: execution, error } = await supabaseClient
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ execution }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'GET' && path.endsWith('/executions')) {
      // List executions
      const { data: executions, error } = await supabaseClient
        .from('workflow_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ executions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && path.includes('/executions/') && path.endsWith('/cancel')) {
      // Cancel execution
      const executionId = path.split('/executions/')[1].replace('/cancel', '');
      
      const { error } = await supabaseClient
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ message: 'Execution cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Workflow execution logic
async function executeWorkflow(
  executionId: string,
  definition: WorkflowDefinition,
  inputs: Record<string, any>,
  supabaseClient: any
) {
  try {
    // Update execution status to running
    await supabaseClient
      .from('workflow_executions')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    const startTime = Date.now();
    const logs: any[] = [];
    const nodeResults: Record<string, any> = {};

    // Execute nodes in topological order
    const sortedNodes = topologicalSort(definition.nodes, definition.edges);
    
    for (const node of sortedNodes) {
      try {
        const result = await executeNode(node, inputs, nodeResults, supabaseClient);
        nodeResults[node.id] = result;
        
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Node ${node.name} executed successfully`,
          nodeId: node.id,
        });
      } catch (error) {
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Node ${node.name} failed: ${error.message}`,
          nodeId: node.id,
        });

        // Handle error based on workflow settings
        const errorHandling = definition.settings?.errorHandling || 'stop';
        if (errorHandling === 'stop') {
          throw error;
        } else if (errorHandling === 'continue') {
          continue;
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Update execution with results
    await supabaseClient
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration,
        outputs: nodeResults,
        logs,
        metrics: {
          totalNodes: definition.nodes.length,
          completedNodes: Object.keys(nodeResults).length,
          failedNodes: definition.nodes.length - Object.keys(nodeResults).length,
          totalLatency: duration,
          averageLatency: duration / definition.nodes.length,
        },
      })
      .eq('id', executionId);

  } catch (error) {
    // Update execution with error
    await supabaseClient
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Workflow execution failed: ${error.message}`,
          },
        ],
      })
      .eq('id', executionId);
  }
}

// Execute a single workflow node
async function executeNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>,
  supabaseClient: any
): Promise<any> {
  switch (node.type) {
    case 'agent':
      return await executeAgentNode(node, inputs, nodeResults, supabaseClient);
    case 'condition':
      return await executeConditionNode(node, inputs, nodeResults);
    case 'parallel':
      return await executeParallelNode(node, inputs, nodeResults, supabaseClient);
    case 'merge':
      return await executeMergeNode(node, inputs, nodeResults);
    case 'delay':
      return await executeDelayNode(node, inputs, nodeResults);
    case 'webhook':
      return await executeWebhookNode(node, inputs, nodeResults);
    case 'data_transform':
      return await executeDataTransformNode(node, inputs, nodeResults);
    case 'notification':
      return await executeNotificationNode(node, inputs, nodeResults);
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

// Execute agent node
async function executeAgentNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>,
  supabaseClient: any
): Promise<any> {
  if (!node.agentId) {
    throw new Error('Agent ID is required for agent nodes');
  }

  // Get agent details
  const { data: agent, error } = await supabaseClient
    .from('agents')
    .select('*')
    .eq('id', node.agentId)
    .single();

  if (error || !agent) {
    throw new Error('Agent not found');
  }

  if (agent.status !== 'online') {
    throw new Error('Agent is not online');
  }

  // Prepare agent inputs
  const agentInputs = { ...inputs, ...node.config.inputs };
  
  // Call agent (this would typically be an HTTP request to the agent)
  // For now, we'll simulate the response
  const response = {
    success: true,
    data: agentInputs,
    timestamp: new Date().toISOString(),
  };

  return response;
}

// Execute condition node
async function executeConditionNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>
): Promise<any> {
  const condition = node.config.condition;
  if (!condition) {
    throw new Error('Condition is required for condition nodes');
  }

  // Evaluate condition (simplified)
  const result = evaluateCondition(condition, inputs, nodeResults);
  
  return {
    condition: condition,
    result: result,
    timestamp: new Date().toISOString(),
  };
}

// Execute parallel node
async function executeParallelNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>,
  supabaseClient: any
): Promise<any> {
  const parallelNodes = node.config.nodes || [];
  const results = await Promise.all(
    parallelNodes.map(async (parallelNode: WorkflowNode) => {
      return await executeNode(parallelNode, inputs, nodeResults, supabaseClient);
    })
  );

  return {
    results,
    timestamp: new Date().toISOString(),
  };
}

// Execute merge node
async function executeMergeNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>
): Promise<any> {
  const mergeStrategy = node.config.strategy || 'concat';
  const inputNodes = node.config.inputNodes || [];
  
  const values = inputNodes.map((nodeId: string) => nodeResults[nodeId]).filter(Boolean);
  
  let result;
  switch (mergeStrategy) {
    case 'concat':
      result = values.flat();
      break;
    case 'merge':
      result = Object.assign({}, ...values);
      break;
    case 'sum':
      result = values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      break;
    default:
      result = values;
  }

  return {
    strategy: mergeStrategy,
    result,
    timestamp: new Date().toISOString(),
  };
}

// Execute delay node
async function executeDelayNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>
): Promise<any> {
  const delay = node.config.delay || 1000; // Default 1 second
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return {
    delay,
    timestamp: new Date().toISOString(),
  };
}

// Execute webhook node
async function executeWebhookNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>
): Promise<any> {
  const url = node.config.url;
  const method = node.config.method || 'POST';
  const headers = node.config.headers || {};
  const body = node.config.body || inputs;

  if (!url) {
    throw new Error('URL is required for webhook nodes');
  }

  // Make HTTP request (simplified)
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return {
    url,
    method,
    status: response.status,
    data,
    timestamp: new Date().toISOString(),
  };
}

// Execute data transform node
async function executeDataTransformNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>
): Promise<any> {
  const transform = node.config.transform;
  if (!transform) {
    throw new Error('Transform is required for data transform nodes');
  }

  // Apply transformation (simplified)
  const result = applyTransform(transform, inputs, nodeResults);

  return {
    transform,
    result,
    timestamp: new Date().toISOString(),
  };
}

// Execute notification node
async function executeNotificationNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  nodeResults: Record<string, any>
): Promise<any> {
  const message = node.config.message || 'Workflow notification';
  const channels = node.config.channels || ['email'];

  // Send notification (simplified)
  const result = {
    message,
    channels,
    sent: true,
    timestamp: new Date().toISOString(),
  };

  return result;
}

// Helper functions
function topologicalSort(nodes: WorkflowNode[], edges: any[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const inDegree = new Map(nodes.map(node => [node.id, 0]));
  const graph = new Map(nodes.map(node => [node.id, []]));

  // Build graph and calculate in-degrees
  for (const edge of edges) {
    const source = edge.source;
    const target = edge.target;
    
    if (graph.has(source) && graph.has(target)) {
      graph.get(source)!.push(target);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  // Find nodes with no incoming edges
  const queue = nodes.filter(node => inDegree.get(node.id) === 0);
  const result: WorkflowNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of graph.get(node.id) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        const neighborNode = nodeMap.get(neighbor);
        if (neighborNode) {
          queue.push(neighborNode);
        }
      }
    }
  }

  return result;
}

function evaluateCondition(condition: string, inputs: Record<string, any>, nodeResults: Record<string, any>): boolean {
  // Simplified condition evaluation
  // In a real implementation, this would use a proper expression evaluator
  try {
    // Replace variables with actual values
    let expr = condition;
    for (const [key, value] of Object.entries(inputs)) {
      expr = expr.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
    }
    for (const [key, value] of Object.entries(nodeResults)) {
      expr = expr.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
    }
    
    // Evaluate the expression (simplified)
    return eval(expr);
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

function applyTransform(transform: any, inputs: Record<string, any>, nodeResults: Record<string, any>): any {
  // Simplified transformation
  // In a real implementation, this would use a proper transformation engine
  try {
    const context = { ...inputs, ...nodeResults };
    return transform(context);
  } catch (error) {
    console.error('Error applying transform:', error);
    return inputs;
  }
}