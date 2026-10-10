import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TicketCheck, Coins, BarChart2, Film, Loader2, AlertCircle, RefreshCw, Users2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';

interface AdminReportDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OverviewData {
  grossRevenue: number;
  revenue: number;
  refundAmount: number;
  orderCount: number;
  ticketCount: number;
  comboRevenue: number;
  occupancyPercent: number;
}

interface BreakdownRow {
  key: string;
  label: string;
  revenue: number;
  orderCount: number;
  ticketCount: number;
  comboRevenue: number;
  occupancyPercent: number;
}

interface TopMovie {
  movieTitle: string;
  revenue: number;
  ticketsSold: number;
  orderCount: number;
}

type BreakdownType = 'DAILY' | 'CINEMA' | 'MOVIE';

export const AdminReportDashboard: React.FC<AdminReportDashboardProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: !loading && !exporting,
  });
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('DAILY');

  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      await api.exportReportCsv({
        from: fromDate,
        to: toDate,
        type: breakdownType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất báo cáo thất bại');
    } finally {
      setExporting(false);
    }
  };

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams({ fromDate, toDate });

      const [ovRes, bdRes, tmRes] = await Promise.all([
        fetch(`${API_BASE}/admin/reports/overview?${params}`, { headers }),
        fetch(`${API_BASE}/admin/reports?${params}&type=${breakdownType}`, { headers }),
        fetch(`${API_BASE}/admin/reports/top-movies?limit=5`, { headers }),
      ]);

      const [ovData, bdData, tmData] = await Promise.all([ovRes.json(), bdRes.json(), tmRes.json()]);

      for (const [res, json] of [[ovRes, ovData], [bdRes, bdData], [tmRes, tmData]] as const) {
        if (!res.ok || !json.success) throw new Error(json.error?.message || 'Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
      }

      if (ovData.success) setOverview(ovData.data);
      if (bdData.success) setBreakdown(bdData.data || []);
      if (tmData.success) setTopMovies(tmData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [token, fromDate, toDate, breakdownType, API_BASE]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) fetchReports();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, fetchReports]);

  if (!isOpen) return null;

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const statCards = overview
    ? [
        { label: 'Doanh thu thuần', value: `${fmt(overview.revenue)}đ`, icon: Coins, color: '#FFB23E', bg: '#FFB23E' },
        { label: 'Đơn đặt vé', value: fmt(overview.orderCount), icon: TicketCheck, color: '#60a5fa', bg: '#3b82f6' },
        { label: 'Vé đã bán', value: fmt(overview.ticketCount), icon: Users2, color: '#a78bfa', bg: '#8b5cf6' },
        { label: 'Tỷ lệ lấp đầy', value: `${overview.occupancyPercent}%`, icon: TrendingUp, color: '#34d399', bg: '#10b981' },
        { label: 'Doanh thu Combo', value: `${fmt(overview.comboRevenue)}đ`, icon: BarChart2, color: '#f97316', bg: '#ea580c' },
        { label: 'Hoàn tiền', value: `${fmt(overview.refundAmount)}đ`, icon: RefreshCw, color: '#f87171', bg: '#ef4444' },
      ]
    : [];

  const maxRevenue = Math.max(...breakdown.map((r) => r.revenue), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-report-title"
        className="relative w-full max-w-5xl bg-[#0F0E12] border border-[#2A2631] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#FFB23E] uppercase tracking-wider">ADMIN DASHBOARD (F14)</div>
              <h2 id="admin-report-title" className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">Báo cáo doanh thu & thống kê</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchReports} disabled={loading}
              className="p-2 text-[#A39E96] hover:text-[#FFB23E] hover:bg-white/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Làm mới"
              aria-label="Làm mới dữ liệu báo cáo"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose}
              className="p-2 text-[#A39E96] hover:text-[#F3EEE6] hover:bg-white/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Đóng báo cáo"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#151318] border border-[#2A2631]">
            <div className="flex items-center gap-2 text-xs text-[#A39E96]">
              <span>Từ ngày:</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs focus:border-[#FFB23E]/60 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#A39E96]">
              <span>Đến ngày:</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs focus:border-[#FFB23E]/60 focus:outline-none" />
            </div>
            <button type="button" onClick={fetchReports} disabled={loading}
              className="px-4 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-50 text-[#0B0A0C] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cập nhật</span>
            </button>

            <button type="button" onClick={handleExportCsv} disabled={exporting || loading}
              className="ml-auto px-4 py-1.5 border border-[#FFB23E]/50 hover:bg-[#FFB23E]/10 disabled:opacity-50 text-[#FFB23E] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 min-h-[36px]"
              title="Xuất bảng dữ liệu ra file CSV tương thích Excel">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{exporting ? 'Đang xuất...' : `Xuất CSV (${breakdownType})`}</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && !overview && (
            <div className="flex items-center justify-center py-16 text-[#A39E96]">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span>Đang tải báo cáo...</span>
            </div>
          )}

          {/* Overview Stats */}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map((card) => (
                <div key={card.label} className="p-4 rounded-xl bg-[#151318] border border-[#2A2631] space-y-2">
                  <div className="flex items-center gap-2">
                    <card.icon className="w-4 h-4 flex-shrink-0" style={{ color: card.color }} />
                    <span className="text-[10px] text-[#A39E96] uppercase tracking-wider leading-tight">{card.label}</span>
                  </div>
                  <div className="font-['Barlow_Condensed'] text-xl font-black" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">Phân tích chi tiết</span>
              <div className="flex gap-1 bg-[#151318] border border-[#2A2631] rounded-lg p-1">
                {(['DAILY', 'CINEMA', 'MOVIE'] as BreakdownType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setBreakdownType(t)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${breakdownType === t ? 'bg-[#FFB23E] text-[#0B0A0C]' : 'text-[#A39E96] hover:text-[#F3EEE6]'}`}>
                    {t === 'DAILY' ? 'Theo ngày' : t === 'CINEMA' ? 'Theo rạp' : 'Theo phim'}
                  </button>
                ))}
              </div>
            </div>

            {error ? null : breakdown.length === 0 && !loading ? (
              <div className="p-8 rounded-xl border border-[#2A2631] text-center text-[#A39E96] text-sm">
                Không có dữ liệu trong khoảng thời gian này
              </div>
            ) : (
              <div className="rounded-xl border border-[#2A2631] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2631] bg-[#151318]">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-[#A39E96] uppercase tracking-wider">
                        {breakdownType === 'DAILY' ? 'Ngày' : breakdownType === 'CINEMA' ? 'Rạp' : 'Phim'}
                      </th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-[#A39E96] uppercase tracking-wider">Doanh thu</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-[#A39E96] uppercase tracking-wider hidden sm:table-cell">Đơn hàng</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-[#A39E96] uppercase tracking-wider hidden sm:table-cell">Vé bán</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#A39E96] uppercase tracking-wider hidden md:table-cell">Biểu đồ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((row, idx) => {
                      const barWidth = Math.round((row.revenue / maxRevenue) * 100);
                      return (
                        <tr key={row.key} className={`border-b border-[#2A2631]/50 ${idx % 2 === 0 ? 'bg-[#0F0E12]' : 'bg-[#151318]/40'} hover:bg-[#2A2631]/30 transition-colors`}>
                          <td className="px-4 py-3 font-medium text-[#F3EEE6] text-xs">{row.label}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#FFB23E] text-xs font-mono">{fmt(row.revenue)}đ</td>
                          <td className="px-4 py-3 text-right text-[#A39E96] text-xs hidden sm:table-cell">{row.orderCount}</td>
                          <td className="px-4 py-3 text-right text-[#A39E96] text-xs hidden sm:table-cell">{row.ticketCount}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="w-full bg-[#2A2631] rounded-full h-2 max-w-[160px] ml-auto">
                              <div className="h-2 rounded-full bg-gradient-to-r from-[#FFB23E] to-[#FF8A00] transition-all"
                                style={{ width: `${barWidth}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Movies */}
          {topMovies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#FFB23E]" />
                <span className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">Top phim ăn khách</span>
              </div>
              <div className="space-y-2">
                {topMovies.map((m, idx) => (
                  <div key={m.movieTitle} className="flex items-center gap-3 p-3 rounded-xl bg-[#151318] border border-[#2A2631] hover:border-[#FFB23E]/30 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${idx === 0 ? 'bg-[#FFB23E] text-[#0B0A0C]' : idx === 1 ? 'bg-[#A39E96] text-[#0B0A0C]' : idx === 2 ? 'bg-[#8B4513] text-white' : 'bg-[#2A2631] text-[#A39E96]'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#F3EEE6] text-sm truncate">{m.movieTitle}</div>
                      <div className="text-xs text-[#A39E96]">{fmt(m.ticketsSold)} vé • {m.orderCount} đơn</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-['Barlow_Condensed'] text-lg font-black text-[#FFB23E]">{fmt(m.revenue)}đ</div>
                    </div>
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
