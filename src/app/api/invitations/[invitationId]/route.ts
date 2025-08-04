import { auth, currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { isAdmin } from "@/utils/admin";
import { createSuccessResponse, createErrorResponse, ErrorCodes, HttpStatus, handleClerkServiceError } from "@/utils/apiResponse";

// Initialize Clerk Backend SDK client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });


interface RouteParams {
  params: {
    invitationId: string;
  };
}

/**
 * GET /api/invitations/[invitationId] - Get invitation details
 * Requires admin privileges
 */
export async function GET(req: Request, { params }: RouteParams) {
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

    const { invitationId } = params;

    if (!invitationId) {
      return createErrorResponse("Invitation ID is required", ErrorCodes.MISSING_REQUIRED_FIELD, HttpStatus.BAD_REQUEST);
    }

    // Fetch invitation details using Clerk Backend SDK
    // Note: Clerk Backend SDK doesn't have getInvitation, so we'll use getInvitationList with filter
    let invitationList;
    try {
      invitationList = await clerk.invitations.getInvitationList({
        limit: 50,
        offset: 0
      });
    } catch (clerkError) {
      // Handle Clerk service errors
      try {
        return handleClerkServiceError(clerkError, "invitation retrieval");
      } catch (specificError) {
        // If not a service error, handle specific Clerk API errors
        if (specificError && typeof specificError === 'object' && 'errors' in specificError) {
          const clerkApiError = specificError as { errors: Array<{ code: string; message: string }> };
          const errorCode = clerkApiError.errors?.[0]?.code;
          
          if (errorCode === 'resource_not_found') {
            return createErrorResponse("Invitation not found", ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
          }
        }
        
        // Re-throw for generic error handling
        throw specificError;
      }
    }
    
    const invitation = invitationList.data.find(inv => inv.id === invitationId);
    
    if (!invitation) {
      return createErrorResponse("Invitation not found", ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return createSuccessResponse({
      invitation: {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        status: invitation.status,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
        url: invitation.url,
      },
    });

  } catch (error) {
    console.error("Get invitation error:", error);
    return createErrorResponse(
      "Failed to fetch invitation details",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * DELETE /api/invitations/[invitationId] - Revoke invitation
 * Requires admin privileges
 */
export async function DELETE(req: Request, { params }: RouteParams) {
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

    const { invitationId } = params;

    if (!invitationId) {
      return createErrorResponse("Invitation ID is required", ErrorCodes.MISSING_REQUIRED_FIELD, HttpStatus.BAD_REQUEST);
    }

    // Revoke invitation using Clerk Backend SDK
    let revokedInvitation;
    try {
      revokedInvitation = await clerk.invitations.revokeInvitation(invitationId);
    } catch (clerkError) {
      // Handle Clerk service errors first
      try {
        return handleClerkServiceError(clerkError, "invitation revocation");
      } catch (specificError) {
        // If not a service error, handle specific Clerk API errors
        if (specificError && typeof specificError === 'object' && 'errors' in specificError) {
          const clerkApiError = specificError as { errors: Array<{ code: string; message: string }> };
          const errorCode = clerkApiError.errors?.[0]?.code;
          
          if (errorCode === 'resource_not_found') {
            return createErrorResponse("Invitation not found", ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
          }
          
          if (errorCode === 'invitation_already_accepted') {
            return createErrorResponse(
              "Cannot revoke an invitation that has already been accepted",
              "INVITATION_ALREADY_ACCEPTED",
              HttpStatus.BAD_REQUEST
            );
          }
        }
        
        // Re-throw for generic error handling
        throw specificError;
      }
    }

    return createSuccessResponse(
      {
        invitation: {
          id: revokedInvitation.id,
          emailAddress: revokedInvitation.emailAddress,
          status: revokedInvitation.status,
          updatedAt: revokedInvitation.updatedAt,
        },
      },
      "Invitation revoked successfully"
    );

  } catch (error) {
    console.error("Revoke invitation error:", error);
    return createErrorResponse(
      "Failed to revoke invitation",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}