import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateUserModelApiKey } from '@/utils/userModels';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider, apiKey, modelId } = body;

    if (!provider || !apiKey || !modelId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate the API key
    const isValid = await validateUserModelApiKey(provider, apiKey);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key or model configuration' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key validated successfully' 
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    );
  }
}
