import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserModelsFromDB, addUserModel, updateUserModel, deleteUserModel } from '@/utils/userModels';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const requestUserId = searchParams.get('userId');
    
    // Users can only access their own models
    if (requestUserId && requestUserId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const models = await getUserModelsFromDB(userId);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching user models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user models' },
      { status: 500 }
    );
  }
}

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
    const { name, provider, apiKey, modelId, description } = body;

    if (!name || !provider || !apiKey || !modelId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newModel = await addUserModel({
      userId,
      name,
      provider,
      apiKey,
      modelId,
      description
    });

    return NextResponse.json({ model: newModel }, { status: 201 });
  } catch (error) {
    console.error('Error adding user model:', error);
    return NextResponse.json(
      { error: 'Failed to add user model' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { modelId, updates } = body;

    if (!modelId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updatedModel = await updateUserModel(userId, modelId, updates);
    return NextResponse.json({ model: updatedModel });
  } catch (error) {
    console.error('Error updating user model:', error);
    return NextResponse.json(
      { error: 'Failed to update user model' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const modelId = searchParams.get('modelId');

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID required' },
        { status: 400 }
      );
    }

    await deleteUserModel(userId, modelId);
    return NextResponse.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting user model:', error);
    return NextResponse.json(
      { error: 'Failed to delete user model' },
      { status: 500 }
    );
  }
}
