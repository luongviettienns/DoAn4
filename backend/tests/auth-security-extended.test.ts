import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import mailService from '../src/shared/mail.service';
import { createLimiter } from '../src/middleware/rate-limit.middleware';
import { requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

describe('Auth Security Extended: Forgot/Reset Password, Verify Email & Rate Limiting (Đợt 2)', () => {
  const namespace = `auth-ext-${crypto.randomUUID().slice(0, 8)}`;
  const testUser = {
    id: crypto.randomUUID(),
    email: `${namespace}@example.test`.toLowerCase(),
    phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
    fullName: 'Test Extended Auth User',
    password: 'OriginalPassword123!',
  };

  beforeAll(async () => {
    requireDedicatedTestDatabase();
    mailService.clearSentEmails();

    const passwordHash = await bcrypt.hash(testUser.password, 10);
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        phone: testUser.phone,
        fullName: testUser.fullName,
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.emailVerificationToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
    mailService.clearSentEmails();
  });

  describe('1. Quên mật khẩu (/forgot-password)', () => {
    it('Email tồn tại: Trả về generic message 200, tạo token hash trong DB, gửi mail in-memory', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Nếu email tồn tại trong hệ thống');

      // Check mail was sent
      const sentEmail = mailService.getLastEmailFor(testUser.email);
      expect(sentEmail).toBeDefined();
      expect(sentEmail?.subject?.toLowerCase()).toContain('đặt lại mật khẩu');
      expect(sentEmail?.token).toBeTruthy();

      // Check token hash in DB
      const tokenHash = crypto.createHash('sha256').update(sentEmail!.token).digest('hex');
      const dbToken = await prisma.passwordResetToken.findFirst({
        where: { tokenHash, userId: testUser.id, usedAt: null },
      });
      expect(dbToken).toBeDefined();
      expect(dbToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('Email KHÔNG tồn tại: Trả về generic message 200 y hệt (chống user enumeration)', async () => {
      mailService.clearSentEmails();
      const fakeEmail = `nonexistent-${crypto.randomUUID()}@example.test`;

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: fakeEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Nếu email tồn tại trong hệ thống');

      const sentEmail = mailService.getLastEmailFor(fakeEmail);
      expect(sentEmail).toBeUndefined();
    });

    it('Yêu cầu forgot-password lần 2: Vô hiệu hóa token cũ, chỉ token mới nhất có hiệu lực', async () => {
      // First request
      await request(app).post('/api/v1/auth/forgot-password').send({ email: testUser.email });
      const firstToken = mailService.getLastEmailFor(testUser.email)!.token;

      // Second request
      await request(app).post('/api/v1/auth/forgot-password').send({ email: testUser.email });
      const secondToken = mailService.getLastEmailFor(testUser.email)!.token;
      expect(secondToken).not.toBe(firstToken);

      // Verify in DB that first token is marked used/invalidated
      const firstHash = crypto.createHash('sha256').update(firstToken).digest('hex');
      const firstDb = await prisma.passwordResetToken.findUnique({ where: { tokenHash: firstHash } });
      expect(firstDb?.usedAt).not.toBeNull();

      // Second token is active
      const secondHash = crypto.createHash('sha256').update(secondToken).digest('hex');
      const secondDb = await prisma.passwordResetToken.findUnique({ where: { tokenHash: secondHash } });
      expect(secondDb?.usedAt).toBeNull();
    });
  });

  describe('2. Đặt lại mật khẩu (/reset-password)', () => {
    it('Reset mật khẩu thành công: Mật khẩu mới hoạt động, mật khẩu cũ bị từ chối, revoke refresh tokens', async () => {
      // 1. Issue fresh reset token
      await request(app).post('/api/v1/auth/forgot-password').send({ email: testUser.email });
      const rawToken = mailService.getLastEmailFor(testUser.email)!.token;

      // 2. Simulate existing active refresh token
      await prisma.refreshToken.create({
        data: {
          userId: testUser.id,
          tokenHash: crypto.randomBytes(32).toString('hex'),
          familyId: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      // 3. Reset password
      const newPassword = 'NewSecretPassword999!';
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 4. Verify login with old password fails (401 Unauthorized)
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(oldLogin.status).toBe(401);

      // 5. Verify login with new password succeeds
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: newPassword });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.accessToken).toBeDefined();

      // 6. Verify refresh tokens were revoked
      const activeRefreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revokedAt: null },
      });
      // Only the newly created login session has unrevoked refresh token
      expect(activeRefreshTokens.length).toBe(1);

      // Update testUser password for subsequent tests
      testUser.password = newPassword;
    });

    it('Single-use test: Dùng lại token đã sử dụng bị từ chối 400', async () => {
      await request(app).post('/api/v1/auth/forgot-password').send({ email: testUser.email });
      const rawToken = mailService.getLastEmailFor(testUser.email)!.token;

      // Use it once
      const first = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPassword123!' });
      expect(first.status).toBe(200);

      // Attempt to reuse the same token
      const second = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'ThirdPassword123!' });
      expect(second.status).toBe(400);
      expect(second.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('Token giả mạo hoặc sai định dạng bị từ chối 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'fake-invalid-token-12345', newPassword: 'ValidPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('3. Xác thực Email (/verify-email)', () => {
    const regEmail = `reg-verify-${crypto.randomUUID().slice(0, 6)}@example.test`;
    let registeredUserId: string;

    it('Đăng ký mới tự động sinh EmailVerificationToken và gửi mail kích hoạt', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: regEmail,
          phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
          fullName: 'Registered Verify User',
          password: 'Password12345!',
        });

      expect(res.status).toBe(201);
      registeredUserId = res.body.data.user.id;

      // Check mail was sent
      const verifyEmail = mailService.getLastEmailFor(regEmail);
      expect(verifyEmail).toBeDefined();
      expect(verifyEmail?.subject).toContain('Xác thực');
      expect(verifyEmail?.token).toBeTruthy();

      // Check user in DB
      const user = await prisma.user.findUnique({ where: { id: registeredUserId } });
      expect(user?.emailVerifiedAt).toBeNull();
    });

    it('Xác thực email với token hợp lệ: Cập nhật emailVerifiedAt', async () => {
      const verifyEmail = mailService.getLastEmailFor(regEmail)!;

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verifyEmail.token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: registeredUserId } });
      expect(user?.emailVerifiedAt).not.toBeNull();
    });

    it('Dùng lại token xác thực đã dùng: Bị từ chối 400 (Single-use)', async () => {
      const verifyEmail = mailService.getLastEmailFor(regEmail)!;

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verifyEmail.token });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    afterAll(async () => {
      if (registeredUserId) {
        await prisma.emailVerificationToken.deleteMany({ where: { userId: registeredUserId } });
        await prisma.refreshToken.deleteMany({ where: { userId: registeredUserId } });
        await prisma.user.deleteMany({ where: { id: registeredUserId } });
      }
    });
  });

  describe('4. Cookie Path & Logout Cleanliness', () => {
    const cookieUser = {
      id: crypto.randomUUID(),
      email: `cookie-test-${crypto.randomUUID().slice(0, 8)}@example.test`.toLowerCase(),
      phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
      fullName: 'Cookie Test User',
      password: 'CookiePassword123!',
    };

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(cookieUser.password, 10);
      await prisma.user.create({
        data: {
          id: cookieUser.id,
          email: cookieUser.email,
          phone: cookieUser.phone,
          fullName: cookieUser.fullName,
          passwordHash,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
    });

    afterAll(async () => {
      await prisma.refreshToken.deleteMany({ where: { userId: cookieUser.id } });
      await prisma.user.deleteMany({ where: { id: cookieUser.id } });
    });

    it('Đăng xuất xóa sạch cookie ở cả 2 path (/api/v1/auth và /)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: cookieUser.email, password: cookieUser.password });

      expect(loginRes.status).toBe(200);
      const setCookies = loginRes.headers['set-cookie'];
      expect(setCookies).toBeDefined();
      expect(setCookies[0]).toContain('Path=/api/v1/auth');

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', setCookies);

      expect(logoutRes.status).toBe(200);
      const clearCookies = logoutRes.headers['set-cookie'];
      expect(clearCookies).toBeDefined();

      // Check both paths are cleared
      const paths = clearCookies.map((c: string) => {
        const match = c.match(/Path=([^;]+)/);
        return match ? match[1] : '';
      });
      expect(paths).toContain('/api/v1/auth');
      expect(paths).toContain('/');
    });
  });

  describe('5. Rate Limiting Factory (Test ngưỡng 429)', () => {
    it('Vượt quá ngưỡng request trả về HTTP 429 TOO_MANY_REQUESTS kèm Retry-After', async () => {
      const testLimiterApp = express();
      testLimiterApp.use(express.json());

      const testLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 2,
        skipInTest: false, // Opt-in to test rate limiter enforcement
        message: 'Quá giới hạn kiểm tra',
      });

      testLimiterApp.post('/test-limit', testLimiter, (_req, res) => {
        res.status(200).json({ ok: true });
      });

      // Request 1: OK
      const r1 = await request(testLimiterApp).post('/test-limit');
      expect(r1.status).toBe(200);

      // Request 2: OK
      const r2 = await request(testLimiterApp).post('/test-limit');
      expect(r2.status).toBe(200);

      // Request 3: Blocked 429
      const r3 = await request(testLimiterApp).post('/test-limit');
      expect(r3.status).toBe(429);
      expect(r3.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(r3.headers['retry-after']).toBeDefined();
      expect(r3.headers['ratelimit-remaining']).toBe('0');
    });
  });
});
