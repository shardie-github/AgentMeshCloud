/**
 * Demo Mode Banner Component
 * 
 * Displays prominent banner when in demo mode to:
 * - Clearly indicate this is demo data
 * - Prevent confusion with production
 * - Provide option to exit demo mode
 */

import React, { useState } from 'react';

interface DemoBannerProps {
  tenantName?: string;
  onExit?: () => void;
  className?: string;
}

const DemoBanner: React.FC<DemoBannerProps> = ({
  tenantName = 'Acme Corporation',
  onExit,
  className = ''
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) {
    // Show minimized version
    return (
      <div className="demo-banner-minimized" onClick={() => setDismissed(false)}>
        <span className="demo-icon">🎬</span>
        <span className="demo-text">Demo Mode</span>
      </div>
    );
  }

  return (
    <div className={`demo-banner ${expanded ? 'expanded' : ''} ${className}`}>
      <div className="demo-banner-content">
        {/* Icon */}
        <div className="demo-icon-container">
          <span className="demo-icon">🎬</span>
        </div>

        {/* Main Message */}
        <div className="demo-message">
          <h4 className="demo-title">
            Demo Mode Active
          </h4>
          <p className="demo-subtitle">
            You're viewing a simulated environment for <strong>{tenantName}</strong> with synthetic data.
            {expanded && (
              <span className="demo-details">
                {' '}All data shown is for demonstration purposes only and does not represent real agents or incidents.
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="demo-actions">
          {!expanded && (
            <button
              className="demo-button demo-button-secondary"
              onClick={() => setExpanded(true)}
            >
              Learn More
            </button>
          )}
          
          {onExit && (
            <button
              className="demo-button demo-button-primary"
              onClick={onExit}
            >
              Exit Demo
            </button>
          )}

          <button
            className="demo-button demo-button-ghost"
            onClick={() => setDismissed(true)}
            title="Minimize banner"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="demo-details-panel">
          <h5>Demo Environment Includes:</h5>
          <ul>
            <li>✓ 10 synthetic agents with varied trust scores</li>
            <li>✓ 30 days of historical KPI data</li>
            <li>✓ 45+ simulated incidents and resolutions</li>
            <li>✓ AI-Ops automation examples</li>
            <li>✓ Policy violations and enforcement</li>
          </ul>

          <p className="demo-disclaimer">
            <strong>Note:</strong> This demo is safe to explore. No real integrations are connected,
            and no actual systems are affected by actions taken here.
          </p>

          <button
            className="demo-button demo-button-secondary"
            onClick={() => setExpanded(false)}
          >
            Show Less
          </button>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .demo-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: linear-gradient(135deg, #ff9a56 0%, #ff6b9d 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(255, 107, 157, 0.3);
          animation: slideDown 0.5s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .demo-banner-content {
          display: flex;
          align-items: center;
          padding: 16px 24px;
          max-width: 1400px;
          margin: 0 auto;
          gap: 16px;
        }

        .demo-icon-container {
          flex-shrink: 0;
        }

        .demo-icon {
          font-size: 32px;
          display: block;
          line-height: 1;
        }

        .demo-message {
          flex: 1;
          min-width: 0;
        }

        .demo-title {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 700;
        }

        .demo-subtitle {
          margin: 0;
          font-size: 14px;
          opacity: 0.95;
          line-height: 1.5;
        }

        .demo-details {
          display: block;
          margin-top: 8px;
          font-size: 13px;
          opacity: 0.9;
        }

        .demo-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .demo-button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          white-space: nowrap;
        }

        .demo-button-primary {
          background: white;
          color: #ff6b9d;
        }

        .demo-button-primary:hover {
          background: #f0f0f0;
          transform: translateY(-1px);
        }

        .demo-button-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .demo-button-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .demo-button-ghost {
          background: transparent;
          color: white;
          padding: 4px 8px;
          font-size: 18px;
        }

        .demo-button-ghost:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .demo-details-panel {
          border-top: 1px solid rgba(255, 255, 255, 0.3);
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.1);
          animation: expandPanel 0.3s ease-out;
        }

        @keyframes expandPanel {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 500px;
            opacity: 1;
          }
        }

        .demo-details-panel h5 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .demo-details-panel ul {
          margin: 0 0 16px 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.8;
        }

        .demo-details-panel li {
          margin-bottom: 4px;
        }

        .demo-disclaimer {
          background: rgba(0, 0, 0, 0.2);
          padding: 12px;
          border-radius: 6px;
          font-size: 12px;
          line-height: 1.6;
          margin: 16px 0;
        }

        .demo-banner-minimized {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 9999;
          background: linear-gradient(135deg, #ff9a56 0%, #ff6b9d 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(255, 107, 157, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: transform 0.2s;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .demo-banner-minimized:hover {
          transform: scale(1.05);
        }

        .demo-banner-minimized .demo-icon {
          font-size: 20px;
        }

        @media (max-width: 768px) {
          .demo-banner-content {
            flex-direction: column;
            align-items: flex-start;
            padding: 12px 16px;
          }

          .demo-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .demo-button {
            font-size: 12px;
            padding: 6px 12px;
          }

          .demo-details-panel {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default DemoBanner;
