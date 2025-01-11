import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${voiceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram API error:', error);
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    return NextResponse.json({ audio: base64 });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 