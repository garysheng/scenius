import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/utils/transcribe';

export const maxDuration = 60;

export async function POST(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400, headers }
      );
    }

    const transcript = await transcribeAudio(audioBlob);
    return NextResponse.json({ transcript }, { headers });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500, headers }
    );
  }
} 