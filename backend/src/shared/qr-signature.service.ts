import crypto from 'node:crypto';

export interface VerifyQrResult {
  valid: boolean;
  ticketCode: string;
  keyVersion?: number;
  isSigned: boolean;
  error?: string;
}

export class QrSignatureService {
  private defaultKeyVersion = 1;

  private getKeySecret(keyVersion: number): string | null {
    if (keyVersion === 1) {
      return process.env.QR_SIGNING_SECRET || 'cinex-default-qr-signing-secret-key-32b!';
    }
    const envKey = process.env[`QR_SIGNING_SECRET_V${keyVersion}`];
    return envKey || null;
  }

  /**
   * Ký mã vé thành định dạng: v<keyVersion>.<ticketCode>.<sig>
   * Chữ ký HMAC-SHA256 được cắt lấy 16 bytes đầu (128-bit) encode base64url
   */
  signTicketCode(ticketCode: string, keyVersion: number = this.defaultKeyVersion): string {
    if (!ticketCode || typeof ticketCode !== 'string') {
      throw new Error('ticketCode is required for signing');
    }
    const secret = this.getKeySecret(keyVersion);
    if (!secret) {
      throw new Error(`Secret key not found for key version: ${keyVersion}`);
    }

    const payloadToSign = `v${keyVersion}.${ticketCode}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadToSign);
    const signature = hmac.digest().subarray(0, 16).toString('base64url');

    return `${payloadToSign}.${signature}`;
  }

  /**
   * Xác thực và bóc tách mã vé từ payload quét được
   */
  verifyAndExtractTicketCode(rawPayload: string, strict: boolean = false): VerifyQrResult {
    if (!rawPayload || typeof rawPayload !== 'string') {
      return { valid: false, ticketCode: '', isSigned: false, error: 'PAYLOAD_EMPTY' };
    }

    const trimmed = rawPayload.trim();

    // 1. Kiểm tra định dạng signed QR: v<version>.<ticketCode>.<sig>
    const match = trimmed.match(/^v(\d+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (match) {
      const keyVersion = parseInt(match[1], 10);
      const ticketCode = match[2];
      const providedSig = match[3];

      const secret = this.getKeySecret(keyVersion);
      if (!secret) {
        return { valid: false, ticketCode, keyVersion, isSigned: true, error: 'KEY_VERSION_UNSUPPORTED' };
      }

      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`v${keyVersion}.${ticketCode}`);
      const expectedSig = hmac.digest().subarray(0, 16).toString('base64url');

      const providedBuf = Buffer.from(providedSig);
      const expectedBuf = Buffer.from(expectedSig);

      if (providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        return { valid: true, ticketCode, keyVersion, isSigned: true };
      }

      return { valid: false, ticketCode, keyVersion, isSigned: true, error: 'INVALID_QR_SIGNATURE' };
    }

    // 2. Không phải signed format:
    // Nếu ở chế độ STRICT_QR_VERIFICATION -> từ chối
    if (strict) {
      return { valid: false, ticketCode: '', isSigned: false, error: 'UNSIGNED_QR_NOT_ALLOWED' };
    }

    // 3. Fallback cho plain ticketCode hoặc format cũ "TKXXXX|showtimeId|..."
    const plainTicketCode = trimmed.includes('|') ? trimmed.split('|')[0] : trimmed;
    if (plainTicketCode.startsWith('TK') && plainTicketCode.length >= 5 && plainTicketCode.length <= 20) {
      return { valid: true, ticketCode: plainTicketCode, isSigned: false };
    }

    return { valid: false, ticketCode: trimmed, isSigned: false, error: 'MALFORMED_QR_PAYLOAD' };
  }
}

export const qrSignatureService = new QrSignatureService();
