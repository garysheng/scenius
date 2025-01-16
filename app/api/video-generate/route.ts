import { NextResponse } from 'next/server';
import { heygenService } from '@/lib/services/server/heygen';

const GARY_TEMPLATE_ID = process.env.NEXT_PUBLIC_HEYGEN_TEMPLATE_ID;
const GARY_OUTGOING_TEMPLATE_ID = 'd5382d443092447f8f6ba8acf111edc2';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes in seconds

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    const { content, isSenderGary } = body;

    if (!content) {
      console.error('Missing required content');
      return NextResponse.json(
        { error: 'Missing required content' },
        { status: 400 }
      );
    }

    // randomly choose between one of these b0ae4802dc374745a6272e71a213f9c7 d5382d443092447f8f6ba8acf111edc2
    const notGaryTemplateId = Math.random() < 0.5 ? 'b0ae4802dc374745a6272e71a213f9c7' : 'd5382d443092447f8f6ba8acf111edc2';
    
    console.log('Calling heygenService.generateVideo with:', { content });
    const result = await heygenService.generateVideo(content, isSenderGary ? GARY_TEMPLATE_ID : notGaryTemplateId);
    console.log('Video generation result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
} 