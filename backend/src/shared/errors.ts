export interface ErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(code = 'BAD_REQUEST', message = 'Dữ liệu yêu cầu không hợp lệ', details: ErrorDetail[] = []) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'Vui lòng đăng nhập để tiếp tục') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'Bạn không có quyền thực hiện thao tác này') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'Tài nguyên yêu cầu không tồn tại') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = 'Xung đột dữ liệu hoặc trạng thái', details: ErrorDetail[] = []) {
    super(409, code, message, details);
  }
}
