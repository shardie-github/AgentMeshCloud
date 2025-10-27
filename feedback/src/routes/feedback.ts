import { Router } from 'express';
import FeedbackController from '../controllers/FeedbackController';

const router = Router();
const feedbackController = new FeedbackController();

// Feedback submission and management
router.post('/submit', (req, res) => feedbackController.submitFeedback(req, res));
router.get('/:id', (req, res) => feedbackController.getFeedbackById(req, res));
router.get('/tenant/:tenantId', (req, res) => feedbackController.getFeedbackByTenant(req, res));
router.patch('/:id/status', (req, res) => feedbackController.updateFeedbackStatus(req, res));

// Analytics and insights
router.get('/tenant/:tenantId/analytics', (req, res) => feedbackController.getFeedbackAnalytics(req, res));
router.get('/tenant/:tenantId/insights', (req, res) => feedbackController.generateInsights(req, res));

// Batch operations
router.post('/batch/process', (req, res) => feedbackController.batchProcessFeedback(req, res));

export default router;
