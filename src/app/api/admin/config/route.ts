import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { getValidationStatus } from "@/utils/startup";
import { getRateLimitInfo } from "@/utils/rateLimiter";
import { createSuccessResponse, createErrorResponse, ErrorCodes, HttpStatus } from "@/utils/apiResponse";


/**
 * GET /api/admin/config - Get detailed configuration status
 * Requires admin privileges - provides comprehensive configuration information
 * for debugging and monitoring purposes.
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

    // Get validation status
    const validationStatus = getValidationStatus();
    
    // Gather additional configuration information
    const configInfo = {
      validation: validationStatus,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextjsVersion: process.env.npm_package_dependencies?.next || "unknown",
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      },
      rateLimiting: getRateLimitInfo(),
      features: {
        pineconeConfigured: !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX),
        clerkConfigured: !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        adminConfigured: !!process.env.ADMIN_EMAILS
      },
      security: {
        adminEmailsCount: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').filter(e => e.trim()).length : 0,
        usingExampleEmails: process.env.ADMIN_EMAILS === 'admin@company.com,manager@company.com',
        hasSecretKeys: !!(process.env.CLERK_SECRET_KEY && process.env.OPENAI_API_KEY)
      },
      requestInfo: {
        userEmail,
        userId,
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