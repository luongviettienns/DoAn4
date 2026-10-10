import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Phone, Award, Shield, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PASSWORD'>('PROFILE');

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Verification email state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: !profileLoading && !passwordLoading && !resendLoading,
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setProfileSuccess(null);
      setProfileError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(null);
      setPasswordError(null);
      setResendMessage(null);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!fullName.trim()) {
      setProfileError('Vui lòng nhập họ và tên');
      return;
    }

    if (phone && !/^0\d{9}$/.test(phone)) {
      setProfileError('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    setProfileLoading(true);
    try {
      await api.updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setProfileSuccess('Cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Không thể cập nhật thông tin');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(res?.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await api.resendVerification(user.email);
      setResendMessage(res.message);
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : 'Không thể gửi email xác thực');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A2631] bg-[#0B0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-lg font-bold text-[#F3EEE6] leading-none">
                Hồ Sơ Cá Nhân
              </h2>
              <p className="text-xs text-[#A39E96] mt-1">Quản lý thông tin tài khoản và bảo mật CineX</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#A39E96] hover:text-[#F3EEE6] hover:bg-[#221F28] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Đóng cửa sổ hồ sơ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Summary */}
        <div className="px-6 py-4 bg-[#110F14] border-b border-[#2A2631] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FFB23E]/20 border border-[#FFB23E]/40 text-[#FFB23E] font-bold text-lg flex items-center justify-center">
              {user.fullName[0] || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F3EEE6] text-sm">{user.fullName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#FFB23E]/10 text-[#FFB23E] border border-[#FFB23E]/30">
                  {user.role}
                </span>
              </div>
              <span className="text-xs text-[#A39E96]">{user.email}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#A39E96] uppercase tracking-wider">Điểm thưởng</div>
            <div className="text-base font-black text-[#FFB23E] flex items-center justify-end gap-1">
              <Award className="w-4 h-4" />
              <span>{user.points.toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2A2631] px-6 bg-[#0B0A0C]">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'PROFILE'
                ? 'border-[#FFB23E] text-[#FFB23E]'
                : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thông tin cá nhân</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PASSWORD')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'PASSWORD'
                ? 'border-[#FFB23E] text-[#FFB23E]'
                : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'PROFILE' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Email (Read-only + verification status) */}
              <div>
                <label className="block text-xs font-medium text-[#A39E96] mb-1 flex items-center justify-between">
                  <span>Địa chỉ Email</span>
                  {user.emailVerifiedAt ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Chưa xác thực
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A39E96]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0A0C] border border-[#2A2631] text-[#A39E96] rounded-xl text-sm opacity-70 cursor-not-allowed"
                  />
                </div>
                {!user.emailVerifiedAt && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#A39E96]">Chưa nhận được mã kích hoạt?</span>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="text-xs text-[#FFB23E] hover:underline font-semibold flex items-center gap-1"
                    >
                      {resendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      <span>Gửi lại email</span>
                    </button>
                  </div>
                )}
                {resendMessage && (
                  <p className="mt-1 text-xs text-amber-400 font-medium">{resendMessage}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-[#A39E96] mb-1">
                  Họ và tên
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A39E96]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] text-[#F3EEE6] rounded-xl text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-[#A39E96] mb-1">
                  Số điện thoại (10 chữ số)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A39E96]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] text-[#F3EEE6] rounded-xl text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full py-2.5 px-4 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-xl text-sm transition-all shadow-md shadow-[#FFB23E]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Lưu thông tin</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#A39E96] mb-1">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A39E96]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <input
                    aria-label="Mật khẩu hiện tại"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] text-[#F3EEE6] rounded-xl text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A39E96] mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A39E96]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    aria-label="Mật khẩu mới"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] text-[#F3EEE6] rounded-xl text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A39E96] mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A39E96]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    aria-label="Xác nhận mật khẩu mới"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] text-[#F3EEE6] rounded-xl text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 px-4 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-xl text-sm transition-all shadow-md shadow-[#FFB23E]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Cập nhật mật khẩu</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
