import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptionResponse {
  text: string;
}

interface ErrorResponse {
  message: string;
  status: number;
}

export async function POST(request: Request): Promise<NextResponse<TranscriptionResponse | ErrorResponse>> {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { message: 'No audio file provided', status: 400 },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a Blob from the buffer with the correct MIME type
    const blob = new Blob([buffer], { type: audioFile.type });

    // Create a File from the Blob
    const file = new File([blob], audioFile.name, { type: audioFile.type });

    try {
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en'
      });

      return NextResponse.json({ text: transcription.text });
    } catch (error) {
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { message: 'Failed to transcribe audio', status: 500 },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { message: 'Internal server error', status: 500 },
      { status: 500 }
    );
  }
} 