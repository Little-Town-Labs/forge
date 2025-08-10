import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { 
  verifyAuthentication, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes, 
  HttpStatus, 
  validateRequestBody 
} from "@/utils/apiResponse";
import { 
  getRagUrls, 
  createRagUrl, 
  updateRagUrl, 
  deleteRagUrl 
} from "@/lib/config-service";
import type { RagUrlConfig, CrawlStatus, CrawlConfig } from "@/types";

/**
 * GET /api/admin/config/knowledge-base - List all RAG URL configurations
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

    const urls = await getRagUrls();
    
    return createSuccessResponse({
      urls,
      summary: {
        total: urls.length,
        active: urls.filter(u => u.isActive).length,
        successful: urls.filter(u => u.crawlStatus === 'success').length,
        failed: urls.filter(u => u.crawlStatus === 'failed').length,
        pending: urls.filter(u => u.crawlStatus === 'pending').length,
        inProgress: urls.filter(u => u.crawlStatus === 'in_progress').length,
        totalPagesIndexed: urls.reduce((sum, u) => sum + (u.pagesIndexed || 0), 0)
      }
    });
  } catch (error) {
    console.error("Failed to get RAG URL configurations:", error);
    return createErrorResponse(
      "Failed to retrieve knowledge base configurations",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * POST /api/admin/config/knowledge-base - Create new RAG URL configuration
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

    // Validate required fields
    const validation = await validateRequestBody(request, ['url', 'namespace', 'crawlConfig', 'isActive']);
    
    if (!validation.success) {
      return validation.response;
    }
    
    const body = validation.data as {
      url: string;
      namespace: string;
      crawlConfig: CrawlConfig;
      isActive: boolean;
    };

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return createErrorResponse(
        "Invalid URL format",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate namespace format (alphanumeric with hyphens/underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(body.namespace)) {
      return createErrorResponse(
        "Namespace must contain only letters, numbers, hyphens, and underscores",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate crawl config
    const crawlConfig = body.crawlConfig as CrawlConfig;
    if (!['single', 'limited', 'deep'].includes(crawlConfig.mode)) {
      return createErrorResponse(
        "Crawl mode must be 'single', 'limited', or 'deep'",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (crawlConfig.maxPages && (crawlConfig.maxPages < 1 || crawlConfig.maxPages > 1000)) {
      return createErrorResponse(
        "Max pages must be between 1 and 1000",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (crawlConfig.maxDepth && (crawlConfig.maxDepth < 1 || crawlConfig.maxDepth > 10)) {
      return createErrorResponse(
        "Max depth must be between 1 and 10",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    const newUrl: Omit<RagUrlConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      url: body.url,
      namespace: body.namespace,
      crawlConfig,
      isActive: Boolean(body.isActive),
      crawlStatus: 'pending' as CrawlStatus,
      pagesIndexed: 0,
      errorMessage: undefined,
      lastCrawled: undefined
    };

    const createdUrl = await createRagUrl(newUrl, userEmail);
    
    return createSuccessResponse({
      url: createdUrl,
      message: "Knowledge base URL configuration created successfully"
    });
  } catch (error) {
    console.error("Failed to create RAG URL configuration:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to create knowledge base configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * PUT /api/admin/config/knowledge-base - Update RAG URL configuration
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    
    if (!body.id || typeof body.id !== 'number') {
      return createErrorResponse(
        "URL configuration ID is required and must be a number",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate URL format if provided
    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return createErrorResponse(
          "Invalid URL format",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Validate namespace format if provided
    if (body.namespace && !/^[a-zA-Z0-9_-]+$/.test(body.namespace)) {
      return createErrorResponse(
        "Namespace must contain only letters, numbers, hyphens, and underscores",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate crawl config if provided
    if (body.crawlConfig) {
      const crawlConfig = body.crawlConfig as CrawlConfig;
      if (!['single', 'limited', 'deep'].includes(crawlConfig.mode)) {
        return createErrorResponse(
          "Crawl mode must be 'single', 'limited', or 'deep'",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }

      if (crawlConfig.maxPages && (crawlConfig.maxPages < 1 || crawlConfig.maxPages > 1000)) {
        return createErrorResponse(
          "Max pages must be between 1 and 1000",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }

      if (crawlConfig.maxDepth && (crawlConfig.maxDepth < 1 || crawlConfig.maxDepth > 10)) {
        return createErrorResponse(
          "Max depth must be between 1 and 10",
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Validate crawl status if provided
    if (body.crawlStatus && !['pending', 'success', 'failed', 'in_progress'].includes(body.crawlStatus)) {
      return createErrorResponse(
        "Crawl status must be 'pending', 'success', 'failed', or 'in_progress'",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    const updates: Partial<Omit<RagUrlConfig, 'id' | 'createdAt' | 'updatedAt'>> = {};
    
    if (body.url) updates.url = body.url;
    if (body.namespace) updates.namespace = body.namespace;
    if (body.crawlConfig) updates.crawlConfig = body.crawlConfig;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.crawlStatus) updates.crawlStatus = body.crawlStatus as CrawlStatus;
    if (body.pagesIndexed !== undefined) updates.pagesIndexed = Number(body.pagesIndexed);
    if (body.errorMessage !== undefined) updates.errorMessage = body.errorMessage;
    if (body.lastCrawled !== undefined) updates.lastCrawled = new Date(body.lastCrawled);

    const updatedUrl = await updateRagUrl(body.id, updates, userEmail);
    
    return createSuccessResponse({
      url: updatedUrl,
      message: "Knowledge base URL configuration updated successfully"
    });
  } catch (error) {
    console.error("Failed to update RAG URL configuration:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to update knowledge base configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * DELETE /api/admin/config/knowledge-base - Delete RAG URL configuration
 */
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    
    if (!body.id || typeof body.id !== 'number') {
      return createErrorResponse(
        "URL configuration ID is required and must be a number",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    await deleteRagUrl(body.id, userEmail);
    
    return createSuccessResponse({
      message: "Knowledge base URL configuration deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete RAG URL configuration:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to delete knowledge base configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}