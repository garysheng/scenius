import { Timestamp } from 'firebase/firestore';

export interface ChatSummary {
  id: string;
  channelId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  summary: string;
  topics: string[];
  participants: string[];
  keyPoints: string[];
  actionItems?: string[];
  metadata: {
    messageCount: number;
    generatedAt: Timestamp;
  };
}

export interface VoiceDictation {
  id: string;
  channelId: string;
  content: string;
  status: 'generating' | 'ready' | 'error';
  audioUrl?: string;
  error?: string;
  metadata: {
    generatedAt: Timestamp;
    duration?: number;
    wordCount?: number;
  };
}

export interface ScenieConfig {
  enabled: boolean;
  features: {
    chatSummary: boolean;
    voiceDictation: boolean;
  };
  preferences: {
    summaryFrequency: 'daily' | 'hourly' | 'realtime';
    voiceModel: string;
    language: string;
  };
} 