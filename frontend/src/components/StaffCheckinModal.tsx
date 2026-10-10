import React, { useState, useEffect, useCallback } from 'react';
import { X, QrCode, CheckCircle2, AlertTriangle, Clock, UserCheck, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';

interface StaffCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffCheckinModal: React.FC<StaffCheckinModalProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuth();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: !loading,
  });
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canBypass, setCanBypass] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [expiredTicketCode, setExpiredTicketCode] = useState('');
  const [stats, setStats] = useState<{ totalTickets: number; checkedInCount: number; pendingCount: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

  const loadStatsAndHistory = useCallback(() => {
    if (!token) return;
    // Stats
    fetch(`${API_BASE}/checkin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      })
      .catch(() => {});

    // History
    fetch(`${API_BASE}/checkin/history?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setHistory(json.data);
      })
      .catch(() => {});
  }, [token, API_BASE]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      loadStatsAndHistory();
      setResult(null);
      setError(null);
      setCanBypass(false);
      setBypassReason('');
      setExpiredTicketCode('');
      setTicketInput('');
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadStatsAndHistory]);

  if (!isOpen) return null;

  const handleScanSubmit = async (e: React.FormEvent, isBypass = false) => {
    e.preventDefault();
    const codeToSubmit = isBypass ? expiredTicketCode : ticketInput.trim();
    if (!codeToSubmit || !token) return;

    if (isBypass && (!bypassReason.trim() || bypassReason.trim().length < 5)) {
      setError('Vui lòng nhập lý do duyệt ngoại lệ (tối thiểu 5 ký tự)');
      return;
    }

    setLoading(true);
    setError(null);
    if (!isBypass) setResult(null);

    try {
      const payload: any = { ticketCode: codeToSubmit, qrPayload: codeToSubmit };
      if (isBypass) {
        payload.bypassWindow = true;
        payload.bypassReason = bypassReason.trim();
      }

      const res = await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error?.code === 'CHECKIN_WINDOW_EXPIRED' && isManagerOrAdmin) {
          setCanBypass(true);
          setExpiredTicketCode(codeToSubmit);
        }
        throw new Error(data.error?.message || data.message || 'Soát vé không thành công');
      }

      setResult(data.data);
      setTicketInput('');
      setCanBypass(false);
      setBypassReason('');
      setExpiredTicketCode('');
      loadStatsAndHistory();
    } catch (err: any) {
      setError(err.message || 'Vé không hợp lệ hoặc đã qua sử dụng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-modal-title"
        className="relative w-full max-w-2xl bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                STAFF CHECK-IN STATION (F08)
              </div>
              <h2 id="checkin-modal-title" className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">
                Cổng soát vé điện tử
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#A39E96] hover:text-[#F3EEE6] hover:bg-white/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng cổng soát vé"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#0B0A0C] border border-[#2A2631]">
                <div className="text-xs text-[#A39E96]">Tổng vé hôm nay</div>
                <div className="font-['Barlow_Condensed'] text-2xl font-bold text-[#F3EEE6]">
                  {stats.totalTickets}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                <div className="text-xs text-emerald-400">Đã vào phòng</div>
                <div className="font-['Barlow_Condensed'] text-2xl font-bold text-emerald-400">
                  {stats.checkedInCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0A0C] border border-[#2A2631]">
                <div className="text-xs text-[#A39E96]">Chưa soát</div>
                <div className="font-['Barlow_Condensed'] text-2xl font-bold text-[#FFB23E]">
                  {stats.pendingCount}
                </div>
              </div>
            </div>
          )}

          {/* Scanner Input Form */}
          <form onSubmit={handleScanSubmit} className="space-y-3">
            <label className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">
              Nhập hoặc quét mã vé (TK...)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                placeholder="VD: TK89F874DB40"
                className="flex-1 bg-[#0B0A0C] border border-[#2A2631] focus:border-[#FFB23E] text-[#F3EEE6] font-mono text-base px-4 py-3 rounded-xl outline-none transition-all placeholder:text-[#A39E96]/40"
              />
              <button
                type="submit"
                disabled={loading || !ticketInput.trim()}
                className="px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-['Barlow_Condensed'] text-base font-black tracking-wider uppercase rounded-xl transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                <span>XÁC NHẬN</span>
              </button>
            </div>
          </form>

          {/* Success Validation Card */}
          {result && (
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <span>VÉ HỢP LỆ — MỜI KHÁCH VÀO PHÒNG CHIẾU</span>
                </div>
                {result.isBypassed && (
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    QUẢN LÝ DUYỆT NGOẠI LỆ
                  </span>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0A0C]/60 text-xs text-[#F3EEE6] space-y-1.5 font-mono">
                <div className="text-base font-bold text-[#FFB23E]">{result.showtime.movieTitle}</div>
                <div className="flex justify-between">
                  <span>MÃ VÉ: <strong className="text-[#FFB23E]">{result.ticket.ticketCode}</strong></span>
                  <span>GHẾ: <strong className="text-emerald-400 text-sm">{result.ticket.seatLabel} ({result.ticket.seatType})</strong></span>
                </div>
                <div className="text-[#A39E96]">{result.showtime.cinemaName} — {result.showtime.roomName}</div>
              </div>
            </div>
          )}

          {/* Error / Conflict Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm space-y-2 animate-fade-in flex flex-col">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <div>
                  <div className="font-bold">KHÔNG THỂ SOÁT VÉ</div>
                  <div className="text-xs text-red-200/80 leading-relaxed mt-0.5">{error}</div>
                </div>
              </div>

              {/* Manager Bypass Form */}
              {canBypass && isManagerOrAdmin && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 bg-amber-950/30 p-3 rounded-lg border border-amber-500/30 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Duyệt ngoại lệ dành cho Quản lý (Bypass Check-in Window)</span>
                  </div>
                  <p className="text-[11px] text-[#A39E96]">
                    Suất chiếu đã quá 15 phút. Bạn có quyền Quản lý để duyệt ngoại lệ cho khách đến muộn (bắt buộc ghi nhận lý do vào nhật ký kiểm toán).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập lý do duyệt ngoại lệ (tối thiểu 5 ký tự)..."
                      value={bypassReason}
                      onChange={(e) => setBypassReason(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-xs text-[#F3EEE6] placeholder:text-[#6E6877] focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      disabled={loading || bypassReason.trim().length < 5}
                      onClick={(e) => handleScanSubmit(e, true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Duyệt ngoại lệ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Check-in Feed */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#2A2631]">
              <div className="text-xs font-bold text-[#A39E96] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Vé vừa soát gần nhất</span>
              </div>
              <div className="space-y-1.5">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[#0B0A0C]/50 border border-[#2A2631] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#FFB23E] font-bold">{h.ticketCode}</span>
                      <span className="text-[#A39E96]">({h.seatLabel})</span>
                      <span className="text-[#F3EEE6] truncate max-w-[160px]">{h.movieTitle}</span>
                    </div>
                    <span className="text-[11px] text-[#A39E96]">
                      {h.checkedInAt ? new Date(h.checkedInAt).toLocaleTimeString('vi-VN') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
