import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@prisma/client';
import prisma from '../../shared/prisma';
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../../shared/errors';
import { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput } from './auth.schema';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars';
const JWT_ACCESS_TTL = '15m';
const REFRESH_TOKEN_DAYS = 7;

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateTokens(userId: string, role: Role) {
    const accessToken = jwt.sign(
      { userId, role },
      JWT_ACCESS_SECRET,
      { expiresIn: JWT_ACCESS_TTL }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput) {
    // 1. Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new ConflictError('EMAIL_EXISTS', 'Email này đã được sử dụng');
    }

    // 2. Check phone uniqueness
    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new ConflictError('PHONE_EXISTS', 'Số điện thoại này đã được sử dụng');
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 4. Create User
    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        passwordHash,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
      },
    });

    // 5. Issue session tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.role);
    const tokenHash = this.hashToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        cinemaAssignments: {
          select: { cinemaId: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác');
    }

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenError('ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác');
    }

    const { accessToken, refreshToken } = this.generateTokens(user.id, user.role);
    const tokenHash = this.hashToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
        cinemaIds: user.cinemaAssignments.map((a) => a.cinemaId),
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('REFRESH_TOKEN_REQUIRED', 'Thiếu refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('TOKEN_INVALID', 'Refresh token không hợp lệ');
    }

    // Token Reuse Detection
    if (storedToken.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('TOKEN_REUSED', 'Phát hiện sử dụng lại token đã thu hồi. Phiên đã bị hủy');
    }

    if (storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedError('TOKEN_EXPIRED', 'Refresh token đã hết hạn. Vui lòng đăng nhập lại');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair in the same family
    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
      storedToken.user.id,
      storedToken.user.role
    );
    const newTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        familyId: storedToken.familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cinemaAssignments: {
          include: { cinema: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'Người dùng không tồn tại');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      birthDate: user.birthDate,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      points: user.points,
      cinemas: user.cinemaAssignments.map((a) => a.cinema),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    if (input.phone) {
      const existing = await prisma.user.findFirst({
        where: { phone: input.phone, id: { not: userId } },
      });
      if (existing) {
        throw new ConflictError('PHONE_EXISTS', 'Số điện thoại này đã được tài khoản khác sử dụng');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        avatarUrl: input.avatarUrl,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      fullName: updated.fullName,
      birthDate: updated.birthDate,
      avatarUrl: updated.avatarUrl,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundError('USER_NOT_FOUND', 'Người dùng không tồn tại');
    }

    const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('INVALID_CURRENT_PASSWORD', 'Mật khẩu hiện tại không chính xác');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all existing sessions
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}

export const authService = new AuthService();
export default authService;
