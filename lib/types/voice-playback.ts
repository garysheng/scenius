import { Timestamp } from 'firebase/firestore';

export interface VoicePlaybackState {
  isPlaying: boolean;
  currentMessageId: string | null;
  startTime: Date | null;
  voiceAssignments: Map<string, string>; // userId -> voiceId
}

export interface MessagePlaybackConfig {
  userId: string;
  voiceId: string;
  settings: {
    model: string;
    speed?: number;
    sampleRate?: number;
  };
}

export interface VoicePool {
  voices: Voice[];
  assignments: Record<string, string>; // userId -> voiceId
}

export interface Voice {
  id: string;
  gender: 'male' | 'female';
  style: 'casual' | 'professional';
  accent: 'US' | 'UK' | 'Ireland';
  language: string[];
  previewUrl?: string;
}

// Frontend types
export interface VoicePlaybackMessage {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
  voiceId?: string;
  status: 'queued' | 'playing' | 'completed' | 'failed';
}

// Backend types
export interface VoiceAssignmentDocument {
  userId: string;
  voiceId: string;
  spaceId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VoicePlaybackOptions {
  speed?: number;
  sampleRate?: number;
  bitRate?: number;
  encoding?: 'wav' | 'mp3';
}

export interface PlaybackManager {
  startPlayback(messageIds: string[]): Promise<void>;
  stopPlayback(): void;
  pausePlayback(): void;
  resumePlayback(): void;
  skipToMessage(messageId: string): Promise<void>;
  getPlaybackState(): VoicePlaybackState;
} 