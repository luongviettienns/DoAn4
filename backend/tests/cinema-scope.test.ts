import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

type Account = { id: string; role: Role; token: string };

class CinemaScopeFixture {
  readonly namespace = `scope-${crypto.randomUUID()}`;
  readonly cinemaA = crypto.randomUUID();
  readonly cinemaB = crypto.randomUUID();
  readonly accounts: Record<'admin' | 'managerA' | 'managerB' | 'unassignedManager' | 'staffA', Account>;
  readonly createdComboIds: string[] = [];
  readonly createdVoucherIds: string[] = [];
  readonly createdRoomIds: string[] = [];

  constructor() {
    this.accounts = Object.fromEntries(
      ([
        ['admin', Role.ADMIN],
        ['managerA', Role.MANAGER],
        ['managerB', Role.MANAGER],
        ['unassignedManager', Role.MANAGER],
        ['staffA', Role.STAFF],
      ] as const).map(([name, role]) => {
        const id = crypto.randomUUID();
        const token = jwt.sign(
          { userId: id, role },
          process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars',
          { expiresIn: '15m' }
        );
        return [name, { id, role, token }];
      })
    ) as Record<'admin' | 'managerA' | 'managerB' | 'unassignedManager' | 'staffA', Account>;
  }

  static async create() {
    requireDedicatedTestDatabase();
    const fixture = new CinemaScopeFixture();
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    await prisma.$transaction(async (tx) => {
      // 1. Create cinemas
      await tx.cinema.createMany({
        data: [
          {
            id: fixture.cinemaA,
            name: `${fixture.namespace}-CinemaA`,
            address: '123 Street A',
            city: 'Hà Nội',
            phone: '0901111111',
            openTime: new Date('1970-01-01T01:00:00Z'),
            closeTime: new Date('1970-01-01T16:00:00Z'),
            status: 'ACTIVE',
          },
          {
            id: fixture.cinemaB,
            name: `${fixture.namespace}-CinemaB`,
            address: '456 Street B',
            city: 'Hồ Chí Minh',
            phone: '0902222222',
            openTime: new Date('1970-01-01T01:00:00Z'),
            closeTime: new Date('1970-01-01T16:00:00Z'),
            status: 'ACTIVE',
          },
        ],
      });

      // 2. Create users
      await tx.user.createMany({
        data: Object.entries(fixture.accounts).map(([name, acc]) => ({
          id: acc.id,
          email: `${name}@${fixture.namespace}.example.test`.toLowerCase(),
          phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
          role: acc.role,
          fullName: `User ${name}`,
          passwordHash,
          status: 'ACTIVE',
        })),
      });

      // 3. User cinema assignments
      await tx.userCinema.createMany({
        data: [
          { userId: fixture.accounts.managerA.id, cinemaId: fixture.cinemaA },
          { userId: fixture.accounts.managerB.id, cinemaId: fixture.cinemaB },
          { userId: fixture.accounts.staffA.id, cinemaId: fixture.cinemaA },
        ],
      });
    });

    return fixture;
  }

  async cleanup() {
    const userIds = Object.values(this.accounts).map((a) => a.id);
    await prisma.$transaction(async (tx) => {
      if (this.createdVoucherIds.length > 0) {
        await tx.voucherRedemption.deleteMany({ where: { voucherId: { in: this.createdVoucherIds } } });
        await tx.voucher.deleteMany({ where: { id: { in: this.createdVoucherIds } } });
      }
      if (this.createdComboIds.length > 0) {
        await tx.comboCinema.deleteMany({ where: { comboId: { in: this.createdComboIds } } });
        await tx.orderCombo.deleteMany({ where: { comboId: { in: this.createdComboIds } } });
        await tx.combo.deleteMany({ where: { id: { in: this.createdComboIds } } });
      }
      if (this.createdRoomIds.length > 0) {
        await tx.seat.deleteMany({ where: { roomId: { in: this.createdRoomIds } } });
        await tx.showtimeSeat.deleteMany({ where: { roomId: { in: this.createdRoomIds } } });
        await tx.room.deleteMany({ where: { id: { in: this.createdRoomIds } } });
      }
      await tx.userCinema.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.cinema.deleteMany({ where: { id: { in: [this.cinemaA, this.cinemaB] } } });
    });
  }
}

describe('Cinema Scope Isolation (Đợt 1)', () => {
  let fixture: CinemaScopeFixture;

  beforeAll(async () => {
    fixture = await CinemaScopeFixture.create();
  });

  afterAll(async () => {
    if (fixture) await fixture.cleanup();
  });

  describe('1. Room Scope (Phòng chiếu)', () => {
    it('Admin có thể tạo phòng ở bất kỳ rạp nào', async () => {
      const res = await request(app)
        .post('/api/v1/cinemas/rooms')
        .set('Authorization', `Bearer ${fixture.accounts.admin.token}`)
        .send({
          cinemaId: fixture.cinemaA,
          name: `Admin-Room-${crypto.randomUUID().slice(0, 6)}`,
          format: 'TWO_D',
          rowCount: 5,
          columnCount: 10,
        });

      expect(res.status).toBe(201);
      fixture.createdRoomIds.push(res.body.data.id);
    });

    it('Manager A có thể tạo phòng ở rạp A (rạp được gán)', async () => {
      const res = await request(app)
        .post('/api/v1/cinemas/rooms')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          cinemaId: fixture.cinemaA,
          name: `MgrA-Room-${crypto.randomUUID().slice(0, 6)}`,
          format: 'TWO_D',
          rowCount: 5,
          columnCount: 10,
        });

      expect(res.status).toBe(201);
      fixture.createdRoomIds.push(res.body.data.id);
    });

    it('Manager A KHÔNG THỂ tạo phòng ở rạp B (sai scope)', async () => {
      const res = await request(app)
        .post('/api/v1/cinemas/rooms')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          cinemaId: fixture.cinemaB,
          name: `MgrA-Illegal-Room`,
          format: 'TWO_D',
          rowCount: 5,
          columnCount: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager không có rạp bị từ chối tạo phòng (rỗng scope)', async () => {
      const res = await request(app)
        .post('/api/v1/cinemas/rooms')
        .set('Authorization', `Bearer ${fixture.accounts.unassignedManager.token}`)
        .send({
          cinemaId: fixture.cinemaA,
          name: `Unassigned-Room`,
          format: 'TWO_D',
          rowCount: 5,
          columnCount: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_FORBIDDEN');
    });

    it('Staff không thể tạo phòng (sai role)', async () => {
      const res = await request(app)
        .post('/api/v1/cinemas/rooms')
        .set('Authorization', `Bearer ${fixture.accounts.staffA.token}`)
        .send({
          cinemaId: fixture.cinemaA,
          name: `Staff-Room`,
          format: 'TWO_D',
          rowCount: 5,
          columnCount: 10,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Combo Scope (Bắp nước)', () => {
    let globalComboId: string;
    let comboCinemaAId: string;
    let comboCinemaBId: string;

    it('Admin có thể tạo combo toàn hệ thống (cinemaIds rỗng)', async () => {
      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.admin.token}`)
        .send({
          name: `Global-Combo-${crypto.randomUUID().slice(0, 6)}`,
          description: 'Global combo for all cinemas',
          price: 50_000,
          cinemaIds: [],
        });

      expect(res.status).toBe(201);
      globalComboId = res.body.data.id;
      fixture.createdComboIds.push(globalComboId);
    });

    it('Manager KHÔNG THỂ tạo combo toàn hệ thống', async () => {
      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: `Mgr-Global-Combo`,
          price: 50_000,
          cinemaIds: [],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GLOBAL_COMBO_ADMIN_ONLY');
    });

    it('Manager A có thể tạo combo gắn rạp A', async () => {
      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: `Combo-CinemaA-${crypto.randomUUID().slice(0, 6)}`,
          price: 45_000,
          cinemaIds: [fixture.cinemaA],
        });

      expect(res.status).toBe(201);
      comboCinemaAId = res.body.data.id;
      fixture.createdComboIds.push(comboCinemaAId);
    });

    it('Manager A KHÔNG THỂ tạo combo gắn rạp B', async () => {
      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: `MgrA-Combo-CinemaB`,
          price: 45_000,
          cinemaIds: [fixture.cinemaB],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager A KHÔNG THỂ tạo combo gắn cả [rạp A, rạp B]', async () => {
      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: `MgrA-Combo-Multi`,
          price: 45_000,
          cinemaIds: [fixture.cinemaA, fixture.cinemaB],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Tạo combo rạp B để phục vụ kiểm tra cập nhật chéo', async () => {
      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerB.token}`)
        .send({
          name: `Combo-CinemaB-${crypto.randomUUID().slice(0, 6)}`,
          price: 60_000,
          cinemaIds: [fixture.cinemaB],
        });

      expect(res.status).toBe(201);
      comboCinemaBId = res.body.data.id;
      fixture.createdComboIds.push(comboCinemaBId);
    });

    it('Manager A KHÔNG THỂ sửa combo thuộc rạp B (lấy rạp từ DB, không tin payload)', async () => {
      const res = await request(app)
        .put(`/api/v1/combos/${comboCinemaBId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: 'Hacked name by MgrA',
          price: 99_000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager A KHÔNG THỂ sửa combo toàn hệ thống', async () => {
      const res = await request(app)
        .put(`/api/v1/combos/${globalComboId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: 'Hacked global combo',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GLOBAL_COMBO_ADMIN_ONLY');
    });

    it('Manager A KHÔNG THỂ xóa combo của rạp B', async () => {
      const res = await request(app)
        .delete(`/api/v1/combos/${comboCinemaBId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager A xem danh sách combo: Chỉ thấy combo global + combo rạp A, KHÔNG thấy combo rạp B', async () => {
      const res = await request(app)
        .get('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`);

      expect(res.status).toBe(200);
      const returnedIds = res.body.data.map((c: any) => c.id);
      expect(returnedIds).toContain(globalComboId);
      expect(returnedIds).toContain(comboCinemaAId);
      expect(returnedIds).not.toContain(comboCinemaBId);
    });

    it('Manager A lọc combo theo rạp B bị 403', async () => {
      const res = await request(app)
        .get('/api/v1/combos')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .query({ cinemaId: fixture.cinemaB });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });
  });

  describe('3. Voucher Scope (Mã giảm giá)', () => {
    let globalVoucherId: string;
    let voucherCinemaAId: string;
    let voucherCinemaBId: string;

    it('Admin có thể tạo voucher toàn hệ thống (cinemaId = null)', async () => {
      const code = `ADM-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
      const res = await request(app)
        .post('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.admin.token}`)
        .send({
          code,
          name: 'Global discount voucher',
          type: 'FIXED',
          value: 20_000,
          minOrder: 0,
          scope: 'ORDER',
          validFrom: new Date(Date.now() - 3600_000).toISOString(),
          validTo: new Date(Date.now() + 86400_000).toISOString(),
          totalLimit: 100,
          perUserLimit: 1,
        });

      expect(res.status).toBe(201);
      globalVoucherId = res.body.data.id;
      fixture.createdVoucherIds.push(globalVoucherId);
    });

    it('Manager KHÔNG THỂ tạo voucher toàn hệ thống (cinemaId = null hoặc thiếu)', async () => {
      const code = `MGR-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
      const res = await request(app)
        .post('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          code,
          name: 'Manager global voucher attempt',
          type: 'FIXED',
          value: 20_000,
          minOrder: 0,
          scope: 'ORDER',
          validFrom: new Date(Date.now() - 3600_000).toISOString(),
          validTo: new Date(Date.now() + 86400_000).toISOString(),
          totalLimit: 100,
          perUserLimit: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GLOBAL_VOUCHER_ADMIN_ONLY');
    });

    it('Manager A có thể tạo voucher cho rạp A', async () => {
      const code = `VOUCH-A-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
      const res = await request(app)
        .post('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          code,
          name: 'Cinema A voucher',
          cinemaId: fixture.cinemaA,
          type: 'FIXED',
          value: 15_000,
          minOrder: 0,
          scope: 'ORDER',
          validFrom: new Date(Date.now() - 3600_000).toISOString(),
          validTo: new Date(Date.now() + 86400_000).toISOString(),
          totalLimit: 50,
          perUserLimit: 1,
        });

      expect(res.status).toBe(201);
      voucherCinemaAId = res.body.data.id;
      fixture.createdVoucherIds.push(voucherCinemaAId);
    });

    it('Manager A KHÔNG THỂ tạo voucher cho rạp B', async () => {
      const code = `VOUCH-B-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
      const res = await request(app)
        .post('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          code,
          name: 'Cinema B voucher by MgrA',
          cinemaId: fixture.cinemaB,
          type: 'FIXED',
          value: 15_000,
          minOrder: 0,
          scope: 'ORDER',
          validFrom: new Date(Date.now() - 3600_000).toISOString(),
          validTo: new Date(Date.now() + 86400_000).toISOString(),
          totalLimit: 50,
          perUserLimit: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Tạo voucher rạp B bằng Manager B để kiểm tra cập nhật chéo', async () => {
      const code = `VOUCH-B2-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
      const res = await request(app)
        .post('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerB.token}`)
        .send({
          code,
          name: 'Cinema B voucher',
          cinemaId: fixture.cinemaB,
          type: 'FIXED',
          value: 10_000,
          minOrder: 0,
          scope: 'ORDER',
          validFrom: new Date(Date.now() - 3600_000).toISOString(),
          validTo: new Date(Date.now() + 86400_000).toISOString(),
          totalLimit: 50,
          perUserLimit: 1,
        });

      expect(res.status).toBe(201);
      voucherCinemaBId = res.body.data.id;
      fixture.createdVoucherIds.push(voucherCinemaBId);
    });

    it('Manager A KHÔNG THỂ sửa voucher của rạp B (lấy entity từ DB)', async () => {
      const res = await request(app)
        .put(`/api/v1/vouchers/admin/${voucherCinemaBId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: 'Tampered voucher name',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager A KHÔNG THỂ sửa voucher toàn hệ thống', async () => {
      const res = await request(app)
        .put(`/api/v1/vouchers/admin/${globalVoucherId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .send({
          name: 'Tampered global voucher',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GLOBAL_VOUCHER_ADMIN_ONLY');
    });

    it('Manager A xem danh sách voucher: Thấy voucher global + voucher rạp A, KHÔNG thấy voucher rạp B', async () => {
      const res = await request(app)
        .get('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`);

      expect(res.status).toBe(200);
      const returnedIds = res.body.data.map((v: any) => v.id);
      expect(returnedIds).toContain(globalVoucherId);
      expect(returnedIds).toContain(voucherCinemaAId);
      expect(returnedIds).not.toContain(voucherCinemaBId);
    });

    it('Manager A lọc voucher theo rạp B bị 403', async () => {
      const res = await request(app)
        .get('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .query({ cinemaId: fixture.cinemaB });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager A lọc voucher theo rạp A thành công', async () => {
      const res = await request(app)
        .get('/api/v1/vouchers/admin')
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`)
        .query({ cinemaId: fixture.cinemaA });

      expect(res.status).toBe(200);
      const returnedIds = res.body.data.map((v: any) => v.id);
      expect(returnedIds).toContain(voucherCinemaAId);
      expect(returnedIds).not.toContain(voucherCinemaBId);
    });

    it('Manager A KHÔNG THỂ xóa voucher của rạp B', async () => {
      const res = await request(app)
        .delete(`/api/v1/vouchers/admin/${voucherCinemaBId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Manager A xóa thành công voucher của rạp A', async () => {
      const res = await request(app)
        .delete(`/api/v1/vouchers/admin/${voucherCinemaAId}`)
        .set('Authorization', `Bearer ${fixture.accounts.managerA.token}`);

      expect(res.status).toBe(200);
    });
  });
});
