/**
 * Example: Database Validation Integration with Next.js
 * 
 * This file demonstrates how to integrate the database validation system
 * with a Next.js application startup sequence.
 */

import { runStartupValidation, getValidationStatus } from '../utils/startup';
import { globalDegradationDetector, getApplicationState, createDegradationMiddleware } from '../utils/degradation';
import type { DatabaseValidationResult } from '../lib/database';

/**
 * Initialize application with database validation
 * This should be called during application startup
 */
export async function initializeApplication(): Promise<{
  success: boolean;
  degradationMode: 'none' | 'demo' | 'readonly' | 'disabled';
  databaseValidation?: DatabaseValidationResult;
}> {
  console.log('🚀 Initializing Forge application...');
  
  try {
    // Run comprehensive startup validation
    const result = await runStartupValidation({
      exitOnError: false,
      allowDegradedMode: true,
      skipDatabaseValidation: false
    });

    // Update global degradation detector
    globalDegradationDetector.updateMode(result.degradationMode);

    // Log application state
    const appState = getApplicationState(result.degradationMode);
    console.log(`Application initialized in ${result.degradationMode.toUpperCase()} mode`);
    
    if (appState.limitations.length > 0) {
      console.log('⚠️  Current limitations:');
      appState.limitations.forEach(limitation => {
        console.log(`  • ${limitation}`);
      });
    }

    if (appState.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      appState.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    return result;
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    // Set to disabled mode on critical failure
    globalDegradationDetector.updateMode('disabled');
    
    return {
      success: false,
      degradationMode: 'disabled'
    };
  }
}

/**
 * Health check endpoint implementation
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  details: {
    mode: string;
    features: Record<string, boolean>;
    database?: {
      connected: boolean;
      responseTime?: number;
    };
  };
}> {
  try {
    const validation = await getValidationStatus();
    const appState = getApplicationState(validation.degradationMode);
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (validation.degradationMode === 'none') {
      status = 'healthy';
    } else if (validation.degradationMode === 'disabled') {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    // Find database validation result
    const dbResult = validation.results.find(r => r.component === 'Database Configuration');
    
    return {
      status,
      timestamp: validation.timestamp,
      details: {
        mode: validation.degradationMode,
        features: appState.features,
        database: dbResult?.details ? {
          connected: Boolean(dbResult.details.connected),
          responseTime: typeof dbResult.details.responseTime === 'number' 
            ? dbResult.details.responseTime 
            : undefined
        } : undefined
      }
    };
    
  } catch {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        mode: 'disabled',
        features: getApplicationState('disabled').features,
        database: {
          connected: false
        }
      }
    };
  }
}

/**
 * Example API middleware for handling degraded modes
 */
export function withDegradationHandling(
  handler: (req: Request) => Promise<Response>,
  requiredFeature?: keyof ReturnType<typeof getApplicationState>['features']
) {
  return async (req: Request): Promise<Response> => {
    const middleware = createDegradationMiddleware();
    
    // Get endpoint from URL
    const url = new URL(req.url);
    const endpoint = url.pathname;
    
    // Check if endpoint should be available
    const availability = middleware.checkEndpointAvailability(endpoint);
    
    if (!availability.available) {
      const response = middleware.getUnavailableResponse(endpoint);
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // If specific feature is required, check it
    if (requiredFeature) {
      const mode = globalDegradationDetector.getCurrentMode();
      const state = getApplicationState(mode);
      
      if (!state.features[requiredFeature]) {
        return new Response(JSON.stringify({
          error: 'Feature Unavailable',
          mode,
          message: `Feature '${requiredFeature}' is not available in ${mode} mode`,
          suggestions: state.recommendations
        }), {
          status: 423,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
    
    try {
      return await handler(req);
    } catch (error) {
      // Handle database connection errors during request processing
      if (error instanceof Error && error.message.includes('database')) {
        // Update degradation mode if database issues detected
        const currentMode = globalDegradationDetector.getCurrentMode();
        if (currentMode === 'none') {
          globalDegradationDetector.updateMode('demo');
          console.warn('Database error detected, switching to demo mode');
        }
      }
      
      throw error;
    }
  };
}

/**
 * Example usage in a Next.js API route
 */

/*
// pages/api/health.ts or app/api/health/route.ts
import { healthCheck } from '../../startup-validation-example';

export async function GET() {
  const health = await healthCheck();
  return Response.json(health, {
    status: health.status === 'unhealthy' ? 503 : 200
  });
}
*/

/*
// pages/api/chat.ts or app/api/chat/route.ts  
import { withDegradationHandling } from '../../startup-validation-example';
import { databaseFallbacks } from '../../utils/degradation';

const chatHandler = async (req: Request): Promise<Response> => {
  const mode = globalDegradationDetector.getCurrentMode();
  
  // Get model configuration based on current mode
  let modelConfig;
  if (mode === 'demo' || mode === 'disabled') {
    // Use fallback configuration
    modelConfig = databaseFallbacks.getFallbackModelConfig('openai');
  } else {
    // Try to get from database
    try {
      modelConfig = await getModelConfigFromDatabase();
    } catch (error) {
      // Fall back to hardcoded config
      modelConfig = databaseFallbacks.getFallbackModelConfig('openai');
    }
  }
  
  // Continue with chat logic...
  return Response.json({ message: 'Chat response' });
};

// Wrap handler with degradation middleware
export const GET = withDegradationHandling(chatHandler, 'chat');
export const POST = withDegradationHandling(chatHandler, 'chat');
*/

/*
// Example usage in layout.tsx or middleware
import { initializeApplication } from './startup-validation-example';

// In your root layout or middleware
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize application on server startup
  const appState = await initializeApplication();
  
  return (
    <html>
      <body>
        {appState.degradationMode !== 'disabled' ? (
          children
        ) : (
          <div>Application is currently unavailable. Please try again later.</div>
        )}
      </body>
    </html>
  );
}
*/

/**
 * Runtime degradation mode detection
 * Monitor for database issues and adjust mode accordingly
 */
export function startDegradationMonitoring() {
  // Monitor database health every 5 minutes
  const monitorInterval = setInterval(async () => {
    try {
      const validation = await getValidationStatus();
      const currentMode = globalDegradationDetector.getCurrentMode();
      
      // Update mode if it has changed
      if (validation.degradationMode !== currentMode) {
        console.log(`Degradation mode changed from ${currentMode} to ${validation.degradationMode}`);
        globalDegradationDetector.updateMode(validation.degradationMode);
      }
      
    } catch (error) {
      console.error('Error during degradation monitoring:', error);
      // If monitoring fails, assume worst case
      globalDegradationDetector.updateMode('disabled');
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Return cleanup function
  return () => {
    clearInterval(monitorInterval);
  };
}

/**
 * Example environment-based configuration
 */
export function getValidationConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    exitOnError: isProduction,
    allowDegradedMode: !isProduction, // Only allow degraded mode in non-production
    skipDatabaseValidation: process.env.SKIP_DB_VALIDATION === 'true',
    logLevel: isDevelopment ? 'debug' : 'error' as const
  };
}