import { Router } from 'express';
import { MarketingController } from '../controllers/MarketingController';

const router = Router();
const marketingController = new MarketingController();

// Health check
router.get('/health', marketingController.healthCheck.bind(marketingController));

// Release review reports
router.post('/reports/:tenantId/weekly', marketingController.generateWeeklyReport.bind(marketingController));
router.get('/reports/:tenantId', marketingController.getReports.bind(marketingController));
router.get('/reports/:tenantId/:reportId', marketingController.getReport.bind(marketingController));

// Dashboard
router.get('/dashboard/:tenantId', marketingController.getDashboard.bind(marketingController));

// Onboarding Copilot
router.post('/onboarding/:tenantId/sessions', marketingController.createOnboardingSession.bind(marketingController));
router.post('/onboarding/:tenantId/sessions/:sessionId/assistance', marketingController.getAIAssistance.bind(marketingController));

// Cognitive Impact Scorecard
router.post('/scorecard/:tenantId/monthly', marketingController.generateMonthlyScorecard.bind(marketingController));
router.get('/scorecard/:tenantId/:scorecardId', marketingController.getScorecard.bind(marketingController));

// Marketing Pipeline
router.post('/pipeline/:tenantId/optimize', marketingController.generatePipelineOptimization.bind(marketingController));
router.get('/pipeline/:tenantId/:pipelineId', marketingController.getPipeline.bind(marketingController));

export default router;
