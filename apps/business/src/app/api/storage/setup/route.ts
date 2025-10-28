import { NextRequest, NextResponse } from 'next/server';
import { createBucket } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { bucketName, isPublic = true } = await request.json();
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'Bucket name is required' },
        { status: 400 }
      );
    }

    const result = await createBucket(bucketName, isPublic);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Bucket "${bucketName}" created successfully`,
      bucketName,
    });
  } catch (error) {
    console.error('Error creating bucket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
