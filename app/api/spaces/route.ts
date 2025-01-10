import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { spaceId } = await request.json();

    if (!spaceId) {
      return NextResponse.json(
        { error: 'Space ID is required' },
        { status: 400 }
      );
    }

    const spaceDoc = await adminDb.collection('spaces').doc(spaceId).get();
    const spaceData = spaceDoc.data();

    if (!spaceData) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: spaceDoc.id,
      ...spaceData,
    });
  } catch (error) {
    console.error('Error fetching space:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space' },
      { status: 500 }
    );
  }
} 