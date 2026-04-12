import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '../auth-options';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  isAppError,
} from '@/lib/errors';
import {
  TenantContext,
  SessionUser,
  UserRole,
  PaginationParams,
  SortParams,
  ApiResponse,
} from '@/lib/types';

export interface HandlerOptions {
  requiredRoles?: UserRole[];
}

export abstract class BaseApiHandler {
  handle(method: string, options?: HandlerOptions) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const authOptions = await getAuthOptions();
        const session = await getServerSession(authOptions);

        if (!session?.user) {
          throw new UnauthorizedError();
        }

        const user = session.user as SessionUser;

        if (options?.requiredRoles && options.requiredRoles.length > 0) {
          if (!options.requiredRoles.includes(user.role)) {
            throw new ForbiddenError();
          }
        }

        const ctx: TenantContext = {
          tenantId: user.tenantId,
          userId: user.id,
          role: user.role,
        };

        switch (method.toUpperCase()) {
          case 'GET':
            return await this.onGet(req, ctx);
          case 'POST':
            return await this.onPost(req, ctx);
          case 'PUT':
            return await this.onPut(req, ctx);
          case 'PATCH':
            return await this.onPatch(req, ctx);
          case 'DELETE':
            return await this.onDelete(req, ctx);
          default:
            return NextResponse.json(
              { success: false, error: `Method ${method} not allowed` },
              { status: 405 }
            );
        }
      } catch (error: unknown) {
        if (isAppError(error)) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              code: error.code,
            },
            { status: error.statusCode }
          );
        }

        console.error('Unhandled error:', error);
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  }

  protected async onGet(
    _req: NextRequest,
    _ctx: TenantContext
  ): Promise<NextResponse> {
    return NextResponse.json(
      { success: false, error: 'GET not implemented' },
      { status: 405 }
    );
  }

  protected async onPost(
    _req: NextRequest,
    _ctx: TenantContext
  ): Promise<NextResponse> {
    return NextResponse.json(
      { success: false, error: 'POST not implemented' },
      { status: 405 }
    );
  }

  protected async onPut(
    _req: NextRequest,
    _ctx: TenantContext
  ): Promise<NextResponse> {
    return NextResponse.json(
      { success: false, error: 'PUT not implemented' },
      { status: 405 }
    );
  }

  protected async onPatch(
    _req: NextRequest,
    _ctx: TenantContext
  ): Promise<NextResponse> {
    return NextResponse.json(
      { success: false, error: 'PATCH not implemented' },
      { status: 405 }
    );
  }

  protected async onDelete(
    _req: NextRequest,
    _ctx: TenantContext
  ): Promise<NextResponse> {
    return NextResponse.json(
      { success: false, error: 'DELETE not implemented' },
      { status: 405 }
    );
  }

  protected success<T>(data: T, status = 200): NextResponse {
    const body: ApiResponse<T> = { success: true, data };
    return NextResponse.json(body, { status });
  }

  protected successMessage(message: string, status = 200): NextResponse {
    const body: ApiResponse = { success: true, message };
    return NextResponse.json(body, { status });
  }

  protected getPagination(req: NextRequest): PaginationParams {
    const url = req.nextUrl;
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
    return {
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
    };
  }

  protected getSort(req: NextRequest, defaultField = 'createdAt'): SortParams {
    const url = req.nextUrl;
    const field = url.searchParams.get('sortField') ?? defaultField;
    const direction =
      url.searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';
    return { field, direction };
  }
}
