import { getEmbeddings } from './embeddings';
import { ScoredVector } from '@/types';
import { Pinecone } from '@pinecone-database/pinecone';

const getMatchesFromEmbeddings = async (embeddings: number[], topK: number, namespace: string): Promise<ScoredVector[]> => {
  // Check if Pinecone is configured
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.warn("Pinecone not configured, returning demo context");
    
    // Return demo context for testing
    return [
      {
        id: "demo-1",
        score: 0.95,
        metadata: {
          chunk: "This is a demo context chunk showing how the context system works. The AI assistant can use this information to provide relevant responses.",
          url: "https://example.com/demo",
          title: "Demo Context 1"
        }
      },
      {
        id: "demo-2", 
        score: 0.87,
        metadata: {
          chunk: "Another demo context chunk demonstrating the context-aware chatbot functionality. This shows how relevant information is retrieved and displayed.",
          url: "https://example.com/demo2",
          title: "Demo Context 2"
        }
      }
    ];
  }

  try {
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Get the index
    const index = pinecone.Index(process.env.PINECONE_INDEX!);

    // Query the index with the embeddings
    const queryResponse = await index.namespace(namespace).query({
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

    return matches;
  } catch (e) {
    console.log("Error querying embeddings: ", e);
    
    // If the error is related to index not found, return demo context
    if (e instanceof Error && e.message.includes('404')) {
      console.warn("Pinecone index not found, returning demo context");
      return [
        {
          id: "demo-1",
          score: 0.95,
          metadata: {
            chunk: "This is a demo context chunk showing how the context system works. The AI assistant can use this information to provide relevant responses.",
            url: "https://example.com/demo",
            title: "Demo Context 1"
          }
        },
        {
          id: "demo-2", 
          score: 0.87,
          metadata: {
            chunk: "Another demo context chunk demonstrating the context-aware chatbot functionality. This shows how relevant information is retrieved and displayed.",
            url: "https://example.com/demo2",
            title: "Demo Context 2"
          }
        }
      ];
    }
    
    return [];
  }
}

export const getContext = async (
  message: string,
  namespace: string = 'default',
  maxTokens = 3000,
  minScore = 0.3,
  getOnlyText = true
): Promise<string | ScoredVector[]> => {
  try {
    // Get the embeddings of the input message
    const embedding = await getEmbeddings(message);

    // Retrieve the matches for the embeddings from the specified namespace
    const matches = await getMatchesFromEmbeddings(embedding, 3, namespace);

    // Filter out the matches that have a score lower than the minimum score
    const qualifyingDocs = matches.filter((m) => m.score > minScore);

    // If the `getOnlyText` flag is false, we'll return the matches
    if (!getOnlyText) {
      return qualifyingDocs;
    }

    const docs = matches
      ? qualifyingDocs.map((match) => match.metadata.chunk)
      : [];
    // Join all the chunks of text together, truncate to the maximum number of tokens, and return the result
    return docs.join("\n").substring(0, maxTokens);
  } catch (error) {
    console.error("Error in getContext:", error);
    return getOnlyText ? "" : [];
  }
}; 