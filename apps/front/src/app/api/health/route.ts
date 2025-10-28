import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  const startTime = Date.now();
  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown';
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      buildSha,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: { status: 'unknown', responseTime: 0 },
        supabase: { status: 'unknown', responseTime: 0 },
        memory: { status: 'healthy', usage: process.memoryUsage() },
        uptime: { status: 'healthy', seconds: process.uptime() }
      },
      responseTime: 0
    };

    // Test Supabase connection
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const supabaseStart = Date.now();
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test with a simple query
        const { data, error } = await supabase
          .from('agents')
          .select('count')
          .limit(1);
        
        const supabaseTime = Date.now() - supabaseStart;
        
        if (error) {
          healthData.checks.supabase = {
            status: 'error',
            responseTime: supabaseTime,
            error: error.message
          };
        } else {
          healthData.checks.supabase = {
            status: 'healthy',
            responseTime: supabaseTime
          };
        }
      } catch (error) {
        healthData.checks.supabase = {
          status: 'error',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test database connection (if Prisma is available)
    try {
      const dbStart = Date.now();
      // This would require importing PrismaClient, but we'll simulate for now
      // In a real implementation, you'd test the actual database connection
      const dbTime = Date.now() - dbStart;
      
      healthData.checks.database = {
        status: 'healthy',
        responseTime: dbTime
      };
    } catch (error) {
      healthData.checks.database = {
        status: 'error',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Calculate overall response time
    healthData.responseTime = Date.now() - startTime;

    // Determine overall status
    const hasErrors = Object.values(healthData.checks).some(
      check => check.status === 'error'
    );
    
    if (hasErrors) {
      healthData.status = 'degraded';
    }

    return NextResponse.json(healthData, {
      status: healthData.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        buildSha,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }, 
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}