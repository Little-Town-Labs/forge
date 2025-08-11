import { getValidationStatus } from "@/utils/startup";
import { createApiResponse, HttpStatus } from "@/utils/apiResponse";

export const runtime = 'nodejs';

/**
 * GET /api/health - Health check endpoint with configuration validation
 * 
 * Returns the current health status of the application including
 * configuration validation results. Useful for monitoring and debugging.
 */
export async function GET() {
  try {
    const validationStatus = await getValidationStatus();
    
    const response = {
      status: validationStatus.isHealthy ? "healthy" : "unhealthy",
      timestamp: validationStatus.timestamp,
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "unknown",
      uptime: process.uptime(),
      validation: {
        isHealthy: validationStatus.isHealthy,
        components: validationStatus.results.map(result => ({
          component: result.component,
          isValid: result.isValid,
          issueCount: result.issues.length,
          warningCount: result.warnings.length,
          issues: result.issues,
          warnings: result.warnings,
          details: result.details
        }))
      }
    };
    
    const httpStatus = validationStatus.isHealthy ? 200 : 503;
    
    return createApiResponse(
      validationStatus.isHealthy,
      httpStatus,
      response,
      undefined,
      undefined,
      undefined,
      {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    );
    
  } catch (error) {
    console.error("Health check error:", error);
    
    return createApiResponse(
      false,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        status: "error",
        error: "Failed to perform health check",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      "Failed to perform health check",
      "HEALTH_CHECK_ERROR",
      undefined,
      {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    );
  }
}