import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a conversation generator that creates natural, flowing conversations between multiple participants. Your output should strictly follow the format [userId]|||[message content] with one message per line."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 2000
    });

    const conversation = completion.choices[0].message.content;

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error generating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to generate conversation' },
      { status: 500 }
    );
  }
}