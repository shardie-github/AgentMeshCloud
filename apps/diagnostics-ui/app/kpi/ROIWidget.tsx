/**
 * ROI Widget Component
 * 
 * Displays:
 * - Trust Score → $ Saved calculation
 * - Risk Avoided (RA$)
 * - Platform cost vs savings
 * - ROI percentage
 * - Upgrade CTA (if on Free/Pro plan)
 * 
 * Formula:
 * RA$ = (Incidents Avoided × Avg Incident Cost) × (Trust Score / 100)
 * ROI = (RA$ - Platform Cost) / Platform Cost × 100
 */

import React, { useEffect, useState } from 'react';

interface ROIData {
  trust_score: number;
  incidents_avoided: number;
  avg_incident_cost: number;
  risk_avoided_usd: number;
  platform_cost: number;
  roi_percentage: number;
  plan_id: string;
  period: string;
}

interface ROIWidgetProps {
  tenantId: string;
  className?: string;
}

const ROIWidget: React.FC<ROIWidgetProps> = ({ tenantId, className = '' }) => {
  const [roiData, setRoiData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchROIData();
  }, [tenantId]);

  const fetchROIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/kpi/roi?tenant_id=${tenantId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ROI data: ${response.statusText}`);
      }

      const data = await response.json();
      setRoiData(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching ROI data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getPlanName = (planId: string): string => {
    const names: Record<string, string> = {
      free: 'Free',
      pro: 'Professional',
      enterprise: 'Enterprise'
    };
    return names[planId] || planId;
  };

  const shouldShowUpgradeCTA = (): boolean => {
    return roiData ? ['free', 'pro'].includes(roiData.plan_id) : false;
  };

  const getUpgradeMessage = (): string => {
    if (!roiData) return '';
    
    if (roiData.plan_id === 'free') {
      return 'Upgrade to Pro to unlock AI-Ops automation and increase savings by 3-5x';
    }
    
    if (roiData.plan_id === 'pro') {
      return 'Upgrade to Enterprise for unlimited agents and advanced analytics';
    }
    
    return '';
  };

  if (loading) {
    return (
      <div className={`roi-widget ${className}`}>
        <div className="roi-widget-loading">
          <div className="spinner" />
          <p>Calculating ROI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`roi-widget roi-widget-error ${className}`}>
        <div className="error-icon">⚠️</div>
        <p>Unable to load ROI data</p>
        <button onClick={fetchROIData} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!roiData) {
    return null;
  }

  return (
    <div className={`roi-widget ${className}`}>
      {/* Header */}
      <div className="roi-widget-header">
        <h3>Return on Investment</h3>
        <span className="roi-period">{roiData.period}</span>
      </div>

      {/* Main ROI Display */}
      <div className="roi-main-metric">
        <div className="roi-percentage">
          <span className="roi-value">{formatPercentage(roiData.roi_percentage)}</span>
          <span className="roi-label">ROI</span>
        </div>
        <div className="roi-multiplier">
          <span className="multiplier-value">
            {(roiData.roi_percentage / 100).toFixed(1)}x
          </span>
          <span className="multiplier-label">Return Multiple</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="roi-breakdown">
        <div className="roi-breakdown-item">
          <div className="breakdown-label">Trust Score</div>
          <div className="breakdown-value trust-score">
            {roiData.trust_score}/100
          </div>
        </div>

        <div className="roi-breakdown-item">
          <div className="breakdown-label">Incidents Avoided</div>
          <div className="breakdown-value">{roiData.incidents_avoided}</div>
        </div>

        <div className="roi-breakdown-item">
          <div className="breakdown-label">Avg Incident Cost</div>
          <div className="breakdown-value">
            {formatCurrency(roiData.avg_incident_cost)}
          </div>
        </div>
      </div>

      {/* Risk Avoided */}
      <div className="roi-risk-avoided">
        <div className="risk-avoided-label">Risk Avoided (RA$)</div>
        <div className="risk-avoided-value">
          {formatCurrency(roiData.risk_avoided_usd)}
        </div>
        <div className="risk-avoided-formula">
          = {roiData.incidents_avoided} incidents ×{' '}
          {formatCurrency(roiData.avg_incident_cost)} ×{' '}
          ({roiData.trust_score}/100)
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="roi-cost-comparison">
        <div className="cost-item">
          <span className="cost-label">Platform Cost</span>
          <span className="cost-value cost-expense">
            -{formatCurrency(roiData.platform_cost)}
          </span>
        </div>
        <div className="cost-item cost-savings">
          <span className="cost-label">Net Savings</span>
          <span className="cost-value cost-positive">
            +{formatCurrency(roiData.risk_avoided_usd - roiData.platform_cost)}
          </span>
        </div>
      </div>

      {/* Current Plan */}
      <div className="roi-current-plan">
        <span className="plan-badge">{getPlanName(roiData.plan_id)}</span>
        <span className="plan-cost">{formatCurrency(roiData.platform_cost)}/mo</span>
      </div>

      {/* Upgrade CTA */}
      {shouldShowUpgradeCTA() && (
        <div className="roi-upgrade-cta">
          <div className="upgrade-message">{getUpgradeMessage()}</div>
          <button className="upgrade-button" onClick={() => window.location.href = '/billing/upgrade'}>
            Upgrade Now
          </button>
        </div>
      )}

      {/* Refresh */}
      <div className="roi-widget-footer">
        <button onClick={fetchROIData} className="refresh-button" title="Refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Styles */}
      <style jsx>{`
        .roi-widget {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-width: 500px;
        }

        .roi-widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .roi-widget-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .roi-period {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
        }

        .roi-main-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .roi-percentage {
          display: flex;
          flex-direction: column;
        }

        .roi-value {
          font-size: 48px;
          font-weight: 700;
          line-height: 1;
        }

        .roi-label {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 4px;
        }

        .roi-multiplier {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .multiplier-value {
          font-size: 32px;
          font-weight: 600;
        }

        .multiplier-label {
          font-size: 12px;
          opacity: 0.9;
        }

        .roi-breakdown {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .roi-breakdown-item {
          text-align: center;
        }

        .breakdown-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .breakdown-value {
          font-size: 20px;
          font-weight: 600;
        }

        .breakdown-value.trust-score {
          color: #4ade80;
        }

        .roi-risk-avoided {
          background: rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .risk-avoided-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .risk-avoided-value {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .risk-avoided-formula {
          font-size: 11px;
          opacity: 0.8;
          font-family: monospace;
        }

        .roi-cost-comparison {
          margin-bottom: 16px;
        }

        .cost-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }

        .cost-item.cost-savings {
          border-top: 2px solid rgba(255, 255, 255, 0.3);
          padding-top: 12px;
          margin-top: 8px;
          font-weight: 600;
        }

        .cost-expense {
          color: #fca5a5;
        }

        .cost-positive {
          color: #4ade80;
          font-size: 18px;
        }

        .roi-current-plan {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .plan-badge {
          font-size: 14px;
          font-weight: 600;
        }

        .plan-cost {
          font-size: 14px;
          opacity: 0.9;
        }

        .roi-upgrade-cta {
          background: rgba(255, 255, 255, 0.95);
          color: #667eea;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .upgrade-message {
          font-size: 13px;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .upgrade-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .upgrade-button:hover {
          transform: translateY(-2px);
        }

        .roi-widget-footer {
          text-align: center;
        }

        .refresh-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .roi-widget-loading {
          text-align: center;
          padding: 40px;
        }

        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .roi-widget-error {
          text-align: center;
          padding: 40px;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .retry-button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 16px;
        }

        .retry-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ROIWidget;
