# Vector Search Implementation

## Overview
This document outlines the implementation of vector search capabilities in Scenius using Pinecone for vector storage/search and Firestore's vector embeddings feature. The system will enable semantic search across messages, providing more intelligent and context-aware search results. All vector operations are tracked using LangSmith for monitoring and optimization.

## Architecture

### Components
1. **Message Vectorization**
   - Each message is chunked (by entire message for simplicity)
   - Embeddings are generated using Firestore's vector embeddings feature
   - Embeddings are stored in Pinecone with metadata linking back to the original message
   - All embedding generations are tracked in LangSmith

2. **Cloud Functions**
   - `vectorizeMessage`: Triggered on new message creation
   - `vectorizeBatch`: Daily batch job to process any missed messages
   - `reindexVectors`: Admin-triggered function to reindex all messages
   - All functions integrate with LangSmith for monitoring

3. **Search Flow**
   - User inputs search query
   - Query is converted to embedding
   - Pinecone performs similarity search
   - Results are enriched with Firestore data
   - URLs and snippets are returned to the user
   - Search operations are tracked in LangSmith

## Data Model

### Pinecone Vector
```typescript
interface PineconeVector {
  id: string;                 // messageId
  values: number[];          // embedding vector
  metadata: {
    messageId: string;       // reference to Firestore message
    channelId: string;       // for filtering
    spaceId: string;         // for filtering
    content: string;         // for snippet generation
    createdAt: string;       // ISO date string
    authorId: string;        // for filtering by author
    url: string;             // direct link to message
  };
}
```

### Search Result
```typescript
interface VectorSearchResult {
  messageId: string;
  channelId: string;
  spaceId: string;
  content: string;
  url: string;
  score: number;           // similarity score
  createdAt: Date;
  authorId: string;
}
```

## Implementation Phases

### Phase 1: Basic Infrastructure
- [x] Set up Pinecone index
- [ ] Create Cloud Functions structure
- [ ] Implement message vectorization
- [ ] Basic search endpoint

### Phase 2: Search Experience
- [ ] Create /dev/vector-search test page
- [ ] Implement search UI components
- [ ] Add filtering capabilities
- [ ] Enhance result ranking

### Phase 3: Integration
- [ ] Integrate with main search
- [ ] Add analytics tracking
- [ ] Optimize performance
- [ ] Add caching layer

## API Endpoints

### Search Messages
\`\`\`typescript
POST /api/vector-search
{
  query: string;
  spaceId: string;
  filters?: {
    channelId?: string;
    authorId?: string;
    startDate?: string;
    endDate?: string;
  };
  limit?: number;
}
\`\`\`

### Reindex Messages (Admin Only)
\`\`\`typescript
POST /api/vector-search/reindex
{
  spaceId: string;
  force?: boolean;
}
\`\`\`

## Cloud Functions

### Message Vectorization
```typescript
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
```

The function will:
1. Generate embedding using Firestore
2. Store vector in Pinecone
3. Update message metadata in Firestore

### Batch Processing
Daily job that:
1. Finds messages without vectors
2. Processes in batches of 100
3. Updates progress in admin dashboard

## Frontend Components

### Search Page (/dev/vector-search)
- Search input with filters
- Real-time results list
- Result highlighting
- Pagination controls

### Search Result Component
- Message preview
- Channel context
- Direct link
- Relevance score
- Author info

## Security Considerations

1. **Access Control**
   - Respect space and channel permissions
   - Filter results based on user access
   - Rate limit search requests

2. **Data Privacy**
   - No sensitive data in vector metadata
   - Audit logging for searches
   - Regular security reviews

## Performance Optimization

1. **Caching Strategy**
   - Cache common searches
   - Cache vector computations
   - Implement edge caching

2. **Batch Processing**
   - Optimize batch sizes
   - Implement retry logic
   - Monitor performance metrics

## Monitoring

1. **Metrics to Track**
   - Vector index size
   - Search latency
   - Cache hit rates
   - Error rates
   - Usage patterns
   - LangSmith metrics:
     - Embedding quality
     - Search relevance
     - Operation latencies
     - Error patterns

2. **Alerts**
   - Index errors
   - High latency
   - Failed vectorizations
   - Rate limit breaches
   - LangSmith alerts:
     - Embedding failures
     - Search degradation
     - Performance anomalies

## LangSmith Integration

### Overview
LangSmith is used to track and monitor all vector operations, providing insights into embedding quality, search relevance, and system performance.

### Tracked Operations

1. **Embedding Generation**
```typescript
interface EmbeddingRun {
  name: "generate_embedding";
  run_type: "embedding";
  inputs: {
    text: string;
  };
  outputs: {
    embedding: number[];
  };
}
```

2. **Vector Search**
```typescript
interface SearchRun {
  name: "vector_search";
  run_type: "chain";
  inputs: {
    query: string;
    spaceId: string;
  };
  outputs: {
    results: VectorSearchResult[];
  };
}
```

### Benefits
1. **Quality Monitoring**
   - Track embedding consistency
   - Monitor search relevance
   - Identify problematic queries

2. **Performance Insights**
   - Operation latencies
   - Success/failure rates
   - Resource utilization

3. **Optimization Opportunities**
   - Identify common patterns
   - Detect areas for improvement
   - Guide model selection

### Implementation
1. **Client-Side**
   - Track search operations
   - Monitor user interactions
   - Capture feedback signals

2. **Server-Side**
   - Track embedding generation
   - Monitor batch operations
   - Log system events 