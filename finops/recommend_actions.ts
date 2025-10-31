/**
 * Recommend Actions
 * CLI tool to run FinOps analysis and output recommendations
 */

import { createFinOpsOptimizer } from './optimizer';

async function main() {
  console.log('🚀 Starting FinOps Cost Analysis...\n');

  const optimizer = createFinOpsOptimizer();

  if (!optimizer) {
    console.error('❌ Failed to initialize FinOps optimizer');
    process.exit(1);
  }

  try {
    const analysis = await optimizer.analyzeCosts();
    const report = optimizer.generateReport(analysis);

    console.log(report);

    // Exit with code based on severity
    const hasCritical = analysis.recommendations.some((r) => r.severity === 'critical');
    const hasHigh = analysis.recommendations.some((r) => r.severity === 'high');

    if (hasCritical) {
      console.log('⚠️  CRITICAL recommendations found - immediate action required');
      process.exit(2);
    } else if (hasHigh) {
      console.log('⚠️  HIGH priority recommendations found');
      process.exit(1);
    } else {
      console.log('✅ All recommendations are low-medium priority');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Failed to analyze costs:', error);
    process.exit(1);
  }
}

main();
