import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { getValidationStatus } from "@/utils/startup";
import { getRateLimitInfo } from "@/utils/rateLimiter";
import { verifyAuthentication, createSuccessResponse, createErrorResponse, ErrorCodes, HttpStatus } from "@/utils/apiResponse";
import { getModelConfigs, getRagUrls, getDatabaseStats } from "@/lib/config-service";


/**
 * GET /api/admin/config - Get detailed configuration status
 * Requires admin privileges - provides comprehensive configuration information
 * for debugging and monitoring purposes.
 */
export async function GET() {
  try {
    // Verify authentication
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
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

    // Get validation status
    const validationStatus = getValidationStatus();
    
    // Get database-driven configuration data
    let modelConfigs: unknown[], ragUrls: unknown[], databaseStats: unknown;
    try {
      [modelConfigs, ragUrls, databaseStats] = await Promise.all([
        getModelConfigs(),
        getRagUrls(), 
        getDatabaseStats()
      ]);
    } catch (dbError) {
      console.warn('Database configuration not available:', dbError);
      modelConfigs = [];
      ragUrls = [];
      databaseStats = { health: { connected: false, responseTime: 0, error: 'Database unavailable' }, tableStats: [], connectionInfo: { database: 'unknown', user: 'unknown', applicationName: 'forge-admin' } };
    }

    // Gather comprehensive configuration information
    const configInfo = {
      validation: validationStatus,
      database: databaseStats,
      aiModels: {
        configured: modelConfigs,
        summary: {
          total: modelConfigs.length,
          enabled: modelConfigs.filter((m: unknown) => (m as Record<string, unknown>)?.isEnabled).length,
          openai: modelConfigs.filter((m: unknown) => (m as Record<string, unknown>)?.provider === 'openai').length,
          google: modelConfigs.filter((m: unknown) => (m as Record<string, unknown>)?.provider === 'google').length
        }
      },
      knowledgeBase: {
        configured: ragUrls,
        summary: {
          total: ragUrls.length,
          active: ragUrls.filter((u: unknown) => (u as Record<string, unknown>)?.isActive).length,
          successful: ragUrls.filter((u: unknown) => (u as Record<string, unknown>)?.crawlStatus === 'success').length,
          totalPagesIndexed: ragUrls.reduce((sum: number, u: unknown) => sum + ((u as Record<string, unknown>)?.pagesIndexed as number || 0), 0)
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextjsVersion: "15.4.4", // Hardcoded for now
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      },
      rateLimiting: getRateLimitInfo(),
      crawlConfig: {
        maxPages: parseInt(process.env.MAX_CRAWL_PAGES || '100'),
        maxDepth: parseInt(process.env.MAX_CRAWL_DEPTH || '3'),
        timeoutMinutes: Math.round(parseInt(process.env.CRAWL_TIMEOUT_MS || '600000') / 60000),
        robotsTxtSupport: false, // Not currently implemented
        rateLimits: {
          singleCrawlsPerHour: parseInt(process.env.MAX_SINGLE_CRAWLS_PER_HOUR || '60'),
          limitedCrawlsPerHour: parseInt(process.env.MAX_LIMITED_CRAWLS_PER_HOUR || '10'),
          deepCrawlsPerHour: parseInt(process.env.MAX_DEEP_CRAWLS_PER_HOUR || '3')
        }
      },
      features: {
        databaseConfigured: databaseStats.health.connected,
        encryptionConfigured: !!process.env.CONFIG_ENCRYPTION_KEY,
        pineconeConfigured: !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX),
        clerkConfigured: !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        googleAiConfigured: !!process.env.GOOGLE_AI_API_KEY,
        adminConfigured: !!process.env.ADMIN_EMAILS
      },
      security: {
        adminEmailsCount: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').filter(e => e.trim()).length : 0,
        usingExampleEmails: process.env.ADMIN_EMAILS === 'admin@company.com,manager@company.com',
        hasSecretKeys: !!(process.env.CLERK_SECRET_KEY && process.env.OPENAI_API_KEY),
        encryptionKeyConfigured: !!process.env.CONFIG_ENCRYPTION_KEY
      },
      requestInfo: {
        userEmail,
        userId: authResult.userId!,
        timestamp: new Date().toISOString(),
        userAgent: 'server-side-request'
      }
    };
    
    return createSuccessResponse(configInfo);

  } catch (error) {
    console.error("Admin config check error:", error);
    return createErrorResponse(
      "Failed to retrieve configuration information",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}