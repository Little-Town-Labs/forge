export interface Page {
  url: string;
  content: string;
}

export interface SeedOptions {
  splittingMethod: 'recursive' | 'markdown';
  chunkSize: number;
  chunkOverlap: number;
}

export interface Metadata {
  chunk: string;
  url: string;
  title?: string;
}

export interface ScoredVector {
  id: string;
  score: number;
  metadata: Metadata;
} 