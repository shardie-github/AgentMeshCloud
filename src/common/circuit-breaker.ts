/**
 * Circuit Breaker pattern for HTTP adapters
 * Prevents cascading failures by failing fast when service is degraded
 */

import { createLogger } from './logger.js';

const logger = createLogger('circuit-breaker');

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number;  // Failures before opening
  successThreshold: number;  // Successes to close from half-open
  timeout: number;           // Time before attempting recovery (ms)
  name: string;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for ${this.config.name}`);
      }
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker entering HALF_OPEN`, { name: this.config.name });
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED`, { name: this.config.name });
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      logger.warn(`Circuit breaker OPEN`, { 
        name: this.config.name,
        failures: this.failureCount,
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
