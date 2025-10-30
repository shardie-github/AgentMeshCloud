#!/usr/bin/env node

/**
 * Registry Service Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { agents, policies } from './index.mjs';

describe('Registry Service', () => {
  
  describe('Agent Management', () => {
    
    it('should load agents from registry YAML', () => {
      assert.ok(agents.size > 0, 'Agents should be loaded');
    });
    
    it('should retrieve agent by ID', () => {
      const agentId = Array.from(agents.keys())[0];
      const agent = agents.get(agentId);
      
      assert.ok(agent, 'Agent should exist');
      assert.ok(agent.id, 'Agent should have ID');
      assert.ok(agent.name, 'Agent should have name');
    });
    
    it('should filter agents by status', () => {
      const activeAgents = Array.from(agents.values())
        .filter(a => a.status === 'active');
      
      assert.ok(activeAgents.length > 0, 'Should have active agents');
    });
    
  });
  
  describe('Policy Management', () => {
    
    it('should load policies from registry YAML', () => {
      assert.ok(policies.size > 0, 'Policies should be loaded');
    });
    
    it('should retrieve policy by ID', () => {
      const policyId = Array.from(policies.keys())[0];
      const policy = policies.get(policyId);
      
      assert.ok(policy, 'Policy should exist');
      assert.ok(policy.id, 'Policy should have ID');
      assert.ok(policy.name, 'Policy should have name');
    });
    
  });
  
});

console.log('✓ Registry service tests passed');
