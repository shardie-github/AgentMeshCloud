/**
 * KPI & ROI API Routes
 * Exposes KPI definitions and ROI calculations
 */

import { Router } from 'express';
import { getTranslator } from '../../../kpi/translator';

const router = Router();

/**
 * GET /kpi/definitions
 * Returns all KPI definitions from registry
 */
router.get('/definitions', async (req, res) => {
  try {
    const translator = await getTranslator();
    const definitions = translator.getAllKPIs();
    
    res.json({
      success: true,
      count: Object.keys(definitions).length,
      kpis: definitions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load KPI definitions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /kpi/roi
 * Calculate ROI for given KPI values
 * 
 * Body: {
 *   kpi_values: { [kpi_name]: value },
 *   tenant_tier?: string
 * }
 */
router.post('/roi', async (req, res) => {
  try {
    const { kpi_values, tenant_tier = 'default' } = req.body;
    
    if (!kpi_values || typeof kpi_values !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'kpi_values object required'
      });
    }
    
    const translator = await getTranslator();
    const result = translator.calculateTotalROI(kpi_values, tenant_tier);
    
    res.json({
      success: true,
      tenant_tier,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ROI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /kpi/roi/:kpi_name
 * Calculate ROI for a single KPI
 * Query: ?value=X&tenant_tier=Y
 */
router.get('/roi/:kpi_name', async (req, res) => {
  try {
    const { kpi_name } = req.params;
    const value = parseFloat(req.query.value as string);
    const tenant_tier = (req.query.tenant_tier as string) || 'default';
    
    if (isNaN(value)) {
      return res.status(400).json({
        success: false,
        error: 'value query parameter required (number)'
      });
    }
    
    const translator = await getTranslator();
    const result = translator.calculateKPIROI(kpi_name, value, tenant_tier);
    
    // Also get status
    const status = translator.getKPIStatus(kpi_name, value);
    
    res.json({
      success: true,
      kpi_name,
      status,
      ...result
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown KPI')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ROI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /kpi/status/:kpi_name
 * Get KPI status (good/warning/critical)
 * Query: ?value=X
 */
router.get('/status/:kpi_name', async (req, res) => {
  try {
    const { kpi_name } = req.params;
    const value = parseFloat(req.query.value as string);
    
    if (isNaN(value)) {
      return res.status(400).json({
        success: false,
        error: 'value query parameter required (number)'
      });
    }
    
    const translator = await getTranslator();
    const status = translator.getKPIStatus(kpi_name, value);
    const definitions = translator.getAllKPIs();
    const kpiDef = definitions[kpi_name];
    
    if (!kpiDef) {
      return res.status(404).json({
        success: false,
        error: `Unknown KPI: ${kpi_name}`
      });
    }
    
    res.json({
      success: true,
      kpi_name,
      value,
      status,
      target: kpiDef.sla.target,
      thresholds: {
        warning: kpiDef.sla.warning_threshold,
        critical: kpiDef.sla.critical_threshold
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get KPI status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
