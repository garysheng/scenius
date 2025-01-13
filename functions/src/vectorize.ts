import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, DocumentSnapshot } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { Client } from 'langsmith';

// Initialize Firebase Admin
initializeApp();

// Initialize Firestore
const db = getFirestore();
const auth = getAuth();

// Define secrets
const PINECONE_API_KEY = defineSecret('PINECONE_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const LANGSMITH_API_KEY = defineSecret('LANGSMITH_API_KEY');

// Types
interface Message {
    id: string;
    content: string;
    spaceId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

interface VectorMetadata {
    id: string;
    spaceId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
    const openai = new OpenAI({
        apiKey: OPENAI_API_KEY.value()
    });

    const langsmith = new Client({
        apiKey: LANGSMITH_API_KEY.value()
    });

    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 3072
    });

    const embedding = response.data[0].embedding;

    // Track embedding generation in LangSmith
    try {
        await langsmith.createRun({
            name: "generate_embedding",
            run_type: "embedding",
            inputs: { text },
            outputs: { embedding }
        });
    } catch (error) {
        console.error('Error tracking embedding in LangSmith:', error);
    }

    return embedding;
}

async function vectorizeMessage(message: Message): Promise<void> {
    try {
        const pinecone = new Pinecone({
            apiKey: PINECONE_API_KEY.value()
        });

        const index = pinecone.index('messages');
        const embedding = await generateEmbedding(message.content);

        const metadata: VectorMetadata = {
            id: message.id,
            spaceId: message.spaceId,
            content: message.content,
            createdAt: message.createdAt.toDate().toISOString(),
            updatedAt: message.updatedAt.toDate().toISOString()
        };

        await index.upsert([{
            id: message.id,
            values: embedding,
            metadata
        }]);

    } catch (error) {
        console.error('Error vectorizing message:', error);
        throw error;
    }
}

export const onMessageCreated = onDocumentCreated({
  document: 'messages/{messageId}',
  secrets: [PINECONE_API_KEY, OPENAI_API_KEY, LANGSMITH_API_KEY]
}, async (event) => {
    const snapshot = event.data as DocumentSnapshot;
    if (!snapshot) {
        console.log('No data associated with the event');
        return;
    }

    const message = {
        id: snapshot.id,
        ...snapshot.data()
    } as Message;

    await vectorizeMessage(message);
});

export const processBatchMessages = onSchedule({
  schedule: 'every day 00:00',
  secrets: [PINECONE_API_KEY, OPENAI_API_KEY, LANGSMITH_API_KEY]
}, async (event: ScheduledEvent) => {
    try {
        const lastProcessedRef = db.collection('system').doc('vectorSearchStatus');
        const lastProcessed = await lastProcessedRef.get();

        let query = db.collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(100);

        if (lastProcessed.exists) {
            const lastTimestamp = lastProcessed.data()?.lastProcessedAt;
            if (lastTimestamp) {
                query = query.where('createdAt', '>', lastTimestamp);
            }
        }

        const messages = await query.get();

        if (messages.empty) {
            console.log('No new messages to process');
            return;
        }

        for (const doc of messages.docs) {
            const message = {
                id: doc.id,
                ...doc.data()
            } as Message;

            await vectorizeMessage(message);
        }

        const lastMessage = messages.docs[messages.docs.length - 1];
        await lastProcessedRef.set({
            lastProcessedAt: lastMessage.data().createdAt,
            lastProcessedId: lastMessage.id,
            processedAt: Timestamp.now()
        });

    } catch (error) {
        console.error('Error processing batch messages:', error);
        throw error;
    }
});

export const reindexMessages = onCall({ 
  secrets: [PINECONE_API_KEY, OPENAI_API_KEY, LANGSMITH_API_KEY] 
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const user = await auth.getUser(request.auth.uid);
    if (!user.customClaims?.admin) {
        throw new HttpsError('permission-denied', 'User must be an admin');
    }

    const { spaceId, force = false } = request.data;
    if (!spaceId) {
        throw new HttpsError('invalid-argument', 'Space ID is required');
    }

    try {
        let query = db.collection('messages').where('spaceId', '==', spaceId);

        if (!force) {
            // Only process messages from the last 30 days if not forcing a full reindex
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.where('createdAt', '>', Timestamp.fromDate(thirtyDaysAgo));
        }

        const messages = await query.get();

        if (messages.empty) {
            return { status: 'success', message: 'No messages to process' };
        }

        let processedCount = 0;
        for (const doc of messages.docs) {
            const message = {
                id: doc.id,
                ...doc.data()
            } as Message;

            await vectorizeMessage(message);
            processedCount++;
        }

        return {
            status: 'success',
            message: `Successfully processed ${processedCount} messages`
        };

    } catch (error) {
        console.error('Error reindexing messages:', error);
        throw new HttpsError('internal', 'Error reindexing messages');
    }
}); 