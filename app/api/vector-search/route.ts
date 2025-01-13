import { NextRequest, NextResponse } from 'next/server';
import { VectorSearchRequest, VectorSearchResult, PineconeMetadata } from '@/types/vector-search';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { urlService } from '@/lib/services/client/url';
import { langsmithService } from '@/lib/services/client/langsmith';

// Initialize clients
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(req: NextRequest) {
    try {
        // Get Firebase auth token from header
        const authHeader = req.headers.get('authorization');
        console.log('Auth header present:', !!authHeader);
        
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('Missing Bearer token');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        console.log('Token extracted, verifying...');
        
        let userId: string;
        let userEmail: string | undefined;
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
            userEmail = decodedToken.email || undefined;
            console.log('Token verified for user:', userId, 'email:', userEmail);
        } catch (authError) {
            console.error('Error verifying token:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        if (!userId) {
            console.log('No userId in decoded token');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json() as VectorSearchRequest;
        const { query, spaceId, filters, limit = 10 } = body;
        console.log('Request body:', { query, spaceId, filters, limit });

        // Validate required fields
        if (!query || !spaceId) {
            console.log('Missing required fields');
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if space exists
        const spaceRef = adminDb.collection('spaces').doc(spaceId);
        const spaceDoc = await spaceRef.get();

        if (!spaceDoc.exists) {
            console.log('Space not found:', spaceId);
            return NextResponse.json(
                { error: 'Space not found' },
                { status: 404 }
            );
        }

        // Check user's access in the access subcollection
        const accessRef = spaceRef.collection('access').doc(userId);
        const accessDoc = await accessRef.get();
        
        console.log('Access check:', {
            userId,
            spaceId,
            hasAccess: accessDoc.exists,
            role: accessDoc.exists ? accessDoc.data()?.role : null
        });

        if (!accessDoc.exists) {
            // If no direct access, check space access config
            const configRef = spaceRef.collection('access').doc('config');
            const configDoc = await configRef.get();
            
            if (!configDoc.exists) {
                console.log('No access config found');
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const config = configDoc.data();
            
            // Check email list
            const emailListEnabled = config?.emailList?.enabled && userEmail && config.emailList.emails.includes(userEmail);
            
            // Check domains
            const userDomain = userEmail?.split('@')[1];
            const domainAllowed = userDomain && config?.domains?.includes(userDomain);

            // Check if space is public
            const isPublic = spaceDoc.data()?.settings?.isPublic;

            console.log('Extended access check:', {
                emailListEnabled,
                domainAllowed,
                isPublic,
                userEmail,
                userDomain
            });

            if (!emailListEnabled && !domainAllowed && !isPublic) {
                console.log('Access denied - no valid access method found');
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        // Get embeddings from OpenAI
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

        // Track search in LangSmith
        try {
            await langsmithService.trackSearch(query, spaceId, results);
        } catch (error) {
            console.error('Error tracking search in LangSmith:', error);
            // Don't throw error as this is non-critical
        }

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
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: query
        });

        const embedding = response.data[0].embedding;

        // Track embedding generation in LangSmith
        try {
            await langsmithService.trackEmbedding(query, embedding);
        } catch (error) {
            console.error('Error tracking embedding in LangSmith:', error);
            // Don't throw error as this is non-critical
        }

        return embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
} 