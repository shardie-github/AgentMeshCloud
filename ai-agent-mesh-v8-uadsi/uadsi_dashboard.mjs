#!/usr/bin/env node
/**
 * UADSI Trust Intelligence Dashboard
 * Next.js/React component for real-time trust visualization
 * Exportable as standalone or embeddable widget
 */

export const UadsiDashboardComponent = `
'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral: '#6B7280'
};

export function UadsiDashboard({ apiUrl, apiKey }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDashboard();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(\`\${apiUrl}/v1/reports/dashboard\`, {
        headers: {
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      
      const data = await response.json();
      setDashboard(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading UADSI Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, agents, workflows, synchronization, risk, compliance, recommendations } = dashboard;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">UADSI Trust Intelligence</h1>
            <p className="text-gray-600 mt-1">Real-time agent diagnostics & synchronization monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchDashboard}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <TrustScoreCard score={summary.trust_score} />
        <RiskAvoidedCard amount={summary.risk_avoided_usd} />
        <ComplianceSLACard percentage={summary.compliance_sla_pct} />
        <SyncFreshnessCard percentage={summary.sync_freshness_pct} />
        <AgentCountCard count={summary.total_agents} healthy={agents.healthy} />
        <WorkflowCountCard count={summary.total_workflows} healthy={workflows.healthy} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AgentHealthChart data={agents} />
        <WorkflowStatusChart data={workflows} />
        <SyncDriftChart data={synchronization} />
        <RiskBreakdownChart data={risk} />
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <RecommendationsPanel recommendations={recommendations} />
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Last updated: {new Date(dashboard.generated_at).toLocaleString()}</p>
        <p className="mt-1">UADSI v1.0 - Unified Agent Diagnostics & Synchronization Intelligence</p>
      </div>
    </div>
  );
}

function TrustScoreCard({ score }) {
  const getColor = (score) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 85) return 'bg-blue-500';
    if (score >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatus = (score) => {
    if (score >= 95) return 'Excellent';
    if (score >= 85) return 'Good';
    if (score >= 75) return 'Fair';
    return 'Critical';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Trust Score (TS)</h3>
        <span className={\`px-3 py-1 rounded-full text-white text-sm \${getColor(score)}\`}>
          {getStatus(score)}
        </span>
      </div>
      <div className="text-4xl font-bold text-gray-900 mb-2">
        {score.toFixed(1)}%
      </div>
      <div className="relative pt-1">
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: \`\${score}%\` }}
            className={\`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center \${getColor(score)}\`}
          ></div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-3">Target: ≥95% | Industry Avg: 82%</p>
    </div>
  );
}

function RiskAvoidedCard({ amount }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Risk Avoided (RA$)</h3>
        <div className="text-green-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      <div className="text-4xl font-bold text-green-600 mb-2">
        ${(amount / 1000000).toFixed(2)}M
      </div>
      <p className="text-sm text-gray-600">Annualized cost of incidents prevented</p>
      <p className="text-xs text-gray-500 mt-2">Target: ≥$1M per 100 agents</p>
    </div>
  );
}

function ComplianceSLACard({ percentage }) {
  const isCompliant = percentage >= 99;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Compliance SLA</h3>
        <span className={\`px-3 py-1 rounded-full text-white text-sm \${isCompliant ? 'bg-green-500' : 'bg-red-500'}\`}>
          {isCompliant ? 'PASS' : 'FAIL'}
        </span>
      </div>
      <div className="text-4xl font-bold text-gray-900 mb-2">
        {percentage.toFixed(1)}%
      </div>
      <p className="text-sm text-gray-600">Audit pass rate</p>
      <p className="text-xs text-gray-500 mt-2">Target: ≥99%</p>
    </div>
  );
}

function SyncFreshnessCard({ percentage }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Sync Freshness</h3>
        <div className="text-blue-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
      <div className="text-4xl font-bold text-blue-600 mb-2">
        {percentage.toFixed(1)}%
      </div>
      <p className="text-sm text-gray-600">Time-aligned data flows</p>
      <p className="text-xs text-gray-500 mt-2">Target: ≥98%</p>
    </div>
  );
}

function AgentCountCard({ count, healthy }) {
  const healthRate = count > 0 ? (healthy / count * 100) : 0;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Agents</h3>
      <div className="text-4xl font-bold text-gray-900 mb-2">{count}</div>
      <div className="flex items-center text-sm">
        <span className="text-green-600 font-medium">{healthy} healthy</span>
        <span className="text-gray-400 mx-2">•</span>
        <span className="text-gray-600">{healthRate.toFixed(0)}% uptime</span>
      </div>
    </div>
  );
}

function WorkflowCountCard({ count, healthy }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Workflows</h3>
      <div className="text-4xl font-bold text-gray-900 mb-2">{count}</div>
      <div className="flex items-center text-sm">
        <span className="text-green-600 font-medium">{healthy} healthy</span>
      </div>
    </div>
  );
}

function AgentHealthChart({ data }) {
  const chartData = [
    { name: 'Healthy', value: data.healthy, color: COLORS.success },
    { name: 'Degraded', value: data.degraded, color: COLORS.warning },
    { name: 'Unhealthy', value: data.unhealthy, color: COLORS.danger }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Agent Health Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => \`\${name} (\${(percent * 100).toFixed(0)}%)\`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={\`cell-\${index}\`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function WorkflowStatusChart({ data }) {
  const chartData = [
    { name: 'Healthy', value: data.healthy },
    { name: 'Degraded', value: data.degraded },
    { name: 'Failed', value: data.failed }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Workflow Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill={COLORS.primary} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SyncDriftChart({ data }) {
  const chartData = [
    { name: 'Critical', value: data.criticalIncidents, color: COLORS.danger },
    { name: 'High', value: data.highIncidents, color: COLORS.warning },
    { name: 'Medium', value: data.by_severity?.medium || 0, color: COLORS.neutral }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Active Drift Incidents</h3>
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900">{data.activeDriftIncidents}</p>
        <p className="text-sm text-gray-600">Total active incidents</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Bar dataKey="value" fill={COLORS.warning} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RiskBreakdownChart({ data }) {
  const chartData = [
    { name: 'Mitigated', value: data.mitigated, color: COLORS.success },
    { name: 'In Progress', value: data.inProgress, color: COLORS.warning },
    { name: 'Unmitigated', value: data.unmitigated, color: COLORS.danger }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Risk Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => \`\${name}: \${value}\`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={\`cell-\${index}\`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function RecommendationsPanel({ recommendations }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Recommendations</h3>
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={\`border rounded-lg p-4 \${getPriorityColor(rec.priority)}\`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold">{rec.title}</h4>
              <span className="text-xs uppercase font-bold px-2 py-1 rounded">
                {rec.priority}
              </span>
            </div>
            <p className="text-sm mb-3">{rec.description}</p>
            <div className="text-sm">
              <p className="font-medium mb-1">Recommended actions:</p>
              <ul className="list-disc list-inside space-y-1">
                {rec.actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UadsiDashboard;
`;

// Export the dashboard configuration
export const dashboardConfig = {
  name: 'UADSI Trust Intelligence Dashboard',
  version: '1.0.0',
  refreshRate: 60000, // 1 minute
  components: [
    'TrustScoreCard',
    'RiskAvoidedCard',
    'ComplianceSLACard',
    'SyncFreshnessCard',
    'AgentHealthChart',
    'WorkflowStatusChart',
    'SyncDriftChart',
    'RiskBreakdownChart',
    'RecommendationsPanel'
  ],
  exportFormats: ['json', 'csv', 'pdf'],
  embeddable: true,
  standalone: true
};
