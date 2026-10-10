import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { googleAuthService } from '../src/shared/google-auth.service';
import { CoreFixture } from './helpers/core-fixture';
import { UserStatus } from '@prisma/client';

const app = createApp();

describe('Google Authentication Endpoints', () => {
  let fixture: CoreFixture;

  beforeAll(async () => {
    fixture = await CoreFixture.create();
  });

  afterAll(async () => {
    await fixture?.cleanup();
    vi.restoreAllMocks();
  });

  it('rejects Google login without credential with 400', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('logs in an existing user via Google and returns access token + cookie', async () => {
    // Existing user from fixture
    const existingEmail = fixture.accounts.buyer.email;

    vi.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-12345',
      aud: '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com',
      email: existingEmail,
      email_verified: true,
      name: 'Existing Google Buyer',
      picture: 'https://lh3.googleusercontent.com/avatar.jpg',
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock-valid-google-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requirePhone).toBe(false);
    expect(res.body.data.user.email).toBe(existingEmail.toLowerCase());
    expect(res.body.data.accessToken).toBeDefined();

    // Check refresh cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
  });

  it('rejects Google login if the account is LOCKED', async () => {
    const lockedEmail = `locked-${fixture.namespace}@example.test`;
    await prisma.user.create({
      data: {
        email: lockedEmail,
        phone: '0988776655',
        fullName: 'Locked User',
        passwordHash: 'dummy-hash',
        status: UserStatus.LOCKED,
      },
    });

    vi.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-locked',
      aud: '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com',
      email: lockedEmail,
      email_verified: true,
      name: 'Locked Google User',
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock-token' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');

    // Cleanup
    await prisma.user.delete({ where: { email: lockedEmail } });
  });

  it('returns requirePhone: true for new Google user when phone is not provided', async () => {
    const newGoogleEmail = `newgoogle-${fixture.namespace}@gmail.com`;

    vi.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-new-1',
      aud: '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com',
      email: newGoogleEmail,
      email_verified: true,
      name: 'New Google User',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock-valid-google-id-token-new' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requirePhone).toBe(true);
    expect(res.body.data.tempToken).toBeDefined();
    expect(res.body.data.googleProfile.email).toBe(newGoogleEmail);
    expect(res.body.data.googleProfile.name).toBe('New Google User');
  });

  it('completes registration with valid phone and logs in', async () => {
    const newGoogleEmail = `complete-${fixture.namespace}@gmail.com`;
    const newPhone = '0933221100';

    vi.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-complete',
      aud: '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com',
      email: newGoogleEmail,
      email_verified: true,
      name: 'Completed Google User',
    });

    // Step 1: Init Google Login -> gets tempToken
    const initRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock-valid-google-id-token' });

    expect(initRes.status).toBe(200);
    const tempToken = initRes.body.data.tempToken;

    // Step 2: Try with invalid phone format
    const badPhoneRes = await request(app)
      .post('/api/v1/auth/google/complete')
      .send({ tempToken, phone: '12345' });
    expect(badPhoneRes.status).toBe(400);

    // Step 3: Complete with valid phone
    const completeRes = await request(app)
      .post('/api/v1/auth/google/complete')
      .send({ tempToken, phone: newPhone });

    expect(completeRes.status).toBe(201);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.user.email).toBe(newGoogleEmail);
    expect(completeRes.body.data.user.phone).toBe(newPhone);
    expect(completeRes.body.data.accessToken).toBeDefined();

    // Verify DB user was created with ACTIVE status and email verified
    const dbUser = await prisma.user.findUnique({ where: { email: newGoogleEmail } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.status).toBe('ACTIVE');
    expect(dbUser?.emailVerifiedAt).toBeDefined();
    expect(dbUser?.passwordHash).toBeDefined();

    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { userId: dbUser!.id } });
    await prisma.user.delete({ where: { id: dbUser!.id } });
  });

  it('directly creates and logs in new user if phone is provided in initial Google login request', async () => {
    const directEmail = `direct-${fixture.namespace}@gmail.com`;
    const directPhone = '0944556677';

    vi.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-direct',
      aud: '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com',
      email: directEmail,
      email_verified: true,
      name: 'Direct User',
      picture: 'https://lh3.googleusercontent.com/direct.jpg',
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock-valid-google-id-token', phone: directPhone });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requirePhone).toBe(false);
    expect(res.body.data.user.email).toBe(directEmail);
    expect(res.body.data.user.phone).toBe(directPhone);
    expect(res.body.data.accessToken).toBeDefined();

    // Cleanup
    const dbUser = await prisma.user.findUnique({ where: { email: directEmail } });
    if (dbUser) {
      await prisma.refreshToken.deleteMany({ where: { userId: dbUser.id } });
      await prisma.user.delete({ where: { id: dbUser.id } });
    }
  });
});
