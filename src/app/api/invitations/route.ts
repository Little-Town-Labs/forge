import { auth, currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { isAdmin } from "@/utils/admin";
import { checkRateLimit, getRateLimitValidation } from "@/utils/rateLimiter";
import { createSuccessResponse, createErrorResponse, ErrorCodes, HttpStatus, handleClerkServiceError } from "@/utils/apiResponse";

// Initialize Clerk Backend SDK client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

// Validate rate limiting configuration on startup and log warnings
const rateLimitValidation = getRateLimitValidation();
if (!rateLimitValidation.isValid) {
  console.warn('⚠️  Rate limiting configuration issues detected in invitations API:');
  rateLimitValidation.warnings.forEach(warning => console.warn(`   ${warning}`));
}



/**
 * POST /api/invitations - Create new invitation
 * Requires admin privileges
 */
export async function POST(req: Request) {
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

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(
        rateLimitResult.error!,
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        HttpStatus.TOO_MANY_REQUESTS
      );
      
      // Add Retry-After header
      if (rateLimitResult.retryAfter) {
        response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
      }
      
      // Add rate limiting backend info for debugging
      response.headers.set('X-RateLimit-Backend', rateLimitResult.backend);
      
      return response;
    }

    const { emailAddress } = await req.json();

    if (!emailAddress) {
      return createErrorResponse("Email address is required", ErrorCodes.MISSING_REQUIRED_FIELD, HttpStatus.BAD_REQUEST);
    }

    // Validate email format
    const emailRegx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegx.test(emailAddress)) {
      return createErrorResponse("Invalid email format", ErrorCodes.INVALID_FORMAT, HttpStatus.BAD_REQUEST);
    }

    // Create invitation using Clerk Backend SDK
    let invitation;
    try {
      invitation = await clerk.invitations.createInvitation({
        emailAddress,
        notify: true, // Send email notification
        ignoreExisting: false, // Don't ignore if user already exists
      });
    } catch (clerkError) {
      // Handle Clerk service errors first
      try {
        return handleClerkServiceError(clerkError, "invitation creation");
      } catch (specificError) {
        // If not a service error, handle specific Clerk API errors
        if (specificError && typeof specificError === 'object' && 'errors' in specificError) {
          const clerkApiError = specificError as { errors: Array<{ code: string; message: string }> };
          const errorCode = clerkApiError.errors?.[0]?.code;
          
          if (errorCode === 'duplicate_record') {
            return createErrorResponse(
              "An invitation for this email already exists or user is already registered",
              ErrorCodes.DUPLICATE_RECORD,
              HttpStatus.CONFLICT
            );
          }
        }
        
        // Re-throw for generic error handling
        throw specificError;
      }
    }

    // Get updated rate limit info after successful creation
    const updatedRateLimit = await checkRateLimit(userId);
    
    const response = createSuccessResponse(
      {
        invitation: {
          id: invitation.id,
          emailAddress: invitation.emailAddress,
          status: invitation.status,
          createdAt: invitation.createdAt,
        },
        rateLimiting: {
          remaining: updatedRateLimit.remaining ? Math.max(0, updatedRateLimit.remaining - 1) : undefined,
          hourlyRemaining: updatedRateLimit.hourlyRemaining ? Math.max(0, updatedRateLimit.hourlyRemaining - 1) : undefined,
          resetTime: updatedRateLimit.resetTime,
          backend: updatedRateLimit.backend,
          configValid: rateLimitValidation.isValid,
          ...(rateLimitValidation.warnings.length > 0 && {
            configWarnings: rateLimitValidation.warnings
          })
        }
      },
      "Invitation created successfully",
      HttpStatus.CREATED
    );
    
    // Add rate limit headers to inform client
    response.headers.set('X-RateLimit-Backend', updatedRateLimit.backend);
    if (updatedRateLimit.remaining !== undefined) {
      response.headers.set('X-RateLimit-Remaining', Math.max(0, updatedRateLimit.remaining - 1).toString());
    }
    if (updatedRateLimit.hourlyRemaining !== undefined) {
      response.headers.set('X-RateLimit-Hourly-Remaining', Math.max(0, updatedRateLimit.hourlyRemaining - 1).toString());
    }
    if (updatedRateLimit.resetTime !== undefined) {
      response.headers.set('X-RateLimit-Reset', Math.ceil(updatedRateLimit.resetTime / 1000).toString());
    }
    
    // Add validation status header for debugging
    response.headers.set('X-RateLimit-Config-Valid', rateLimitValidation.isValid.toString());
    
    return response;

  } catch (error) {
    console.error("Create invitation error:", error);
    return createErrorResponse(
      "Failed to create invitation",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * GET /api/invitations - List all pending invitations
 * Requires admin privileges
 */
export async function GET(req: Request) {
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

    // Parse pagination parameters
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch invitations using Clerk Backend SDK
    let invitationList;
    try {
      invitationList = await clerk.invitations.getInvitationList({
        limit,
        offset,
        status: ['pending'], // Only get pending invitations
      });
    } catch (clerkError) {
      // Handle Clerk service errors
      try {
        return handleClerkServiceError(clerkError, "invitation listing");
      } catch (specificError) {
        // Re-throw for generic error handling
        throw specificError;
      }
    }

    const invitations = invitationList.data.map(invitation => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      status: invitation.status,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    }));

    return createSuccessResponse(
      {
        invitations,
        totalCount: invitationList.totalCount,
        hasMore: (offset + invitations.length) < invitationList.totalCount,
      }
    );

  } catch (error) {
    console.error("List invitations error:", error);
    return createErrorResponse(
      "Failed to fetch invitations",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}