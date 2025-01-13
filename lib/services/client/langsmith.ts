import { Client } from 'langsmith';
import { VectorSearchResult } from '@/types/vector-search';

// Initialize LangSmith client
const client = new Client({
  apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY
});

export const langsmithService = {
  async trackSearch(query: string, spaceId: string, results: VectorSearchResult[]) {
    try {
      const startTime = Date.now();
      await client.createRun({
        name: "vector_search",
        run_type: "chain",
        inputs: { query, spaceId },
        outputs: { results },
        start_time: startTime,
        end_time: Date.now()
      });
    } catch (error) {
      console.error('Error tracking search in LangSmith:', error);
    }
  },

  async trackEmbedding(text: string, embedding: number[]) {
    try {
      const startTime = Date.now();
      await client.createRun({
        name: "generate_embedding",
        run_type: "embedding",
        inputs: { text },
        outputs: { embedding },
        start_time: startTime,
        end_time: Date.now()
      });
    } catch (error) {
      console.error('Error tracking embedding in LangSmith:', error);
    }
  }
}; 