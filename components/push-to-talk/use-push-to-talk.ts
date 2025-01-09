import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioProcessor } from './audio-processor';

interface UsePushToTalkOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob) => Promise<void>;
}

export function usePushToTalk({ onRecordingStart, onRecordingStop }: UsePushToTalkOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioProcessor = useRef<AudioProcessor | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  // Safari-compatible media recorder setup
  const setupMediaRecorder = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;
      setHasPermission(true);

      // Safari doesn't support the codecs option
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };

      try {
        mediaRecorder.current = new MediaRecorder(mediaStream, options);
      } catch {
        // Fallback for Safari - use default codec
        mediaRecorder.current = new MediaRecorder(mediaStream);
      }

      // Setup audio processor for level monitoring
      audioProcessor.current = new AudioProcessor();
      await audioProcessor.current.init(mediaStream);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm;codecs=opus' });
        audioChunks.current = [];
        
        if (onRecordingStop) {
          try {
            await onRecordingStop(audioBlob);
          } catch (error) {
            console.error('Error in recording stop callback:', error);
            setError(error instanceof Error ? error : new Error('Unknown error'));
          }
        }
      };
    } catch (error) {
      console.error('Error setting up media recorder:', error);
      setError(error instanceof Error ? error : new Error('Failed to setup recording'));
      setHasPermission(false);
    }
  }, [onRecordingStop]);

  const startRecording = useCallback(async () => {
    try {
      if (!mediaRecorder.current) {
        await setupMediaRecorder();
      }

      if (mediaRecorder.current && mediaRecorder.current.state === 'inactive') {
        audioChunks.current = [];
        mediaRecorder.current.start();
        setIsRecording(true);
        
        // Start audio level monitoring
        audioProcessor.current?.start(setAudioLevel);
        
        if (onRecordingStart) {
          onRecordingStart();
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, [onRecordingStart, setupMediaRecorder]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      audioProcessor.current?.stop();
      setIsRecording(false);
      setAudioLevel(0);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
      if (audioProcessor.current) {
        audioProcessor.current.cleanup();
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    hasPermission,
    audioLevel,
    error
  };
} 