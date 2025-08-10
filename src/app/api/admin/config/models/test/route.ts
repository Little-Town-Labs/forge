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
import { testModelConnection } from "@/lib/config-service";
import type { ModelProvider } from "@/types";

/**
 * POST /api/admin/config/models/test - Test AI model connection
 * Tests connectivity to AI provider APIs with provided credentials
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
    const validation = await validateRequestBody(request, ['provider', 'apiKey']);
    
    if (!validation.success) {
      return validation.response;
    }
    
    const body = validation.data as {
      provider: string;
      apiKey: string;
      modelName?: string;
    };

    // Validate provider
    if (!['openai', 'google'].includes(body.provider)) {
      return createErrorResponse(
        "Invalid provider. Must be 'openai' or 'google'",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate API key format
    if (typeof body.apiKey !== 'string' || body.apiKey.trim().length === 0) {
      return createErrorResponse(
        "API key must be a non-empty string",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    const provider = body.provider as ModelProvider;
    const apiKey = body.apiKey.trim();
    const modelName = body.modelName || undefined;

    // Test the connection
    const testResult = await testModelConnection(provider, apiKey, modelName);
    
    if (testResult.success) {
      return createSuccessResponse({
        success: true,
        provider,
        modelName: modelName || null,
        responseTime: testResult.responseTime,
        message: `Successfully connected to ${provider.toUpperCase()} API`
      });
    } else {
      return createSuccessResponse({
        success: false,
        provider,
        modelName: modelName || null,
        responseTime: testResult.responseTime,
        error: testResult.error,
        message: `Failed to connect to ${provider.toUpperCase()} API`
      });
    }
  } catch (error) {
    console.error("Model connection test failed:", error);
    return createErrorResponse(
      "Model connection test failed",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}