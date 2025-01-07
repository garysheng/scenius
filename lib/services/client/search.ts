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
import { SemanticTag } from '@/types/messages';

export interface SearchResult {
  id: string;
  type: 'message' | 'file' | 'channel';
  title: string;
  snippet?: string;
  url: string;
  timestamp: Date;
  relevance?: number;
  message?: Message;
  messageId?: string;
  channelId?: string;
}

export const searchService = {
  async search(spaceId: string, queryText: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerm = queryText.toLowerCase().trim();

    try {
      // Search channels
      const searchTerms = [
        searchTerm,
        searchTerm + 's',     // plural
        searchTerm.slice(0, -1), // singular (if plural)
      ].filter(Boolean);
      
      console.log('Searching with terms:', searchTerms);

      // Search channels
      const channelSearchRef = collection(db, 'spaces', spaceId, 'channels');
      const channelSearchQuery = query(
        channelSearchRef,
        or(
          ...searchTerms.flatMap(term => [
            where('name', '>=', term),
            where('name', '<=', term + '\uf8ff'),
            where('description', '>=', term),
            where('description', '<=', term + '\uf8ff')
          ])
        ),
        limit(5)
      );

      const channelSearchDocs = await getDocs(channelSearchQuery);
      channelSearchDocs.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'channel',
          title: data.name,
          snippet: data.description,
          url: `/spaces/${spaceId}?channel=${doc.id}`,
          timestamp: data.createdAt.toDate(),
          relevance: 1,
          channelId: doc.id
        });
      });

      // Search messages across all channels
      const allChannelsRef = collection(db, 'spaces', spaceId, 'channels');
      const allChannelDocs = await getDocs(allChannelsRef);
      
      console.log('Searching messages in channels:', allChannelDocs.docs.map(d => ({ id: d.id, name: d.data().name })));
      
      // Search messages in each channel
      for (const channelDoc of allChannelDocs.docs) {
        console.log('Searching in channel:', channelDoc.id, channelDoc.data().name);
        const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelDoc.id, 'messages');
        
        // First, try exact content match
        const exactMatchQuery = query(
          messagesRef,
          or(
            ...searchTerms.flatMap(term => [
              where('content', '>=', term),
              where('content', '<=', term + '\uf8ff')
            ])
          ),
          orderBy('content'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        console.log('Exact match query for terms:', searchTerms);
        const exactMatches = await getDocs(exactMatchQuery);
        console.log('Found exact matches:', exactMatches.docs.length);
        
        exactMatches.forEach(doc => {
          const data = doc.data() as Message;
          console.log('Processing exact match:', { id: doc.id, content: data.content });
          results.push({
            id: doc.id,
            type: 'message',
            title: `Message in #${channelDoc.data().name}`,
            snippet: data.content,
            url: `/spaces/${spaceId}?channel=${channelDoc.id}&message=${doc.id}`,
            timestamp: data.createdAt.toDate(),
            relevance: 1,
            message: {
              ...data,
              id: doc.id,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            },
            messageId: doc.id,
            channelId: channelDoc.id
          });
        });

        // Then, search by semantic tags that were created at message creation time
        const semanticQuery = query(
          messagesRef,
          where('metadata.semanticTags', 'array-contains-any', 
            searchTerms.flatMap(term => [
              { type: 'topic', value: term },
              { type: 'entity', value: term },
              { type: 'category', value: term }
            ] as SemanticTag[])
          ),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        console.log('Semantic query for terms:', searchTerms);
        const semanticMatches = await getDocs(semanticQuery);
        console.log('Found semantic matches:', semanticMatches.docs.length);
        
        semanticMatches.forEach(doc => {
          // Skip if we already have this result from exact match
          if (results.some(r => r.id === doc.id)) {
            console.log('Skipping duplicate semantic match:', doc.id);
            return;
          }

          const data = doc.data() as Message;
          console.log('Processing semantic match:', { 
            id: doc.id, 
            content: data.content,
            semanticTags: (data.metadata as { semanticTags?: SemanticTag[] })?.semanticTags 
          });
          
          results.push({
            id: doc.id,
            type: 'message',
            title: `Message in #${channelDoc.data().name}`,
            snippet: data.content,
            url: `/spaces/${spaceId}?channel=${channelDoc.id}&message=${doc.id}`,
            timestamp: data.createdAt.toDate(),
            relevance: 0.8,
            message: {
              ...data,
              id: doc.id,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            },
            messageId: doc.id,
            channelId: channelDoc.id
          });
        });
      }

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