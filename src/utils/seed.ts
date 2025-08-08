import { Pinecone } from '@pinecone-database/pinecone';
import { Crawler } from './crawler';
import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from 'langchain/text_splitter';
import { prepareDocument, chunkedUpsert, DocumentSplitter } from './documents';
import { embedDocument, getEmbeddingDimensions, EmbeddingProvider } from './embeddings';
import { Page, SeedOptions, CrawlConfig, CrawlStats } from '@/types';

/**
 * Configure crawler parameters based on crawl mode
 */
function configureCrawler(crawlConfig: CrawlConfig): { depth: number, pages: number } {
  switch (crawlConfig.mode) {
    case 'single':
      return { depth: 1, pages: 1 };
    case 'limited':
      return { depth: 2, pages: crawlConfig.maxPages || 10 };
    case 'deep':
      return { depth: crawlConfig.maxDepth || 2, pages: 100 };
    default:
      return { depth: 1, pages: 1 };
  }
}

/**
 * Seed the knowledge base with documents from a URL
 * @param url - The URL to crawl
 * @param indexName - The Pinecone index name
 * @param options - Chunking and splitting options
 * @param crawlConfig - Configuration for crawling behavior
 * @param namespace - Pinecone namespace (default: 'default')
 * @param embeddingProvider - Embedding provider to use (default: 'openai')
 * @param timeoutMs - Optional timeout in milliseconds for crawler operations
 * @returns Promise with documents and crawl statistics
 */
export async function seed(
  url: string, 
  indexName: string, 
  options: SeedOptions, 
  crawlConfig: CrawlConfig,
  namespace: string = 'default',
  embeddingProvider: EmbeddingProvider = 'openai',
  timeoutMs?: number
): Promise<{ documents: Page[], crawlStats: CrawlStats }> {
  try {
    // Check if Pinecone is configured
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("Pinecone API key is not configured. Please set PINECONE_API_KEY in your .env.local file or use demo mode.");
    }

    // Initialize the Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Track crawl statistics
    const startTime = Date.now();
    
    // Destructure the options object
    const { splittingMethod, chunkSize, chunkOverlap } = options;

    // Configure crawler based on crawl mode
    const { depth, pages: maxPages } = configureCrawler(crawlConfig);
    
    // Calculate crawler timeout (slightly less than API timeout to allow for cleanup)
    // Default to 2 minutes if no timeout specified, reduce by 10% for cleanup buffer
    const crawlerTimeoutMs = timeoutMs ? Math.floor(timeoutMs * 0.9) : 120000;
    
    console.log(`Setting crawler timeout: ${crawlerTimeoutMs}ms (${Math.round(crawlerTimeoutMs / 1000)}s) - API timeout: ${timeoutMs || 'not specified'}ms`);
    
    // Create a new Crawler with configured parameters
    const crawler = new Crawler(depth, maxPages, crawlerTimeoutMs);

    // Crawl the given URL and get the pages and stats
    const crawlResult = await crawler.crawl(url);
    const pages = crawlResult.pages;

    // Choose the appropriate document splitter based on the splitting method
    const splitter: DocumentSplitter = splittingMethod === 'recursive' ?
      new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap }) : new MarkdownTextSplitter({});

    // Prepare documents by splitting the pages
    const documents = await Promise.all(pages.map(page => prepareDocument(page, splitter)));

    // Get the embedding dimensions for the selected provider
    const embeddingDimensions = getEmbeddingDimensions(embeddingProvider);

    // Check if index exists and create it if it doesn't
    // Check if index exists and create if necessary
    try {
      // Try to describe the index to check if it exists
      await pinecone.describeIndex(indexName);
    } catch {
      // Index doesn't exist, create it
      console.log(`Creating Pinecone index: ${indexName} with ${embeddingDimensions} dimensions`);
      try {
        await pinecone.createIndex({
          name: indexName,
          dimension: embeddingDimensions,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        console.log('Waiting for index to be ready...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      } catch (createError) {
        console.error('Error creating index:', createError);
        throw new Error(`Failed to create Pinecone index: ${indexName}. Please ensure your Pinecone API key is correct and you have permission to create indexes.`);
      }
    }

    // Get the index
    const index = pinecone.Index(indexName);

    // Get the vector embeddings for the documents using the selected provider
    const vectors = await Promise.all(documents.flat().map(doc => embedDocument(doc, embeddingProvider)));

    // Upsert vectors into the Pinecone index with the specified namespace
    await chunkedUpsert(index, vectors, namespace, 10);

    console.log(`Successfully indexed ${vectors.length} vectors in namespace: ${namespace} using ${embeddingProvider} embeddings`);
    
    // Update crawl statistics with processing information
    const endTime = Date.now();
    const crawlStats: CrawlStats = {
      ...crawlResult.stats, // Use crawler's stats as base
      pagesProcessed: vectors.length, // Update with actual processed count
      totalTokens: vectors.reduce((total, vector) => total + (vector.values?.length || 0), 0), // Update with actual tokens
      crawlDuration: endTime - startTime // Update with total duration including processing
    };
    
    // Return documents and statistics
    return {
      documents: pages,
      crawlStats
    };
  } catch (error) {
    console.error("Error seeding:", error);
    throw error;
  }
} 