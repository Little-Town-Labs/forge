import { Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { getContext } from "@/utils/context";
import { verifyAuthentication, StreamingErrors } from "@/utils/apiResponse";
import { EmbeddingProvider } from "@/utils/embeddings";
import { getDefaultModelConfig, getModelConfigs } from "@/lib/config-service";
import { ModelProvider, AiModelConfig } from "@/types";

// Request-level cache to avoid multiple database calls per request
let requestCache: {
  allModels?: AiModelConfig[];
  timestamp?: number;
} = {};

// Cache TTL: 30 seconds per request to balance performance and data freshness
const CACHE_TTL = 30 * 1000;

/**
 * Clear the request cache (useful for testing or forced refresh)
 * Note: This function is available for internal cache management
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearModelCache(): void {
  requestCache = {};
}

/**
 * Get default system prompt when none is configured
 */
function getDefaultSystemPrompt(): string {
  return `AI assistant is a brand new, powerful, human-like artificial intelligence.
The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
AI is a well-behaved and well-mannered individual.
AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
AI assistant is a big fan of Pinecone and Vercel.`;
}

/**
 * Create hardcoded fallback configuration when database is unavailable
 */
function getHardcodedFallback(provider: ModelProvider): AiModelConfig {
  const baseConfig = {
    id: 0,
    isDefault: true,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemPrompt: getDefaultSystemPrompt()
  };

  if (provider === "google") {
    return {
      ...baseConfig,
      provider: "google",
      modelName: "gemini-2.5-flash",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    };
  } else {
    return {
      ...baseConfig,
      provider: "openai",
      modelName: "gpt-5-nano",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    };
  }
}

/**
 * Get all model configurations with request-level caching
 */
async function getCachedModelConfigs(): Promise<AiModelConfig[]> {
  const now = Date.now();
  
  // Return cached models if still valid
  if (requestCache.allModels && requestCache.timestamp && (now - requestCache.timestamp) < CACHE_TTL) {
    return requestCache.allModels;
  }

  try {
    const models = await getModelConfigs();
    requestCache = { allModels: models, timestamp: now };
    return models;
  } catch (error) {
    console.warn("Failed to fetch model configs from database:", error);
    // Return cached models even if expired, or empty array if no cache
    return requestCache.allModels || [];
  }
}

/**
 * Single optimized function to get the best available model configuration
 * Handles all fallback logic in priority order with a single database call
 */
async function getOptimalModelConfig(
  provider: ModelProvider,
  modelId?: number
): Promise<AiModelConfig> {
  const startTime = Date.now();
  let fallbackReason = "unknown";
  
  try {
    // Get all models with caching
    const allModels = await getCachedModelConfigs();
    
    if (allModels.length > 0) {
      console.log(`Loaded ${allModels.length} model configurations from cache/database`);
      
      // Priority 1: Specific model by ID (if provided)
      if (modelId) {
        const specificModel = allModels.find(m => m.id === modelId && m.isEnabled);
        if (specificModel) {
          console.log(`Using specific model by ID ${modelId}: ${specificModel.modelName} (${Date.now() - startTime}ms)`);
          return specificModel;
        }
        console.warn(`Requested model ID ${modelId} not found or disabled`);
        fallbackReason = "model_id_not_found";
      }
      
      // Priority 2: Default model for the provider
      const defaultModel = allModels.find(m => 
        m.provider === provider && m.isDefault && m.isEnabled
      );
      if (defaultModel) {
        console.log(`Using default ${provider} model: ${defaultModel.modelName} (${Date.now() - startTime}ms)`);
        return defaultModel;
      }
      fallbackReason = "no_default_model";
      
      // Priority 3: Any enabled model for the provider
      const fallbackModel = allModels.find(m => 
        m.provider === provider && m.isEnabled
      );
      if (fallbackModel) {
        console.log(`Using fallback enabled ${provider} model: ${fallbackModel.modelName} (${Date.now() - startTime}ms)`);
        return fallbackModel;
      }
      fallbackReason = "no_enabled_models_for_provider";
    } else {
      console.warn("No model configurations loaded from database");
      fallbackReason = "empty_database_result";
    }
    
    // Priority 4: Try individual default model lookup as final database attempt
    try {
      const defaultFromService = await getDefaultModelConfig(provider);
      if (defaultFromService) {
        console.log(`Using service default ${provider} model: ${defaultFromService.modelName} (${Date.now() - startTime}ms)`);
        return defaultFromService;
      }
    } catch (serviceError) {
      console.warn("Individual default model lookup failed:", serviceError);
      fallbackReason = "service_lookup_failed";
    }
    
  } catch (error) {
    console.warn("Database model config lookup failed:", error);
    fallbackReason = "database_error";
  }
  
  // Ultimate fallback: hardcoded configuration
  const hardcodedConfig = getHardcodedFallback(provider);
  console.warn(`Using hardcoded fallback for ${provider} (reason: ${fallbackReason}): ${hardcodedConfig.modelName} (${Date.now() - startTime}ms)`);
  return hardcodedConfig;
}

/**
 * Create AI model instance from configuration
 */
function createAIModel(config: AiModelConfig) {
  if (config.provider === "google") {
    // Use configured API key if available, otherwise fall back to environment
    if (config.apiKey) {
      // Create a new Google client with the specific API key
      const customGoogle = google({
        apiKey: config.apiKey
      });
      return customGoogle(config.modelName);
    } else {
      // Use environment-configured Google client
      return google(config.modelName);
    }
  } else {
    // Use configured API key if available, otherwise fall back to environment
    if (config.apiKey) {
      // Create a new OpenAI client with the specific API key
      const customOpenAI = openai({
        apiKey: config.apiKey
      });
      return customOpenAI(config.modelName);
    } else {
      // Use environment-configured OpenAI client
      return openai(config.modelName);
    }
  }
}

export async function POST(req: Request) {
  // Verify authentication
  const authResult = await verifyAuthentication();
  if (!authResult.success) {
    // Return appropriate streaming error based on the error type
    return authResult.response?.status === 503 
      ? StreamingErrors.authServiceUnavailable()
      : StreamingErrors.unauthorized("Please sign in to access the chat");
  }
  
  // Authentication successful - userId available for future use
  // const userId = authResult.userId!;

  try {
    const { messages, provider = "openai", modelId } = await req.json();

    // Get optimal model configuration with single cached lookup and simplified fallback logic
    const modelConfig = await getOptimalModelConfig(provider as ModelProvider, modelId);

    // Validate that we have a working configuration
    if (!modelConfig || !modelConfig.isEnabled) {
      console.error("No enabled AI model configuration available:", { provider, modelId });
      return StreamingErrors.internalError("No enabled AI model configuration available");
    }

    // Detailed configuration logging is now handled in getOptimalModelConfig
    // Only log essential info here to avoid duplicate logging
    if (modelConfig.id === 0) {
      console.log("Using hardcoded fallback model configuration");
    }

    // Get the last message for context
    const lastMessage = messages[messages.length - 1];

    // Determine embedding provider based on the selected model provider
    const embeddingProvider: EmbeddingProvider = modelConfig.provider === "google" ? "google" : "openai";

    // Get the context from the last message using the appropriate embedding provider
    const context = await getContext(lastMessage.content, 'default', 3000, 0.3, true, embeddingProvider);

    // Build system prompt from configuration or use default
    const systemPrompt = modelConfig.systemPrompt || getDefaultSystemPrompt();
    const contextualizedPrompt = `${systemPrompt}
START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK
AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
AI assistant will not invent anything that is not drawn directly from the context.`;

    const prompt = [
      {
        role: "system",
        content: contextualizedPrompt,
      },
    ];

    // Create the appropriate AI model instance with configured parameters
    let aiModel;
    try {
      aiModel = createAIModel(modelConfig);
    } catch (error) {
      console.error("Failed to create AI model instance:", error);
      return StreamingErrors.internalError("Failed to initialize AI model");
    }

    // Ask AI for a streaming chat completion given the prompt
    const response = await streamText({
      model: aiModel,
      messages: [
        ...prompt,
        ...messages.filter((message: Message) => message.role === "user"),
      ],
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      topP: modelConfig.topP,
    });
    
    // Convert the response into a friendly text-stream
    return response.toDataStreamResponse();
    
  } catch (error) {
    console.error("Chat API error:", error);
    return StreamingErrors.internalError("Failed to process chat request");
  }
}

// Cache management function available internally
// Note: clearModelCache is available as a local function for internal use 