# Chặng 1 — Discovery, giữ ghế, kết quả thanh toán

Yêu cầu đã được người dùng giao thực hiện ngày 2026-10-04. Giao diện giữ phong cách CineX; dữ liệu đặt vé lấy từ API hiện có.

- Discovery: phim/search/pagination → rạp → ngày Việt Nam → suất chiếu cụ thể. Đổi lựa chọn phải xóa dữ liệu con, hủy request cũ, có loading/error/retry/empty.
- Chọn ghế: đăng nhập và xác nhận tuổi trước lần giữ đầu. POST tạo đơn khi chọn ghế đầu; PATCH cập nhật tập ghế và combo/voucher trong cùng đơn. Chỉ owner được sửa, deadline không gia hạn, không sửa sau khi bắt đầu giao dịch. Khóa đơn để serialize cập nhật và tạo giao dịch; claims ghế nguyên tử và rollback khi xung đột.
- Poll sơ đồ mỗi 5 giây, không request chồng lấn; phân biệt ghế khách đang giữ qua boolean từ server, không lộ owner người khác. Khôi phục đơn pending khi mở lại; đóng/bỏ ghế cuối hủy pendingOnly, sang checkout chuyển cùng đơn.
- Checkout dùng đơn đã giữ và tổng tiền/deadline từ server; chỉnh combo/voucher qua PATCH, không tạo đơn mới. Lưu orderId trước redirect; trả về /payment/result.
- Kết quả: chỉ dùng UUID orderId để tra cứu owner-authenticated. Bỏ qua status/amount/query cổng thanh toán. Poll đơn 5 giây tới trạng thái server và vé thật; timeout có retry, không tự kết luận thất bại. Các trạng thái hết hạn/hủy/đã thu tiền chưa cấp vé có thông báo riêng. Khôi phục phiên trước lookup, abort/timer cleanup.

Kiểm thử: RED/GREEN cho API + MySQL (atomic claims, tranh ghế, scope, voucher, pay/edit race), real React/API với network fixtures cho discovery/hold/polling/result/checkout. Cuối chặng chạy toàn bộ coverage gates, build, lint và luồng trình duyệt trên database test được bảo vệ. Không triển khai production trong chặng này.
