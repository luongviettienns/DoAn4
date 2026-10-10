import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { UserStatus } from '@prisma/client';
import { authService } from '../src/modules/auth/auth.service';
import prisma from '../src/shared/prisma';
import { AppError } from '../src/shared/errors';
import { requireDedicatedTestDatabase } from './helpers/core-fixture';

describe('Refresh-token security with isolated database sessions', () => {
  const userIds: string[] = [];
  let passwordHash: string;

  beforeAll(async () => {
    requireDedicatedTestDatabase();
    passwordHash = await bcrypt.hash('AuthFixture123!', 10);
  });

  afterEach(async () => {
    // These IDs belong only to this test; seeded/demo accounts are never changed.
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  async function createSession(status: UserStatus = UserStatus.ACTIVE, expired = false) {
    const userId = crypto.randomUUID();
    userIds.push(userId);
    await prisma.user.create({ data: {
      id: userId,
      email: `auth-security-${userId}@example.test`,
      phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
      fullName: 'Isolated auth security fixture',
      passwordHash,
      status,
    } });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const familyId = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await prisma.refreshToken.create({ data: {
      userId,
      familyId,
      tokenHash,
      expiresAt: new Date(Date.now() + (expired ? -60_000 : 3_600_000)),
    } });
    return { userId, familyId, refreshToken, storedToken };
  }

  async function refreshFailure(token: string) {
    try {
      await authService.refresh(token);
      return null;
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      return { code: error.code, statusCode: error.statusCode };
    }
  }

  it.each([
    [UserStatus.LOCKED, 'ACCOUNT_LOCKED'],
    [UserStatus.PENDING_VERIFY, 'ACCOUNT_PENDING'],
  ] as const)('refuses a refresh for an account in status %s', async (status, code) => {
    const session = await createSession(status);

    expect(await refreshFailure(session.refreshToken)).toEqual({ code, statusCode: 403 });

    const family = await prisma.refreshToken.findMany({ where: { familyId: session.familyId } });
    expect(family).toHaveLength(1);
  });

  it('rotates an active session and invalidates the presented refresh token', async () => {
    const session = await createSession();

    const result = await authService.refresh(session.refreshToken);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(session.refreshToken);
    const family = await prisma.refreshToken.findMany({ where: { familyId: session.familyId } });
    expect(family).toHaveLength(2);
    const presentedToken = family.find((token) => token.id === session.storedToken.id);
    expect(presentedToken).toBeDefined();
    expect(presentedToken!.revokedAt).not.toBeNull();
    const active = family.filter((token) => token.revokedAt === null);
    expect(active).toHaveLength(1);
    expect(active[0].tokenHash).toBe(crypto.createHash('sha256').update(result.refreshToken).digest('hex'));
  });

  it('allows only one rotation when two requests present the same refresh token concurrently', async () => {
    const session = await createSession();

    const attempts = await Promise.allSettled([
      authService.refresh(session.refreshToken),
      authService.refresh(session.refreshToken),
    ]);

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find((attempt) => attempt.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toMatchObject({ code: 'TOKEN_REUSED' });
    const family = await prisma.refreshToken.findMany({ where: { familyId: session.familyId } });
    expect(family).toHaveLength(2);
    expect(family.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it('revokes the successor session when a rotated token is replayed', async () => {
    const session = await createSession();
    const successor = await authService.refresh(session.refreshToken);

    expect(await refreshFailure(session.refreshToken)).toEqual({ code: 'TOKEN_REUSED', statusCode: 401 });

    const activeSessions = await prisma.refreshToken.count({ where: { familyId: session.familyId, revokedAt: null } });
    expect(activeSessions).toBe(0);
    expect(await refreshFailure(successor.refreshToken)).toEqual({ code: 'TOKEN_REUSED', statusCode: 401 });
  });

  it('refuses expired tokens without creating a successor session', async () => {
    const session = await createSession(UserStatus.ACTIVE, true);

    expect(await refreshFailure(session.refreshToken)).toEqual({ code: 'TOKEN_EXPIRED', statusCode: 401 });

    expect(await prisma.refreshToken.count({ where: { familyId: session.familyId } })).toBe(1);
  });
});
