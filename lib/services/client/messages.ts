import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { MessageFrontend } from '@/types';

export const messagesService = {
  async sendMessage(spaceId: string, channelId: string, content: string, userId: string) {
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    
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
        attachments: []
      }
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
  }
}; 