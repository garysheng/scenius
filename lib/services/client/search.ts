import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit,
  or,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';

export interface SearchResult {
  id: string;
  type: 'message' | 'file' | 'channel';
  title: string;
  snippet?: string;
  url: string;
  timestamp: Date;
  relevance?: number; // Higher = more relevant
  message?: Message; // Full message data when type is 'message'
}

export const searchService = {
  async search(spaceId: string, queryText: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerm = queryText.toLowerCase().trim();

    try {
      // Search channels
      const channelsRef = collection(db, 'spaces', spaceId, 'channels');
      const channelsQuery = query(
        channelsRef,
        or(
          where('name', '>=', searchTerm),
          where('name', '<=', searchTerm + '\uf8ff'),
          where('description', '>=', searchTerm),
          where('description', '<=', searchTerm + '\uf8ff')
        ),
        limit(5)
      );

      const channelDocs = await getDocs(channelsQuery);
      channelDocs.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'channel',
          title: data.name,
          snippet: data.description,
          url: `/spaces/${spaceId}/channels/${doc.id}`,
          timestamp: data.createdAt.toDate(),
          relevance: 1
        });
      });

      // Search messages
      const messagesRef = collection(db, 'spaces', spaceId, 'messages');
      
      // First, try exact content match
      const exactMatchQuery = query(
        messagesRef,
        where('content', '>=', searchTerm),
        where('content', '<=', searchTerm + '\uf8ff'),
        orderBy('content'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const exactMatches = await getDocs(exactMatchQuery);
      exactMatches.forEach(doc => {
        const data = doc.data() as Message;
        results.push({
          id: doc.id,
          type: 'message',
          title: `Message in channel`,
          snippet: data.content,
          url: `/spaces/${spaceId}/channels/${data.channelId}?message=${doc.id}`,
          timestamp: data.createdAt.toDate(),
          relevance: 1,
          message: {
            ...data,
            id: doc.id,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          }
        });
      });

      // Then, search by semantic tags that were created at message creation time
      const semanticQuery = query(
        messagesRef,
        where('metadata.semanticTags', 'array-contains', { value: searchTerm }),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const semanticMatches = await getDocs(semanticQuery);
      semanticMatches.forEach(doc => {
        // Skip if we already have this result from exact match
        if (results.some(r => r.id === doc.id)) return;

        const data = doc.data() as Message;
        results.push({
          id: doc.id,
          type: 'message',
          title: `Message in channel`,
          snippet: data.content,
          url: `/spaces/${spaceId}/channels/${data.channelId}?message=${doc.id}`,
          timestamp: data.createdAt.toDate(),
          relevance: 0.8, // Slightly lower relevance for semantic matches
          message: {
            ...data,
            id: doc.id,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          }
        });
      });

      // Search files
      const filesRef = collection(db, 'spaces', spaceId, 'files');
      const filesQuery = query(
        filesRef,
        or(
          where('name', '>=', searchTerm),
          where('name', '<=', searchTerm + '\uf8ff'),
          where('description', '>=', searchTerm),
          where('description', '<=', searchTerm + '\uf8ff')
        ),
        orderBy('name'),
        limit(5)
      );

      const fileDocs = await getDocs(filesQuery);
      fileDocs.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'file',
          title: data.name,
          snippet: data.description,
          url: data.url,
          timestamp: data.uploadedAt.toDate(),
          relevance: 1
        });
      });

      // Sort results by relevance first, then timestamp
      return results.sort((a, b) => {
        const relevanceDiff = (b.relevance || 0) - (a.relevance || 0);
        if (relevanceDiff !== 0) return relevanceDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
}; 