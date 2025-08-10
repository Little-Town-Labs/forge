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
  getModelConfigs, 
  createModelConfig, 
  updateModelConfig, 
  deleteModelConfig
} from "@/lib/config-service";
import type { AiModelConfig, ModelProvider } from "@/types";

/**
 * GET /api/admin/config/models - List all AI model configurations
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

    const models = await getModelConfigs();
    
    return createSuccessResponse({
      models,
      summary: {
        total: models.length,
        enabled: models.filter(m => m.isEnabled).length,
        openai: models.filter(m => m.provider === 'openai').length,
        google: models.filter(m => m.provider === 'google').length,
        defaults: models.filter(m => m.isDefault).length
      }
    });
  } catch (error) {
    console.error("Failed to get model configurations:", error);
    return createErrorResponse(
      "Failed to retrieve model configurations",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * POST /api/admin/config/models - Create new AI model configuration
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
    const validation = await validateRequestBody(request, [
      'provider', 'modelName', 'isDefault', 'isEnabled', 
      'temperature', 'maxTokens', 'topP'
    ]);
    
    if (!validation.success) {
      return validation.response;
    }
    
    const body = validation.data as {
      provider: string;
      modelName: string;
      temperature: number;
      maxTokens: number;
      topP: number;
      systemPrompt?: string;
      apiKey?: string;
      isDefault: boolean;
      isEnabled: boolean;
    };

    // Additional validation for provider
    if (!['openai', 'google'].includes(body.provider)) {
      return createErrorResponse(
        "Invalid provider. Must be 'openai' or 'google'",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate numeric ranges
    if (body.temperature < 0 || body.temperature > 2) {
      return createErrorResponse(
        "Temperature must be between 0 and 2",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (body.topP < 0 || body.topP > 1) {
      return createErrorResponse(
        "Top P must be between 0 and 1",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (body.maxTokens < 1 || body.maxTokens > 100000) {
      return createErrorResponse(
        "Max tokens must be between 1 and 100000",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    const newModel: Omit<AiModelConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      provider: body.provider as ModelProvider,
      modelName: body.modelName,
      isDefault: Boolean(body.isDefault),
      isEnabled: Boolean(body.isEnabled),
      temperature: Number(body.temperature),
      maxTokens: Number(body.maxTokens),
      topP: Number(body.topP),
      systemPrompt: body.systemPrompt || undefined,
      apiKey: body.apiKey || undefined
    };

    const createdModel = await createModelConfig(newModel, userEmail);
    
    return createSuccessResponse({
      model: {
        ...createdModel,
        apiKey: createdModel.apiKey ? '[MASKED]' : undefined // Don't return actual API key
      },
      message: "Model configuration created successfully"
    });
  } catch (error) {
    console.error("Failed to create model configuration:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to create model configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * PUT /api/admin/config/models - Update AI model configuration
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
        "Model ID is required and must be a number",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate numeric fields if present
    if (body.temperature !== undefined && (body.temperature < 0 || body.temperature > 2)) {
      return createErrorResponse(
        "Temperature must be between 0 and 2",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (body.topP !== undefined && (body.topP < 0 || body.topP > 1)) {
      return createErrorResponse(
        "Top P must be between 0 and 1",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (body.maxTokens !== undefined && (body.maxTokens < 1 || body.maxTokens > 100000)) {
      return createErrorResponse(
        "Max tokens must be between 1 and 100000",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (body.provider && !['openai', 'google'].includes(body.provider)) {
      return createErrorResponse(
        "Invalid provider. Must be 'openai' or 'google'",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    const updates: Partial<Omit<AiModelConfig, 'id' | 'createdAt' | 'updatedAt'>> = {};
    
    if (body.provider) updates.provider = body.provider as ModelProvider;
    if (body.modelName) updates.modelName = body.modelName;
    if (body.isDefault !== undefined) updates.isDefault = Boolean(body.isDefault);
    if (body.isEnabled !== undefined) updates.isEnabled = Boolean(body.isEnabled);
    if (body.temperature !== undefined) updates.temperature = Number(body.temperature);
    if (body.maxTokens !== undefined) updates.maxTokens = Number(body.maxTokens);
    if (body.topP !== undefined) updates.topP = Number(body.topP);
    if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt;
    if (body.apiKey !== undefined) updates.apiKey = body.apiKey;

    const updatedModel = await updateModelConfig(body.id, updates, userEmail);
    
    return createSuccessResponse({
      model: {
        ...updatedModel,
        apiKey: updatedModel.apiKey ? '[MASKED]' : undefined // Don't return actual API key
      },
      message: "Model configuration updated successfully"
    });
  } catch (error) {
    console.error("Failed to update model configuration:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to update model configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * DELETE /api/admin/config/models - Delete AI model configuration
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
        "Model ID is required and must be a number",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    await deleteModelConfig(body.id, userEmail);
    
    return createSuccessResponse({
      message: "Model configuration deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete model configuration:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to delete model configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}