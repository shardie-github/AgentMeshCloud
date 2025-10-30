'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Shield, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, agentsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/telemetry/dashboard`),
        fetch(`${API_URL}/api/v1/agents`)
      ]);

      const dashboardData = await dashboardRes.json();
      const agentsData = await agentsRes.json();

      setDashboard(dashboardData);
      setAgents(agentsData.agents || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Loading AI-Agent Mesh...</div>
      </div>
    );
  }

  const successRate = dashboard?.requests?.total > 0
    ? ((dashboard.requests.success / dashboard.requests.total) * 100).toFixed(1)
    : 100;

  const errorRate = dashboard?.requests?.total > 0
    ? ((dashboard.requests.error / dashboard.requests.total) * 100).toFixed(1)
    : 0;

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const suspendedAgents = agents.filter(a => a.status === 'suspended').length;
  const quarantinedAgents = agents.filter(a => a.status === 'quarantined').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">AI-Agent Mesh</h1>
        <p className="text-gray-400">Enterprise AI Governance & Observability Platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          icon={<Server className="w-8 h-8" />}
          title="Total Agents"
          value={agents.length}
          subtitle={`${activeAgents} active`}
          color="blue"
        />
        <StatsCard
          icon={<Activity className="w-8 h-8" />}
          title="Total Requests"
          value={dashboard?.requests?.total || 0}
          subtitle={`${successRate}% success rate`}
          color="green"
        />
        <StatsCard
          icon={<Shield className="w-8 h-8" />}
          title="Compliance Status"
          value="Compliant"
          subtitle={`${quarantinedAgents} quarantined`}
          color="purple"
        />
        <StatsCard
          icon={<TrendingUp className="w-8 h-8" />}
          title="Avg Latency"
          value={`${dashboard?.performance?.avg_latency_ms?.toFixed(0) || 0}ms`}
          subtitle={`P95: ${dashboard?.performance?.p95_latency_ms?.toFixed(0) || 0}ms`}
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Request Stats */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Request Statistics</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Success', value: dashboard?.requests?.success || 0, fill: '#10b981' },
              { name: 'Error', value: dashboard?.requests?.error || 0, fill: '#ef4444' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Log Levels */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Log Levels</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Debug', value: dashboard?.logs?.by_level?.debug || 0 },
              { name: 'Info', value: dashboard?.logs?.by_level?.info || 0 },
              { name: 'Warn', value: dashboard?.logs?.by_level?.warn || 0 },
              { name: 'Error', value: dashboard?.logs?.by_level?.error || 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Registered Agents</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="pb-3 px-4">Name</th>
                <th className="pb-3 px-4">Type</th>
                <th className="pb-3 px-4">Vendor</th>
                <th className="pb-3 px-4">Model</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="py-3 px-4 font-medium">{agent.name}</td>
                  <td className="py-3 px-4">{agent.type}</td>
                  <td className="py-3 px-4">{agent.vendor}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{agent.model}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="py-3 px-4">
                    <ComplianceBadge tier={agent.compliance_tier} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon, title, value, subtitle, color }: any) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-900 text-green-300',
    suspended: 'bg-yellow-900 text-yellow-300',
    quarantined: 'bg-red-900 text-red-300',
    deprecated: 'bg-gray-700 text-gray-300'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.deprecated}`}>
      {status}
    </span>
  );
}

function ComplianceBadge({ tier }: { tier: string }) {
  const styles = {
    critical: 'bg-purple-900 text-purple-300',
    high: 'bg-blue-900 text-blue-300',
    standard: 'bg-gray-700 text-gray-300',
    none: 'bg-gray-800 text-gray-400'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[tier] || styles.none}`}>
      {tier}
    </span>
  );
}
