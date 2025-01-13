import { NextRequest, NextResponse } from 'next/server';
import { VectorSearchRequest, VectorSearchResult, PineconeMetadata } from '@/types/vector-search';
import { Pinecone } from '@pinecone-database/pinecone';
import { adminDb } from '@/lib/firebase-admin';
import { urlService } from '@/lib/services/client/url';
import { getAuth } from 'firebase-admin/auth';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const auth = getAuth();

export async function POST(req: NextRequest) {
  try {
    // Get Firebase auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as VectorSearchRequest;
    const { query, spaceId, filters, limit = 10 } = body;

    // Validate required fields
    if (!query || !spaceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has access to the space
    const spaceRef = adminDb.collection('spaces').doc(spaceId);
    const spaceDoc = await spaceRef.get();
    
    if (!spaceDoc.exists) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }

    // Check space permissions
    const spaceData = spaceDoc.data();
    const hasAccess = spaceData?.members?.includes(userId) || spaceData?.admins?.includes(userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get embeddings from Firestore
    const embedding = await generateEmbedding(query);
    
    // Get the index
    const index = pinecone.index('messages');

    // Prepare vector search query
    const vectorQuery = {
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      filter: {
        $and: [
          { spaceId: { $eq: spaceId } },
          ...(filters?.channelId ? [{ channelId: { $eq: filters.channelId } }] : []),
          ...(filters?.authorId ? [{ authorId: { $eq: filters.authorId } }] : []),
          ...(filters?.startDate ? [{ createdAt: { $gte: filters.startDate } }] : []),
          ...(filters?.endDate ? [{ createdAt: { $lte: filters.endDate } }] : [])
        ]
      }
    };

    // Query Pinecone
    const queryResponse = await index.query(vectorQuery);

    // Transform results with type safety
    const results: VectorSearchResult[] = queryResponse.matches
      .filter(match => match.score !== undefined && match.metadata)
      .map(match => {
        const metadata = match.metadata as unknown as PineconeMetadata;
        if (!metadata.messageId || !metadata.channelId || !metadata.spaceId || !metadata.content || !metadata.createdAt || !metadata.authorId) {
          throw new Error('Invalid metadata structure in Pinecone response');
        }
        return {
          messageId: metadata.messageId,
          channelId: metadata.channelId,
          spaceId: metadata.spaceId,
          content: metadata.content,
          url: metadata.url || urlService.spaces.message(spaceId, metadata.channelId, metadata.messageId),
          score: match.score!,
          createdAt: new Date(metadata.createdAt),
          authorId: metadata.authorId
        };
      });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateEmbedding(query: string): Promise<number[]> {
    console.log('Generating embedding for query:', query);
  // TODO: Implement embedding generation using Firestore
  // For now, return a mock embedding
  return Array(1536).fill(0).map(() => Math.random());
} 