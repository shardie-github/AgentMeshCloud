/**
 * Pact Contract: UI Consumer → ORCA API Provider
 * Defines expected interactions from frontend
 */

export const uiConsumerPact = {
  consumer: { name: 'orca-ui' },
  provider: { name: 'orca-api' },
  interactions: [
    {
      state: 'trust metrics exist',
      uponReceiving: 'a request for trust metrics',
      withRequest: {
        method: 'GET',
        path: '/trust',
        headers: {
          'Authorization': 'Bearer TOKEN'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          timestamp: '2025-10-31T00:00:00Z',
          kpis: {
            trust_score: 85.5,
            risk_avoided_usd: 62000,
            sync_freshness_pct: 95.2,
            drift_rate_pct: 3.8,
            compliance_sla_pct: 99.1
          }
        }
      }
    },
    {
      state: 'agents exist',
      uponReceiving: 'a request to list agents',
      withRequest: {
        method: 'GET',
        path: '/agents',
        headers: {
          'Authorization': 'Bearer TOKEN'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          total: 10,
          agents: [
            {
              id: 'agent-1',
              name: 'Customer Support Bot',
              type: 'chatbot',
              status: 'active',
              trust_level: 85
            }
          ]
        }
      }
    },
    {
      state: 'kpi definitions exist',
      uponReceiving: 'a request for KPI definitions',
      withRequest: {
        method: 'GET',
        path: '/kpi/definitions',
        headers: {
          'Authorization': 'Bearer TOKEN'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          count: 10,
          kpis: {
            trust_score: {
              name: 'Trust Score',
              unit: 'percentage',
              sla: {
                target: 85
              }
            }
          }
        }
      }
    },
    {
      state: 'roi calculation available',
      uponReceiving: 'a request to calculate ROI',
      withRequest: {
        method: 'POST',
        path: '/kpi/roi',
        headers: {
          'Authorization': 'Bearer TOKEN',
          'Content-Type': 'application/json'
        },
        body: {
          kpi_values: {
            trust_score: 85
          },
          tenant_tier: 'pro'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          total_monthly_roi: 85000,
          annualized_roi: 1020000,
          by_category: {
            revenue_protection: 85000
          }
        }
      }
    }
  ],
  metadata: {
    pactSpecification: {
      version: '2.0.0'
    }
  }
};

// Export for Pact verification
export default uiConsumerPact;
