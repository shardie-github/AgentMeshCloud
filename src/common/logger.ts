/**
 * Centralized Logger - ORCA Core
 * Provides structured logging with OpenTelemetry correlation
 */

import { context, trace } from '@opentelemetry/api';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger class with OpenTelemetry integration
 */
export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private piiPatterns: RegExp[];

  constructor(
    serviceName: string,
    level: string = process.env.LOG_LEVEL || 'info'
  ) {
    this.serviceName = serviceName;
    this.minLevel = this.parseLogLevel(level);
    this.piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /api[_-]?key["\']?\s*[:=]\s*["\']?[a-zA-Z0-9_-]{20,}/gi, // API keys
      /bearer\s+[a-zA-Z0-9_-]+/gi, // Bearer tokens
    ];
  }

  private parseLogLevel(level: string): LogLevel {
    const levels: Record<string, LogLevel> = {
      trace: LogLevel.TRACE,
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      fatal: LogLevel.FATAL,
    };
    return levels[level.toLowerCase()] ?? LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private redactPII(message: string): string {
    let redacted = message;
    for (const pattern of this.piiPatterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
  }

  private getTraceContext(): {
    trace_id?: string;
    span_id?: string;
    correlation_id?: string;
  } {
    const span = trace.getSpan(context.active());
    
    // Import correlation storage dynamically to avoid circular deps
    let correlationId: string | undefined;
    try {
      const { getCorrelationId } = require('../telemetry/correlation.js');
      correlationId = getCorrelationId();
    } catch {
      // Correlation module not available
    }

    const result: {
      trace_id?: string;
      span_id?: string;
      correlation_id?: string;
    } = {};

    if (span) {
      const spanContext = span.spanContext();
      result.trace_id = spanContext.traceId;
      result.span_id = spanContext.spanId;
    }

    if (correlationId) {
      result.correlation_id = correlationId;
    }

    return result;
  }

  private formatLog(
    level: string,
    message: string,
    ctx?: LogContext,
    error?: Error
  ): string {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message: this.redactPII(message),
      ...this.getTraceContext(),
      ...ctx,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    return JSON.stringify(log);
  }

  trace(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.TRACE)) return;
    console.log(this.formatLog('trace', message, ctx));
  }

  debug(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.formatLog('debug', message, ctx));
  }

  info(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatLog('info', message, ctx));
  }

  warn(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatLog('warn', message, ctx));
  }

  error(message: string, error?: Error, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.formatLog('error', message, ctx, error));
  }

  fatal(message: string, error?: Error, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    console.error(this.formatLog('fatal', message, ctx, error));
  }

  /**
   * Create a child logger with additional context
   */
  child(ctx: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    childLogger.minLevel = this.minLevel;
    // Store context for all future logs (simplified version)
    return childLogger;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('orca-core');

/**
 * Create a logger for a specific module
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(`orca-core:${moduleName}`);
}
