import nodemailer, { type Transporter } from 'nodemailer';

export interface SentEmail {
  to: string;
  subject: string;
  token: string;
  link: string;
  html: string;
  text: string;
  sentAt: Date;
}

export interface BookingConfirmationEmailData {
  orderCode: string;
  customerName: string;
  movieTitle: string;
  posterUrl?: string | null;
  cinemaName: string;
  roomName: string;
  formatName: string;
  showtimeDate: string;
  showtimeTime: string;
  seats: string[];
  ticketCodes: string[];
  combos?: Array<{ name: string; quantity: number }>;
  totalAmount: number;
  paymentMethod: string;
}

export class MailService {
  private transporter: Transporter | null = null;
  private sentEmails: SentEmail[] = [];

  constructor() {
    this.initTransporter();
  }

  /**
   * Khởi tạo hoặc cập nhật cấu hình SMTP Transporter
   */
  initTransporter(): void {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    } else {
      this.transporter = null;
    }
  }

  /**
   * Kiểm tra xem cấu hình SMTP thực tế đã sẵn sàng chưa
   */
  isSmtpConfigured(): boolean {
    if (!this.transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.initTransporter();
    }
    return this.transporter !== null;
  }

  /**
   * Kiểm tra kết nối tới máy chủ SMTP
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.initTransporter();
    }
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      console.error('[MAIL] Kiểm tra kết nối SMTP thất bại:', err);
      return false;
    }
  }

  private shouldSendViaSmtp(): boolean {
    if (!this.transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.initTransporter();
    }
    return Boolean(this.transporter && (process.env.NODE_ENV !== 'test' || process.env.ENABLE_TEST_REAL_EMAIL === 'true'));
  }

  /**
   * Gửi email hướng dẫn đặt lại mật khẩu (Token 15 phút)
   */
  async sendPasswordReset(to: string, rawToken: string, fullName: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/reset-password?token=${rawToken}`;
    const subject = '[CineX] Hướng dẫn đặt lại mật khẩu tài khoản';
    const text = `Xin chào ${fullName},\n\nBạn đã yêu cầu đặt lại mật khẩu cho tài khoản CineX. Vui lòng bấm vào liên kết sau để thiết lập mật khẩu mới (liên kết có hiệu lực trong 15 phút):\n${link}\n\nNếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và tài khoản của bạn vẫn an toàn.`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #0B0A0C; color: #F3EEE6; border: 1px solid #2A2631; border-radius: 12px;">
        <div style="border-bottom: 2px solid #FFB23E; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="color: #FFB23E; font-size: 26px; margin: 0; letter-spacing: 2px; text-transform: uppercase;">CINEX REWARDS</h1>
          <p style="color: #A39E96; font-size: 13px; margin: 4px 0 0 0;">Hệ thống rạp chiếu phim hiện đại chuẩn quốc tế</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">Xin chào <strong>${fullName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #D1CCD6;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản CineX liên kết với email này. Vui lòng bấm vào nút bên dưới để thiết lập mật khẩu mới:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: #FFB23E; color: #0B0A0C; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(255, 178, 62, 0.3);">ĐẶT LẠI MẬT KHẨU</a>
        </div>
        <div style="background: #151318; border-left: 4px solid #FFB23E; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
          <p style="font-size: 13px; color: #FFB23E; margin: 0; font-weight: bold;">Lưu ý bảo mật:</p>
          <p style="font-size: 12px; color: #A39E96; margin: 4px 0 0 0;">Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> và sẽ tự hủy sau 1 lần sử dụng.</p>
        </div>
        <p style="font-size: 12px; color: #6E6877; line-height: 1.5; margin-top: 24px;">Nếu nút bấm trên không phản hồi, hãy sao chép và dán liên kết sau vào trình duyệt:<br/><a href="${link}" style="color: #FFB23E; word-break: break-all;">${link}</a></p>
        <div style="border-top: 1px solid #2A2631; margin-top: 24px; pt-4; font-size: 11px; color: #55505C; text-align: center;">
          <p style="margin: 8px 0 0 0;">CineX Cinema • Đây là email tự động, vui lòng không trả lời thư này.</p>
        </div>
      </div>
    `;

    this.recordSent({ to, subject, token: rawToken, link, html, text, sentAt: new Date() });

    if (this.shouldSendViaSmtp() && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || `"CineX Cinema" <${process.env.SMTP_USER}>`;
        await this.transporter.sendMail({ from, to, subject, text, html });
        console.log(`[MAIL] Đã gửi email đặt lại mật khẩu thành công tới ${to}`);
      } catch (err) {
        console.error(`[MAIL-ERROR] Gửi email đặt lại mật khẩu thất bại tới ${to}:`, err);
      }
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(`[MAIL-DEV] (Chưa cấu hình SMTP) Gửi email đặt lại mật khẩu tới ${to}: ${link}`);
    }
  }

  /**
   * Gửi email xác thực tài khoản (Token 24 giờ)
   */
  async sendEmailVerification(to: string, rawToken: string, fullName: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/verify-email?token=${rawToken}`;
    const subject = '[CineX] Xác thực địa chỉ email tài khoản thành viên';
    const text = `Xin chào ${fullName},\n\nCảm ơn bạn đã đăng ký tài khoản thành viên CineX Rewards! Vui lòng bấm vào liên kết sau để kích hoạt tài khoản của bạn:\n${link}\n\nLiên kết có hiệu lực trong vòng 24 giờ.`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #0B0A0C; color: #F3EEE6; border: 1px solid #2A2631; border-radius: 12px;">
        <div style="border-bottom: 2px solid #FFB23E; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="color: #FFB23E; font-size: 26px; margin: 0; letter-spacing: 2px; text-transform: uppercase;">CINEX REWARDS</h1>
          <p style="color: #A39E96; font-size: 13px; margin: 4px 0 0 0;">Chào mừng bạn đến với cộng đồng điện ảnh CineX</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">Xin chào <strong>${fullName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #D1CCD6;">Cảm ơn bạn đã gia nhập CineX! Để bảo vệ tài khoản, tích lũy điểm thưởng và nhận thông báo vé xem phim nhanh nhất, vui lòng xác nhận địa chỉ email của bạn:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: #FFB23E; color: #0B0A0C; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(255, 178, 62, 0.3);">KÍCH HOẠT TÀI KHOẢN</a>
        </div>
        <div style="background: #151318; border-left: 4px solid #38A169; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
          <p style="font-size: 13px; color: #38A169; margin: 0; font-weight: bold;">Đặc quyền thành viên:</p>
          <p style="font-size: 12px; color: #A39E96; margin: 4px 0 0 0;">Tích điểm 10% mỗi lần đặt vé, ưu đãi đồng giá vé 55k vào thứ Ba hàng tuần và quà tặng sinh nhật hấp dẫn.</p>
        </div>
        <p style="font-size: 12px; color: #6E6877; line-height: 1.5; margin-top: 24px;">Nếu nút bấm trên không phản hồi, hãy sao chép và dán liên kết sau vào trình duyệt:<br/><a href="${link}" style="color: #FFB23E; word-break: break-all;">${link}</a></p>
        <div style="border-top: 1px solid #2A2631; margin-top: 24px; pt-4; font-size: 11px; color: #55505C; text-align: center;">
          <p style="margin: 8px 0 0 0;">CineX Cinema • Liên kết kích hoạt có hiệu lực trong vòng 24 giờ.</p>
        </div>
      </div>
    `;

    this.recordSent({ to, subject, token: rawToken, link, html, text, sentAt: new Date() });

    if (this.shouldSendViaSmtp() && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || `"CineX Cinema" <${process.env.SMTP_USER}>`;
        await this.transporter.sendMail({ from, to, subject, text, html });
        console.log(`[MAIL] Đã gửi email xác thực tài khoản thành công tới ${to}`);
      } catch (err) {
        console.error(`[MAIL-ERROR] Gửi email xác thực tài khoản thất bại tới ${to}:`, err);
      }
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(`[MAIL-DEV] (Chưa cấu hình SMTP) Gửi email xác thực tài khoản tới ${to}: ${link}`);
    }
  }

  /**
   * Gửi email xác nhận đặt vé & Vé xem phim điện tử (E-Ticket)
   */
  async sendBookingConfirmation(to: string, data: BookingConfirmationEmailData): Promise<void> {
    const subject = `[CineX] Vé xem phim điện tử • Đơn hàng #${data.orderCode} (${data.movieTitle})`;
    const formattedTotal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.totalAmount);
    const seatsFormatted = data.seats.join(', ');
    const primaryTicketCode = data.ticketCodes[0] || data.orderCode;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(primaryTicketCode)}`;

    const combosHtml = data.combos && data.combos.length > 0 ? `
      <div style="background: #151318; border-radius: 8px; padding: 12px 16px; margin-top: 12px;">
        <span style="font-size: 12px; font-weight: bold; color: #FFB23E; text-transform: uppercase;">Combo bắp nước:</span>
        <p style="font-size: 13px; color: #F3EEE6; margin: 4px 0 0 0;">
          ${data.combos.map(c => `• ${c.name} (x${c.quantity})`).join('<br/>')}
        </p>
      </div>
    ` : '';

    const text = `Xin chào ${data.customerName},\n\nCảm ơn bạn đã đặt vé tại CineX! Đơn hàng #${data.orderCode} đã thanh toán thành công.\n\nPhim: ${data.movieTitle}\nRạp: ${data.cinemaName} - ${data.roomName}\nSuất chiếu: ${data.showtimeTime}, ${data.showtimeDate}\nGhế: ${seatsFormatted}\nMã vé: ${data.ticketCodes.join(', ')}\nTổng tiền: ${formattedTotal}\n\nVui lòng xuất trình mã vé tại rạp để vào phòng chiếu.`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: auto; padding: 24px; background: #0B0A0C; color: #F3EEE6; border: 1px solid #2A2631; border-radius: 12px;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #FFB23E; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: #FFB23E; font-size: 26px; margin: 0; letter-spacing: 2px; text-transform: uppercase;">CINEX REWARDS</h1>
          <p style="color: #A39E96; font-size: 13px; margin: 4px 0 0 0;">XÁC NHẬN ĐẶT VÉ & VÉ ĐIỆN TỬ (E-TICKET)</p>
        </div>

        <p style="font-size: 15px; margin-top: 0;">Xin chào <strong>${data.customerName}</strong>,</p>
        <p style="font-size: 14px; color: #D1CCD6; margin-bottom: 20px;">Đơn hàng của bạn đã được thanh toán thành công. Dưới đây là thông tin vé xem phim điện tử chính thức:</p>

        <!-- Ticket Card Box -->
        <div style="background: #151318; border: 2px dashed #FFB23E; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <!-- Movie Info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              ${data.posterUrl ? `
                <td style="width: 100px; vertical-align: top; padding-right: 16px;">
                  <img src="${data.posterUrl}" alt="${data.movieTitle}" style="width: 100px; border-radius: 8px; border: 1px solid #2A2631; display: block;" />
                </td>
              ` : ''}
              <td style="vertical-align: top;">
                <span style="background: #FFB23E; color: #0B0A0C; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${data.formatName}</span>
                <h2 style="color: #F3EEE6; font-size: 20px; margin: 8px 0 4px 0; line-height: 1.3;">${data.movieTitle}</h2>
                <p style="color: #FFB23E; font-size: 13px; font-weight: bold; margin: 0;">${data.cinemaName}</p>
                <p style="color: #A39E96; font-size: 13px; margin: 2px 0 0 0;">Phòng chiếu: <strong>${data.roomName}</strong></p>
              </td>
            </tr>
          </table>

          <!-- Showtime & Seats -->
          <div style="background: #0B0A0C; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; border: 1px solid #2A2631;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="color: #A39E96; padding: 4px 0;">Suất chiếu:</td>
                <td style="color: #FFB23E; font-weight: bold; text-align: right; padding: 4px 0;">${data.showtimeTime}</td>
              </tr>
              <tr>
                <td style="color: #A39E96; padding: 4px 0;">Ngày chiếu:</td>
                <td style="color: #F3EEE6; font-weight: bold; text-align: right; padding: 4px 0;">${data.showtimeDate}</td>
              </tr>
              <tr>
                <td style="color: #A39E96; padding: 4px 0;">Ghế ngồi:</td>
                <td style="color: #FFB23E; font-weight: bold; text-align: right; padding: 4px 0;">${seatsFormatted}</td>
              </tr>
              <tr>
                <td style="color: #A39E96; padding: 4px 0;">Mã đơn hàng:</td>
                <td style="color: #F3EEE6; font-family: monospace; font-weight: bold; text-align: right; padding: 4px 0;">#${data.orderCode}</td>
              </tr>
            </table>
          </div>

          ${combosHtml}

          <!-- QR Code & Ticket Code Box -->
          <div style="text-align: center; background: #0B0A0C; border-radius: 8px; padding: 16px; margin-top: 16px; border: 1px solid #2A2631;">
            <p style="font-size: 12px; color: #A39E96; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Mã QR Soát Vé Tại Rạp</p>
            <img src="${qrUrl}" alt="QR Ticket Code" style="width: 160px; height: 160px; background: #FFFFFF; padding: 8px; border-radius: 8px; display: inline-block;" />
            <div style="margin-top: 12px;">
              <span style="font-size: 12px; color: #A39E96;">Mã vé: </span>
              <strong style="font-family: monospace; font-size: 16px; color: #FFB23E; letter-spacing: 1.5px;">${data.ticketCodes.join(' • ')}</strong>
            </div>
          </div>
        </div>

        <!-- Payment Summary -->
        <div style="background: #151318; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #A39E96;">Hình thức thanh toán:</td>
              <td style="color: #F3EEE6; text-align: right; font-weight: bold;">${data.paymentMethod}</td>
            </tr>
            <tr>
              <td style="color: #A39E96; padding-top: 6px;">Tổng tiền đã thanh toán:</td>
              <td style="color: #FFB23E; font-size: 16px; font-weight: bold; text-align: right; padding-top: 6px;">${formattedTotal}</td>
            </tr>
          </table>
        </div>

        <!-- Instructions -->
        <div style="background: #151318; border-left: 4px solid #FFB23E; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="font-size: 13px; color: #FFB23E; margin: 0; font-weight: bold;">Hướng dẫn vào rạp:</p>
          <ul style="font-size: 12px; color: #A39E96; margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5;">
            <li>Vui lòng có mặt trước giờ chiếu 15 - 30 phút để nhận bắp nước (nếu có).</li>
            <li>Xuất trình mã QR hoặc mã vé trên email này trực tiếp tại cửa kiểm soát vé.</li>
            <li>Vé đã thanh toán không áp dụng đổi hoặc hủy khi suất chiếu còn dưới 2 giờ.</li>
          </ul>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #2A2631; padding-top: 16px; font-size: 11px; color: #55505C; text-align: center;">
          <p style="margin: 0;">Hotline hỗ trợ: 1900 6868 • Email: support@cinex.vn</p>
          <p style="margin: 4px 0 0 0;">CineX Cinema • Rạp chiếu phim công nghệ hàng đầu Việt Nam</p>
        </div>
      </div>
    `;

    this.recordSent({ to, subject, token: data.orderCode, link: primaryTicketCode, html, text, sentAt: new Date() });

    if (this.shouldSendViaSmtp() && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || `"CineX Cinema" <${process.env.SMTP_USER}>`;
        await this.transporter.sendMail({ from, to, subject, text, html });
        console.log(`[MAIL] Đã gửi email vé điện tử thành công tới ${to} (Đơn #${data.orderCode})`);
      } catch (err) {
        console.error(`[MAIL-ERROR] Gửi email vé điện tử thất bại tới ${to}:`, err);
      }
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(`[MAIL-DEV] (Chưa cấu hình SMTP) Gửi vé điện tử tới ${to} cho đơn #${data.orderCode}`);
    }
  }

  private recordSent(email: SentEmail): void {
    this.sentEmails.push(email);
    if (this.sentEmails.length > 100) {
      this.sentEmails.shift();
    }
  }

  getSentEmails(): SentEmail[] {
    return [...this.sentEmails];
  }

  getLastEmailFor(email: string): SentEmail | undefined {
    return this.sentEmails.slice().reverse().find((e) => e.to.toLowerCase() === email.toLowerCase());
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

export const mailService = new MailService();
export default mailService;
