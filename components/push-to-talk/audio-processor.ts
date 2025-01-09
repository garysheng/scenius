export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;

  async init(stream: MediaStream) {
    // Safari requires a user gesture to create AudioContext
    const AudioContextClass = (window.AudioContext || 
      // @ts-expect-error - Safari support
      window.webkitAudioContext
    ) as typeof AudioContext;
    this.audioContext = new AudioContextClass();
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    
    // Configure analyser
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Connect nodes
    this.mediaStreamSource.connect(this.analyser);
  }

  start(onLevel: (level: number) => void) {
    const updateLevel = () => {
      if (!this.analyser || !this.dataArray) return;
      
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average level
      const average = this.dataArray.reduce((acc, val) => acc + val, 0) / this.dataArray.length;
      const normalizedLevel = average / 255; // Normalize to 0-1
      
      onLevel(normalizedLevel);
      this.animationFrame = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  cleanup() {
    this.stop();
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
} 