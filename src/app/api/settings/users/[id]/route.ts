import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { userService } from '@/lib/users';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('users') + 1];
}

class UserHandler extends BaseApiHandler {
  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const data = await req.json();
    const updated = await userService.updateUser(ctx, id, data);
    return this.success(updated);
  }

  protected async onDelete(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    await userService.deactivateUser(ctx, id);
    return this.successMessage('User deactivated');
  }
}

const handler = new UserHandler();
export const PUT = handler.handle('PUT', { requiredRoles: [UserRole.ADMIN] });
export const DELETE = handler.handle('DELETE', { requiredRoles: [UserRole.ADMIN] });
