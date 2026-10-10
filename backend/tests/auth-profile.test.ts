import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, fixturePassword, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();
const replacementPassword = 'ReplacementFixture456!';

function profileTest(name: string, scenario: (fixture: CoreFixture) => Promise<void>) {
  it(name, async () => {
    requireDedicatedTestDatabase();
    const fixture = await CoreFixture.create();
    try {
      await scenario(fixture);
    } finally {
      await fixture.cleanup();
    }
  }, 30_000);
}

function updateProfile(fixture: CoreFixture, body: Record<string, unknown>) {
  return request(app).put('/api/v1/auth/me')
    .set('Authorization', `Bearer ${fixture.accounts.buyer.token}`).send(body);
}

function changePassword(fixture: CoreFixture, body: Record<string, unknown>) {
  return request(app).put('/api/v1/auth/change-password')
    .set('Authorization', `Bearer ${fixture.accounts.buyer.token}`).send(body);
}

function login(fixture: CoreFixture, password = fixturePassword) {
  return request(app).post('/api/v1/auth/login').send({ email: fixture.accounts.buyer.email, password });
}

function refreshCookie(response: request.Response): string {
  const header = response.headers['set-cookie'] as string[] | string | undefined;
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const cookie = cookies.find((value) => value.startsWith('refreshToken='));
  // Avoid rendering the live cookie or access token in assertion failures.
  expect(Boolean(cookie)).toBe(true);
  return cookie!.split(';')[0];
}

async function unusedPhone() {
  for (;;) {
    const phone = `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`;
    if (!await prisma.user.findUnique({ where: { phone }, select: { id: true } })) return phone;
  }
}

describe('Auth profile and password API with isolated users (F01, FR-02)', () => {
  profileTest('updates writable profile fields and persists the date without exposing a password hash', async (f) => {
    const phone = await unusedPhone();
    const response = await updateProfile(f, {
      fullName: '  Updated fixture customer  ', phone, birthDate: '1995-06-15', avatarUrl: 'https://example.test/avatar.png',
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: f.accounts.buyer.id, email: f.accounts.buyer.email, fullName: 'Updated fixture customer',
      phone, birthDate: '1995-06-15T00:00:00.000Z', avatarUrl: 'https://example.test/avatar.png',
    });
    expect(response.body.data).not.toHaveProperty('passwordHash');
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    expect(stored).toMatchObject({ fullName: 'Updated fixture customer', phone, avatarUrl: 'https://example.test/avatar.png' });
    expect(stored.birthDate?.toISOString()).toBe('1995-06-15T00:00:00.000Z');
  });

  profileTest('partial updates preserve omitted profile fields', async (f) => {
    await prisma.user.update({ where: { id: f.accounts.buyer.id }, data: { avatarUrl: 'https://example.test/original.png' } });
    const response = await updateProfile(f, { fullName: 'Partial profile customer' });

    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } })).toMatchObject({
      fullName: 'Partial profile customer', phone: f.accounts.buyer.phone,
      birthDate: new Date('1990-01-01T00:00:00Z'), avatarUrl: 'https://example.test/original.png',
    });
  });

  profileTest('accepts the current phone number without treating its owner as a duplicate', async (f) => {
    const response = await updateProfile(f, { phone: f.accounts.buyer.phone });
    expect(response.status).toBe(200);
    expect(response.body.data.phone).toBe(f.accounts.buyer.phone);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } })).phone).toBe(f.accounts.buyer.phone);
  });

  profileTest('rejects another user phone atomically without applying the accompanying name change', async (f) => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    const response = await updateProfile(f, { phone: f.accounts.other.phone, fullName: 'Should not be persisted' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PHONE_EXISTS');
    expect(await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } })).toMatchObject({
      phone: before.phone, fullName: before.fullName,
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.other.id } })).phone).toBe(f.accounts.other.phone);
  });

  profileTest('rejects a malformed birth date as validation error without changing the profile', async (f) => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    const response = await updateProfile(f, { birthDate: 'not-a-date', fullName: 'Should not be persisted' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } })).toMatchObject({
      birthDate: before.birthDate, fullName: before.fullName,
    });
  });

  profileTest('profile updates cannot change email, role, status, points, or password through extra fields', async (f) => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    const response = await updateProfile(f, {
      fullName: 'Allowed profile change', email: f.accounts.other.email,
      role: 'ADMIN', status: 'LOCKED', points: 9999, passwordHash: 'injected-fixture-hash',
    });

    expect(response.status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    expect(stored).toMatchObject({ fullName: 'Allowed profile change', email: before.email, role: 'CUSTOMER', status: 'ACTIVE', points: 0 });
    expect(stored.passwordHash === before.passwordHash).toBe(true);
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  profileTest('rejects an incorrect current password and preserves the password and existing session', async (f) => {
    const session = await login(f);
    expect(session.status).toBe(200);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    const response = await changePassword(f, { currentPassword: 'WrongFixture123!', newPassword: replacementPassword });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    const after = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    expect(after.passwordHash === before.passwordHash).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userId: f.accounts.buyer.id, revokedAt: null } })).toBe(1);
    expect((await login(f)).status).toBe(200);
  });

  profileTest('rejects a new password without a number before changing the stored credential', async (f) => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    const response = await changePassword(f, { currentPassword: fixturePassword, newPassword: 'LettersOnlyPassword' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const after = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
    expect(after.passwordHash === before.passwordHash).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userId: f.accounts.buyer.id } })).toBe(0);
  });

  profileTest('changing the password revokes every existing refresh family and makes only the new password usable', async (f) => {
    const first = await login(f);
    const second = await login(f);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie(first));
    expect(rotated.status).toBe(200);
    const activeCookie = refreshCookie(rotated);
    const secondCookie = refreshCookie(second);
    const previousSessions = await prisma.refreshToken.findMany({ where: { userId: f.accounts.buyer.id } });
    expect(previousSessions).toHaveLength(3);
    expect(new Set(previousSessions.map((session) => session.familyId)).size).toBe(2);

    const changed = await changePassword(f, { currentPassword: fixturePassword, newPassword: replacementPassword });
    expect(changed.status).toBe(200);
    expect(refreshCookie(changed)).toBe('refreshToken=');
    const revoked = await prisma.refreshToken.findMany({ where: { userId: f.accounts.buyer.id } });
    expect(revoked).toHaveLength(3);
    expect(revoked.every((session) => session.revokedAt !== null)).toBe(true);
    for (const cookie of [activeCookie, secondCookie]) {
      const denied = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
      expect(denied.status).toBe(401);
      expect(denied.body.error.code).toBe('TOKEN_REUSED');
    }
    expect((await login(f, fixturePassword)).status).toBe(401);
    const fresh = await login(f, replacementPassword);
    expect(fresh.status).toBe(200);
    expect(fresh.body.data.user.id).toBe(f.accounts.buyer.id);
    expect(fresh.body.data.user).not.toHaveProperty('passwordHash');
    expect(await prisma.refreshToken.count({ where: { userId: f.accounts.buyer.id, revokedAt: null } })).toBe(1);
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${fresh.body.data.accessToken}`)).status).toBe(200);
  });

  for (const path of ['/api/v1/auth/me', '/api/v1/auth/change-password']) {
    profileTest(`unauthenticated callers cannot write ${path}`, async (f) => {
      const before = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
      const response = await request(app).put(path).send({
        fullName: 'Unauthorized fixture change', currentPassword: fixturePassword, newPassword: replacementPassword,
      });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      const after = await prisma.user.findUniqueOrThrow({ where: { id: f.accounts.buyer.id } });
      expect(after.fullName).toBe(before.fullName);
      expect(after.passwordHash === before.passwordHash).toBe(true);
      expect(await prisma.refreshToken.count({ where: { userId: f.accounts.buyer.id } })).toBe(0);
    });
  }

  profileTest('pending verification accounts cannot log in or create a session before verification', async (f) => {
    await prisma.user.update({ where: { id: f.accounts.buyer.id }, data: { status: 'PENDING_VERIFY' } });
    // F01.1 and F01.2 require verification before login and an ACTIVE account.
    const response = await login(f);
    const sessions = await prisma.refreshToken.count({ where: { userId: f.accounts.buyer.id } });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCOUNT_PENDING');
    expect(response.body.data).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(sessions).toBe(0);
  });
});
