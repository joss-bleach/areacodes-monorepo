import { NextRequest, NextResponse } from 'next/server';
import { deleteFileServer } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { bucket, path } = await request.json();

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Bucket and path are required' },
        { status: 400 }
      );
    }

    const deleteResult = await deleteFileServer(bucket, path);

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error || 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

