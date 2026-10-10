import { Role } from '@prisma/client';
import { AuthUser } from '../middleware/auth.middleware';
import { ForbiddenError, UnauthorizedError } from './errors';

/**
 * Kiểm tra xem Actor có quyền thao tác trên cụm rạp mục tiêu (cinemaId) hay không.
 * - ADMIN: Toàn quyền truy cập mọi rạp.
 * - MANAGER: Phải được gán rạp trong actor.cinemaIds. Nếu rỗng rạp -> từ chối 403.
 * - Khác: Từ chối 403.
 */
export function assertCinemaScope(
  actor: Pick<AuthUser, 'role' | 'cinemaIds'> | undefined,
  cinemaId: string,
  actionDesc = 'thao tác'
): void {
  if (!actor) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục');
  }

  if (actor.role === Role.ADMIN) {
    return;
  }

  if (actor.role === Role.MANAGER) {
    if (!actor.cinemaIds || actor.cinemaIds.length === 0) {
      throw new ForbiddenError(
        'CINEMA_SCOPE_FORBIDDEN',
        'Tài khoản Quản lý chưa được phân công cụm rạp nào'
      );
    }

    if (!actor.cinemaIds.includes(cinemaId)) {
      throw new ForbiddenError(
        'CINEMA_SCOPE_DENIED',
        `Bạn không có quyền ${actionDesc} tại cụm rạp này`
      );
    }
    return;
  }

  throw new ForbiddenError(
    'FORBIDDEN',
    'Hành động này yêu cầu quyền Quản trị viên hoặc Quản lý cụm rạp'
  );
}

/**
 * Kiểm tra xem Actor có quyền thao tác trên toàn bộ danh sách cụm rạp (cinemaIds) hay không.
 */
export function assertCinemaScopeMulti(
  actor: Pick<AuthUser, 'role' | 'cinemaIds'> | undefined,
  cinemaIds: string[],
  _actionDesc = 'thao tác'
): void {
  if (!actor) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục');
  }

  if (actor.role === Role.ADMIN) {
    return;
  }

  if (actor.role === Role.MANAGER) {
    if (!actor.cinemaIds || actor.cinemaIds.length === 0) {
      throw new ForbiddenError(
        'CINEMA_SCOPE_FORBIDDEN',
        'Tài khoản Quản lý chưa được phân công cụm rạp nào'
      );
    }

    const unauthorized = cinemaIds.filter((cid) => !actor.cinemaIds.includes(cid));
    if (unauthorized.length > 0) {
      throw new ForbiddenError(
        'CINEMA_SCOPE_DENIED',
        `Có cụm rạp nằm ngoài phạm vi quản lý của bạn: ${unauthorized.join(', ')}`
      );
    }
    return;
  }

  throw new ForbiddenError(
    'FORBIDDEN',
    'Hành động này yêu cầu quyền Quản trị viên hoặc Quản lý cụm rạp'
  );
}

/**
 * Đảm bảo chỉ có ADMIN mới có quyền tạo/sửa/xóa các thực thể Global (áp dụng toàn hệ thống).
 */
export function assertAdminForGlobal(
  actor: Pick<AuthUser, 'role'> | undefined,
  entityName: string
): void {
  if (!actor) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục');
  }

  if (actor.role !== Role.ADMIN) {
    throw new ForbiddenError(
      `GLOBAL_${entityName.toUpperCase()}_ADMIN_ONLY`,
      `Chỉ Quản trị viên hệ thống (Admin) mới có quyền tạo, sửa hoặc xóa ${entityName} toàn hệ thống`
    );
  }
}
