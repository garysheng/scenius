import { Timestamp } from 'firebase/firestore';

// Pinecone Vector Types
export interface PineconeVector {
  id: string;                 // messageId
  values: number[];          // embedding vector
  metadata: PineconeMetadata;
}

export interface PineconeMetadata {
  messageId: string;       // reference to Firestore message
  channelId: string;      // for filtering
  spaceId: string;        // for filtering
  content: string;        // for snippet generation
  createdAt: string;      // ISO date string
  updatedAt?: string;
  url?: string;
  authorId?: string;
}

// Search Types
export interface VectorSearchFilters {
  channelId?: string;
  authorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface VectorSearchRequest {
  query: string;
  spaceId: string;
  filters?: VectorSearchFilters;
  limit?: number;
}

export interface VectorSearchResult {
  messageId: string;
  channelId: string;
  spaceId: string;
  content: string;
  url: string;
  score: number;           // similarity score
  createdAt: Date;
  authorId?: string;
}

// Backend Types
export interface MessageVectorization {
  messageId: string;
  content: string;
  metadata: {
    channelId: string;
    spaceId: string;
    authorId: string;
    createdAt: string;
  };
}

export interface VectorIndexStatus {
  spaceId: string;
  lastIndexed: Timestamp;
  totalMessages: number;
  vectorizedMessages: number;
  status: 'idle' | 'indexing' | 'error';
  error?: string;
  progress?: number;
}

export interface VectorIndexStatusFrontend extends Omit<VectorIndexStatus, 'lastIndexed'> {
  lastIndexed: Date;
}

// Admin Types
export interface ReindexRequest {
  spaceId: string;
  force?: boolean;
}

export interface VectorSearchStats {
  totalSearches: number;
  averageLatency: number;
  cacheHitRate: number;
  errorRate: number;
  popularQueries: Array<{
    query: string;
    count: number;
  }>;
}

// Scenie Chat Tool Types
export interface VectorSearchToolCall {
  type: 'vector_search';
  input: {
    query: string;
    spaceId: string;
    filters?: VectorSearchFilters;
    limit?: number;
  };
  output?: VectorSearchResult[];
  error?: string;
} 