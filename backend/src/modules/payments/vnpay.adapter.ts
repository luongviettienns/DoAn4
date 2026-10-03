import crypto from 'crypto';

export interface VnpayCreateParams {
  amount: number; // In VND (e.g. 115000)
  txnRef: string; // e.g. MV261003A1B2C3-1
  orderInfo: string;
  ipAddr: string;
  returnUrl?: string;
  locale?: string;
}

export class VnpayAdapter {
  private tmnCode: string;
  private hashSecret: string;
  private paymentUrl: string;
  private returnUrl: string;

  constructor() {
    this.tmnCode = process.env.VNPAY_TMN_CODE || 'CINEXSANDBOX';
    this.hashSecret = process.env.VNPAY_HASH_SECRET || 'CINEX_SUPER_SECRET_VNPAY_HASH_KEY_2026';
    this.paymentUrl = process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/v1/payment/vnpay/return';
  }

  /**
   * Sinh URL thanh toán VNPay Sandbox với chữ ký HMAC-SHA512
   */
  createPaymentUrl(params: VnpayCreateParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.txnRef,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(params.amount * 100), // VNPay tính bằng đơn vị xu (VND * 100)
      vnp_ReturnUrl: params.returnUrl || this.returnUrl,
      vnp_IpAddr: params.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedParams = this.sortObject(vnpParams);
    const signData = this.buildQueryString(sortedParams);
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;

    return `${this.paymentUrl}?${this.buildQueryString(sortedParams)}`;
  }

  /**
   * Xác thực chữ ký HMAC-SHA512 từ callback / IPN của VNPay
   */
  verifyReturnUrl(query: Record<string, any>): { isValid: boolean; data: Record<string, any> } {
    const secureHash = query['vnp_SecureHash'];
    delete query['vnp_SecureHash'];
    delete query['vnp_SecureHashType'];

    const sortedParams = this.sortObject(query);
    const signData = this.buildQueryString(sortedParams);
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return {
      isValid: secureHash?.toLowerCase() === signed.toLowerCase(),
      data: sortedParams,
    };
  }

  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
      }
    }
    return sorted;
  }

  private buildQueryString(obj: Record<string, string>): string {
    return Object.entries(obj)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }
}

export const vnpayAdapter = new VnpayAdapter();
