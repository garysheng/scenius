# Message List Playback Feature

## Overview
The Message List Playback feature enables users to listen to message threads using Deepgram's Text-to-Speech (TTS) capabilities. Each user's messages are voiced by a distinct, pre-selected voice from Deepgram's voice catalog, creating an immersive and distinguishable audio experience.

## Technical Components

### Data Structure
```typescript
interface VoicePlaybackState {
  isPlaying: boolean;
  currentMessageId: string | null;
  startTime: Date | null;
  voiceAssignments: Map<string, string>; // userId -> voiceId
}

interface MessagePlaybackConfig {
  userId: string;
  voiceId: string;
  settings: {
    model: string;
    speed?: number;
    sampleRate?: number;
  };
}
```

### Voice Assignment System
- Each user is assigned a consistent voice from a pre-selected pool
- Voice assignments are stored per space to maintain consistency
- System ensures diverse voice distribution within conversations

### UI Components

#### Playback Controls
1. **Play Button**
   - Located at the top of message list
   - Initiates sequential message playback
   - Visual indicator for active playback state

2. **Stop Button**
   - Floating button in top-right corner
   - Only visible during active playback
   - Immediately stops all audio playback

3. **Message Highlighting**
   - Active message glows during playback
   - Smooth transition between messages
   - Visual feedback for current playback position

### Voice Pool Configuration
```typescript
interface VoicePool {
  voices: {
    id: string;
    gender: 'male' | 'female';
    style: 'casual' | 'professional';
    language: string[];
    previewUrl: string;
  }[];
  assignments: {
    [userId: string]: string; // userId -> voiceId
  };
}
```

## Implementation Details

### Voice Assignment Logic
1. First-time user assignment:
   - Select least-used voice from pool
   - Consider gender and style distribution
   - Store assignment in space metadata

2. Consistent assignment:
   - Cache voice assignments
   - Reuse same voice across sessions
   - Handle voice availability changes

### Playback Management
```typescript
interface PlaybackManager {
  startPlayback(messageIds: string[]): Promise<void>;
  stopPlayback(): void;
  pausePlayback(): void;
  resumePlayback(): void;
  skipToMessage(messageId: string): Promise<void>;
}
```

### Message Queue Processing
1. Queue Management:
   - Build message queue on play
   - Handle new messages during playback
   - Maintain play state across updates

2. Audio Processing:
   - Pre-fetch next message audio
   - Smooth transition between messages
   - Handle network interruptions

## Deepgram Integration

### TTS Configuration
```typescript
interface DeepgramTTSConfig {
  apiKey: string;
  model: string;
  voiceId: string;
  options: {
    speed?: number;
    sampleRate?: number;
    bitRate?: number;
    encoding?: string;
  };
}
```

### Audio Generation Pipeline
1. Text Preprocessing:
   - Clean message content
   - Handle special characters
   - Apply voice-specific formatting

2. Audio Generation:
   - Batch process upcoming messages
   - Cache generated audio
   - Handle streaming playback

## User Experience

### Visual Feedback
1. Message States:
   - Queued: Subtle indicator
   - Playing: Glow effect
   - Completed: Return to normal
   - Failed: Error indicator

2. Playback Controls:
   - Clear play/stop states
   - Loading indicators
   - Error feedback

### Performance Considerations
1. Audio Caching:
   - Cache recently played messages
   - Preload upcoming messages
   - Clear cache periodically

2. Resource Management:
   - Limit concurrent audio loads
   - Handle background/inactive tabs
   - Memory usage optimization

## Error Handling

### Common Scenarios
1. Network Issues:
   - Retry failed audio generation
   - Resume from last played message
   - Clear feedback to user

2. Voice Unavailability:
   - Fallback voice selection
   - User notification
   - Assignment rebalancing

## Future Enhancements
- Voice preference settings
- Playback speed control
- Custom voice assignments
- Background playback controls
- Multi-language support
- Voice emotion matching
- Accessibility improvements 