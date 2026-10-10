import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';

const app = createApp();

async function debug() {
  const custRes = await request(app).post('/api/v1/auth/login').send({ email: 'customer@gmail.com', password: '12345678' });
  const customerToken = custRes.body.data?.accessToken;
  if (!customerToken) { console.log('Login failed:', custRes.body); process.exit(1); }
  
  const comboRes = await request(app).get('/api/v1/combos');
  const sampleCombo = comboRes.body.data?.[0];
  console.log('Sample combo:', JSON.stringify({ id: sampleCombo?.id, name: sampleCombo?.name, price: sampleCombo?.price, isActive: sampleCombo?.isActive }));
  
  const showtimes = await prisma.showtime.findMany({
    where: { status: 'OPEN' },
    include: { slots: { where: { status: 'AVAILABLE' } } },
  });
  const showtime = showtimes.sort((a, b) => b.slots.length - a.slots.length)[0];
  console.log('Best showtime:', showtime?.id, 'Available slots:', showtime?.slots.length);
  
  if (!showtime || showtime.slots.length === 0) { console.log('No showtime!'); process.exit(1); }
  
  // Check voucher status
  const voucher = await prisma.voucher.findFirst({ where: { code: 'CINEX20' } });
  console.log('CINEX20 voucher:', JSON.stringify({ id: voucher?.id, usageCount: voucher?.usageCount, usageLimit: voucher?.usageLimit, isActive: voucher?.isActive }));
  
  const seat = showtime.slots[0];
  const res = await request(app).post('/api/v1/orders').set('Authorization', 'Bearer ' + customerToken).send({
    showtimeId: showtime.id,
    seatIds: [seat.seatId],
    ageConfirmed: true,
    combos: sampleCombo ? [{ comboId: sampleCombo.id, quantity: 2 }] : [],
    voucherCode: 'CINEX20',
  });
  
  console.log('\nStatus:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  await prisma.$disconnect();
}

debug().catch((e) => { console.error(e); process.exit(1); });
