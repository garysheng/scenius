# Vector Search Implementation

## Overview
This document outlines the implementation of vector search capabilities in Scenius using Pinecone for vector storage/search and OpenAI's text-embedding-3-large model for embeddings. The system enables semantic search across messages, providing more intelligent and context-aware search results. All vector operations are tracked using LangSmith for monitoring and optimization.

## Architecture

### Components
1. **Message Vectorization**
   - Each message is chunked (by entire message for simplicity)
   - Embeddings are generated using OpenAI's text-embedding-3-large model
   - Embeddings are stored in Pinecone with metadata linking back to the original message
   - All embedding generations are tracked in LangSmith with proper run lifecycle management

2. **Cloud Functions**
   - `onMessageCreated`: Triggered on new message creation to vectorize messages
   - `processBatchMessages`: Daily batch job to process any missed messages
   - `reindexMessages`: Admin-triggered function to reindex all messages (with 2GB memory, 540s timeout)
   - All functions integrate with LangSmith for monitoring

3. **Search Flow**
   - User inputs search query
   - Query is converted to embedding using text-embedding-3-large
   - Pinecone performs similarity search
   - Results are enriched with Firestore data
   - URLs and snippets are returned to the user
   - Search operations are tracked in LangSmith

## Implementation Status

### Completed
- [x] Set up Pinecone index for message storage
- [x] Implemented Cloud Functions structure
- [x] Created message vectorization pipeline
- [x] Built basic search endpoint
- [x] Added LangSmith integration for monitoring
- [x] Created /dev/vector-search test page
- [x] Implemented search UI components
- [x] Added filtering capabilities
- [x] Set up proper run lifecycle management in LangSmith

### In Progress
- [ ] Enhance result ranking
- [ ] Add caching layer
- [ ] Implement analytics tracking
- [ ] Add rate limiting

### LangSmith Integration Details
All vector operations are tracked in LangSmith with proper run lifecycle management:

1. **Embedding Generation**
```typescript
interface EmbeddingRun {
  name: "generate_embedding";
  run_type: "embedding";
  inputs: { text: string };
  outputs: { embedding: number[] };
  start_time: number;  // Unix timestamp
  end_time: number;    // Unix timestamp
}
```

2. **Vector Search**
```typescript
interface SearchRun {
  name: "vector_search";
  run_type: "chain";
  inputs: { query: string; spaceId: string };
  outputs: { results: VectorSearchResult[] };
  start_time: number;  // Unix timestamp
  end_time: number;    // Unix timestamp
}
```

### Cloud Function Configuration
The reindexMessages function is configured with:
- Memory: 2GB
- Timeout: 540 seconds
- Min instances: 0
- Max instances: 10

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

## API Endpoints

### Search Messages
```typescript
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
```

### Reindex Messages (Admin Only)
```typescript
POST /api/vector-search/reindex
{
  spaceId: string;
  force?: boolean;
}
```

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

## Benefits
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