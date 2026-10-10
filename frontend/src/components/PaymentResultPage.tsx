import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Home, RefreshCw, ShieldAlert, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError, type ApiOrder } from '../services/api';
import { TicketModal } from './TicketModal';

const PENDING_ORDER_KEY = 'cinex_pending_order_id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_INTERVAL_MS = 5000;
const POLL_LIMIT_MS = 120000;

function readOrderReference() {
  const query = new URLSearchParams(window.location.search);
  const references = query.getAll('orderId');
  const reference = references.length === 0 ? localStorage.getItem(PENDING_ORDER_KEY) : references[0];
  if (references.length > 1 || !reference || !UUID.test(reference)) return null;
  return reference;
}

function hasIssuedTickets(order: ApiOrder) {
  return order.status === 'PAID' && order.items.length > 0
    && order.items.every((item) => typeof item.ticket?.ticketCode === 'string' && item.ticket.ticketCode.length > 0);
}

interface ResultState {
  userId: string;
  orderId: string;
  order: ApiOrder | null;
  error: { title: string; message: string; needsLogin: boolean } | null;
  loading: boolean;
  timedOut: boolean;
}

function describeError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return { title: 'Phiên đăng nhập đã hết hạn', message: 'Đăng nhập lại để kiểm tra đơn hàng của bạn.', needsLogin: true };
    if (error.status === 403) return { title: 'Bạn không có quyền xem đơn hàng này', message: 'Hãy dùng tài khoản đã đặt đơn hàng.', needsLogin: false };
    if (error.status === 404) return { title: 'Không tìm thấy đơn hàng', message: 'Kiểm tra lại mã đơn hoặc mở lịch sử vé trong tài khoản.', needsLogin: false };
  }
  return { title: 'Chưa thể kiểm tra thanh toán', message: 'Kết nối tới máy chủ đang gián đoạn. Bạn có thể kiểm tra lại; trạng thái thanh toán chưa được xác nhận.', needsLogin: false };
}

export function PaymentResultPage({ onHome }: { onHome?: () => void }) {
  const { user, isRestoring, openAuthModal } = useAuth();
  const [orderId, setOrderId] = useState(readOrderReference);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResultState | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    const readLocation = () => setOrderId(readOrderReference());
    window.addEventListener('popstate', readLocation);
    return () => window.removeEventListener('popstate', readLocation);
  }, []);

  useEffect(() => {
    if (isRestoring || !userId || !orderId) return;
    const controller = new AbortController();
    let disposed = false;
    let stopped = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + POLL_LIMIT_MS;
    const currentState: ResultState = { userId, orderId, order: null, error: null, loading: true, timedOut: false };
    const stopAfterTimeout = () => {
      if (disposed || stopped) return;
      stopped = true;
      clearTimeout(pollTimer);
      controller.abort();
      setState((previous) => previous?.userId === userId && previous.orderId === orderId
        ? { ...previous, loading: false, timedOut: true } : { ...currentState, loading: false, timedOut: true });
    };
    const deadlineTimer = setTimeout(stopAfterTimeout, POLL_LIMIT_MS);

    const load = async () => {
      try {
        const nextOrder = await api.getOrder(orderId, controller.signal);
        if (disposed || stopped) return;
        // A response must match the requested order; browser parameters never establish payment success.
        if (nextOrder.id !== orderId) throw new Error('Order response mismatch');
        setState({ ...currentState, order: nextOrder, loading: false });
        if (nextOrder.status === 'PENDING_PAYMENT') {
          localStorage.setItem(PENDING_ORDER_KEY, nextOrder.id);
        } else if (['PAID', 'EXPIRED', 'CANCELLED', 'PAID_UNFULFILLED'].includes(nextOrder.status)
          && localStorage.getItem(PENDING_ORDER_KEY) === nextOrder.id) {
          localStorage.removeItem(PENDING_ORDER_KEY);
        }
        if (hasIssuedTickets(nextOrder)) setTicketOpen(true);

        if (nextOrder.status === 'PENDING_PAYMENT' || (nextOrder.status === 'PAID' && !hasIssuedTickets(nextOrder))) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) stopAfterTimeout();
          else pollTimer = setTimeout(() => { void load(); }, Math.min(POLL_INTERVAL_MS, remaining));
        } else {
          stopped = true;
          clearTimeout(deadlineTimer);
        }
      } catch (error) {
        if (disposed || stopped) return;
        stopped = true;
        clearTimeout(deadlineTimer);
        setState({ ...currentState, error: describeError(error), loading: false });
      }
    };
    void load();
    return () => {
      disposed = true;
      clearTimeout(deadlineTimer);
      clearTimeout(pollTimer);
      controller.abort();
    };
  }, [userId, orderId, isRestoring, attempt]);

  // Hide the previous account/order immediately, before the next effect cleanup executes.
  const current = state && state.userId === userId && state.orderId === orderId ? state : null;
  const order = userId && !isRestoring ? current?.order ?? null : null;
  const issued = !!order && hasIssuedTickets(order);
  const checking = !!orderId && !!userId && !isRestoring && (!current || current.loading);
  let title = 'Đang kiểm tra đơn hàng';
  let message = 'Vui lòng đợi trong khi hệ thống đọc trạng thái đơn hàng của bạn.';

  if (!orderId) {
    title = 'Mã đơn hàng không hợp lệ';
    message = 'Mở lại kết quả từ đơn hàng hoặc xem lịch sử vé trong tài khoản của bạn.';
  } else if (isRestoring) {
    title = 'Kết quả thanh toán';
    message = 'Đang khôi phục phiên đăng nhập…';
  } else if (!userId) {
    title = 'Đăng nhập để xem kết quả thanh toán';
    message = 'Chỉ tài khoản đã đặt đơn hàng có thể xem trạng thái và vé điện tử.';
  } else if (current?.error) {
    title = current.error.title;
    message = current.error.message;
  } else if (order) {
    switch (order.status) {
      case 'PENDING_PAYMENT':
        title = 'Đang xác nhận thanh toán';
        message = 'Hệ thống đang chờ xác nhận từ cổng thanh toán. Vé sẽ hiển thị sau khi máy chủ xác nhận thanh toán và phát hành vé.';
        break;
      case 'PAID':
        title = issued ? 'Thanh toán thành công' : 'Đang phát hành vé';
        message = issued ? 'Thanh toán đã được xác nhận. Vé điện tử bên dưới được phát hành từ đơn hàng của bạn.' : 'Máy chủ đã ghi nhận thanh toán. Hệ thống đang kiểm tra việc phát hành đầy đủ vé điện tử.';
        break;
      case 'EXPIRED':
        title = 'Đơn hàng đã hết hạn';
        message = 'Thời gian giữ ghế của đơn hàng đã kết thúc. Kiểm tra lịch sử đơn hàng hoặc liên hệ rạp nếu tài khoản đã bị trừ tiền.';
        break;
      case 'CANCELLED':
        title = 'Đơn hàng đã hủy';
        message = order.refundStatus === 'PENDING' ? 'Yêu cầu hoàn tiền đang được xử lý. Vé của đơn hàng này không còn hiệu lực.' : 'Đơn hàng này đã bị hủy. Bạn có thể quay lại để chọn suất chiếu khác.';
        break;
      case 'PAID_UNFULFILLED':
        title = order.refundStatus === 'REFUNDED' ? 'Thanh toán đã được hoàn tiền' : 'Đã nhận thanh toán, đang xử lý hoàn tiền';
        message = order.refundStatus === 'REFUNDED' ? 'Đơn hàng không phát hành vé; máy chủ đã ghi nhận hoàn tiền.' : 'Đơn hàng không thể phát hành vé. Khoản thanh toán đã được ghi nhận và yêu cầu hoàn tiền đang được xử lý; không cần thanh toán lại đơn này.';
        break;
      default:
        title = 'Đang xử lý đơn hàng';
        message = 'Trạng thái hiện tại chưa cho phép hiển thị vé. Hãy kiểm tra lại hoặc xem lịch sử đơn hàng.';
    }
  }

  const goHome = () => {
    if (onHome) onHome();
    else window.location.assign('/');
  };
  const needsLogin = !!orderId && !isRestoring && (!userId || current?.error?.needsLogin);
  const canRetry = !!orderId && !!userId && !isRestoring && !checking;

  return <main className="min-h-screen bg-[#0B0A0C] text-[#F3EEE6] px-4 py-20 flex items-center justify-center">
    <section aria-labelledby="payment-result-title" className="w-full max-w-xl rounded-3xl border border-[#2A2631] bg-[#151318] p-6 sm:p-9 shadow-2xl">
      <div className={`mb-6 inline-flex rounded-2xl p-4 ${issued ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#FFB23E]/10 text-[#FFB23E]'}`} aria-hidden="true">
        {issued ? <CheckCircle2 size={32} /> : current?.error ? <ShieldAlert size={32} /> : <Clock3 size={32} />}
      </div>
      <p className="text-xs font-bold tracking-widest text-[#A39E96] uppercase mb-3">CineX · Kết quả thanh toán</p>
      <h1 id="payment-result-title" className="font-['Barlow_Condensed'] text-3xl font-bold mb-4" aria-live="polite">{title}</h1>
      <p className="text-sm leading-6 text-[#A39E96]" role={current?.error ? 'alert' : 'status'}>{message}</p>
      {order && <dl className="mt-6 space-y-3 rounded-2xl border border-[#2A2631] p-4 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-[#A39E96]">Mã đơn hàng</dt><dd className="font-mono text-[#FFB23E]">{order.code}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#A39E96]">Tổng tiền</dt><dd>{order.total.toLocaleString('vi-VN')}đ</dd></div>
        {order.status === 'PENDING_PAYMENT' && order.expiresAt && <div className="flex justify-between gap-4"><dt className="text-[#A39E96]">Giữ ghế đến</dt><dd>{new Date(order.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd></div>}
      </dl>}
      {current?.timedOut && <p role="status" className="mt-5 rounded-xl border border-[#FFB23E]/30 bg-[#FFB23E]/5 p-4 text-sm text-[#FFB23E]">Chưa nhận được xác nhận từ cổng thanh toán trong 2 phút. Bạn có thể kiểm tra lại hoặc xem lịch sử vé; hệ thống vẫn có thể cập nhật đơn hàng sau đó.</p>}
      <div className="mt-7 flex flex-col sm:flex-row gap-3">
        {needsLogin && <button type="button" onClick={openAuthModal} className="min-h-[44px] rounded-xl bg-[#FFB23E] px-5 py-3 text-sm font-bold text-[#0B0A0C]">Đăng nhập</button>}
        {issued && <button type="button" onClick={() => setTicketOpen(true)} className="min-h-[44px] rounded-xl bg-[#FFB23E] px-5 py-3 text-sm font-bold text-[#0B0A0C] inline-flex items-center justify-center gap-2"><Ticket size={18} />Xem vé điện tử</button>}
        {canRetry && !issued && <button type="button" onClick={() => { setState(null); setTicketOpen(false); setAttempt((value) => value + 1); }} className="min-h-[44px] rounded-xl border border-[#FFB23E]/40 px-5 py-3 text-sm font-bold text-[#FFB23E] inline-flex items-center justify-center gap-2"><RefreshCw size={18} />Kiểm tra lại</button>}
        <button type="button" onClick={goHome} className="min-h-[44px] rounded-xl border border-[#2A2631] px-5 py-3 text-sm inline-flex items-center justify-center gap-2 hover:bg-white/5"><Home size={18} />Về trang chủ</button>
      </div>
    </section>
    <TicketModal isOpen={ticketOpen && issued} onClose={() => setTicketOpen(false)} onHome={goHome} order={issued ? order : null} />
  </main>;
}
