import { Router } from 'express';
import AIOpsController from '../controllers/AIOpsController';

const router = Router();
const aiopsController = new AIOpsController();

// Incident routes
router.post('/incidents', (req, res) => aiopsController.createIncident(req, res));
router.get('/incidents/:id', (req, res) => aiopsController.getIncident(req, res));
router.get('/tenants/:tenantId/incidents', (req, res) => aiopsController.getIncidents(req, res));
router.patch('/incidents/:id/status', (req, res) => aiopsController.updateIncidentStatus(req, res));
router.get('/tenants/:tenantId/incidents/stats', (req, res) => aiopsController.getIncidentStats(req, res));

// Optimization routes
router.post('/optimize/release', (req, res) => aiopsController.analyzeRelease(req, res));
router.get('/optimize/jobs/:jobId', (req, res) => aiopsController.getOptimizationJob(req, res));
router.get('/tenants/:tenantId/optimize/jobs', (req, res) => aiopsController.getOptimizationJobs(req, res));
router.get('/tenants/:tenantId/optimize/stats', (req, res) => aiopsController.getOptimizationStats(req, res));

// Dashboard routes
router.get('/tenants/:tenantId/dashboard', (req, res) => aiopsController.getDashboard(req, res));

export default router;
