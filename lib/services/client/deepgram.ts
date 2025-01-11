export class DeepgramService {
  async generateSpeech(
    text: string,
    voiceId: string,
    options?: {
      speed?: number;
      sampleRate?: number;
    }
  ): Promise<ArrayBuffer> {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const { audio } = await response.json();
      
      // Convert base64 back to ArrayBuffer
      const binaryString = atob(audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  async getAvailableVoices(): Promise<string[]> {
    // For now, return a static list of voice IDs
    return [
      'aura-asteria-en',
      'aura-luna-en',
      'aura-orion-en',
      'aura-nova-en',
      'aura-stella-en'
    ];
  }
}

export const deepgramService = new DeepgramService(); 