/**
 * Metrics middleware for AgentMesh Cloud Orchestrator
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

interface MetricsData {
  requestCount: number;
  responseTime: number;
  statusCode: number;
  method: string;
  path: string;
  timestamp: number;
}

class MetricsCollector {
  private metrics: MetricsData[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 requests

  record(metric: MetricsData): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(): MetricsData[] {
    return [...this.metrics];
  }

  getStats(): {
    totalRequests: number;
    averageResponseTime: number;
    statusCodeCounts: Record<number, number>;
    methodCounts: Record<string, number>;
  } {
    const totalRequests = this.metrics.length;
    const averageResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests || 0;
    
    const statusCodeCounts: Record<number, number> = {};
    const methodCounts: Record<string, number> = {};
    
    this.metrics.forEach(metric => {
      statusCodeCounts[metric.statusCode] = (statusCodeCounts[metric.statusCode] || 0) + 1;
      methodCounts[metric.method] = (methodCounts[metric.method] || 0) + 1;
    });

    return {
      totalRequests,
      averageResponseTime,
      statusCodeCounts,
      methodCounts
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

const metricsCollector = new MetricsCollector();

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - startTime;
    
    metricsCollector.record({
      requestCount: metricsCollector.getMetrics().length + 1,
      responseTime,
      statusCode: res.statusCode,
      method: req.method,
      path: req.path,
      timestamp: Date.now()
    });

    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn(`Slow request detected: ${req.method} ${req.path} took ${responseTime}ms`);
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

export const getMetrics = (): MetricsData[] => {
  return metricsCollector.getMetrics();
};

export const getMetricsStats = () => {
  return metricsCollector.getStats();
};

export const clearMetrics = (): void => {
  metricsCollector.clear();
};