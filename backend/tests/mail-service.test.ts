import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { MailService } from '../src/shared/mail.service';

describe('MailService Unit & SMTP Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('runs in fallback in-memory mode when SMTP is not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const mailService = new MailService();
    expect(mailService.isSmtpConfigured()).toBe(false);

    await mailService.sendPasswordReset('user@example.test', 'raw-token-123', 'Nguyễn Văn A');
    const resetMail = mailService.getLastEmailFor('user@example.test');
    expect(resetMail).toBeDefined();
    expect(resetMail?.token).toBe('raw-token-123');
    expect(resetMail?.link).toContain('/reset-password?token=raw-token-123');
    expect(resetMail?.html).toContain('CINEX REWARDS');

    await mailService.sendEmailVerification('user@example.test', 'verify-token-456', 'Nguyễn Văn A');
    const verifyMail = mailService.getLastEmailFor('user@example.test');
    expect(verifyMail?.token).toBe('verify-token-456');
    expect(verifyMail?.link).toContain('/verify-email?token=verify-token-456');

    expect(await mailService.verifyConnection()).toBe(false);
  });

  it('initializes nodemailer transporter when SMTP configuration is provided', async () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'cinex.cinema.vn@gmail.com';
    process.env.SMTP_PASS = 'mockapppassword123';
    process.env.SMTP_FROM = '"CineX Cinema" <cinex.cinema.vn@gmail.com>';

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-123' });
    const mockVerify = vi.fn().mockResolvedValue(true);

    const createTransportSpy = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
    } as any);

    const mailService = new MailService();
    expect(mailService.isSmtpConfigured()).toBe(true);
    expect(createTransportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'cinex.cinema.vn@gmail.com',
          pass: 'mockapppassword123',
        },
      })
    );

    const isConnected = await mailService.verifyConnection();
    expect(isConnected).toBe(true);
    expect(mockVerify).toHaveBeenCalled();
  });

  it('sends real password reset email via transporter when SMTP is enabled', async () => {
    process.env.ENABLE_TEST_REAL_EMAIL = 'true';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = 'cinex.cinema.vn@gmail.com';
    process.env.SMTP_PASS = 'mockapppassword123';

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-456' });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
      verify: vi.fn().mockResolvedValue(true),
    } as any);

    const mailService = new MailService();
    await mailService.sendPasswordReset('customer@gmail.com', 'token-abc', 'Trần Thị B');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const sendArgs = mockSendMail.mock.calls[0][0];
    expect(sendArgs.to).toBe('customer@gmail.com');
    expect(sendArgs.subject).toBe('[CineX] Hướng dẫn đặt lại mật khẩu tài khoản');
    expect(sendArgs.html).toContain('Trần Thị B');
    expect(sendArgs.html).toContain('/reset-password?token=token-abc');

    const recorded = mailService.getLastEmailFor('customer@gmail.com');
    expect(recorded?.token).toBe('token-abc');
  });

  it('sends email verification via transporter and handles transporter failure gracefully', async () => {
    process.env.ENABLE_TEST_REAL_EMAIL = 'true';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = 'cinex.cinema.vn@gmail.com';
    process.env.SMTP_PASS = 'mockapppassword123';

    const mockSendMail = vi.fn().mockRejectedValue(new Error('SMTP connection timed out'));
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
      verify: vi.fn().mockRejectedValue(new Error('Auth failed')),
    } as any);

    const mailService = new MailService();

    // Verification check returns false on error
    expect(await mailService.verifyConnection()).toBe(false);

    // sendEmailVerification catches error and does not throw uncaught exception
    await expect(
      mailService.sendEmailVerification('customer@gmail.com', 'verify-token-xyz', 'Lê Văn C')
    ).resolves.toBeUndefined();

    // But record is still kept in-memory
    const recorded = mailService.getLastEmailFor('customer@gmail.com');
    expect(recorded?.token).toBe('verify-token-xyz');
  });

  it('correctly tracks and clears sent emails history', async () => {
    const mailService = new MailService();
    mailService.clearSentEmails();
    expect(mailService.getSentEmails()).toHaveLength(0);

    await mailService.sendPasswordReset('alpha@cinex.vn', 'tok1', 'Alpha');
    await mailService.sendPasswordReset('beta@cinex.vn', 'tok2', 'Beta');

    expect(mailService.getSentEmails()).toHaveLength(2);
    expect(mailService.getLastEmailFor('alpha@cinex.vn')?.token).toBe('tok1');
    expect(mailService.getLastEmailFor('beta@cinex.vn')?.token).toBe('tok2');
    expect(mailService.getLastEmailFor('nonexistent@cinex.vn')).toBeUndefined();

    mailService.clearSentEmails();
    expect(mailService.getSentEmails()).toHaveLength(0);
  });

  it('generates rich E-Ticket email with QR code, combos, seats, and formatted amount in fallback mode', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const mailService = new MailService();

    await mailService.sendBookingConfirmation('booking.user@example.test', {
      orderCode: 'ORD20261007',
      customerName: 'Nguyễn Văn A',
      movieTitle: 'Dune: Part Two',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
      cinemaName: 'CineX Landmark 81',
      roomName: 'Phòng 01 (IMAX)',
      formatName: 'IMAX LASER',
      showtimeDate: 'Thứ Bảy, 10/10/2026',
      showtimeTime: '19:30',
      seats: ['F05', 'F06'],
      ticketCodes: ['TK99A1', 'TK99A2'],
      combos: [
        { name: 'Combo Solo Bắp Phô Mai + Coca lớn', quantity: 2 },
      ],
      totalAmount: 320000,
      paymentMethod: 'VNPAY',
    });

    const sent = mailService.getLastEmailFor('booking.user@example.test');
    expect(sent).toBeDefined();
    expect(sent?.subject).toContain('Vé xem phim điện tử • Đơn hàng #ORD20261007 (Dune: Part Two)');
    expect(sent?.html).toContain('Dune: Part Two');
    expect(sent?.html).toContain('CineX Landmark 81');
    expect(sent?.html).toContain('F05, F06');
    expect(sent?.html).toContain('TK99A1 • TK99A2');
    expect(sent?.html).toContain('Combo Solo Bắp Phô Mai + Coca lớn (x2)');
    expect(sent?.html).toContain('api.qrserver.com');
    expect(sent?.html).toContain('320.000');
    expect(sent?.text).toContain('ORD20261007');
  });

  it('dispatches E-Ticket confirmation via nodemailer transporter when SMTP is enabled', async () => {
    process.env.ENABLE_TEST_REAL_EMAIL = 'true';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = 'cinex.cinema.vn@gmail.com';
    process.env.SMTP_PASS = 'mockapppassword123';

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-ticket-789' });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
      verify: vi.fn().mockResolvedValue(true),
    } as any);

    const mailService = new MailService();

    await mailService.sendBookingConfirmation('paid.customer@gmail.com', {
      orderCode: 'ORD8888',
      customerName: 'Hoàng Yến',
      movieTitle: 'Godzilla x Kong',
      cinemaName: 'CineX Vincom Ba Triệu',
      roomName: 'Phòng 03',
      formatName: '2D Digital',
      showtimeDate: 'Chủ Nhật, 11/10/2026',
      showtimeTime: '20:00',
      seats: ['H10'],
      ticketCodes: ['TK777'],
      totalAmount: 110000,
      paymentMethod: 'VNPAY',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const sendArgs = mockSendMail.mock.calls[0][0];
    expect(sendArgs.to).toBe('paid.customer@gmail.com');
    expect(sendArgs.subject).toContain('#ORD8888');
    expect(sendArgs.html).toContain('Godzilla x Kong');
    expect(sendArgs.html).toContain('H10');
  });
});

