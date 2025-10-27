/**
 * Agent Controller for AgentMesh Cloud Orchestrator
 */

import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

export class AgentController {
  private agentService: any;

  constructor(agentService: any) {
    this.agentService = agentService;
  }

  async getAllAgents(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all agents');
      
      const agents = await this.agentService.getAllAgents();
      
      res.json({
        agents,
        total: agents.length,
        message: 'Agents fetched successfully'
      });
    } catch (error: any) {
      logger.error('Error fetching all agents:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch agents'
      });
    }
  }

  async getAgentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info(`Fetching agent ${id}`);
      
      const agent = await this.agentService.getAgent(id);
      
      res.json({
        agent,
        message: 'Agent fetched successfully'
      });
    } catch (error: any) {
      logger.error(`Error fetching agent ${req.params.id}:`, error);
      
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: `Agent ${req.params.id} not found`
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to fetch agent'
        });
      }
    }
  }

  async createAgent(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Creating new agent');
      
      const agent = await this.agentService.createAgent(req.body);
      
      res.status(201).json({
        agent,
        message: 'Agent created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating agent:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create agent'
      });
    }
  }

  async updateAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info(`Updating agent ${id}`);
      
      const agent = await this.agentService.updateAgent(id, req.body);
      
      res.json({
        agent,
        message: 'Agent updated successfully'
      });
    } catch (error: any) {
      logger.error(`Error updating agent ${req.params.id}:`, error);
      
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: `Agent ${req.params.id} not found`
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to update agent'
        });
      }
    }
  }

  async deleteAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info(`Deleting agent ${id}`);
      
      await this.agentService.deleteAgent(id);
      
      res.json({
        message: 'Agent deleted successfully'
      });
    } catch (error: any) {
      logger.error(`Error deleting agent ${req.params.id}:`, error);
      
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: `Agent ${req.params.id} not found`
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to delete agent'
        });
      }
    }
  }

  async startAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info(`Starting agent ${id}`);
      
      await this.agentService.startAgent(id);
      
      res.json({
        message: 'Agent started successfully'
      });
    } catch (error: any) {
      logger.error(`Error starting agent ${req.params.id}:`, error);
      
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: `Agent ${req.params.id} not found`
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to start agent'
        });
      }
    }
  }

  async stopAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info(`Stopping agent ${id}`);
      
      await this.agentService.stopAgent(id);
      
      res.json({
        message: 'Agent stopped successfully'
      });
    } catch (error: any) {
      logger.error(`Error stopping agent ${req.params.id}:`, error);
      
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: `Agent ${req.params.id} not found`
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to stop agent'
        });
      }
    }
  }
}