import { Timestamp } from 'firebase/firestore';
import { FileAttachment } from './index';

export interface SemanticTag {
  type: 'topic' | 'entity' | 'sentiment' | 'intent' | 'category';
  value: string;
  confidence: number; // 0 to 1
}

// Example semantic tags:
// Topic: "programming", "design", "marketing"
// Entity: "React", "Firebase", "TypeScript"
// Sentiment: "positive", "negative", "neutral"
// Intent: "question", "announcement", "suggestion"
// Category: "technical", "administrative", "social" 

export interface MessageFrontend {
  id: string;
  channelId: string;
  content: string;
  userId: string;
  type: 'TEXT' | 'VOICE';
  createdAt: Date;
  updatedAt: Date;
  threadId: string | null; // Allow all three states to match Firestore
  metadata: {
    reactions?: Record<string, string[]>;
    edited?: boolean;
    attachments?: FileAttachment[];
    status?: 'sending' | 'sent' | 'error';
    threadInfo?: {
      replyCount: number;
      lastReplyAt: Date | null;
      participantIds: string[];
    };
  };
} 