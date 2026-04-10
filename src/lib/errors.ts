export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const message = id ? `${entity} with ID ${id} not found` : `${entity} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class TenantIsolationError extends AppError {
  constructor() {
    super('Tenant context is required for this operation', 403, 'TENANT_ISOLATION');
  }
}

export class EncryptionError extends AppError {
  constructor(message = 'Encryption operation failed') {
    super(message, 500, 'ENCRYPTION_ERROR');
  }
}

export class SetupRequiredError extends AppError {
  constructor() {
    super('Platform setup has not been completed', 503, 'SETUP_REQUIRED');
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
