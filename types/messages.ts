import { Timestamp } from 'firebase/firestore';

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