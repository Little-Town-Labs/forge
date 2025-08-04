import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { getRateLimitInfo, checkRateLimit } from "@/utils/rateLimiter";
import { createSuccessResponse, createErrorResponse, ErrorCodes, HttpStatus } from "@/utils/apiResponse";

/**
 * GET /api/admin/rate-limit-status - Get rate limiting status for current admin
 * Requires admin privileges - provides current rate limit status and configuration
 */
export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized - Please sign in", ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    // Get current user details to check admin status
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return createErrorResponse("Unable to verify user email", ErrorCodes.INVALID_USER, HttpStatus.BAD_REQUEST);
    }

    // Verify admin privileges
    const userEmail = user.emailAddresses[0].emailAddress;
    if (!isAdmin(userEmail)) {
      return createErrorResponse("Admin privileges required", ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    // Get rate limiting configuration
    const rateLimitInfo = getRateLimitInfo();
    
    // Get current rate limit status for this admin (without incrementing counters)
    // Note: This is a status check only, so we don't actually increment counters
    let currentStatus;
    try {
      // For status check, we'll create a dummy check that doesn't increment
      currentStatus = await checkRateLimit(`status_check_${userId}`);
    } catch (error) {
      console.error("Rate limit status check error:", error);
      currentStatus = {
        allowed: true,
        backend: 'error',
        error: 'Unable to check current status'
      };
    }
    
    const statusInfo = {
      configuration: rateLimitInfo,
      currentStatus: {
        backend: currentStatus.backend,
        allowed: currentStatus.allowed,
        remaining: currentStatus.remaining,
        hourlyRemaining: currentStatus.hourlyRemaining,
        resetTime: currentStatus.resetTime,
        error: currentStatus.error
      },
      recommendations: generateRecommendations(rateLimitInfo),
      healthCheck: {
        timestamp: new Date().toISOString(),
        userId,
        userEmail
      }
    };
    
    return createSuccessResponse(statusInfo);

  } catch (error) {
    console.error("Rate limit status check error:", error);
    return createErrorResponse(
      "Failed to retrieve rate limiting status",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Generate recommendations based on current rate limiting configuration
 */
function generateRecommendations(rateLimitInfo: { mode: string; environment: { nodeEnv?: string; redisConfigured: boolean } }): string[] {
  const recommendations: string[] = [];
  const { mode, environment } = rateLimitInfo;
  
  if (mode === 'memory' && environment.nodeEnv === 'production') {
    recommendations.push('🔴 CRITICAL: Switch to Redis-based rate limiting for production deployment');
    recommendations.push('Set REDIS_URL environment variable to enable Redis rate limiting');
  }
  
  if (mode === 'disabled') {
    recommendations.push('⚠️  Rate limiting is disabled - consider enabling for better security');
    recommendations.push('Relying on Clerk\'s built-in rate limiting only');
  }
  
  if (mode === 'redis' && !environment.redisConfigured) {
    recommendations.push('🔴 Redis mode enabled but REDIS_URL not configured');
  }
  
  if (mode === 'redis' && environment.redisConfigured) {
    recommendations.push('✅ Optimal configuration - using Redis for distributed rate limiting');
  }
  
  if (mode === 'memory' && environment.nodeEnv !== 'production') {
    recommendations.push('✅ Good for development - using in-memory rate limiting');
    recommendations.push('Consider testing with Redis before production deployment');
  }
  
  return recommendations;
}