import { NextResponse } from 'next/server';
import { autoResponseService } from '@/lib/services/server/auto-response';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes in seconds

export async function POST(req: Request) {
  try {
    const { spaceId, channelId, message, userId } = await req.json();

    // Check for required fields
    if (!spaceId || !channelId || !message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call auto-response service
    await autoResponseService.handleIncomingMessage(spaceId, channelId, message, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in auto-response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 