import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment, runTransaction, where, deleteDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { FileAttachment, MessageFrontend } from '@/types';

export const messagesService = {
  async sendMessage(
    spaceId: string, 
    channelId: string, 
    content: string, 
    userId: string,
    attachments?: FileAttachment[]
  ) {
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    const channelRef = doc(db, 'spaces', spaceId, 'channels', channelId);
    
    // Create message with attachments
    await addDoc(messagesRef, {
      content,
      userId,
      channelId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      type: 'TEXT',
      metadata: {
        reactions: {},
        edited: false,
        attachments: attachments?.map(a => ({
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          thumbnailUrl: a.thumbnailUrl
        })) || [],
        status: 'sent'
      }
    });

    // Update channel metadata
    await updateDoc(channelRef, {
      'metadata.lastMessageAt': serverTimestamp(),
      'metadata.messageCount': increment(1),
      'metadata.lastMessageSenderId': userId
    });
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
            // You can track progress here if needed
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
          },
          (error) => {
            console.error('Upload failed:', error);
            reject(error);
          },
          () => resolve(uploadTask)
        );
      });

      // Get the download URL
      const voiceUrl = await getDownloadURL(audioRef);

      // Create message in Firestore
      const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
      await addDoc(messagesRef, {
        content: transcription, // Use transcription as content
        userId,
        channelId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: 'VOICE',
        metadata: {
          reactions: {},
          edited: false,
          attachments: [{
            voiceUrl,
            transcription,
            mimeType: 'audio/webm'
          }]
        }
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  },

  subscribeToMessages(spaceId: string, channelId: string, callback: (messages: MessageFrontend[]) => void) {
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    const messagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MessageFrontend[];

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
  }
}; 