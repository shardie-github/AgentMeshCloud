/**
 * Demo Tooltips Component
 * 
 * Provides contextual tooltips for demo mode to guide users
 * through the platform features and highlight key capabilities.
 * 
 * Features:
 * - Auto-show on first visit to each section
 * - Dismissible and remembers state
 * - Sequential tour mode
 * - Customizable positioning
 */

import React, { useState, useEffect, useRef } from 'react';

interface TooltipStep {
  id: string;
  selector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  highlight?: boolean;
}

interface DemoTooltipsProps {
  steps: TooltipStep[];
  autoStart?: boolean;
  onComplete?: () => void;
}

const DemoTooltips: React.FC<DemoTooltipsProps> = ({
  steps,
  autoStart = true,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoStart && !active && currentStep === 0) {
      setActive(true);
    }
  }, [autoStart]);

  useEffect(() => {
    if (active && steps[currentStep]) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [active, currentStep]);

  const updatePosition = () => {
    const step = steps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.selector);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 16;

    let top = 0;
    let left = 0;

    switch (step.position || 'bottom') {
      case 'top':
        top = rect.top - tooltipHeight - offset;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + offset;
        break;
    }

    // Keep tooltip within viewport
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (top < 10) top = 10;

    setPosition({ top, left });

    // Add highlight to element
    if (step.highlight) {
      element.classList.add('demo-highlight');
    }
  };

  const handleNext = () => {
    const step = steps[currentStep];
    if (step) {
      // Remove highlight
      const element = document.querySelector(step.selector);
      if (element) {
        element.classList.remove('demo-highlight');
      }

      dismissed.add(step.id);
      setDismissed(new Set(dismissed));
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setActive(false);
    const step = steps[currentStep];
    if (step) {
      const element = document.querySelector(step.selector);
      if (element) {
        element.classList.remove('demo-highlight');
      }
    }
  };

  const handleComplete = () => {
    setActive(false);
    if (onComplete) {
      onComplete();
    }
  };

  if (!active || !steps[currentStep]) {
    return (
      <button
        className="demo-tooltips-trigger"
        onClick={() => setActive(true)}
        title="Show demo tour"
      >
        <span className="tooltip-icon">💡</span>
        <span className="tooltip-text">Tour</span>
      </button>
    );
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="demo-tooltips-backdrop" onClick={handleSkip} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="demo-tooltip"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
      >
        {/* Progress Bar */}
        <div className="demo-tooltip-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <div className="demo-tooltip-content">
          <div className="demo-tooltip-header">
            <h4 className="demo-tooltip-title">{step.title}</h4>
            <button
              className="demo-tooltip-close"
              onClick={handleSkip}
              title="Skip tour"
            >
              ✕
            </button>
          </div>

          <p className="demo-tooltip-text">{step.content}</p>

          {/* Navigation */}
          <div className="demo-tooltip-footer">
            <div className="tooltip-step-counter">
              {currentStep + 1} of {steps.length}
            </div>

            <div className="tooltip-actions">
              {currentStep > 0 && (
                <button
                  className="tooltip-button tooltip-button-secondary"
                  onClick={handlePrev}
                >
                  Previous
                </button>
              )}

              <button
                className="tooltip-button tooltip-button-primary"
                onClick={handleNext}
              >
                {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className={`demo-tooltip-arrow arrow-${step.position || 'bottom'}`} />
      </div>

      {/* Styles */}
      <style jsx>{`
        .demo-tooltips-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9998;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .demo-tooltip {
          position: fixed;
          z-index: 9999;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .demo-tooltip-progress {
          height: 4px;
          background: #e5e7eb;
          border-radius: 12px 12px 0 0;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease-out;
        }

        .demo-tooltip-content {
          padding: 20px;
        }

        .demo-tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .demo-tooltip-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
        }

        .demo-tooltip-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: color 0.2s;
        }

        .demo-tooltip-close:hover {
          color: #1f2937;
        }

        .demo-tooltip-text {
          margin: 0 0 16px 0;
          font-size: 14px;
          line-height: 1.6;
          color: #4b5563;
        }

        .demo-tooltip-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .tooltip-step-counter {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }

        .tooltip-actions {
          display: flex;
          gap: 8px;
        }

        .tooltip-button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .tooltip-button-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .tooltip-button-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .tooltip-button-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .tooltip-button-secondary:hover {
          background: #e5e7eb;
        }

        .demo-tooltip-arrow {
          position: absolute;
          width: 0;
          height: 0;
          border: 10px solid transparent;
        }

        .arrow-bottom {
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: white;
        }

        .arrow-top {
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: white;
        }

        .arrow-left {
          right: -20px;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: white;
        }

        .arrow-right {
          left: -20px;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: white;
        }

        .demo-tooltips-trigger {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9997;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: transform 0.2s;
        }

        .demo-tooltips-trigger:hover {
          transform: scale(1.05);
        }

        .tooltip-icon {
          font-size: 20px;
        }

        :global(.demo-highlight) {
          position: relative;
          z-index: 9997;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.4),
                      0 0 0 2000px rgba(0, 0, 0, 0.5) !important;
          border-radius: 8px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.4),
                        0 0 0 2000px rgba(0, 0, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.6),
                        0 0 0 2000px rgba(0, 0, 0, 0.5);
          }
        }
      `}</style>
    </>
  );
};

// Predefined demo tour steps
export const defaultDemoSteps: TooltipStep[] = [
  {
    id: 'trust-score',
    selector: '.trust-score-widget',
    title: 'Trust Score',
    content: 'Your overall Trust Score (0-100) reflects the reliability, security, and compliance of all your AI agents. Higher scores mean lower risk.',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'agents-list',
    selector: '.agents-list',
    title: 'Agent Registry',
    content: 'View all your registered AI agents. Agents are automatically discovered from MCP servers, Zapier, Make, and other integrations.',
    position: 'right',
    highlight: true
  },
  {
    id: 'incidents',
    selector: '.incidents-panel',
    title: 'Incidents & Alerts',
    content: 'Track policy violations, sync issues, and other incidents. AI-Ops automatically resolves many issues without human intervention.',
    position: 'left',
    highlight: true
  },
  {
    id: 'roi-widget',
    selector: '.roi-widget',
    title: 'ROI Calculator',
    content: 'See the financial impact of ORCA. We calculate Risk Avoided (RA$) based on incidents prevented and your Trust Score.',
    position: 'top',
    highlight: true
  },
  {
    id: 'aiops-actions',
    selector: '.aiops-panel',
    title: 'AI-Ops Automation',
    content: 'View automated actions taken by ORCA: auto-healing, drift correction, capacity scaling, and more. No manual intervention needed.',
    position: 'bottom',
    highlight: true
  }
];

export default DemoTooltips;
