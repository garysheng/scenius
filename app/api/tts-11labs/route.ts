import { NextRequest } from 'next/server';
import { ELEVEN_LABS_VOICES } from '@/lib/constants/eleven-labs-voices';

// Default to Sarah's voice if none specified
const DEFAULT_VOICE = ELEVEN_LABS_VOICES.SARAH;

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return new Response('Missing text parameter', { status: 400 });
    }

    // Use provided voiceId or default to Sarah
    const voice = voiceId ? Object.values(ELEVEN_LABS_VOICES).find(v => v.id === voiceId) : DEFAULT_VOICE;
    
    if (!voice) {
      return new Response('Invalid voice ID', { status: 400 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    });
  } catch (error: any) {
    console.error('TTS Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.response?.data || error 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 