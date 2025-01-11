import { SemanticTag } from '@/types/messages';
import OpenAI from 'openai';
import { AI_MODELS } from '@/lib/constants/ai';

// Define the shape of the raw tag from GPT response
interface RawTag {
  type?: string;
  value?: string;
  confidence?: number;
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const DEFAULT_TAGS: SemanticTag[] = [
  {
    type: 'sentiment',
    value: 'neutral',
    confidence: 0.5
  },
  {
    type: 'category',
    value: 'social',
    confidence: 0.5
  }
];

export const messageAnalysisService = {
  async analyzeMessage(content: string): Promise<SemanticTag[]> {
    console.log('MessageAnalysisService - Analyzing content:', content);
    
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODELS.CHAT.GPT4o,
        messages: [
          {
            role: "system",
            content: `Analyze the following message and return a JSON object with a 'tags' array. Each tag in the array should have:
              - type: one of 'topic', 'entity', 'sentiment', 'intent', or 'category'
              - value: the specific tag value
              - confidence: number between 0 and 1

              Example response format:
              {
                "tags": [
                  {
                    "type": "sentiment",
                    "value": "positive",
                    "confidence": 0.8
                  },
                  {
                    "type": "category",
                    "value": "social",
                    "confidence": 0.7
                  }
                ]
              }

              Topics: programming, design, marketing, etc.
              Entities: specific technologies, tools, or concepts
              Sentiment: positive, negative, neutral
              Intent: question, announcement, suggestion, problem, request
              Category: technical, administrative, social`
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

      console.log('MessageAnalysisService - GPT response:', completion.choices[0]?.message?.content);

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        console.error('MessageAnalysisService - No response from GPT-4');
        return DEFAULT_TAGS;
      }

      const parsedResponse = JSON.parse(response);
      console.log('MessageAnalysisService - Parsed response:', parsedResponse);

      if (!parsedResponse.tags || !Array.isArray(parsedResponse.tags) || parsedResponse.tags.length === 0) {
        console.log('MessageAnalysisService - No valid tags in response, using defaults');
        return DEFAULT_TAGS;
      }

      // Validate each tag
      const validTags = parsedResponse.tags.filter((tag: RawTag) => 
        tag.type && 
        ['topic', 'entity', 'sentiment', 'intent', 'category'].includes(tag.type) &&
        tag.value && 
        typeof tag.confidence === 'number' &&
        tag.confidence >= 0 && 
        tag.confidence <= 1
      ) as SemanticTag[];

      if (validTags.length === 0) {
        console.log('MessageAnalysisService - No valid tags after validation, using defaults');
        return DEFAULT_TAGS;
      }

      console.log('MessageAnalysisService - Final tags:', validTags);
      return validTags;
    } catch (error) {
      console.error('MessageAnalysisService - Failed to analyze message:', error);
      return DEFAULT_TAGS;
    }
  }
}; 