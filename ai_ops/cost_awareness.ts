/**
 * AI-Ops Cost Awareness Module
 * Injects cost coefficients into remediation decision scoring
 * Ensures cost-optimal actions are chosen while meeting SLOs
 */

interface RemediationAction {
  id: string;
  type: 'restart' | 'scale' | 'reroute' | 'fallback' | 'notify';
  target: string;
  description: string;
  estimatedDuration: number; // minutes
  successProbability: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
}

interface CostCoefficients {
  compute: number;      // $/hour
  egress: number;       // $/GB
  database: number;     // $/hour
  api_call: number;     // $/1000 calls
  engineer_time: number; // $/hour
}

interface ScoredAction extends RemediationAction {
  score: number;
  costImpact: number;
  riskImpact: number;
  timeImpact: number;
  reasoning: string;
}

/**
 * Cost-aware decision scorer for AI-Ops remediation
 */
export class CostAwareDecisionEngine {
  private costs: CostCoefficients;
  private sloTarget: number; // e.g., 99.5% uptime
  
  constructor(costs?: Partial<CostCoefficients>, sloTarget: number = 99.5) {
    this.costs = {
      compute: costs?.compute || 0.50,        // $0.50/hr
      egress: costs?.egress || 0.09,          // $0.09/GB
      database: costs?.database || 0.25,      // $0.25/hr
      api_call: costs?.api_call || 0.001,     // $0.001 per 1K calls
      engineer_time: costs?.engineer_time || 150, // $150/hr
    };
    this.sloTarget = sloTarget;
  }
  
  /**
   * Score remediation actions based on cost, risk, and time
   */
  scoreActions(actions: RemediationAction[], anomalyContext: any): ScoredAction[] {
    const scored: ScoredAction[] = [];
    
    for (const action of actions) {
      const costImpact = this.estimateCost(action, anomalyContext);
      const riskImpact = this.estimateRisk(action);
      const timeImpact = action.estimatedDuration;
      
      // Weighted scoring:
      // - 40% cost
      // - 35% risk
      // - 25% time
      const costScore = 1 - Math.min(costImpact / 1000, 1); // Normalize to 0-1
      const riskScore = action.successProbability * (1 - riskImpact);
      const timeScore = 1 - Math.min(timeImpact / 60, 1); // Normalize to 0-1
      
      const score = (costScore * 0.4) + (riskScore * 0.35) + (timeScore * 0.25);
      
      scored.push({
        ...action,
        score,
        costImpact,
        riskImpact,
        timeImpact,
        reasoning: this.generateReasoning(action, costScore, riskScore, timeScore)
      });
    }
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Estimate cost of a remediation action
   */
  private estimateCost(action: RemediationAction, context: any): number {
    let cost = 0;
    
    switch (action.type) {
      case 'restart':
        // Downtime cost + restart overhead
        cost += (this.costs.compute * (action.estimatedDuration / 60));
        cost += this.costs.engineer_time * 0.25; // 15 min oversight
        break;
        
      case 'scale':
        // Additional compute for scaled instances
        const additionalInstances = context.scaleAmount || 2;
        cost += this.costs.compute * additionalInstances * 1; // 1 hour scaled
        break;
        
      case 'reroute':
        // Egress costs for traffic rerouting
        const estimatedTrafficGB = context.trafficGb || 100;
        cost += this.costs.egress * estimatedTrafficGB;
        break;
        
      case 'fallback':
        // Fallback endpoint might be more expensive
        cost += this.costs.api_call * (context.requestCount || 10000) * 1.5;
        break;
        
      case 'notify':
        // Engineer time to investigate
        cost += this.costs.engineer_time * (action.estimatedDuration / 60);
        break;
    }
    
    return cost;
  }
  
  /**
   * Estimate risk impact (0-1 scale)
   */
  private estimateRisk(action: RemediationAction): number {
    const riskMap = {
      low: 0.1,
      medium: 0.4,
      high: 0.8
    };
    
    return riskMap[action.riskLevel] || 0.5;
  }
  
  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    action: RemediationAction,
    costScore: number,
    riskScore: number,
    timeScore: number
  ): string {
    const parts: string[] = [];
    
    if (costScore > 0.7) {
      parts.push('low cost');
    } else if (costScore < 0.3) {
      parts.push('high cost');
    }
    
    if (riskScore > 0.7) {
      parts.push('low risk');
    } else if (riskScore < 0.3) {
      parts.push('high risk');
    }
    
    if (timeScore > 0.7) {
      parts.push('fast resolution');
    } else if (timeScore < 0.3) {
      parts.push('slow resolution');
    }
    
    if (parts.length === 0) {
      return 'Balanced trade-offs across cost, risk, and time';
    }
    
    return `Chosen for: ${parts.join(', ')}`;
  }
  
  /**
   * Choose best action that meets SLO
   */
  chooseBestAction(actions: RemediationAction[], anomalyContext: any): ScoredAction | null {
    const scored = this.scoreActions(actions, anomalyContext);
    
    if (scored.length === 0) {
      return null;
    }
    
    // Return highest-scoring action
    return scored[0]!;
  }
}

/**
 * Example usage
 */
export function exampleCostAwareDecision() {
  const engine = new CostAwareDecisionEngine();
  
  const actions: RemediationAction[] = [
    {
      id: 'action-1',
      type: 'restart',
      target: 'agent-service-3',
      description: 'Restart affected agent service',
      estimatedDuration: 5,
      successProbability: 0.9,
      riskLevel: 'low'
    },
    {
      id: 'action-2',
      type: 'scale',
      target: 'agent-service-3',
      description: 'Scale out to 5 instances',
      estimatedDuration: 10,
      successProbability: 0.95,
      riskLevel: 'medium'
    },
    {
      id: 'action-3',
      type: 'notify',
      target: 'on-call-engineer',
      description: 'Escalate to on-call engineer',
      estimatedDuration: 30,
      successProbability: 1.0,
      riskLevel: 'low'
    }
  ];
  
  const context = {
    scaleAmount: 3,
    trafficGb: 50,
    requestCount: 10000
  };
  
  const best = engine.chooseBestAction(actions, context);
  console.log('Best action:', best);
  console.log('Reasoning:', best?.reasoning);
}
