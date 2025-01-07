import { SemanticTag } from '@/types/messages';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const messageAnalysisService = {
  async analyzeMessage(content: string): Promise<SemanticTag[]> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Analyze the following message and return semantic tags in JSON format. Each tag should have:
              - type: one of 'topic', 'entity', 'sentiment', 'intent', or 'category'
              - value: the specific tag value
              - confidence: number between 0 and 1

              Topics: programming, design, marketing, etc.
              Entities: specific technologies, tools, or concepts
              Sentiment: positive, negative, neutral
              Intent: question, announcement, suggestion, problem, request
              Category: technical, administrative, social

              Return only the JSON array, no other text.`
          },
          {
            role: "user",
            content
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from GPT-4');
      }

      const tags = JSON.parse(response).tags as SemanticTag[];
      return tags;
    } catch (error) {
      console.error('Failed to analyze message:', error);
      // Return basic sentiment analysis as fallback
      return [{
        type: 'sentiment',
        value: 'neutral',
        confidence: 0.5
      }];
    }
  }
}; 