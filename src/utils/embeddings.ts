import { Metadata } from '@/types';

// Embedding provider types
export type EmbeddingProvider = 'openai' | 'google';

// Google AI SDK for embeddings
async function getGoogleEmbeddings(text: string): Promise<number[]> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedText', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GOOGLE_AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google AI API error:', response.status, errorText);
    throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.embedding || !data.embedding.values) {
    console.error('Unexpected Google AI response structure:', data);
    throw new Error('Invalid response structure from Google AI API');
  }
  
  return data.embedding.values;
}

// OpenAI embeddings (existing implementation)
async function getOpenAIEmbeddings(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      dimensions: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Debug: Log the response structure
  console.log('OpenAI response structure:', {
    hasData: !!data.data,
    dataLength: data.data?.length,
    firstItem: data.data?.[0],
    hasEmbedding: !!data.data?.[0]?.embedding
  });
  
  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    console.error('Unexpected OpenAI response structure:', data);
    throw new Error('Invalid response structure from OpenAI API');
  }
  
  if (!data.data[0].embedding) {
    console.error('No embedding in response:', data.data[0]);
    throw new Error('No embedding found in OpenAI response');
  }
  
  return data.data[0].embedding;
}

// Main embedding function with provider selection
export async function getEmbeddings(text: string, provider: EmbeddingProvider = 'openai'): Promise<number[]> {
  try {
    switch (provider) {
      case 'google':
        if (!process.env.GOOGLE_AI_API_KEY) {
          throw new Error('Google AI API key not configured. Falling back to OpenAI.');
        }
        return await getGoogleEmbeddings(text);
      
      case 'openai':
      default:
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }
        return await getOpenAIEmbeddings(text);
    }
  } catch (error) {
    // If Google fails and we have OpenAI, fallback to OpenAI
    if (provider === 'google' && process.env.OPENAI_API_KEY) {
      console.warn('Google embeddings failed, falling back to OpenAI:', error);
      return await getOpenAIEmbeddings(text);
    }
    throw error;
  }
}

export interface Document {
  pageContent: string;
  metadata: Metadata;
}

export interface VectorDocument {
  id: string;
  values: number[];
  metadata: Metadata;
}

export async function embedDocument(document: Document, provider: EmbeddingProvider = 'openai'): Promise<VectorDocument> {
  const embedding = await getEmbeddings(document.pageContent, provider);
  return {
    id: document.metadata.url + '_' + Math.random().toString(36).substr(2, 9),
    values: embedding,
    metadata: document.metadata,
  };
}

// Helper function to get the recommended embedding dimensions for each provider
export function getEmbeddingDimensions(provider: EmbeddingProvider = 'openai'): number {
  switch (provider) {
    case 'google':
      return 768; // Google's embedding-001 model dimensions
    case 'openai':
    default:
      return 1024; // OpenAI's text-embedding-3-small dimensions
  }
} 