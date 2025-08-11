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
import { getRagUrls, updateRagUrl } from "@/lib/config-service";
import { Crawler } from "@/utils/crawler";
import { EmbeddingProvider } from "@/utils/embeddings";
import { prepareDocument, chunkedUpsert, DocumentSplitter } from "@/utils/documents";
import { Pinecone } from '@pinecone-database/pinecone';
import { SeedOptions } from "@/types";
import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from 'langchain/text_splitter';

/**
 * POST /api/admin/config/knowledge-base/crawl - Trigger crawl for a specific URL
 * Initiates crawling process for a configured knowledge base URL
 * Features: Graceful Pinecone fallback, enhanced error handling, cancellation support
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
    const validation = await validateRequestBody(request, ['id']);
    
    if (!validation.success) {
      return validation.response;
    }
    
    const body = validation.data as { id: number };

    if (typeof body.id !== 'number') {
      return createErrorResponse(
        "URL configuration ID must be a number",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Get the URL configuration to crawl
    const ragUrls = await getRagUrls();
    const urlConfig = ragUrls.find(u => u.id === body.id);
    
    if (!urlConfig) {
      return createErrorResponse(
        "URL configuration not found",
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }

    if (!urlConfig.isActive) {
      return createErrorResponse(
        "Cannot crawl inactive URL configuration",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Check if already crawling
    if (urlConfig.crawlStatus === 'in_progress') {
      return createErrorResponse(
        "Crawl already in progress for this URL",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      );
    }

    // Update status to in_progress
    await updateRagUrl(body.id, {
      crawlStatus: 'in_progress',
      errorMessage: undefined
    }, userEmail);

    // Check if Pinecone index is configured
    if (!process.env.PINECONE_INDEX) {
      await updateRagUrl(body.id, {
        crawlStatus: 'failed',
        errorMessage: 'Pinecone index name is not configured'
      }, userEmail);

      return createErrorResponse(
        "Pinecone index name is not configured. Please set PINECONE_INDEX in your environment variables.",
        ErrorCodes.CONFIGURATION_ERROR,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Prepare seed options for document processing
    const seedOptions: SeedOptions = {
      splittingMethod: 'recursive',
      chunkSize: 1000,
      chunkOverlap: 200
    };

    // Create document splitter from seed options
    const { splittingMethod, chunkSize, chunkOverlap } = seedOptions;
    const splitter: DocumentSplitter = splittingMethod === 'recursive' ?
      new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap }) : new MarkdownTextSplitter({});

    // Use OpenAI as default embedding provider (can be made configurable later)
    const embeddingProvider: EmbeddingProvider = 'openai';

    // Trigger the actual crawl using database-integrated crawler
    try {
      // Create crawler from database configuration
      const crawler = await Crawler.fromDatabaseConfig(body.id, userEmail);
      
      // Crawl the URL (the crawler handles database status updates automatically)
      const crawlResult = await crawler.crawl(urlConfig.url);

      // Check if there were any failures during crawling
      const hasFailures = crawlResult.stats.failedPages?.length > 0 || crawlResult.stats.errors?.length > 0;
      const hasSuccesses = crawlResult.pages.length > 0;

      if (hasSuccesses) {
        // Process and store the crawled pages using embeddings
        const documents = [];
        const pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY!,
        });
        const index = pinecone.index(process.env.PINECONE_INDEX!);

        for (const page of crawlResult.pages) {
          // Prepare document chunks
          const preparedDoc = await prepareDocument(page, splitter);
          
          // Generate embeddings and store in Pinecone
          await chunkedUpsert(
            index,
            preparedDoc,
            crawlResult.namespace || 'default',
            embeddingProvider
          );
          
          documents.push(preparedDoc);
        }

        // Final status update is handled by crawler, but we ensure it's marked as completed
        await updateRagUrl(body.id, {
          crawlStatus: hasFailures ? 'partial_success' : 'success',
          lastCrawled: new Date(),
          pagesIndexed: crawlResult.stats.pagesProcessed || 0,
          errorMessage: hasFailures ? `Partial success: ${crawlResult.stats.failedPages?.length || 0} pages failed` : undefined
        }, userEmail);

        return createSuccessResponse({
          message: hasFailures ? "Crawl completed with partial success" : "Crawl completed successfully",
          urlId: body.id,
          url: urlConfig.url,
          namespace: crawlResult.namespace,
          crawlStats: crawlResult.stats,
          documents: documents,
          warning: hasFailures ? `${crawlResult.stats.failedPages?.length || 0} pages failed to process` : undefined
        });
      } else {
        // Complete failure - no pages crawled successfully
        const errorMessage = crawlResult.stats.errors?.length > 0 
          ? `Failed to crawl any pages. Errors: ${crawlResult.stats.errors.join('; ')}`
          : "Failed to crawl any pages from the specified URL.";

        // Status already updated by crawler, but ensure it's marked as failed
        await updateRagUrl(body.id, {
          crawlStatus: 'failed',
          errorMessage: errorMessage
        }, userEmail);

        return createErrorResponse(
          errorMessage,
          ErrorCodes.EXTERNAL_SERVICE_ERROR,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } catch (crawlError) {
      // Handle specific error cases
      let errorMessage = 'Crawl operation failed';
      let errorCode = ErrorCodes.INTERNAL_ERROR;
      let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

      if (crawlError instanceof Error) {
        if (crawlError.message.includes('API_TIMEOUT') || crawlError.message.includes('timeout')) {
          errorMessage = 'Crawl operation timed out. Please try with fewer pages or a simpler crawl mode.';
          errorCode = ErrorCodes.REQUEST_TIMEOUT;
          httpStatus = HttpStatus.REQUEST_TIMEOUT;
        } else if (crawlError.message.includes('Pinecone')) {
          errorMessage = 'Vector database error: ' + crawlError.message;
          errorCode = ErrorCodes.EXTERNAL_SERVICE_ERROR;
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        } else if (crawlError.message.includes('Invalid crawl')) {
          errorMessage = crawlError.message;
          errorCode = ErrorCodes.INVALID_INPUT;
          httpStatus = HttpStatus.BAD_REQUEST;
        } else {
          errorMessage = crawlError.message;
        }
      }

      // Update with failure status
      await updateRagUrl(body.id, {
        crawlStatus: 'failed',
        errorMessage: errorMessage
      }, userEmail);

      console.error("Crawl operation failed:", crawlError);
      return createErrorResponse(
        errorMessage,
        errorCode,
        httpStatus
      );
    }
  } catch (error) {
    console.error("Knowledge base crawl failed:", error);
    return createErrorResponse(
      "Failed to trigger knowledge base crawl",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}