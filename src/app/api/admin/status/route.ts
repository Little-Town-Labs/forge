import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { 
  verifyAuthentication, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes, 
  HttpStatus 
} from "@/utils/apiResponse";

/**
 * GET /api/admin/status - Check if current user has admin privileges
 * This endpoint provides a safe way for client-side components to check admin status
 * without exposing environment variables or admin logic to the client
 */
export async function GET() {
  try {
    // Verify authentication
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    // Get current user details
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return createErrorResponse("Unable to verify user email", ErrorCodes.INVALID_USER, HttpStatus.BAD_REQUEST);
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    
    // Check admin status server-side
    const adminStatus = isAdmin(userEmail);
    
    return createSuccessResponse({
      isAdmin: adminStatus,
      userEmail: userEmail,
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Failed to check admin status:", error);
    return createErrorResponse(
      "Failed to check admin status",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
