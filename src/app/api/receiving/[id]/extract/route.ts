import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { receivingService } from '@/lib/receiving';

class ExtractHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext,
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const idIndex = segments.indexOf('receiving') + 1;
    const sessionId = segments[idIndex];

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const extraction = await receivingService.extractPackingSlipFromDocument(
        ctx,
        sessionId,
        buffer,
        file.type || 'application/octet-stream',
        file.name,
      );

      return this.success(extraction);
    }

    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'imageBase64 is required' },
        { status: 400 },
      );
    }

    const extraction = await receivingService.extractPackingSlip(
      ctx,
      sessionId,
      imageBase64,
    );

    return this.success(extraction);
  }
}

const handler = new ExtractHandler();
export const POST = handler.handle('POST');
