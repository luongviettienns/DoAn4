import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@prisma/client';
import prisma from '../../shared/prisma';
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../../shared/errors';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ResetPasswordInput,
  GoogleLoginInput,
  CompleteGoogleRegistrationInput,
} from './auth.schema';
import mailService from '../../shared/mail.service';
import { googleAuthService } from '../../shared/google-auth.service';

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

    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    const status = requireVerification ? UserStatus.PENDING_VERIFY : UserStatus.ACTIVE;

    // 4. Create User
    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        passwordHash,
        role: Role.CUSTOMER,
        status,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
      },
    });

    // Send verification email asynchronously
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = this.hashToken(rawVerifyToken);
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verifyTokenHash,
        expiresAt: verifyExpiresAt,
      },
    });
    mailService.sendEmailVerification(user.email, rawVerifyToken, user.fullName).catch((err) => {
      console.error('[MAIL_VERIFY_ERROR]', err);
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
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError('ACCOUNT_PENDING', 'Vui lòng xác minh tài khoản trước khi đăng nhập');
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
    const result = await prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        return { ok: false as const, error: new UnauthorizedError('TOKEN_INVALID', 'Refresh token không hợp lệ') };
      }

      const now = new Date();
      if (storedToken.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { familyId: storedToken.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return { ok: false as const, error: new UnauthorizedError('TOKEN_REUSED', 'Phát hiện sử dụng lại token đã thu hồi. Phiên đã bị hủy') };
      }

      if (storedToken.expiresAt <= now) {
        return { ok: false as const, error: new UnauthorizedError('TOKEN_EXPIRED', 'Refresh token đã hết hạn. Vui lòng đăng nhập lại') };
      }

      if (storedToken.user.status !== UserStatus.ACTIVE) {
        const locked = storedToken.user.status === UserStatus.LOCKED;
        return { ok: false as const, error: new ForbiddenError(
          locked ? 'ACCOUNT_LOCKED' : 'ACCOUNT_PENDING',
          locked ? 'Tài khoản của bạn đã bị tạm khóa' : 'Vui lòng xác minh email trước khi sử dụng'
        ) };
      }

      // The conditional write is the claim: concurrent requests cannot rotate the same token twice.
      const claimed = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
          expiresAt: { gt: now },
          user: { status: UserStatus.ACTIVE },
        },
        data: { revokedAt: now, usedAt: now },
      });

      if (claimed.count !== 1) {
        await tx.refreshToken.updateMany({
          where: { familyId: storedToken.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { ok: false as const, error: new UnauthorizedError('TOKEN_REUSED', 'Phát hiện sử dụng lại token đã thu hồi. Phiên đã bị hủy') };
      }

      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        storedToken.user.id,
        storedToken.user.role
      );
      await tx.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: this.hashToken(newRefreshToken),
          familyId: storedToken.familyId,
          expiresAt: new Date(now.getTime() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      return { ok: true as const, tokens: { accessToken, refreshToken: newRefreshToken } };
    });

    // Throw after commit so replay detection does not roll back the family revocation.
    if (!result.ok) throw result.error;
    return result.tokens;
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

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && user.status !== UserStatus.LOCKED) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

      await prisma.$transaction(async (tx) => {
        // Vô hiệu hóa các token reset cũ chưa dùng của user này
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        // Tạo token mới
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });
      });

      // Gửi mail bất đồng bộ (không await để chống timing attack)
      mailService.sendPasswordReset(user.email, rawToken, user.fullName).catch((err) => {
        console.error('[MAIL_RESET_ERROR]', err);
      });
    }

    // Luôn trả về phản hồi generic chống user enumeration
    return {
      message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = this.hashToken(input.token);
    const now = new Date();

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    if (!resetToken || !resetToken.user) {
      throw new BadRequestError(
        'INVALID_OR_EXPIRED_TOKEN',
        'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu.'
      );
    }

    if (resetToken.user.status === UserStatus.LOCKED) {
      throw new ForbiddenError('ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật mật khẩu mới
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newHash },
      });

      // 2. Đánh dấu token này đã sử dụng (single-use)
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });

      // 3. Thu hồi (revoke) toàn bộ Refresh Token của user để đăng xuất khỏi tất cả các thiết bị
      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    const verifyToken = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    if (!verifyToken || !verifyToken.user) {
      throw new BadRequestError(
        'INVALID_OR_EXPIRED_TOKEN',
        'Mã xác thực email không hợp lệ hoặc đã hết hạn.'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verifyToken.userId },
        data: {
          emailVerifiedAt: now,
          status: verifyToken.user.status === UserStatus.PENDING_VERIFY ? UserStatus.ACTIVE : undefined,
        },
      });

      await tx.emailVerificationToken.update({
        where: { id: verifyToken.id },
        data: { usedAt: now },
      });
    });

    return {
      success: true,
      message: 'Xác thực email thành công! Bạn có thể sử dụng đầy đủ dịch vụ của CineX.',
    };
  }

  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && !user.emailVerifiedAt && user.status !== UserStatus.LOCKED) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });
      });

      mailService.sendEmailVerification(user.email, rawToken, user.fullName).catch((err) => {
        console.error('[MAIL_VERIFY_ERROR]', err);
      });
    }

    return {
      message: 'Nếu email tồn tại và chưa xác thực, email kích hoạt đã được gửi lại.',
    };
  }

  async googleLogin(input: GoogleLoginInput) {
    const payload = await googleAuthService.verifyIdToken(input.credential);
    const email = payload.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        cinemaAssignments: {
          select: { cinemaId: true },
        },
      },
    });

    if (user) {
      if (user.status === UserStatus.LOCKED) {
        throw new ForbiddenError('ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ');
      }

      const shouldUpdateVerified = !user.emailVerifiedAt;
      const shouldUpdateAvatar = !user.avatarUrl && Boolean(payload.picture);

      if (shouldUpdateVerified || shouldUpdateAvatar) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            avatarUrl: user.avatarUrl || payload.picture,
          },
        });
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
        requirePhone: false as const,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          points: user.points,
          avatarUrl: user.avatarUrl || payload.picture || null,
        },
        accessToken,
        refreshToken,
      };
    }

    // User chưa tồn tại trong hệ thống
    if (input.phone) {
      if (!/^0[0-9]{9}$/.test(input.phone)) {
        throw new BadRequestError('INVALID_PHONE', 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0');
      }

      const existingPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingPhone) {
        throw new ConflictError('PHONE_EXISTS', 'Số điện thoại này đã được sử dụng bởi tài khoản khác');
      }

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          phone: input.phone,
          fullName: payload.name || 'Khách hàng',
          avatarUrl: payload.picture || null,
          passwordHash,
          role: Role.CUSTOMER,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      const { accessToken, refreshToken } = this.generateTokens(newUser.id, newUser.role);
      const tokenHash = this.hashToken(refreshToken);
      const familyId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          familyId,
          expiresAt,
        },
      });

      return {
        requirePhone: false as const,
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          fullName: newUser.fullName,
          role: newUser.role,
          points: newUser.points,
          avatarUrl: newUser.avatarUrl,
        },
        accessToken,
        refreshToken,
      };
    }

    // Cần bổ sung số điện thoại
    const tempToken = jwt.sign(
      {
        email,
        name: payload.name || '',
        picture: payload.picture || '',
        sub: payload.sub,
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return {
      requirePhone: true as const,
      tempToken,
      googleProfile: {
        email,
        name: payload.name || '',
        picture: payload.picture || '',
      },
    };
  }

  async completeGoogleRegistration(input: CompleteGoogleRegistrationInput) {
    let decoded: { email: string; name?: string; picture?: string };
    try {
      decoded = jwt.verify(input.tempToken, JWT_ACCESS_SECRET) as { email: string; name?: string; picture?: string };
    } catch {
      throw new UnauthorizedError('INVALID_TEMP_TOKEN', 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại Google');
    }

    const email = decoded.email.toLowerCase().trim();

    if (!/^0[0-9]{9}$/.test(input.phone)) {
      throw new BadRequestError('INVALID_PHONE', 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const { accessToken, refreshToken } = this.generateTokens(existingUser.id, existingUser.role);
      const tokenHash = this.hashToken(refreshToken);
      const familyId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          userId: existingUser.id,
          tokenHash,
          familyId,
          expiresAt,
        },
      });

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          phone: existingUser.phone,
          fullName: existingUser.fullName,
          role: existingUser.role,
          points: existingUser.points,
          avatarUrl: existingUser.avatarUrl,
        },
        accessToken,
        refreshToken,
      };
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existingPhone) {
      throw new ConflictError('PHONE_EXISTS', 'Số điện thoại này đã được sử dụng bởi tài khoản khác');
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        phone: input.phone,
        fullName: decoded.name || 'Khách hàng',
        avatarUrl: decoded.picture || null,
        passwordHash,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    const { accessToken, refreshToken } = this.generateTokens(newUser.id, newUser.role);
    const tokenHash = this.hashToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: newUser.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.fullName,
        role: newUser.role,
        points: newUser.points,
        avatarUrl: newUser.avatarUrl,
      },
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
export default authService;
