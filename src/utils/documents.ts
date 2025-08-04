import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from 'langchain/text_splitter';
import { Page, Metadata } from '@/types';
import { Document, VectorDocument } from './embeddings';

export type DocumentSplitter = RecursiveCharacterTextSplitter | MarkdownTextSplitter;

export async function prepareDocument(page: Page, splitter: DocumentSplitter): Promise<Document[]> {
  const chunks = await splitter.splitText(page.content);
  
  return chunks.map((chunk, index) => ({
    pageContent: chunk,
    metadata: {
      chunk: chunk,
      url: page.url,
      title: `Chunk ${index + 1}`,
    } as Metadata,
  }));
}

export async function chunkedUpsert(index: { upsert: (request: { vectors: VectorDocument[], namespace: string }) => Promise<unknown> }, vectors: VectorDocument[], namespace: string, batchSize: number) {
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.namespace(namespace).upsert(batch);
  }
} 