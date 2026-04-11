import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { userService } from '@/lib/users';

class UsersHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const users = await userService.listForTenant(ctx);
    return this.success(users);
  }

  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const data = await req.json();
    const created = await userService.createUser(ctx, data);
    return this.success(created, 201);
  }
}

const handler = new UsersHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
