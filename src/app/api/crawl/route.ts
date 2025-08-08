import { seed } from "@/utils/seed";
import { SeedOptions, CrawlConfig, CrawlRequest, CrawlStats, Page } from "@/types";
import { EmbeddingProvider } from "@/utils/embeddings";
import { verifyAuthentication, createSuccessResponse, CommonErrors, validateRequestBody, createErrorResponse, ErrorCodes, HttpStatus } from "@/utils/apiResponse";

export const runtime = "nodejs";

/**
 * Validate and sanitize crawl configuration
 * @param crawlConfig - The crawl configuration to validate
 * @returns Validation result with sanitized config if valid
 */
function validateCrawlConfig(crawlConfig: CrawlConfig): { 
  isValid: boolean; 
  error?: string; 
  sanitizedConfig?: CrawlConfig;
} {
  // Input type validation
  if (!crawlConfig || typeof crawlConfig !== 'object') {
    return { isValid: false, error: "Invalid crawl configuration: must be an object" };
  }

  const { mode, maxPages, maxDepth, ...extraProps } = crawlConfig;
  
  // Check for unexpected properties
  const unexpectedProps = Object.keys(extraProps);
  if (unexpectedProps.length > 0) {
    return { 
      isValid: false, 
      error: `Unexpected properties in crawl configuration: ${unexpectedProps.join(', ')}` 
    };
  }

  // Validate mode (required field)
  if (!mode) {
    return { isValid: false, error: "Crawl mode is required" };
  }
  
  if (typeof mode !== 'string' || !['single', 'limited', 'deep'].includes(mode)) {
    return { isValid: false, error: "Invalid crawl mode. Must be 'single', 'limited', or 'deep'" };
  }

  // Initialize sanitized config with only the mode
  const sanitizedConfig: CrawlConfig = { mode };

  // Validate based on crawl mode
  switch (mode) {
    case 'single':
      // Single mode should not have maxPages or maxDepth
      if (maxPages !== undefined) {
        return { isValid: false, error: "Single crawl mode should not specify maxPages" };
      }
      if (maxDepth !== undefined) {
        return { isValid: false, error: "Single crawl mode should not specify maxDepth" };
      }
      break;

    case 'limited':
      // Limited mode should not have maxDepth
      if (maxDepth !== undefined) {
        return { isValid: false, error: "Limited crawl mode should not specify maxDepth" };
      }

      // Validate maxPages for limited mode
      if (maxPages === undefined) {
        return { isValid: false, error: "Limited crawl mode requires maxPages to be specified" };
      }

      if (typeof maxPages !== 'number') {
        return { isValid: false, error: "maxPages must be a number" };
      }

      if (!Number.isInteger(maxPages)) {
        return { isValid: false, error: "maxPages must be an integer" };
      }

      if (maxPages < 1) {
        return { isValid: false, error: "maxPages must be a positive number (minimum 1)" };
      }

      if (maxPages > 1000) {
        return { isValid: false, error: "maxPages cannot exceed 1000 for security reasons" };
      }

      // For limited mode, enforce the original constraint of max 50 pages
      if (maxPages > 50) {
        return { isValid: false, error: "For limited crawl mode, maxPages must be between 1 and 50" };
      }

      sanitizedConfig.maxPages = maxPages;
      break;

    case 'deep':
      // Deep mode should not have maxPages
      if (maxPages !== undefined) {
        return { isValid: false, error: "Deep crawl mode should not specify maxPages" };
      }

      // Validate maxDepth for deep mode
      if (maxDepth === undefined) {
        return { isValid: false, error: "Deep crawl mode requires maxDepth to be specified" };
      }

      if (typeof maxDepth !== 'number') {
        return { isValid: false, error: "maxDepth must be a number" };
      }

      if (!Number.isInteger(maxDepth)) {
        return { isValid: false, error: "maxDepth must be an integer" };
      }

      if (maxDepth < 1) {
        return { isValid: false, error: "maxDepth must be a positive number (minimum 1)" };
      }

      if (maxDepth > 10) {
        return { isValid: false, error: "maxDepth cannot exceed 10 for security and performance reasons" };
      }

      // For deep mode, enforce the original constraint of depth 2 or 3
      if (![2, 3].includes(maxDepth)) {
        return { isValid: false, error: "For deep crawl mode, maxDepth must be 2 or 3" };
      }

      sanitizedConfig.maxDepth = maxDepth;
      break;

    default:
      // This should never happen due to earlier validation, but included for completeness
      return { isValid: false, error: `Invalid crawl mode: ${mode}` };
  }

  return { isValid: true, sanitizedConfig };
}

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
    const bodyResult = await validateRequestBody<CrawlRequest>(req, ['url']);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const { url, options, embeddingProvider = 'openai', crawlConfig } = bodyResult.data;
    
    // Provide default crawl configuration if not specified (backward compatibility)
    const defaultCrawlConfig: CrawlConfig = crawlConfig || { mode: 'single' };
    
    // Validate and sanitize crawl configuration
    const validation = validateCrawlConfig(defaultCrawlConfig);
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, ErrorCodes.INVALID_REQUEST_BODY, HttpStatus.BAD_REQUEST);
    }

    // Use the sanitized configuration for security
    const sanitizedCrawlConfig = validation.sanitizedConfig!;
    
    // Provide default options if not specified
    const seedOptions: SeedOptions = options || {
      splittingMethod: 'recursive',
      chunkSize: 1000,
      chunkOverlap: 200
    };
    
    // Set timeout based on crawl mode
    const timeoutMs = sanitizedCrawlConfig.mode === 'single' ? 30000 :
                     sanitizedCrawlConfig.mode === 'limited' ? 300000 : 600000;
    
    console.log(`Setting API timeout: ${timeoutMs}ms (${Math.round(timeoutMs / 1000)}s) for ${sanitizedCrawlConfig.mode} mode`);
  
    // Debug: Log environment variables
    console.log("Environment variables check:");
    console.log("PINECONE_API_KEY exists:", !!process.env.PINECONE_API_KEY);
    console.log("PINECONE_INDEX exists:", !!process.env.PINECONE_INDEX);
    console.log("PINECONE_INDEX value:", process.env.PINECONE_INDEX);
    console.log("Selected embedding provider:", embeddingProvider);
    console.log("Crawl configuration (sanitized):", sanitizedCrawlConfig);
    
    // Check if Pinecone index is configured
    if (!process.env.PINECONE_INDEX) {
      return CommonErrors.configurationError("Pinecone index name is not configured. Please set PINECONE_INDEX in your .env.local file.");
    }
    
    // Execute crawl with timeout - use proper cleanup pattern
    const crawlPromise = seed(url, process.env.PINECONE_INDEX, seedOptions, sanitizedCrawlConfig, 'default', embeddingProvider as EmbeddingProvider, timeoutMs);
    
    // Create timeout with stored ID for cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('API_TIMEOUT'));
      }, timeoutMs);
    });
    
    // Execute race with proper cleanup
    let result: { documents: Page[], crawlStats: CrawlStats };
    try {
      result = await Promise.race([crawlPromise, timeoutPromise]) as { documents: Page[], crawlStats: CrawlStats };
      console.log('Crawl completed successfully, clearing timeout');
    } finally {
      // Always clear the timeout to prevent memory leaks and race conditions
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
        console.log('API timeout cleared');
      }
    }
    
    // Check if there were any failures during crawling
    const hasFailures = result.crawlStats.failedPages?.length > 0 || result.crawlStats.errors?.length > 0;
    const hasSuccesses = result.documents.length > 0;
    
    if (hasSuccesses && hasFailures) {
      // Partial success - some pages worked, some failed
      return createSuccessResponse({ 
        documents: result.documents, 
        crawlStats: result.crawlStats,
        crawlConfig: sanitizedCrawlConfig,
        warning: `Crawl completed with ${result.crawlStats.failedPages.length} failed pages out of ${result.crawlStats.pagesFound} total pages found.`
      });
    } else if (hasSuccesses) {
      // Complete success
      return createSuccessResponse({ 
        documents: result.documents, 
        crawlStats: result.crawlStats,
        crawlConfig: sanitizedCrawlConfig
      });
    } else {
      // Complete failure - no pages crawled successfully
      const errorMessage = result.crawlStats.errors?.length > 0 
        ? `Failed to crawl any pages. Errors: ${result.crawlStats.errors.join('; ')}`
        : "Failed to crawl any pages from the specified URL.";
      
      return createErrorResponse(errorMessage, ErrorCodes.EXTERNAL_SERVICE_ERROR, HttpStatus.SERVICE_UNAVAILABLE);
    }
  } catch (error) {
    console.error("Crawl API error:", error);
    
    if (error instanceof Error) {
      if (error.message === 'API_TIMEOUT') {
        return createErrorResponse(
          "Request timed out. The crawl operation exceeded the maximum allowed time. Please try with fewer pages or a simpler crawl mode.", 
          ErrorCodes.REQUEST_TIMEOUT, 
          HttpStatus.REQUEST_TIMEOUT
        );
      } else if (error.message.includes('Crawl operation was aborted due to timeout')) {
        return createErrorResponse(
          "Crawler timed out while processing the website. This may be due to slow page loading or network issues. Please try again or use a simpler crawl mode.", 
          ErrorCodes.REQUEST_TIMEOUT, 
          HttpStatus.REQUEST_TIMEOUT
        );
      } else if (error.message.includes('Invalid crawl')) {
        return createErrorResponse(error.message, ErrorCodes.INVALID_REQUEST_BODY, HttpStatus.BAD_REQUEST);
      } else if (error.message.includes('Pinecone API key')) {
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