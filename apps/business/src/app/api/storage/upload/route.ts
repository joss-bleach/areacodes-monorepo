import { NextRequest, NextResponse } from 'next/server';
import { uploadFileServer } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const folder = formData.get('folder') as string | undefined;
    
    if (!file || !bucket) {
      return NextResponse.json(
        { error: 'File and bucket are required' },
        { status: 400 }
      );
    }

    const uploadResult = await uploadFileServer(file, {
      bucket,
      folder,
      fileName: file.name,
      upsert: true,
    });

    if (uploadResult.error || !uploadResult.url) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: uploadResult.url,
      path: uploadResult.path,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

