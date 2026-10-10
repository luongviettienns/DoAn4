import React, { useState, useEffect, useCallback } from 'react';
import { X, Lock, Mail, Phone, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: unknown) => void;
          renderButton: (element: HTMLElement, options: unknown) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, loginWithGoogle, completeGoogleRegistration } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google Sign-In state
  const [showGooglePhoneStep, setShowGooglePhoneStep] = useState(false);
  const [googleTempToken, setGoogleTempToken] = useState<string | null>(null);
  const [googleProfile, setGoogleProfile] = useState<{ email: string; name: string; picture: string } | null>(null);
  const [googlePhone, setGooglePhone] = useState('');
  const [gisLoaded, setGisLoaded] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleClose = useCallback(() => {
    setShowGooglePhoneStep(false);
    setGoogleTempToken(null);
    setGoogleProfile(null);
    setGooglePhone('');
    setError(null);
    setSuccessMsg(null);
    closeAuthModal();
  }, [closeAuthModal]);

  useModalA11y({
    isOpen: isAuthModalOpen,
    onClose: handleClose,
    closeOnEscape: !loading,
  });

  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle(idToken);
      if (res.requirePhone && res.tempToken) {
        setGoogleTempToken(res.tempToken);
        setGoogleProfile(res.googleProfile || null);
        setShowGooglePhoneStep(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đăng nhập Google thất bại');
      }
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle]);

  const handleCompleteGooglePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleTempToken) return;
    setError(null);
    setLoading(true);
    try {
      await completeGoogleRegistration(googleTempToken, googlePhone);
      handleClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Hoàn tất thông tin thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthModalOpen || (tab !== 'login' && tab !== 'register') || showGooglePhoneStep) return;

    const clientId = (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string) || '654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com';

    const tryInitGis = () => {
      if (window.google?.accounts?.id) {
        setGisLoaded(true);
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              void handleGoogleCredential(response.credential);
            }
          },
        });

        const btnSlot = document.getElementById('google-btn-slot');
        if (btnSlot) {
          window.google.accounts.id.renderButton(btnSlot, {
            theme: 'filled_black',
            size: 'large',
            width: 380,
            text: tab === 'register' ? 'signup_with' : 'signin_with',
            locale: 'vi',
            shape: 'rectangular',
          });
        }
      }
    };

    tryInitGis();
    const interval = setInterval(tryInitGis, 500);
    return () => clearInterval(interval);
  }, [isAuthModalOpen, tab, showGooglePhoneStep, handleGoogleCredential]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else if (tab === 'register') {
        await register({ email, password, fullName, phone });
      } else if (tab === 'forgot') {
        const res = await api.forgotPassword(email);
        setSuccessMsg(res.message);
      } else if (tab === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Xác nhận mật khẩu mới không khớp');
        }
        const res = await api.resetPassword({ token: resetToken, newPassword: password });
        setSuccessMsg(res.message);
        setPassword('');
        setConfirmPassword('');
        setResetToken('');
        setTimeout(() => setTab('login'), 2000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md bg-[#151318] border border-[#2A2631] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-[#A39E96] hover:text-[#F3EEE6] rounded-lg hover:bg-[#221F28] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Đóng cửa sổ đăng nhập"
        >
          <X className="w-5 h-5" />
        </button>

        {showGooglePhoneStep ? (
          /* Bước bổ sung số điện thoại sau khi đăng nhập Google lần đầu */
          <div className="space-y-5">
            <div id="auth-modal-title" className="border-b border-[#2A2631] pb-3">
              <h2 className="font-['Barlow_Condensed'] text-2xl font-bold tracking-wide uppercase text-[#FFB23E]">
                HOÀN TẤT THÔNG TIN
              </h2>
              <p className="text-xs text-[#A39E96] mt-1">
                Vui lòng cung cấp số điện thoại để CineX hoàn tất hồ sơ thành viên và gửi mã đặt vé cho bạn.
              </p>
            </div>

            {googleProfile && (
              <div className="flex items-center gap-3 p-3 bg-[#0B0A0C] border border-[#2A2631] rounded-lg">
                {googleProfile.picture ? (
                  <img
                    src={googleProfile.picture}
                    alt={googleProfile.name}
                    className="w-10 h-10 rounded-full border border-[#2A2631] object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#221F28] flex items-center justify-center text-sm font-bold text-[#FFB23E]">
                    {googleProfile.name?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#F3EEE6] truncate">{googleProfile.name}</div>
                  <div className="text-[11px] text-[#A39E96] truncate">{googleProfile.email}</div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-950/40 border border-red-800/60 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCompleteGooglePhone} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A39E96]">Số điện thoại liên hệ (10 chữ số)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39E96]" />
                  <input
                    type="tel"
                    required
                    pattern="^0[0-9]{9}$"
                    value={googlePhone}
                    onChange={(e) => setGooglePhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                  />
                </div>
                <p className="text-[11px] text-[#6B665F]">Bắt đầu bằng số 0 và có đúng 10 chữ số.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGooglePhoneStep(false);
                    setGoogleTempToken(null);
                    setGoogleProfile(null);
                    setGooglePhone('');
                  }}
                  disabled={loading}
                  className="flex-1 py-3 bg-[#221F28] hover:bg-[#2A2631] text-[#A39E96] hover:text-[#F3EEE6] text-xs font-semibold rounded-lg transition-colors min-h-[44px]"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-50 text-[#0B0A0C] font-['Barlow_Condensed'] text-base font-bold uppercase rounded-lg shadow-lg shadow-[#FFB23E]/20 transition-all min-h-[44px] flex items-center justify-center gap-2"
                >
                  {loading ? 'Đang xử lý...' : 'XÁC NHẬN'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Form Đăng nhập / Đăng ký / Quên MK */
          <>
            {/* Modal Header & Tabs */}
            <div id="auth-modal-title">
              {tab === 'login' || tab === 'register' ? (
                <div className="flex border-b border-[#2A2631] pb-3 gap-6">
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
                    className={`font-['Barlow_Condensed'] text-2xl font-bold tracking-wide uppercase transition-colors relative pb-2 ${
                      tab === 'login' ? 'text-[#FFB23E]' : 'text-[#A39E96] hover:text-[#F3EEE6]'
                    }`}
                  >
                    ĐĂNG NHẬP
                    {tab === 'login' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFB23E]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('register'); setError(null); setSuccessMsg(null); }}
                    className={`font-['Barlow_Condensed'] text-2xl font-bold tracking-wide uppercase transition-colors relative pb-2 ${
                      tab === 'register' ? 'text-[#FFB23E]' : 'text-[#A39E96] hover:text-[#F3EEE6]'
                    }`}
                  >
                    ĐĂNG KÝ
                    {tab === 'register' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFB23E]" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="border-b border-[#2A2631] pb-3 flex items-center justify-between">
                  <span className="font-['Barlow_Condensed'] text-2xl font-bold tracking-wide uppercase text-[#FFB23E]">
                    {tab === 'forgot' ? 'QUÊN MẬT KHẨU' : 'ĐẶT LẠI MẬT KHẨU'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
                    className="text-xs text-[#A39E96] hover:text-[#FFB23E] underline font-semibold"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              )}
              <p className="text-xs text-[#A39E96] mt-2">
                {tab === 'login' && 'Đăng nhập tài khoản để nhận điểm thưởng và đặt vé nhanh'}
                {tab === 'register' && 'Trở thành thành viên CineX Rewards để nhận ưu đãi vé 55k và tích điểm 10%'}
                {tab === 'forgot' && 'Nhập địa chỉ email để nhận hướng dẫn và mã đặt lại mật khẩu an toàn'}
                {tab === 'reset' && 'Nhập mã token từ email và thiết lập mật khẩu mới cho tài khoản của bạn'}
              </p>
            </div>

            {/* Error / Success alert */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-950/40 border border-red-800/60 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A39E96]">Họ và tên</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39E96]" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A39E96]">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39E96]" />
                      <input
                        type="tel"
                        required
                        pattern="^0[0-9]{9}$"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                      />
                    </div>
                  </div>
                </>
              )}

              {tab === 'reset' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#A39E96]">Mã Token đặt lại mật khẩu</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Nhập mã token 64 ký tự từ email"
                    className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg px-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                  />
                </div>
              )}

              {tab !== 'reset' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#A39E96]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39E96]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {tab !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#A39E96]">
                      {tab === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
                    </label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setTab('forgot'); setError(null); setSuccessMsg(null); }}
                        className="text-[11px] text-[#FFB23E] hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39E96]" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {tab === 'reset' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#A39E96]">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39E96]" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#F3EEE6] placeholder:text-[#6B665F] outline-none min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-50 text-[#0B0A0C] font-['Barlow_Condensed'] text-base font-bold uppercase rounded-lg shadow-lg shadow-[#FFB23E]/20 transition-all min-h-[44px] flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <span>
                    {tab === 'login' && 'ĐĂNG NHẬP NGAY'}
                    {tab === 'register' && 'TẠO TÀI KHOẢN'}
                    {tab === 'forgot' && 'GỬI YÊU CẦU ĐẶT LẠI'}
                    {tab === 'reset' && 'XÁC NHẬN MẬT KHẨU MỚI'}
                  </span>
                )}
              </button>

              {tab === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setTab('reset'); setError(null); setSuccessMsg(null); }}
                    className="text-xs text-[#A39E96] hover:text-[#FFB23E] underline"
                  >
                    Đã có mã token? Đặt lại mật khẩu ngay
                  </button>
                </div>
              )}
            </form>

            {/* Google Sign-in Section (Login and Register tabs) */}
            {(tab === 'login' || tab === 'register') && (
              <div className="space-y-3 pt-1">
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-[#2A2631]"></div>
                  <span className="flex-shrink mx-4 text-[11px] uppercase tracking-wider text-[#A39E96]">Hoặc tiếp tục với</span>
                  <div className="flex-grow border-t border-[#2A2631]"></div>
                </div>

                <div className="w-full flex justify-center">
                  <div id="google-btn-slot" className={`w-full flex justify-center ${gisLoaded ? 'block' : 'hidden'}`}></div>
                </div>

                {!gisLoaded && (
                  <button
                    type="button"
                    data-testid="google-login-btn"
                    onClick={() => {
                      if (window.google?.accounts?.id) {
                        window.google.accounts.id.prompt();
                      } else {
                        void handleGoogleCredential('mock_google_credential');
                      }
                    }}
                    disabled={loading}
                    className="w-full py-2.5 bg-[#1F1C24] hover:bg-[#2A2631] text-[#F3EEE6] text-xs font-medium rounded-lg border border-[#2A2631] flex items-center justify-center gap-2.5 transition-colors min-h-[44px]"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{tab === 'register' ? 'Đăng ký với Google' : 'Đăng nhập với Google'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Demo Account Hint */}
            <div className="p-3 bg-[#0B0A0C] rounded-lg border border-[#2A2631] text-[11px] text-[#A39E96] space-y-1">
              <div className="font-semibold text-[#FFB23E]">Tài khoản mẫu thử nghiệm:</div>
              <div>Khách hàng: <span className="font-mono text-[#F3EEE6]">customer@gmail.com</span> / <span className="font-mono text-[#F3EEE6]">12345678</span></div>
              <div>Quản trị viên: <span className="font-mono text-[#F3EEE6]">admin@cinex.vn</span> / <span className="font-mono text-[#F3EEE6]">12345678</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
