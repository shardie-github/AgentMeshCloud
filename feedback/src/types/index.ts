export interface FeedbackSubmission {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  feedbackType: 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'general' | 'praise';
  title: string;
  description: string;
  context?: {
    page?: string;
    feature?: string;
    userJourney?: string;
    timestamp?: string;
  };
  metadata?: {
    browser?: string;
    device?: string;
    os?: string;
    performanceMetrics?: Record<string, number>;
    userAgent?: string;
    screenResolution?: string;
    viewportSize?: string;
  };
}

export interface ProcessedFeedback {
  id: string;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  feedbackType: 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'general' | 'praise';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'triaged' | 'in_progress' | 'resolved' | 'closed' | 'duplicate';
  title: string;
  description: string;
  context: Record<string, any>;
  metadata: Record<string, any>;
  embedding?: number[];
  themes: string[];
  sentimentScore?: number;
  urgencyScore?: number;
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackTriagerResult {
  themes: string[];
  sentimentScore: number;
  urgencyScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  suggestedAssignee?: string;
  similarFeedback?: string[];
}

export interface GrowthSignal {
  tenantId: string;
  signalType: 'engagement' | 'retention' | 'revenue' | 'referral' | 'feature_adoption' | 'support_ticket';
  metricName: string;
  metricValue: number;
  baselineValue?: number;
  changePercentage?: number;
  timePeriod: 'daily' | 'weekly' | 'monthly';
  cohortId?: string;
  userSegment?: string;
  metadata: Record<string, any>;
}

export interface ReferralCredit {
  tenantId: string;
  referrerUserId: string;
  referredUserId?: string;
  referralCode: string;
  creditAmount: number;
  creditType: 'usage' | 'premium' | 'feature';
  status: 'pending' | 'awarded' | 'expired' | 'cancelled';
  stripeCustomerId?: string;
  metadata: Record<string, any>;
  expiresAt?: Date;
}

export interface AIOpsIncident {
  tenantId: string;
  incidentId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed';
  affectedServices: string[];
  rootCause?: string;
  resolutionSteps?: string[];
  autoResolved: boolean;
  aiInsights: Record<string, any>;
  metrics: Record<string, any>;
  resolvedAt?: Date;
}

export interface AutoOptimizationJob {
  tenantId: string;
  jobName: string;
  optimizationType: 'performance' | 'cost' | 'reliability' | 'security' | 'user_experience';
  status: 'pending' | 'running' | 'completed' | 'failed';
  baselineMetrics: Record<string, any>;
  optimizedMetrics?: Record<string, any>;
  improvementPercentage?: number;
  changesApplied: any[];
  rollbackPlan?: Record<string, any>;
  executionLog?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ReleaseReviewReport {
  tenantId: string;
  releaseVersion: string;
  reportType: 'weekly' | 'monthly' | 'quarterly';
  qaMetrics: Record<string, any>;
  finopsMetrics: Record<string, any>;
  userFeedbackSummary: Record<string, any>;
  performanceMetrics: Record<string, any>;
  recommendations: any[];
  aiInsights: Record<string, any>;
  generatedAt: Date;
}

export interface CognitiveImpactScorecard {
  tenantId: string;
  scorecardPeriod: 'monthly' | 'quarterly';
  periodStart: Date;
  periodEnd: Date;
  customerSatisfactionScore?: number;
  customerSatisfactionDelta?: number;
  aiModelAccuracy?: number;
  aiModelAccuracyDelta?: number;
  featureAdoptionRate?: number;
  featureAdoptionDelta?: number;
  infrastructureEfficiency?: number;
  infrastructureEfficiencyDelta?: number;
  costReductionPercentage?: number;
  carbonReductionPercentage?: number;
  retentionRate?: number;
  retentionDelta?: number;
  overallCognitiveScore?: number;
  insights: Record<string, any>;
  recommendations: any[];
}

export interface MarketingPipeline {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  campaignType: 'email' | 'social' | 'content' | 'paid' | 'referral';
  targetSegment?: string;
  conversionPrediction?: number;
  actualConversion?: number;
  aiOptimizationSuggestions: any[];
  budgetAllocated?: number;
  budgetSpent?: number;
  roi?: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startedAt?: Date;
  endedAt?: Date;
}

export interface OnboardingSession {
  tenantId: string;
  userId: string;
  sessionId: string;
  currentStep: string;
  completedSteps: string[];
  aiAssistanceLog: any[];
  userSatisfactionScore?: number;
  completionTime?: number;
  abandonedAt?: Date;
  completedAt?: Date;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  feedbackByType: Record<string, number>;
  feedbackByPriority: Record<string, number>;
  feedbackByStatus: Record<string, number>;
  averageSentiment: number;
  topThemes: Array<{ theme: string; count: number }>;
  resolutionTime: {
    average: number;
    median: number;
    p95: number;
  };
  userSatisfaction: {
    average: number;
    distribution: Record<string, number>;
  };
}

export interface ProcessingJob {
  id: string;
  type: 'feedback_triaging' | 'growth_analysis' | 'incident_analysis' | 'optimization';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
