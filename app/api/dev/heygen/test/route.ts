import { NextResponse } from 'next/server';
import { autoResponseService } from '@/lib/services/server/auto-response';

export async function POST(request: Request) {
  try {
    const { spaceId, channelId, message, userId } = await request.json();

    if (!spaceId || !channelId || !message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await autoResponseService.handleIncomingMessage(
      spaceId,
      channelId,
      message,
      userId,
      { isTest: true }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('HeyGen test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 