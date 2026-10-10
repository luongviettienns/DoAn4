import https from 'node:https';
import { AppError, UnauthorizedError } from './errors';

export interface GoogleTokenPayload {
  iss: string;
  sub: string;
  azp?: string;
  aud: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export class GoogleAuthService {
  private get expectedClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com';
  }

  async verifyIdToken(idToken: string): Promise<GoogleTokenPayload> {
    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedError('INVALID_GOOGLE_TOKEN', 'Mã xác thực Google không hợp lệ');
    }

    return new Promise((resolve, reject) => {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`;

      const req = https.get(url, { timeout: 10000 }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new UnauthorizedError(
                  'INVALID_GOOGLE_TOKEN',
                  'Mã xác thực Google không hợp lệ hoặc đã hết hạn'
                )
              );
            }
            const data = JSON.parse(rawData) as GoogleTokenPayload;

            // Xác thực đối tượng nhận (Audience) phải khớp với Client ID đã đăng ký
            if (data.aud !== this.expectedClientId) {
              return reject(
                new UnauthorizedError('INVALID_GOOGLE_AUDIENCE', 'Google Client ID không khớp với ứng dụng')
              );
            }

            // Xác thực đơn vị phát hành token (Issuer)
            if (!['accounts.google.com', 'https://accounts.google.com'].includes(data.iss)) {
              return reject(new UnauthorizedError('INVALID_GOOGLE_ISSUER', 'Đơn vị phát hành token không hợp lệ'));
            }

            // Kiểm tra email đã được Google xác thực chưa
            if (data.email_verified !== 'true' && data.email_verified !== true) {
              return reject(new UnauthorizedError('GOOGLE_EMAIL_NOT_VERIFIED', 'Tài khoản Google chưa được xác minh email'));
            }

            resolve(data);
          } catch {
            reject(new AppError(502, 'GOOGLE_API_ERROR', 'Không thể phân tích dữ liệu xác thực từ Google'));
          }
        });
      });

      req.on('error', (err) => {
        reject(new AppError(502, 'GOOGLE_CONNECTION_ERROR', `Không thể kết nối đến máy chủ Google: ${err.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy(new Error('Yêu cầu xác thực Google vượt quá thời gian chờ (10s)'));
      });
    });
  }
}

export const googleAuthService = new GoogleAuthService();
