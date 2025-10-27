/**
 * Agent Registry Edge Function
 * Handles agent registration, discovery, and lifecycle management
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRegistrationRequest {
  name: string;
  description: string;
  version: string;
  capabilities: any[];
  metadata: any;
}

interface AgentUpdateRequest {
  name?: string;
  description?: string;
  version?: string;
  capabilities?: any[];
  metadata?: any;
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
    if (method === 'GET' && path.endsWith('/agents')) {
      // List agents
      const { data: agents, error } = await supabaseClient
        .from('agents')
        .select(`
          *,
          agent_capabilities(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ agents }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && path.endsWith('/agents')) {
      // Register new agent
      const body: AgentRegistrationRequest = await req.json();
      
      const { data: agent, error } = await supabaseClient
        .from('agents')
        .insert({
          name: body.name,
          description: body.description,
          version: body.version,
          capabilities: body.capabilities,
          metadata: body.metadata,
          tenant_id: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Insert capabilities
      if (body.capabilities && body.capabilities.length > 0) {
        const capabilities = body.capabilities.map(cap => ({
          agent_id: agent.id,
          name: cap.name,
          description: cap.description,
          type: cap.type,
          inputs: cap.inputs || [],
          outputs: cap.outputs || [],
          constraints: cap.constraints || [],
        }));

        const { error: capError } = await supabaseClient
          .from('agent_capabilities')
          .insert(capabilities);

        if (capError) {
          throw capError;
        }
      }

      return new Response(
        JSON.stringify({ agent }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'GET' && path.includes('/agents/')) {
      // Get specific agent
      const agentId = path.split('/agents/')[1];
      
      const { data: agent, error } = await supabaseClient
        .from('agents')
        .select(`
          *,
          agent_capabilities(*)
        `)
        .eq('id', agentId)
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ agent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'PUT' && path.includes('/agents/')) {
      // Update agent
      const agentId = path.split('/agents/')[1];
      const body: AgentUpdateRequest = await req.json();
      
      const { data: agent, error } = await supabaseClient
        .from('agents')
        .update({
          name: body.name,
          description: body.description,
          version: body.version,
          capabilities: body.capabilities,
          metadata: body.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update capabilities if provided
      if (body.capabilities) {
        // Delete existing capabilities
        await supabaseClient
          .from('agent_capabilities')
          .delete()
          .eq('agent_id', agentId);

        // Insert new capabilities
        const capabilities = body.capabilities.map(cap => ({
          agent_id: agentId,
          name: cap.name,
          description: cap.description,
          type: cap.type,
          inputs: cap.inputs || [],
          outputs: cap.outputs || [],
          constraints: cap.constraints || [],
        }));

        const { error: capError } = await supabaseClient
          .from('agent_capabilities')
          .insert(capabilities);

        if (capError) {
          throw capError;
        }
      }

      return new Response(
        JSON.stringify({ agent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'DELETE' && path.includes('/agents/')) {
      // Delete agent
      const agentId = path.split('/agents/')[1];
      
      const { error } = await supabaseClient
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ message: 'Agent deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && path.includes('/agents/') && path.endsWith('/heartbeat')) {
      // Update agent heartbeat
      const agentId = path.split('/agents/')[1].replace('/heartbeat', '');
      
      const { error } = await supabaseClient
        .from('agents')
        .update({
          last_seen_at: new Date().toISOString(),
          status: 'online',
        })
        .eq('id', agentId);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ message: 'Heartbeat updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && path.includes('/agents/') && path.endsWith('/status')) {
      // Update agent status
      const agentId = path.split('/agents/')[1].replace('/status', '');
      const body = await req.json();
      
      const { error } = await supabaseClient
        .from('agents')
        .update({
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ message: 'Status updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Discovery endpoint
    if (method === 'POST' && path.endsWith('/discover')) {
      const body = await req.json();
      const { agentType, capabilities, status, tags, limit = 10 } = body;
      
      let query = supabaseClient
        .from('agents')
        .select(`
          *,
          agent_capabilities(*)
        `)
        .limit(limit);

      if (agentType) {
        query = query.eq('metadata->>category', agentType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('metadata->tags', tags);
      }

      if (capabilities && capabilities.length > 0) {
        query = query.contains('capabilities', capabilities);
      }

      const { data: agents, error } = await query;

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ agents, total: agents.length }),
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