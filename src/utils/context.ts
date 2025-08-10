import { getEmbeddings, EmbeddingProvider } from './embeddings';
import { ScoredVector, RagUrlConfig } from '@/types';
import { Pinecone } from '@pinecone-database/pinecone';
import { getRagUrls } from '@/lib/config-service';

/**
 * Get demo context for testing when Pinecone is not configured
 */
function getDemoContext(namespace: string): ScoredVector[] {
  return [
    {
      id: "demo-1",
      score: 0.95,
      metadata: {
        chunk: `This is a demo context chunk for namespace '${namespace}' showing how the context system works. The AI assistant can use this information to provide relevant responses.`,
        url: "https://example.com/demo",
        title: "Demo Context 1"
      }
    },
    {
      id: "demo-2", 
      score: 0.87,
      metadata: {
        chunk: `Another demo context chunk for namespace '${namespace}' demonstrating the context-aware chatbot functionality. This shows how relevant information is retrieved and displayed.`,
        url: "https://example.com/demo2",
        title: "Demo Context 2"
      }
    }
  ];
}

/**
 * Get available namespaces from database configuration
 */
export const getAvailableNamespaces = async (): Promise<string[]> => {
  try {
    const ragUrls = await getRagUrls();
    const activeUrls = ragUrls.filter(url => url.isActive);
    return activeUrls.map(url => url.namespace);
  } catch (error) {
    console.error("Failed to get available namespaces:", error);
    return ['default'];
  }
};

/**
 * Get namespace configuration by namespace name
 */
export const getNamespaceConfig = async (namespace: string): Promise<RagUrlConfig | null> => {
  try {
    const ragUrls = await getRagUrls();
    return ragUrls.find(url => url.namespace === namespace && url.isActive) || null;
  } catch (error) {
    console.error("Failed to get namespace config:", error);
    return null;
  }
};

/**
 * Get all namespace configurations grouped by status
 */
export const getNamespacesByStatus = async (): Promise<{
  active: RagUrlConfig[];
  inactive: RagUrlConfig[];
  successful: RagUrlConfig[];
  failed: RagUrlConfig[];
}> => {
  try {
    const ragUrls = await getRagUrls();
    return {
      active: ragUrls.filter(url => url.isActive),
      inactive: ragUrls.filter(url => !url.isActive),
      successful: ragUrls.filter(url => url.crawlStatus === 'success'),
      failed: ragUrls.filter(url => url.crawlStatus === 'failed')
    };
  } catch (error) {
    console.error("Failed to get namespaces by status:", error);
    return { active: [], inactive: [], successful: [], failed: [] };
  }
};

const getMatchesFromEmbeddings = async (embeddings: number[], topK: number, namespace: string): Promise<ScoredVector[]> => {
  // Check if Pinecone is configured
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.warn("Pinecone not configured, returning demo context");
    return getDemoContext(namespace);
  }

  // Validate namespace against database configuration
  let validNamespace = namespace;
  let namespaceConfig = null;
  
  try {
    namespaceConfig = await getNamespaceConfig(namespace);
    if (!namespaceConfig) {
      console.warn(`Namespace '${namespace}' not found in database or inactive, checking for available namespaces`);
      const availableNamespaces = await getAvailableNamespaces();
      if (availableNamespaces.length > 0) {
        validNamespace = availableNamespaces[0];
        namespaceConfig = await getNamespaceConfig(validNamespace);
        console.log(`Using fallback namespace: ${validNamespace}`);
      } else {
        console.warn("No active namespaces available, using demo context");
        return getDemoContext(namespace);
      }
    } else {
      console.log(`Using configured namespace: ${validNamespace}`, {
        url: namespaceConfig.url,
        crawlStatus: namespaceConfig.crawlStatus,
        pagesIndexed: namespaceConfig.pagesIndexed,
        lastCrawled: namespaceConfig.lastCrawled
      });
    }
  } catch (error) {
    console.warn("Failed to validate namespace, proceeding with original:", error);
  }

  // Check if the namespace has successful crawl data
  if (namespaceConfig && namespaceConfig.crawlStatus === 'failed') {
    console.warn(`Namespace '${validNamespace}' has failed crawl status, using demo context`);
    return getDemoContext(namespace);
  }
  
  if (namespaceConfig && namespaceConfig.pagesIndexed === 0) {
    console.warn(`Namespace '${validNamespace}' has no indexed pages, using demo context`);
    return getDemoContext(namespace);
  }

  try {
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Get the index
    const index = pinecone.Index(process.env.PINECONE_INDEX!);

    // Query the index with the embeddings using the validated namespace
    const queryResponse = await index.namespace(validNamespace).query({
      vector: embeddings,
      topK: topK,
      includeMetadata: true,
    });

    // Transform the response to match our ScoredVector interface
    const matches: ScoredVector[] = queryResponse.matches?.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: {
        chunk: match.metadata?.chunk as string || '',
        url: match.metadata?.url as string || '',
        title: match.metadata?.title as string || '',
      }
    })) || [];

    console.log(`Pinecone returned ${matches.length} matches from namespace '${validNamespace}'`);
    return matches;
  } catch (e) {
    console.log("Error querying embeddings: ", e);
    
    // If the error is related to index not found, return demo context
    if (e instanceof Error && e.message.includes('404')) {
      console.warn("Pinecone index not found, returning demo context");
      return getDemoContext(validNamespace);
    }
    
    // If the error is related to namespace not found, return demo context
    if (e instanceof Error && (e.message.includes('namespace') || e.message.includes('not found'))) {
      console.warn(`Pinecone namespace '${validNamespace}' not found, returning demo context`);
      return getDemoContext(namespace);
    }
    
    // For other errors, return empty matches
    console.error("Pinecone query failed with unexpected error:", e);
    return [];
  }
}

export const getContext = async (
  message: string,
  namespace: string = 'default',
  maxTokens = 3000,
  minScore = 0.3,
  getOnlyText = true,
  embeddingProvider: EmbeddingProvider = 'openai'
): Promise<string | ScoredVector[]> => {
  try {
    // Log context retrieval attempt for debugging
    console.log(`Getting context for message in namespace '${namespace}' with provider '${embeddingProvider}'`);

    // Get the embeddings of the input message using the selected provider
    const embedding = await getEmbeddings(message, embeddingProvider);

    // Retrieve the matches for the embeddings from the specified namespace
    const matches = await getMatchesFromEmbeddings(embedding, 3, namespace);

    // Filter out the matches that have a score lower than the minimum score
    const qualifyingDocs = matches.filter((m) => m.score > minScore);

    console.log(`Found ${matches.length} total matches, ${qualifyingDocs.length} qualifying (score > ${minScore})`);

    // If the `getOnlyText` flag is false, we'll return the matches
    if (!getOnlyText) {
      return qualifyingDocs;
    }

    const docs = matches
      ? qualifyingDocs.map((match) => match.metadata.chunk)
      : [];
    
    const contextText = docs.join("\n").substring(0, maxTokens);
    console.log(`Returning ${contextText.length} characters of context text`);
    
    // Join all the chunks of text together, truncate to the maximum number of tokens, and return the result
    return contextText;
  } catch (error) {
    console.error("Error in getContext:", error);
    return getOnlyText ? "" : [];
  }
}; 