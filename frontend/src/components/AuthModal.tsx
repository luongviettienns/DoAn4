import React, { useState } from 'react';
import { X, Lock, Mail, Phone, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, fullName, phone });
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
      <div className="relative w-full max-w-md bg-[#151318] border border-[#2A2631] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-[#A39E96] hover:text-[#F3EEE6] rounded-lg hover:bg-[#221F28] transition-colors"
          aria-label="Đóng cửa sổ đăng nhập"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Tabs */}
        <div>
          <div className="flex border-b border-[#2A2631] pb-3 gap-6">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
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
              onClick={() => { setTab('register'); setError(null); }}
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
          <p className="text-xs text-[#A39E96] mt-2">
            {tab === 'login'
              ? 'Đăng nhập tài khoản để nhận điểm thưởng và đặt vé nhanh'
              : 'Trở thành thành viên CineX Rewards để nhận ưu đãi vé 55k và tích điểm 10%'}
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#A39E96]">Mật khẩu</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-50 text-[#0B0A0C] font-['Barlow_Condensed'] text-base font-bold uppercase rounded-lg shadow-lg shadow-[#FFB23E]/20 transition-all min-h-[44px] flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : (
              <span>{tab === 'login' ? 'ĐĂNG NHẬP NGAY' : 'TẠO TÀI KHOẢN'}</span>
            )}
          </button>
        </form>

        {/* Demo Account Hint */}
        <div className="p-3 bg-[#0B0A0C] rounded-lg border border-[#2A2631] text-[11px] text-[#A39E96] space-y-1">
          <div className="font-semibold text-[#FFB23E]">Tài khoản mẫu thử nghiệm:</div>
          <div>Khách hàng: <span className="font-mono text-[#F3EEE6]">customer@gmail.com</span> / <span className="font-mono text-[#F3EEE6]">12345678</span></div>
          <div>Quản trị viên: <span className="font-mono text-[#F3EEE6]">admin@cinex.vn</span> / <span className="font-mono text-[#F3EEE6]">12345678</span></div>
        </div>
      </div>
    </div>
  );
};
