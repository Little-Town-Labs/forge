import { Pinecone } from '@pinecone-database/pinecone';
import { Crawler } from './crawler';
import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from 'langchain/text_splitter';
import { prepareDocument, chunkedUpsert, DocumentSplitter } from './documents';
import { embedDocument, getEmbeddingDimensions, EmbeddingProvider } from './embeddings';
import { Page, SeedOptions } from '@/types';

export async function seed(
  url: string, 
  limit: number, 
  indexName: string, 
  options: SeedOptions, 
  namespace: string = 'default',
  embeddingProvider: EmbeddingProvider = 'openai'
) {
  try {
    // Check if Pinecone is configured
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("Pinecone API key is not configured. Please set PINECONE_API_KEY in your .env.local file or use demo mode.");
    }

    // Initialize the Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Destructure the options object
    const { splittingMethod, chunkSize, chunkOverlap } = options;

    // Create a new Crawler with depth 1 and maximum pages as limit
    const crawler = new Crawler(1, limit || 100);

    // Crawl the given URL and get the pages
    const pages = await crawler.crawl(url) as Page[];

    // Choose the appropriate document splitter based on the splitting method
    const splitter: DocumentSplitter = splittingMethod === 'recursive' ?
      new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap }) : new MarkdownTextSplitter({});

    // Prepare documents by splitting the pages
    const documents = await Promise.all(pages.map(page => prepareDocument(page, splitter)));

    // Get the embedding dimensions for the selected provider
    const embeddingDimensions = getEmbeddingDimensions(embeddingProvider);

    // Check if index exists and create it if it doesn't
    let indexExists = false;
    try {
      // Try to describe the index to check if it exists
      await pinecone.describeIndex(indexName);
      indexExists = true;
    } catch (describeError) {
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
        indexExists = true;
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
    
    // Return the first document
    return documents[0];
  } catch (error) {
    console.error("Error seeding:", error);
    throw error;
  }
} 