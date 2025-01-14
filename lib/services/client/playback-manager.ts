import { deepgramService } from './deepgram';
import { voiceAssignmentService } from './voice-assignment';
import { VoicePlaybackState, VoicePlaybackMessage } from '@/lib/types/voice-playback';

/**
 * Manages text-to-speech playback of messages using Deepgram's TTS service
 * Handles voice assignments, audio caching, and sequential message playback
 */
class PlaybackManager {
  // Current state of the playback system
  private state: VoicePlaybackState = {
    isPlaying: false,
    currentMessageId: null,
    startTime: null,
    voiceAssignments: new Map()
  };

  // Queue of messages waiting to be played
  private messageQueue: VoicePlaybackMessage[] = [];
  // Currently playing audio element
  private currentAudio: HTMLAudioElement | null = null;
  // Cache of generated audio to avoid re-fetching
  private audioCache = new Map<string, ArrayBuffer>();
  // Listeners for message status updates
  private messageStatusListeners = new Set<(message: VoicePlaybackMessage) => void>();
  // Current space context
  private currentSpaceId: string | null = null;
  // Complete list of messages for context
  private allMessages: VoicePlaybackMessage[] = [];
  // Index of current message in the list
  private currentMessageIndex: number = -1;

  constructor() {
    // Clear audio cache when tab becomes inactive to free memory
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.audioCache.clear();
        }
      });
    }
  }

  /**
   * Start playing a sequence of messages
   * @param messages - Array of messages to play
   * @param spaceId - ID of the current space
   * @param startFromMessageId - Optional ID of message to start from
   */
  async startPlayback(messages: VoicePlaybackMessage[], spaceId: string, startFromMessageId?: string): Promise<void> {
    console.log('🎵 PlaybackManager - Starting playback:', {
      messageCount: messages.length,
      spaceId,
      startFromMessageId
    });

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

    // Load voice assignments for all users in the space
    console.log('🎙️ PlaybackManager - Loading voice assignments for space:', spaceId);
    this.state.voiceAssignments = await voiceAssignmentService.getSpaceAssignments(spaceId);
    console.log('🎙️ PlaybackManager - Voice assignments loaded:',
      Object.fromEntries(this.state.voiceAssignments)
    );

    // Start playing
    await this.playNextMessage();
  }

  /**
   * Stop all playback and reset state
   */
  async stopPlayback(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    // Reset all message statuses
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

  /**
   * Pause the current message playback
   */
  async pausePlayback(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    this.state.isPlaying = false;
  }

  /**
   * Resume playing the current message
   */
  async resumePlayback(): Promise<void> {
    if (this.currentAudio) {
      await this.currentAudio.play();
      this.state.isPlaying = true;
    }
  }

  /**
   * Skip to a specific message in the queue
   * @param messageId - ID of message to skip to
   */
  async skipToMessage(messageId: string): Promise<void> {
    const messageIndex = this.allMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    this.currentMessageIndex = messageIndex;

    // Reset status of all messages
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

  /**
   * Get the current state of the playback system
   */
  getPlaybackState(): VoicePlaybackState {
    return { ...this.state };
  }

  /**
   * Add a listener for message status updates
   * @param listener - Function to call when a message status changes
   * @returns Function to remove the listener
   */
  addMessageStatusListener(listener: (message: VoicePlaybackMessage) => void): () => void {
    this.messageStatusListeners.add(listener);
    return () => this.messageStatusListeners.delete(listener);
  }

  /**
   * Update the status of a message and notify listeners
   */
  private updateMessageStatus(messageId: string, status: VoicePlaybackMessage['status']) {
    const message = this.messageQueue.find(m => m.id === messageId);
    if (message) {
      message.status = status;
      this.messageStatusListeners.forEach(listener => listener(message));
    }
  }

  /**
   * Play the next message in the queue
   * Handles voice assignment, audio generation/caching, and playback
   */
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
      // Get or assign voice for the message author
      console.log('🎙️ PlaybackManager - Getting voice for user:', {
        userId: message.userId,
        messageId: message.id
      });

      // let voiceId = this.state.voiceAssignments.get(message.userId);
      // console.log('🎙️ PlaybackManager - Cached voice assignment:', { 
      //   userId: message.userId, 
      //   voiceId 
      // });

      console.log('🎙️ PlaybackManager - No cached voice, requesting new assignment');
      const voiceId = await voiceAssignmentService.getVoiceAssignment(message.userId, this.currentSpaceId);
      this.state.voiceAssignments.set(message.userId, voiceId);
      console.log('🎙️ PlaybackManager - New voice assigned:', {
        userId: message.userId,
        voiceId
      });

      // Get or generate audio for the message
      let audioBuffer = this.audioCache.get(message.id);
      if (!audioBuffer) {
        console.log('🔊 PlaybackManager - Generating speech:', {
          messageId: message.id,
          voiceId,
          content: message.content.slice(0, 50) + '...'
        });

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

      // Play the audio
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