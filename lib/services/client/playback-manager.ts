import { deepgramService } from './deepgram';
import { voiceAssignmentService } from './voice-assignment';
import { VoicePlaybackState, VoicePlaybackMessage } from '@/lib/types/voice-playback';

class PlaybackManager {
  private state: VoicePlaybackState = {
    isPlaying: false,
    currentMessageId: null,
    startTime: null,
    voiceAssignments: new Map()
  };

  private messageQueue: VoicePlaybackMessage[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private audioCache = new Map<string, ArrayBuffer>();
  private messageStatusListeners = new Set<(message: VoicePlaybackMessage) => void>();
  private currentSpaceId: string | null = null;
  private allMessages: VoicePlaybackMessage[] = [];
  private currentMessageIndex: number = -1;

  constructor() {
    // Clear cache when tab becomes inactive
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.audioCache.clear();
        }
      });
    }
  }

  async startPlayback(messages: VoicePlaybackMessage[], spaceId: string, startFromMessageId?: string): Promise<void> {
    if (this.state.isPlaying) {
      await this.stopPlayback();
    }

    this.allMessages = messages;
    this.currentSpaceId = spaceId;
    
    // Find the starting index
    if (startFromMessageId) {
      this.currentMessageIndex = this.allMessages.findIndex(m => m.id === startFromMessageId);
      if (this.currentMessageIndex === -1) {
        this.currentMessageIndex = 0;
      }
    } else {
      this.currentMessageIndex = 0;
    }

    // Queue up messages from the current index
    this.messageQueue = this.allMessages.slice(this.currentMessageIndex).map(msg => ({ 
      ...msg, 
      status: 'queued' as const 
    }));

    this.state.isPlaying = true;
    this.state.startTime = new Date();

    // Load voice assignments
    this.state.voiceAssignments = await voiceAssignmentService.getSpaceAssignments(spaceId);

    // Start playing
    await this.playNextMessage();
  }

  async stopPlayback(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    // Update status of remaining messages to 'queued'
    this.messageQueue.forEach(msg => {
      this.updateMessageStatus(msg.id, 'queued');
    });

    this.state.isPlaying = false;
    this.state.currentMessageId = null;
    this.messageQueue = [];
    this.currentSpaceId = null;
    this.allMessages = [];
    this.currentMessageIndex = -1;
  }

  async pausePlayback(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    this.state.isPlaying = false;
  }

  async resumePlayback(): Promise<void> {
    if (this.currentAudio) {
      await this.currentAudio.play();
      this.state.isPlaying = true;
    }
  }

  async skipToMessage(messageId: string): Promise<void> {
    const messageIndex = this.allMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    this.currentMessageIndex = messageIndex;
    
    // Update status of skipped messages to 'queued'
    this.messageQueue.forEach(msg => {
      this.updateMessageStatus(msg.id, 'queued');
    });

    // Queue up messages from the new index
    this.messageQueue = this.allMessages.slice(this.currentMessageIndex).map(msg => ({
      ...msg,
      status: 'queued' as const
    }));
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    await this.playNextMessage();
  }

  getPlaybackState(): VoicePlaybackState {
    return { ...this.state };
  }

  addMessageStatusListener(listener: (message: VoicePlaybackMessage) => void): () => void {
    this.messageStatusListeners.add(listener);
    return () => this.messageStatusListeners.delete(listener);
  }

  private updateMessageStatus(messageId: string, status: VoicePlaybackMessage['status']) {
    const message = this.messageQueue.find(m => m.id === messageId);
    if (message) {
      message.status = status;
      this.messageStatusListeners.forEach(listener => listener(message));
    }
  }

  private async playNextMessage(): Promise<void> {
    if (!this.state.isPlaying || this.messageQueue.length === 0 || !this.currentSpaceId) {
      await this.stopPlayback();
      return;
    }

    const message = this.messageQueue[0];
    if (!message) return;

    this.state.currentMessageId = message.id;
    this.currentMessageIndex = this.allMessages.findIndex(m => m.id === message.id);
    this.updateMessageStatus(message.id, 'playing');

    try {
      // Get or assign voice
      let voiceId = this.state.voiceAssignments.get(message.userId);
      if (!voiceId) {
        voiceId = await voiceAssignmentService.getVoiceAssignment(message.userId, this.currentSpaceId);
        this.state.voiceAssignments.set(message.userId, voiceId);
      }

      // Get or generate audio
      let audioBuffer = this.audioCache.get(message.id);
      if (!audioBuffer) {
        audioBuffer = await deepgramService.generateSpeech(
          message.content,
          voiceId,
          {
            speed: 1,
            sampleRate: 24000,
          }
        );
        this.audioCache.set(message.id, audioBuffer);
      }

      // Play audio
      const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      this.currentAudio = new Audio(url);
      this.currentAudio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        this.updateMessageStatus(message.id, 'completed');
        this.messageQueue.shift(); // Remove the played message
        this.currentMessageIndex++; // Move to next message
        this.playNextMessage();
      });

      await this.currentAudio.play();
    } catch (error) {
      console.error('Error playing message:', error);
      this.updateMessageStatus(message.id, 'failed');
      this.messageQueue.shift(); // Remove the failed message
      this.currentMessageIndex++; // Move to next message even if failed
      this.playNextMessage();
    }
  }
}

export const playbackManager = new PlaybackManager(); 