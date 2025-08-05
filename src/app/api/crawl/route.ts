import { seed } from "@/utils/seed";
import { SeedOptions } from "@/types";
import { EmbeddingProvider } from "@/utils/embeddings";
import { verifyAuthentication, createSuccessResponse, CommonErrors, validateRequestBody } from "@/utils/apiResponse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    // Authentication successful - userId available for future use
    // const userId = authResult.userId!;

    // Validate request body
    const bodyResult = await validateRequestBody<{ 
      url: string; 
      options?: SeedOptions;
      embeddingProvider?: EmbeddingProvider;
    }>(req, ['url']);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const { url, options, embeddingProvider = 'openai' } = bodyResult.data;
    
    // Provide default options if not specified
    const seedOptions: SeedOptions = options || {
      splittingMethod: 'recursive',
      chunkSize: 1000,
      chunkOverlap: 200
    };
  
    // Debug: Log environment variables
    console.log("Environment variables check:");
    console.log("PINECONE_API_KEY exists:", !!process.env.PINECONE_API_KEY);
    console.log("PINECONE_INDEX exists:", !!process.env.PINECONE_INDEX);
    console.log("PINECONE_INDEX value:", process.env.PINECONE_INDEX);
    console.log("Selected embedding provider:", embeddingProvider);
    
    // Check if Pinecone index is configured
    if (!process.env.PINECONE_INDEX) {
      return CommonErrors.configurationError("Pinecone index name is not configured. Please set PINECONE_INDEX in your .env.local file.");
    }
    
    const documents = await seed(url, 1, process.env.PINECONE_INDEX, seedOptions, 'default', embeddingProvider);
    return createSuccessResponse({ documents });
  } catch (error) {
    console.error("Crawl API error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('Pinecone API key')) {
        return CommonErrors.configurationError("Invalid Pinecone API key. Please check your environment variables.");
      } else if (error.message.includes('Failed to create Pinecone index')) {
        return CommonErrors.externalServiceError("Pinecone", "Failed to create index. Please check your API key and permissions.");
      } else if (error.message.includes('Failed crawling')) {
        return CommonErrors.externalServiceError("Web Crawler", "Failed to crawl the website. Please check the URL and try again.");
      }
    }
    
    return CommonErrors.internalError("Failed to crawl website", error instanceof Error ? error.message : undefined);
  }
} 