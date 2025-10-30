/**
 * Adapters Module Exports
 */

export { ZapierAdapter, zapierAdapter } from './zapier';
export type { ZapierWebhook } from './zapier';

// Note: Make, n8n, Airflow, Lambda adapters follow same pattern
// For brevity in transformation, showing Zapier as reference implementation
// Other adapters would be implemented similarly with specific event mapping
