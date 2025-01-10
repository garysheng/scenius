export interface ConversationContext {
  topic: string;
  tone: 'casual' | 'formal' | 'technical';
  duration: 'short' | 'medium' | 'long';
  scenario: string;
} 