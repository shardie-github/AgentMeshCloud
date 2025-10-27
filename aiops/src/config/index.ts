/**
 * Configuration for AIOps services
 */

export interface AIOpsConfig {
  agentOps: {
    enabled: boolean;
    driftThreshold: number;
    retrainingInterval: number;
    humanFeedbackRequired: boolean;
  };
  finOps: {
    enabled: boolean;
    budgetAlertThreshold: number;
    costOptimizationEnabled: boolean;
    scalingEnabled: boolean;
  };
  quantumSecurity: {
    enabled: boolean;
    keyRotationInterval: number;
    encryptionEnabled: boolean;
    auditEnabled: boolean;
  };
  cognitiveLedger: {
    enabled: boolean;
    carbonTrackingEnabled: boolean;
    tokenTrackingEnabled: boolean;
    auditEnabled: boolean;
  };
  sovereignData: {
    enabled: boolean;
    complianceMonitoringEnabled: boolean;
    dataGovernanceEnabled: boolean;
    licensingEnabled: boolean;
  };
  digitalTwin: {
    enabled: boolean;
    simulationEnabled: boolean;
    scenarioPlanningEnabled: boolean;
    impactModelingEnabled: boolean;
  };
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    alertingEnabled: boolean;
    metricsEnabled: boolean;
  };
}

export const config: AIOpsConfig = {
  agentOps: {
    enabled: true,
    driftThreshold: 0.1,
    retrainingInterval: 24 * 60 * 60 * 1000, // 24 hours
    humanFeedbackRequired: true
  },
  finOps: {
    enabled: true,
    budgetAlertThreshold: 0.8,
    costOptimizationEnabled: true,
    scalingEnabled: true
  },
  quantumSecurity: {
    enabled: true,
    keyRotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
    encryptionEnabled: true,
    auditEnabled: true
  },
  cognitiveLedger: {
    enabled: true,
    carbonTrackingEnabled: true,
    tokenTrackingEnabled: true,
    auditEnabled: true
  },
  sovereignData: {
    enabled: true,
    complianceMonitoringEnabled: true,
    dataGovernanceEnabled: true,
    licensingEnabled: true
  },
  digitalTwin: {
    enabled: true,
    simulationEnabled: true,
    scenarioPlanningEnabled: true,
    impactModelingEnabled: true
  },
  monitoring: {
    enabled: true,
    healthCheckInterval: 60 * 1000, // 1 minute
    alertingEnabled: true,
    metricsEnabled: true
  }
};