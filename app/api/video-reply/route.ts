import { NextResponse } from 'next/server';
import { autoResponseService } from '@/lib/services/server/auto-response';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes in seconds

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    const { spaceId, channelId, content, userId, useHistory } = body;

    if (!spaceId || !channelId || !userId) {
      console.error('Missing required fields:', { spaceId, channelId, userId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Calling autoResponseService with:', { spaceId, channelId, content, userId, useHistory });
    const result = await autoResponseService.handleIncomingMessage(
      spaceId,
      channelId,
      content || '', // Pass empty string if no content, service will use history
      userId,
      { isTest: true, useHistory }
    );
    console.log('Auto response result:', result);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error generating video reply:', error);
    // Return the actual error message to help with debugging
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video reply' },
      { status: 500 }
    );
  }
} 