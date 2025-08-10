import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { 
  verifyAuthentication, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes, 
  HttpStatus 
} from "@/utils/apiResponse";
import { getAuditLog } from "@/lib/config-service";

/**
 * GET /api/admin/config/audit - Get configuration audit logs
 * Returns paginated audit log entries with filtering options
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters: {
      adminEmail?: string;
      resourceType?: 'ai_model' | 'rag_url' | 'system';
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {};

    // Extract and validate filters
    if (searchParams.get('adminEmail')) {
      filters.adminEmail = searchParams.get('adminEmail')!;
    }

    if (searchParams.get('resourceType')) {
      const resourceType = searchParams.get('resourceType');
      if (['ai_model', 'rag_url', 'system'].includes(resourceType!)) {
        filters.resourceType = resourceType as 'ai_model' | 'rag_url' | 'system';
      } else {
        return createErrorResponse(
          "Invalid resource type. Must be 'ai_model', 'rag_url', or 'system'",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    if (searchParams.get('action')) {
      filters.action = searchParams.get('action')!;
    }

    if (searchParams.get('startDate')) {
      try {
        filters.startDate = new Date(searchParams.get('startDate')!);
        if (isNaN(filters.startDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch {
        return createErrorResponse(
          "Invalid start date format. Use ISO 8601 format",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    if (searchParams.get('endDate')) {
      try {
        filters.endDate = new Date(searchParams.get('endDate')!);
        if (isNaN(filters.endDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch {
        return createErrorResponse(
          "Invalid end date format. Use ISO 8601 format",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Parse pagination parameters
    if (searchParams.get('limit')) {
      const limit = parseInt(searchParams.get('limit')!);
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        return createErrorResponse(
          "Limit must be a number between 1 and 1000",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
      filters.limit = limit;
    } else {
      filters.limit = 50; // Default limit
    }

    if (searchParams.get('offset')) {
      const offset = parseInt(searchParams.get('offset')!);
      if (isNaN(offset) || offset < 0) {
        return createErrorResponse(
          "Offset must be a non-negative number",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
      filters.offset = offset;
    } else {
      filters.offset = 0; // Default offset
    }

    // Validate date range
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      return createErrorResponse(
        "Start date must be before or equal to end date",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Get audit log entries
    const { entries, totalCount } = await getAuditLog(filters);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / filters.limit);
    const currentPage = Math.floor(filters.offset / filters.limit) + 1;
    const hasNextPage = filters.offset + filters.limit < totalCount;
    const hasPreviousPage = filters.offset > 0;

    return createSuccessResponse({
      entries,
      pagination: {
        totalCount,
        totalPages,
        currentPage,
        limit: filters.limit,
        offset: filters.offset,
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        adminEmail: filters.adminEmail || null,
        resourceType: filters.resourceType || null,
        action: filters.action || null,
        startDate: filters.startDate?.toISOString() || null,
        endDate: filters.endDate?.toISOString() || null
      },
      summary: {
        entriesInPage: entries.length,
        uniqueAdmins: [...new Set(entries.map(e => e.adminEmail))].length,
        uniqueActions: [...new Set(entries.map(e => e.action))].length,
        resourceTypes: {
          ai_model: entries.filter(e => e.resourceType === 'ai_model').length,
          rag_url: entries.filter(e => e.resourceType === 'rag_url').length,
          system: entries.filter(e => e.resourceType === 'system').length
        }
      }
    });
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return createErrorResponse(
      "Failed to retrieve audit logs",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}