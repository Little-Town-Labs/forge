import { Metadata } from '@/types';

export async function getEmbeddings(text: string): Promise<number[]> {
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

export interface Document {
  pageContent: string;
  metadata: Metadata;
}

export interface VectorDocument {
  id: string;
  values: number[];
  metadata: Metadata;
}

export async function embedDocument(document: Document): Promise<VectorDocument> {
  const embedding = await getEmbeddings(document.pageContent);
  return {
    id: document.metadata.url + '_' + Math.random().toString(36).substr(2, 9),
    values: embedding,
    metadata: document.metadata,
  };
} 