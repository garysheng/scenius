import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment, runTransaction, where, deleteDoc, Timestamp, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { FileAttachment, MessageFrontend } from '@/types';
import { messageAnalysisService } from './message-analysis';
import { autoResponseService } from './auto-response';

export const messagesService = {
  async sendMessage(
    spaceId: string, 
    channelId: string, 
    content: string, 
    userId: string,
    attachments?: FileAttachment[],
    type: 'TEXT' | 'VOICE' | 'VIDEO' = 'TEXT'
  ): Promise<MessageFrontend> {
    console.log('MessagesService - Starting sendMessage:', { spaceId, channelId, content, userId });
    
    try {
      // Analyze message content
      console.log('MessagesService - About to analyze message');
      const semanticTags = await messageAnalysisService.analyzeMessage(content);
      console.log('MessagesService - Semantic tags:', semanticTags);

      const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
      const channelRef = doc(db, 'spaces', spaceId, 'channels', channelId);
      
      // Create message with attachments and semantic tags
      const messageData = {
        content,
        userId,
        channelId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type,
        threadId: null,
        metadata: {
          reactions: {},
          edited: false,
          attachments: attachments?.map(a => ({
            id: a.id,
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
            thumbnailUrl: a.thumbnailUrl,
            uploadStatus: 'complete' as const,
            uploadProgress: 100
          })) || [],
          semanticTags,
          status: 'sent'
        }
      };

      console.log('MessagesService - Creating message with data:', messageData);
      const messageRef = await addDoc(messagesRef, messageData);

      // Update channel metadata
      console.log('MessagesService - Updating channel metadata');
      await updateDoc(channelRef, {
        'metadata.lastMessageAt': serverTimestamp(),
        'metadata.messageCount': increment(1),
        'metadata.lastMessageSenderId': userId
      });

      console.log('MessagesService - Message sent successfully');
      
      return {
        id: messageRef.id,
        ...messageData,
        createdAt: Timestamp.now().toDate(),
        updatedAt: Timestamp.now().toDate(),
        threadId: null
      } as MessageFrontend;
    } catch (error) {
      console.error('MessagesService - Failed to send message:', error);
      throw error;
    }
  },

  async sendVoiceMessage(spaceId: string, channelId: string, audioBlob: Blob, userId: string, transcription: string) {
    try {
      // Create a reference with a timestamp-based name
      const fileName = `${Date.now()}.webm`;
      const audioRef = ref(storage, `spaces/${spaceId}/channels/${channelId}/voice/${fileName}`);

      // Create metadata including CORS headers
      const metadata = {
        contentType: 'audio/webm',
        customMetadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      };

      // Upload with metadata and track progress
      const uploadTask = uploadBytesResumable(audioRef, audioBlob, metadata);
      
      // Wait for upload to complete
      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
          },
          (error) => {
            console.error('Upload failed:', error);
            reject(error);
          },
          () => {
            console.log('Upload completed');
            resolve(null);
          }
        );
      });

      // Get the download URL
      const voiceUrl = await getDownloadURL(audioRef);

      // Create message document
      const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
      const channelRef = doc(db, 'spaces', spaceId, 'channels', channelId);

      // Analyze transcription for semantic tags
      const semanticTags = await messageAnalysisService.analyzeMessage(transcription);

      const messageData = {
        content: transcription,
        userId,
        channelId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: 'VOICE',
        threadId: null,
        metadata: {
          reactions: {},
          edited: false,
          attachments: [{
            id: fileName,
            voiceUrl,
            fileName,
            fileSize: audioBlob.size,
            mimeType: 'audio/webm',
            uploadStatus: 'complete' as const,
            uploadProgress: 100
          }],
          semanticTags,
          status: 'sent'
        }
      };

      const messageRef = await addDoc(messagesRef, messageData);

      // Update channel metadata
      await updateDoc(channelRef, {
        'metadata.lastMessageAt': serverTimestamp(),
        'metadata.messageCount': increment(1),
        'metadata.lastMessageSenderId': userId
      });

      return {
        id: messageRef.id,
        ...messageData,
        createdAt: Timestamp.now().toDate(),
        updatedAt: Timestamp.now().toDate(),
        threadId: null
      } as MessageFrontend;
    } catch (error) {
      console.error('Failed to send voice message:', error);
      throw error;
    }
  },

  subscribeToMessages(spaceId: string, channelId: string, callback: (messages: MessageFrontend[]) => void) {
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('threadId', '==', null),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          channelId: data.channelId,
          content: data.content,
          userId: data.userId,
          type: data.type,
          threadId: null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          metadata: {
            ...data.metadata,
            threadInfo: data.metadata?.threadInfo || {
              replyCount: 0,
              lastReplyAt: null,
              participantIds: []
            }
          }
        } as MessageFrontend;
      });

      // Process new messages for auto-response
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const message = change.doc.data();
          autoResponseService.handleIncomingMessage(
            spaceId,
            channelId,
            message.content,
            message.userId
          );
        }
      });

      callback(messages);
    });
  },

  async toggleReaction(spaceId: string, channelId: string, messageId: string, emoji: string, userId: string) {
    const messageRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'messages', messageId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw new Error('Message not found');

        console.log('MessagesService - Current reactions:', messageDoc.data().metadata.reactions);
        
        const reactions = messageDoc.data().metadata.reactions || {};
        const userIds = reactions[emoji] || [];
        
        // Toggle user's reaction
        if (userIds.includes(userId)) {
          reactions[emoji] = userIds.filter((id: string) => id !== userId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...userIds, userId];
        }

        console.log('MessagesService - Updated reactions:', reactions);

        transaction.update(messageRef, {
          'metadata.reactions': reactions
        });
      });
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  },

  async sendThreadReply(
    spaceId: string, 
    channelId: string, 
    parentMessageId: string, 
    content: string, 
    userId: string
  ) {
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    const parentMessageRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'messages', parentMessageId);
    
    try {
      await runTransaction(db, async (transaction) => {
        // First, read the parent message
        const parentDoc = await transaction.get(parentMessageRef);
        if (!parentDoc.exists()) {
          throw new Error('Parent message not found');
        }

        // Get current thread info
        const threadInfo = parentDoc.data().metadata?.threadInfo || {
          replyCount: 0,
          lastReplyAt: null,
          participantIds: [parentDoc.data().userId]
        };

        // Create new reply message
        const replyRef = doc(messagesRef);
        const newReply = {
          content,
          userId,
          channelId,
          threadId: parentMessageId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          type: 'TEXT',
          metadata: {
            reactions: {},
            edited: false,
            attachments: [],
            status: 'sent'
          }
        };

        // Update parent message thread info
        const updatedThreadInfo = {
          replyCount: threadInfo.replyCount + 1,
          lastReplyAt: serverTimestamp(),
          participantIds: Array.from(new Set([...threadInfo.participantIds, userId]))
        };

        // Write operations after all reads
        transaction.set(replyRef, newReply);
        transaction.update(parentMessageRef, {
          'metadata.threadInfo': updatedThreadInfo
        });
      });
    } catch (error) {
      console.error('Error sending thread reply:', error);
      throw error;
    }
  },

  subscribeToThread(spaceId: string, channelId: string, parentMessageId: string, callback: (messages: MessageFrontend[]) => void) {
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    const threadQuery = query(
      messagesRef,
      where('threadId', '==', parentMessageId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(threadQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MessageFrontend[];

      callback(messages);
    });
  },

  async deleteMessage(spaceId: string, channelId: string, messageId: string) {
    const messageRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'messages', messageId);
    
    try {
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  async editMessage(spaceId: string, channelId: string, messageId: string, content: string) {
    const messageRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'messages', messageId);
    
    try {
      await updateDoc(messageRef, {
        content,
        'metadata.edited': true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  },

  async updateMessage(spaceId: string, messageId: string, content: string): Promise<void> {
    try {
      // Re-analyze updated content
      const semanticTags = await messageAnalysisService.analyzeMessage(content);

      const messageRef = doc(db, 'spaces', spaceId, 'messages', messageId);
      await updateDoc(messageRef, {
        content,
        updatedAt: serverTimestamp(),
        'metadata.edited': true,
        'metadata.editedAt': serverTimestamp(),
        'metadata.semanticTags': semanticTags
      });
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  },

  async getMessage(spaceId: string, channelId: string, messageId: string): Promise<MessageFrontend> {
    const messageRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'messages', messageId);
    
    try {
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const data = messageDoc.data();
      return {
        id: messageDoc.id,
        channelId: data.channelId,
        content: data.content,
        userId: data.userId,
        type: data.type,
        threadId: data.threadId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        metadata: {
          ...data.metadata,
          threadInfo: data.metadata?.threadInfo || {
            replyCount: 0,
            lastReplyAt: null,
            participantIds: []
          }
        }
      } as MessageFrontend;
    } catch (error) {
      console.error('Failed to get message:', error);
      throw error;
    }
  }
}; 