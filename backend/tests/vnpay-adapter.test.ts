import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VnpayAdapter } from '../src/modules/payments/vnpay.adapter';

afterEach(() => vi.unstubAllEnvs());

describe('VNPay signature and amount boundary', () => {
  const secret = 'adapter-test-secret-not-a-live-credential';
  const adapter = () => {
    vi.stubEnv('VNPAY_HASH_SECRET', secret);
    return new VnpayAdapter();
  };

  it('signs the encoded request and sends VND as an integer multiplied by 100', () => {
    const url = new URL(adapter().createPaymentUrl({ amount: 95000, txnRef: 'ORDER-1', orderInfo: 'Ve phim & combo', ipAddr: '127.0.0.1' }));
    expect(url.searchParams.get('vnp_Amount')).toBe('9500000');
    expect(url.searchParams.get('vnp_OrderInfo')).toBe('Ve phim & combo');
    const signature = url.searchParams.get('vnp_SecureHash');
    url.searchParams.delete('vnp_SecureHash');
    expect(signature).toBe(crypto.createHmac('sha512', secret).update(url.search.slice(1)).digest('hex'));
  });

  it('accepts an independently signed callback and rejects tampering', () => {
    const checksum = crypto.createHmac('sha512', secret).update('vnp_Amount=9500000&vnp_ResponseCode=00&vnp_TxnRef=ORDER-1').digest('hex');
    const query = { vnp_Amount: '9500000', vnp_ResponseCode: '00', vnp_TxnRef: 'ORDER-1', vnp_SecureHash: checksum };
    expect(adapter().verifyReturnUrl({ ...query }).isValid).toBe(true);
    expect(adapter().verifyReturnUrl({ ...query, vnp_Amount: '100' }).isValid).toBe(false);
  });

  it.each([undefined, '', 'not-a-checksum', ['a', 'b'], { value: 'a' }])('rejects malformed checksum %j without throwing', (checksum) => {
    expect(adapter().verifyReturnUrl({ vnp_Amount: '9500000', vnp_SecureHash: checksum }).isValid).toBe(false);
  });

  it('rejects duplicate query fields even when their string conversion is signed', () => {
    const signature = crypto.createHmac('sha512', secret).update('vnp_Amount=9500000%2C100').digest('hex');
    expect(adapter().verifyReturnUrl({ vnp_Amount: ['9500000', '100'], vnp_SecureHash: signature }).isValid).toBe(false);
  });
});
