import { VectorSearchToolCall } from './vector-search';

export type ScenieChatMode = 'text' | 'voice';

export interface ScenieMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'scenie';
  mode: ScenieChatMode;
  contextType?: 'channel' | 'user' | 'space';
  contextId?: string;
  audioUrl?: string;
  toolCalls?: VectorSearchToolCall[];
}

export interface ScenieConversation {
  id: string;
  userId: string;
  messages: ScenieMessage[];
  createdAt: Date;
  updatedAt: Date;
  activeMode: ScenieChatMode;
}

export interface ScenieContext {
  spaceId: string;
  channelContext?: {
    channelId: string;
    recentMessages: Array<{
      id: string;
      content: string;
      userId: string;
      timestamp: Date;
    }>;
  };
  userContext?: {
    userId: string;
    recentActivity: Array<{
      id: string;
      content: string;
      channelId: string;
      timestamp: Date;
    }>;
  };
}

// Eleven Labs Configuration Types
export interface ElevenLabsAgentConfig {
  id: string;
  name: string;
  voiceId: string;
  model: 'eleven_multilingual_v2';
  description?: string;
}

export interface ElevenLabsTurnTakingConfig {
  mode: 'auto' | 'manual';
  maxDuration: number;
  interruptible: boolean;
  silenceTimeout: number;
}

export interface ElevenLabsWebSocketConfig {
  reconnection: boolean;
  maxRetries: number;
  endpoint: string;
}

export interface ElevenLabsConfig {
  apiKey: string;
  organizationId: string;
  agent: ElevenLabsAgentConfig;
  conversation: {
    websocket: ElevenLabsWebSocketConfig;
    turnTaking: ElevenLabsTurnTakingConfig;
  };
}

// Hook Types
export interface UseScenieChatOptions {
  spaceId: string;
  channelId?: string;
  userId?: string;
  mode: ScenieChatMode;
  onModeChange?: (mode: ScenieChatMode) => void;
}

export interface UseScenieChatReturn {
  messages: ScenieMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  startVoiceChat: () => Promise<void>;
  stopVoiceChat: () => Promise<void>;
  isVoiceChatActive: boolean;
  switchMode: (mode: ScenieChatMode) => void;
}

// Service Types
export interface ScenieTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: any) => Promise<any>;
}

export interface ScenieResponse {
  message: string;
  audio?: {
    url: string;
    duration: number;
  };
  context?: {
    type: 'channel' | 'user' | 'space';
    id: string;
  };
}

export interface VoiceChatSession {
  id: string;
  startedAt: Date;
  mode: ScenieChatMode;
  websocket: WebSocket;
  audioStream?: MediaStream;
  isActive: boolean;
} 