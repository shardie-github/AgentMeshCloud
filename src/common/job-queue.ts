/**
 * Async Job Queue for background tasks
 * Decouples report generation and heavy processing from API threads
 */

import { createLogger } from './logger.js';

const logger = createLogger('job-queue');

export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

type JobHandler<T = unknown> = (payload: T) => Promise<void>;

export class JobQueue {
  private queue: Job[] = [];
  private handlers = new Map<string, JobHandler>();
  private processing = false;
  private maxConcurrency = 5;
  private activeJobs = 0;

  constructor() {
    this.startProcessing();
  }

  /**
   * Register a job handler
   */
  registerHandler<T>(jobType: string, handler: JobHandler<T>): void {
    this.handlers.set(jobType, handler as JobHandler);
    logger.info(`Registered handler for job type: ${jobType}`);
  }

  /**
   * Enqueue a job
   */
  enqueue<T>(type: string, payload: T, priority = 0, maxAttempts = 3): string {
    const job: Job<T> = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts,
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);

    logger.debug(`Enqueued job`, { id: job.id, type, priority });
    return job.id;
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    if (this.processing) return;
    this.processing = true;

    setInterval(() => {
      this.processNextBatch();
    }, 100);
  }

  private async processNextBatch(): Promise<void> {
    while (this.activeJobs < this.maxConcurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        this.processJob(job);
      }
    }
  }

  private async processJob(job: Job): Promise<void> {
    this.activeJobs++;
    job.attempts++;

    const handler = this.handlers.get(job.type);
    
    if (!handler) {
      logger.error(`No handler for job type: ${job.type}`, undefined, { jobId: job.id });
      this.activeJobs--;
      return;
    }

    try {
      await handler(job.payload);
      logger.info(`Job completed`, { id: job.id, type: job.type });
    } catch (error) {
      logger.error(`Job failed`, error as Error, { 
        id: job.id, 
        type: job.type,
        attempts: job.attempts,
      });

      // Retry if under max attempts
      if (job.attempts < job.maxAttempts) {
        job.priority -= 1; // Lower priority for retries
        this.queue.push(job);
        this.queue.sort((a, b) => b.priority - a.priority);
      }
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      activeJobs: this.activeJobs,
      handlerCount: this.handlers.size,
    };
  }
}

// Global queue instance
export const jobQueue = new JobQueue();
