import { NextResponse } from 'next/server';
import { autoResponseService } from '@/lib/services/server/auto-response';
import { messagesService } from '@/lib/services/client/messages';
import { FileAttachment } from '@/types';

interface AutoResponseResult {
  success: boolean;
  status: string;
  video_url?: string;
  transcript?: string;
}

export async function POST(request: Request) {
  try {
    console.log('📥 [API] Auto-response request received');
    
    const body = await request.json();
    console.log('📦 [API] Request body:', body);

    const { spaceId, channelId, message, userId } = body;

    if (!spaceId || !channelId || !message || !userId) {
      console.log('❌ [API] Missing required fields:', { spaceId, channelId, message, userId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🎬 [API] Calling auto-response service');
    const result = await autoResponseService.handleIncomingMessage(
      spaceId,
      channelId,
      message,
      userId
    ) as AutoResponseResult;

    console.log('✅ [API] Auto-response completed:', result);

    if (result?.success && result?.video_url) {
      console.log('💬 [API] Posting response message with video');
      const garyId = process.env.NEXT_PUBLIC_GARY_USER_ID;
      if (!garyId) throw new Error('Gary user ID not found');

      const videoAttachment: FileAttachment = {
        id: crypto.randomUUID(),
        fileUrl: result.video_url,
        fileName: 'response.mp4',
        fileSize: 0,
        mimeType: 'video/mp4',
        thumbnailUrl: '',
        uploadStatus: 'complete' as const,
        uploadProgress: 100
      };

      await messagesService.sendMessage(
        spaceId,
        channelId,
        result.transcript || 'Here\'s my response:',
        garyId,
        [videoAttachment]
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [API] Auto-response error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 