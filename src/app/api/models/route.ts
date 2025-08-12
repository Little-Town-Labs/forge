import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPublicModels } from '@/utils/models';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get public models that all users can access
    const models = await getPublicModels();
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching public models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
