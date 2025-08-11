/**
 * System Initialization Status API Endpoint
 * 
 * GET /api/admin/system/init - Get current initialization status
 * POST /api/admin/system/init - Force re-initialization (admin only)
 */

import { NextRequest } from "next/server";

export const runtime = 'nodejs';
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { 
  verifyAuthentication, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes, 
  HttpStatus 
} from "@/utils/apiResponse";
import { 
  getDatabaseInitializationStatus, 
  forceReinitializeDatabase 
} from "@/lib/database-init";
import { getStartupStatus, forceReinitializeApplication } from "@/lib/startup";

/**
 * GET /api/admin/system/init - Get initialization status
 */
export async function GET() {
  try {
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return createErrorResponse("Unable to verify user email", ErrorCodes.INVALID_USER, HttpStatus.BAD_REQUEST);
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    if (!isAdmin(userEmail)) {
      return createErrorResponse("Admin privileges required", ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    // Get detailed initialization status
    const [databaseStatus, startupStatus] = await Promise.all([
      getDatabaseInitializationStatus(),
      Promise.resolve(getStartupStatus())
    ]);

    const response = {
      timestamp: new Date().toISOString(),
      database: {
        initialized: databaseStatus.initialized,
        tables: databaseStatus.tables,
        indexCount: databaseStatus.indexCount,
        error: databaseStatus.error
      },
      startup: {
        timestamp: startupStatus.timestamp,
        uptime: startupStatus.uptime,
        environment: startupStatus.environment,
        encryption: startupStatus.encryption
      },
      overall: {
        ready: databaseStatus.initialized && 
               startupStatus.environment.valid && 
               startupStatus.encryption.configured,
        issues: [
          ...(!databaseStatus.initialized ? ['Database not initialized'] : []),
          ...(!startupStatus.environment.valid ? [`Missing environment variables: ${startupStatus.environment.missingVariables.join(', ')}`] : []),
          ...(!startupStatus.encryption.configured ? ['Encryption not configured'] : []),
          ...(!startupStatus.encryption.working && startupStatus.encryption.configured ? ['Encryption not working'] : [])
        ]
      }
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error("Failed to get initialization status:", error);
    return createErrorResponse(
      "Failed to get initialization status",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * POST /api/admin/system/init - Force re-initialization
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return createErrorResponse("Unable to verify user email", ErrorCodes.INVALID_USER, HttpStatus.BAD_REQUEST);
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    if (!isAdmin(userEmail)) {
      return createErrorResponse("Admin privileges required", ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    // Parse request body to determine initialization type
    const body = await request.json();
    const { type = 'full' } = body; // 'full' or 'database'

    console.log(`[INIT-API] Force re-initialization requested by ${userEmail}, type: ${type}`);

    let result;

    if (type === 'database') {
      // Force database re-initialization only
      result = await forceReinitializeDatabase();
      
      return createSuccessResponse({
        message: "Database re-initialization completed",
        type: 'database',
        success: result.initialized,
        duration: result.duration,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    } else {
      // Force full application re-initialization
      result = await forceReinitializeApplication();
      
      return createSuccessResponse({
        message: "Full application re-initialization completed",
        type: 'full',
        success: result.success,
        duration: result.duration,
        database: result.database,
        environment: result.environment,
        encryption: result.encryption,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Failed to force re-initialization:", error);
    return createErrorResponse(
      "Failed to force re-initialization",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}