import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audioFile');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'No audio file provided or invalid file type' },
        { status: 400 }
      );
    }

    // Convert Blob to File with .webm extension
    const file = new File([audioFile], 'audio.webm', { type: 'audio/webm' });

    try {
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      });

      return NextResponse.json({ transcription: transcriptionResponse });
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError);
      return NextResponse.json(
        { 
          error: 'Failed to transcribe audio',
          details: openaiError.message || 'Unknown OpenAI error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json(
      { 
        error: 'Server error processing audio',
        details: error.message || 'Unknown server error'
      },
      { status: 500 }
    );
  }
} 