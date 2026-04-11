import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { ValidationError } from '@/lib/errors';
import { testConnection } from '@/lib/integrations/data-source-service';

class TestConnectionHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const { apiUrl, apiHeaders } = await req.json();
    if (!apiUrl) throw new ValidationError('API URL is required');
    const result = await testConnection(apiUrl, apiHeaders || undefined);
    return this.success(result);
  }
}

const handler = new TestConnectionHandler();
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
