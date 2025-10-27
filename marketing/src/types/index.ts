export interface ReleaseReviewReport {
  id: string;
  tenantId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly';
  periodStart: Date;
  periodEnd: Date;
  qaSummary: QASummary;
  finOpsSummary: FinOpsSummary;
  userFeedbackSummary: UserFeedbackSummary;
  incidentSummary: IncidentSummary;
  optimizationSummary: OptimizationSummary;
  aiInsights: AIInsights;
  recommendations: Recommendation[];
  overallHealthScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QASummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testCoverage: number;
  criticalBugs: number;
  regressionBugs: number;
  performanceTests: number;
  securityTests: number;
  testExecutionTime: number;
  qualityScore: number;
}

export interface FinOpsSummary {
  totalCost: number;
  costPerUser: number;
  infrastructureCost: number;
  thirdPartyCost: number;
  costTrend: string;
  budgetVariance: number;
  costOptimization: number;
  resourceUtilization: number;
  carbonFootprint: number;
  efficiencyScore: number;
}

export interface UserFeedbackSummary {
  totalFeedback: number;
  averageSentiment: number;
  positiveFeedback: number;
  negativeFeedback: number;
  neutralFeedback: number;
  topIssues: Array<{ issue: string; count: number }>;
  featureRequests: number;
  bugReports: number;
  satisfactionScore: number;
  responseTime: number;
}

export interface IncidentSummary {
  totalIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
  averageResolutionTime: number;
  autoResolvedIncidents: number;
  incidentsBySeverity: Record<string, number>;
  topAffectedServices: Array<{ service: string; count: number }>;
  uptime: number;
  reliabilityScore: number;
}

export interface OptimizationSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  autoOptimizedJobs: number;
  averageProcessingTime: number;
  performanceImprovements: number;
  costSavings: number;
  efficiencyGains: number;
  optimizationScore: number;
}

export interface AIInsights {
  keyFindings: string[];
  trends: string[];
  risks: string[];
  opportunities: string[];
  performanceAnalysis: string;
  costAnalysis: string;
  userSatisfactionAnalysis: string;
  reliabilityAnalysis: string;
}

export interface Recommendation {
  category: string;
  priority: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  timeline: string;
}

export interface MarketingPipeline {
  id: string;
  tenantId: string;
  campaignName: string;
  campaignType: 'email' | 'social' | 'content' | 'paid' | 'organic';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetAudience: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  costPerClick: number;
  costPerConversion: number;
  roi: number;
  startDate: Date;
  endDate: Date;
  aiOptimizations: AIOptimization[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIOptimization {
  id: string;
  type: 'audience' | 'creative' | 'budget' | 'timing' | 'channel';
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  applied: boolean;
  appliedAt?: Date;
  results?: {
    before: number;
    after: number;
    improvement: number;
  };
}

export interface OnboardingSession {
  id: string;
  tenantId: string;
  userId: string;
  sessionType: 'tutorial' | 'demo' | 'support' | 'training';
  status: 'active' | 'completed' | 'abandoned' | 'paused';
  progress: number;
  currentStep: string;
  totalSteps: number;
  aiAssistance: AIAssistance[];
  duration: number;
  satisfactionScore?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface AIAssistance {
  id: string;
  type: 'hint' | 'explanation' | 'tutorial' | 'support';
  content: string;
  context: string;
  helpful: boolean;
  timestamp: Date;
}

export interface CognitiveImpactScorecard {
  id: string;
  tenantId: string;
  period: 'monthly' | 'quarterly';
  periodStart: Date;
  periodEnd: Date;
  customerSatisfaction: {
    score: number;
    change: number;
    trend: string;
  };
  aiModelAccuracy: {
    score: number;
    change: number;
    trend: string;
  };
  featureAdoption: {
    rate: number;
    change: number;
    trend: string;
  };
  infrastructureEfficiency: {
    score: number;
    change: number;
    trend: string;
  };
  carbonReduction: {
    percentage: number;
    change: number;
    trend: string;
  };
  costReduction: {
    percentage: number;
    change: number;
    trend: string;
  };
  retentionRate: {
    rate: number;
    change: number;
    trend: string;
  };
  overallScore: number;
  createdAt: Date;
  updatedAt: Date;
}
