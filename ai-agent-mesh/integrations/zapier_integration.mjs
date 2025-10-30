/**
 * Zapier Integration for AI-Agent Mesh
 * Enables no-code automation with 5000+ apps
 * 
 * @module ZapierIntegration
 * @version 3.0.0
 */

export const ZapierIntegration = {
  // Zapier Platform Configuration
  version: '3.0.0',
  platformVersion: '14.1.0',

  // Authentication
  authentication: {
    type: 'custom',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        required: true,
        type: 'string',
        helpText: 'Get your API key from AI-Agent Mesh dashboard'
      }
    ],
    test: {
      url: 'https://api.ai-agent-mesh.com/v3/account/limits',
      headers: {
        'Authorization': 'Bearer {{bundle.authData.apiKey}}'
      }
    },
    connectionLabel: '{{bundle.authData.tenant_id}}'
  },

  // Triggers (Events that start Zaps)
  triggers: {
    agent_created: {
      key: 'agent_created',
      noun: 'Agent',
      display: {
        label: 'Agent Created',
        description: 'Triggers when a new AI agent is created'
      },
      operation: {
        type: 'polling',
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/agents',
          params: {
            limit: 100,
            created_after: '{{bundle.meta.time_checked}}'
          }
        },
        sample: {
          id: 'agent_123',
          name: 'Customer Support Agent',
          type: 'conversational',
          status: 'active',
          createdAt: '2025-10-30T10:00:00Z'
        }
      }
    },

    workflow_completed: {
      key: 'workflow_completed',
      noun: 'Workflow',
      display: {
        label: 'Workflow Completed',
        description: 'Triggers when a workflow execution completes'
      },
      operation: {
        type: 'hook',
        performSubscribe: {
          url: 'https://api.ai-agent-mesh.com/v3/webhooks',
          method: 'POST',
          body: {
            url: '{{bundle.targetUrl}}',
            events: ['workflow.completed']
          }
        },
        performUnsubscribe: {
          url: 'https://api.ai-agent-mesh.com/v3/webhooks/{{bundle.subscribeData.id}}',
          method: 'DELETE'
        },
        perform: {
          url: '{{bundle.cleanedRequest.callback_url}}'
        },
        sample: {
          workflowId: 'wf_123',
          agentId: 'agent_123',
          status: 'success',
          output: {
            result: 'Workflow completed successfully'
          },
          executedAt: '2025-10-30T10:00:00Z',
          duration: 1500
        }
      }
    },

    policy_violated: {
      key: 'policy_violated',
      noun: 'Policy Violation',
      display: {
        label: 'Policy Violated',
        description: 'Triggers when a governance policy is violated',
        important: true
      },
      operation: {
        type: 'hook',
        performSubscribe: {
          url: 'https://api.ai-agent-mesh.com/v3/webhooks',
          method: 'POST',
          body: {
            url: '{{bundle.targetUrl}}',
            events: ['policy.violated']
          }
        },
        performUnsubscribe: {
          url: 'https://api.ai-agent-mesh.com/v3/webhooks/{{bundle.subscribeData.id}}',
          method: 'DELETE'
        },
        sample: {
          agentId: 'agent_123',
          agentName: 'Support Agent',
          policyName: 'GDPR Compliance',
          severity: 'high',
          details: 'PII data accessed without consent',
          timestamp: '2025-10-30T10:00:00Z'
        }
      }
    },

    health_alert: {
      key: 'health_alert',
      noun: 'Health Alert',
      display: {
        label: 'Agent Health Alert',
        description: 'Triggers when agent health drops below threshold'
      },
      operation: {
        type: 'hook',
        performSubscribe: {
          url: 'https://api.ai-agent-mesh.com/v3/webhooks',
          method: 'POST',
          body: {
            url: '{{bundle.targetUrl}}',
            events: ['agent.health_alert']
          }
        },
        performUnsubscribe: {
          url: 'https://api.ai-agent-mesh.com/v3/webhooks/{{bundle.subscribeData.id}}',
          method: 'DELETE'
        },
        sample: {
          agentId: 'agent_123',
          healthScore: 45,
          status: 'at_risk',
          issues: ['High error rate', 'Low response time'],
          timestamp: '2025-10-30T10:00:00Z'
        }
      }
    }
  },

  // Actions (Operations that Zaps can perform)
  actions: {
    create_agent: {
      key: 'create_agent',
      noun: 'Agent',
      display: {
        label: 'Create Agent',
        description: 'Creates a new AI agent'
      },
      operation: {
        inputFields: [
          {
            key: 'name',
            label: 'Agent Name',
            type: 'string',
            required: true
          },
          {
            key: 'type',
            label: 'Agent Type',
            type: 'string',
            choices: ['conversational', 'support', 'sales', 'analytics'],
            required: true
          },
          {
            key: 'config',
            label: 'Configuration (JSON)',
            type: 'text',
            required: false,
            helpText: 'JSON object with agent configuration'
          }
        ],
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/agents',
          method: 'POST',
          body: {
            name: '{{bundle.inputData.name}}',
            type: '{{bundle.inputData.type}}',
            config: '{{bundle.inputData.config}}',
            status: 'active'
          }
        },
        sample: {
          id: 'agent_123',
          name: 'New Agent',
          type: 'conversational',
          status: 'active'
        }
      }
    },

    execute_workflow: {
      key: 'execute_workflow',
      noun: 'Workflow',
      display: {
        label: 'Execute Workflow',
        description: 'Executes a specific workflow'
      },
      operation: {
        inputFields: [
          {
            key: 'workflow_id',
            label: 'Workflow ID',
            type: 'string',
            required: true,
            dynamic: 'list_workflows.id.name'
          },
          {
            key: 'input',
            label: 'Input Data (JSON)',
            type: 'text',
            required: false
          }
        ],
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/workflows/{{bundle.inputData.workflow_id}}/execute',
          method: 'POST',
          body: {
            input: '{{bundle.inputData.input}}'
          }
        },
        sample: {
          id: 'exec_123',
          workflowId: 'wf_123',
          status: 'success',
          output: {}
        }
      }
    },

    apply_policy: {
      key: 'apply_policy',
      noun: 'Policy',
      display: {
        label: 'Apply Policy',
        description: 'Applies a governance policy to an agent'
      },
      operation: {
        inputFields: [
          {
            key: 'agent_id',
            label: 'Agent ID',
            type: 'string',
            required: true,
            dynamic: 'list_agents.id.name'
          },
          {
            key: 'policy_name',
            label: 'Policy Name',
            type: 'string',
            required: true
          },
          {
            key: 'framework',
            label: 'Framework',
            type: 'string',
            choices: ['GDPR', 'HIPAA', 'SOC2', 'Custom'],
            required: true
          },
          {
            key: 'rules',
            label: 'Rules (JSON)',
            type: 'text',
            required: true
          }
        ],
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/agents/{{bundle.inputData.agent_id}}/policies',
          method: 'POST',
          body: {
            name: '{{bundle.inputData.policy_name}}',
            framework: '{{bundle.inputData.framework}}',
            rules: '{{bundle.inputData.rules}}',
            enforcement_mode: 'enforce'
          }
        }
      }
    },

    get_telemetry: {
      key: 'get_telemetry',
      noun: 'Telemetry',
      display: {
        label: 'Get Telemetry',
        description: 'Retrieves telemetry data for an agent'
      },
      operation: {
        inputFields: [
          {
            key: 'agent_id',
            label: 'Agent ID',
            type: 'string',
            required: true
          },
          {
            key: 'event_type',
            label: 'Event Type',
            type: 'string',
            required: false
          }
        ],
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/agents/{{bundle.inputData.agent_id}}/telemetry',
          method: 'GET',
          params: {
            event_type: '{{bundle.inputData.event_type}}'
          }
        }
      }
    }
  },

  // Searches (Lookups for dropdown fields)
  searches: {
    list_agents: {
      key: 'list_agents',
      noun: 'Agent',
      display: {
        label: 'Find Agent',
        description: 'Finds an agent by name or ID'
      },
      operation: {
        inputFields: [
          {
            key: 'search',
            label: 'Search',
            type: 'string',
            required: false
          }
        ],
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/agents',
          params: {
            search: '{{bundle.inputData.search}}'
          }
        }
      }
    },

    list_workflows: {
      key: 'list_workflows',
      noun: 'Workflow',
      display: {
        label: 'Find Workflow',
        description: 'Finds a workflow by name or ID'
      },
      operation: {
        perform: {
          url: 'https://api.ai-agent-mesh.com/v3/workflows'
        }
      }
    }
  }
};

// Usage examples for Zapier integration
export const useCases = [
  {
    name: 'Lead Qualification Pipeline',
    description: 'When form submitted → Create agent → Qualify lead → Update CRM',
    trigger: 'Typeform (New Entry)',
    actions: [
      'AI-Agent Mesh (Create Agent)',
      'AI-Agent Mesh (Execute Workflow)',
      'Salesforce (Create Lead)'
    ]
  },
  {
    name: 'Customer Support Automation',
    description: 'When ticket created → Execute support agent → Send response → Close ticket',
    trigger: 'Zendesk (New Ticket)',
    actions: [
      'AI-Agent Mesh (Execute Workflow)',
      'Zendesk (Reply to Ticket)',
      'Slack (Send Message)'
    ]
  },
  {
    name: 'Policy Compliance Alerting',
    description: 'When policy violated → Send alert → Create incident → Notify team',
    trigger: 'AI-Agent Mesh (Policy Violated)',
    actions: [
      'PagerDuty (Create Incident)',
      'Slack (Send Channel Message)',
      'Email (Send Email)'
    ]
  }
];

export default ZapierIntegration;
