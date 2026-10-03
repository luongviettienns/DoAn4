# Theo dõi tiến độ dự án - Đồ án 4: Hệ thống đặt vé xem phim online

> **Cập nhật lần cuối:** 2026-10-03  
> **Repository GitHub:** [luongviettienns/DoAn4](https://github.com/luongviettienns/DoAn4) (Private)

---

## 1. Tổng quan các giai đoạn (Phases)

| Giai đoạn | Mô tả | Trạng thái |
|---|---|---|
| **Phase 0: Khảo sát & Thiết kế hệ thống** | Phân tích yêu cầu, luồng F01–F19, CSDL, kiến trúc, OpenAPI 3.0.3, kế hoạch | [x] Hoàn thành |
| **Phase 1: Khởi tạo môi trường & Kho mã nguồn** | Git init, cấu hình .gitignore, liên kết remote GitHub, tài liệu tiến độ | [x] Hoàn thành |
| **Phase 2: Sprint 1 - Nền tảng Core & Dữ liệu** | Scaffold Frontend (Vite+React) & Backend (Node+Express+Prisma), Auth/RBAC (F01), Danh mục Phim/Rạp (F09, F10) | [x] Hoàn thành |
| **Phase 3: Sprint 2 - Quản lý Suất chiếu & Sơ đồ ghế** | Suất chiếu & Ghế (F11, F02), Bảng giá (F12), Giao diện chọn ghế | [x] Hoàn thành |
| **Phase 4: Sprint 3 - Đặt vé & Thanh toán VNPay** | Giữ ghế transaction (F03), Tích hợp VNPay sandbox (F04), Xuất vé QR (F05) | [x] Hoàn thành |
| **Phase 5: Sprint 4 - Nghiệm thu Core MVP (Must)** | Soát vé (F08), Lịch sử đặt vé (F06), Worker hết hạn đơn (F19), Smoke test MVP | [x] Hoàn thành |
| **Phase 6: Sprint 5 - Tính năng mở rộng (Should)** | Combo/Voucher (F13), Bán tại quầy (F07), Báo cáo doanh thu (F14), Hủy/Hoàn vé | [/] Đang thực hiện |
| **Phase 7: Sprint 6 - Nâng cao & Hoàn thiện đồ án (Could)** | Gợi ý phim ML (F17), Đánh giá phim (F18), Báo cáo nghiệm thu & Slide bảo vệ | [ ] Chưa bắt đầu |

---

## 2. Nhật ký công việc chi tiết

### [2026-10-03] Phase 0 & Phase 1
- [x] Rà soát và hoàn thiện bộ tài liệu thiết kế kiến trúc, CSDL, hợp đồng `openapi.json` và quy ước phát triển.
- [x] Tạo kho lưu trữ Git cục bộ (`main` branch) và cấu hình tệp `.gitignore` chuẩn.
- [x] Tạo repository **DoAn4** (Private) trên tài khoản GitHub `luongviettienns`.
- [x] Đẩy mã nguồn và bộ tài liệu thiết kế ban đầu lên GitHub.
- [x] Thiết lập tệp theo dõi tiến độ [PROJECT_PROGRESS.md](file:///c:/Users/ASUS/Desktop/DoAn4/PROJECT_PROGRESS.md).

### [2026-10-03] Phase 2: Hoàn thành Sprint 1 (Backend Core, CSDL, Auth F01, Phim/Rạp F02/F09/F10)
- [x] Kết nối CSDL MySQL 8.0 cục bộ (`cinema_booking_dev`), áp dụng schema tham chiếu và 143 dòng ràng buộc CHECK (`constraints.sql`).
- [x] Xây dựng kịch bản seed CSDL đầy đủ (`seed.ts`): Settings, Quản trị viên/Nhân viên/Khách hàng, Cụm rạp Cầu Giấy/Bà Triệu, Phòng chiếu IMAX, Ghế (Standard, VIP, Couple), Bảng giá, Thể loại và Phim.
- [x] Triển khai Backend Core Architecture: Prisma singleton, Middleware Error handling, JWT Auth, RBAC và Cinema-scoped authorization.
- [x] Triển khai Module Auth (F01): Đăng ký, Đăng nhập, Token rotation refresh qua HttpOnly cookie, Đăng xuất, /me, Đổi mật khẩu.
- [x] Triển khai Module Phim & Cụm rạp (F02, F09, F10): API công khai và API quản trị (CRUD Phim, danh sách Rạp, Phòng, Sơ đồ ghế).
- [x] Viết bộ kiểm thử tích hợp tự động với `vitest` và `supertest` (14/14 tests PASSED 100%).
- [x] Tích hợp AuthContext, AuthModal và trạng thái tài khoản trực tiếp trên Frontend. Kiểm thử browser tự động xác nhận luồng đăng nhập/đăng xuất hoạt động hoàn hảo.
- [x] Xác minh trực quan qua browser automation (đạt chuẩn responsive, contrast 4.5:1, không lỗi console).

### [2026-10-03] Phase 3: Hoàn thành Sprint 2 (Quản lý Suất chiếu F11 & Sơ đồ ghế động F12)
- [x] Triển khai Backend Module Showtimes (`showtime.schema.ts`, `showtime.service.ts`, `showtime.controller.ts`, `showtime.routes.ts`):
  - Tra cứu suất chiếu công khai theo phim, cụm rạp, khoảng ngày.
  - Tạo suất chiếu mới với cơ chế kiểm tra xung đột phòng chiếu + thời gian giãn cách dọn dẹp tối thiểu 15 phút (BR-10).
  - Tự động sinh `ShowtimeSeat` dựa trên sơ đồ phòng với giá tính động: `basePrice + surcharge` theo loại ghế (Standard, VIP, Couple) và khung giờ.
  - Cơ chế tự động giải phóng ghế tạm giữ quá hạn (hold expires fallback).
- [x] Bộ kiểm thử tự động API Suất chiếu (`backend/tests/showtimes.test.ts`):
  - Danh sách suất chiếu, sơ đồ ghế chi tiết, từ chối tạo suất trùng lịch (BR-10), tính giá ghế động.
  - Toàn bộ test suite chạy thành công: **18/18 tests PASSED (100%)**.
- [x] Phát triển Frontend Interactive `SeatMapModal.tsx`:
  - Mô phỏng màn chiếu cong phát sáng (Curved projection screen arc).
  - Hiển thị lưới ghế chuẩn hàng A-F, phân biệt trạng thái Trống / Đang chọn / Đã đặt / Đang giữ / Ghế VIP / Ghế đôi.
  - Áp dụng chặt chẽ quy tắc BR-03: giới hạn tối đa 8 ghế cho 1 lần đặt.
  - Dock thanh thông tin phía dưới hiển thị ghế đã chọn, tính tổng tiền thời gian thực và nút chuyển bước "Tiếp tục đặt vé".
- [x] Kiểm thử trực tiếp giao diện (Browser Subagent verification):
  - Mở sơ đồ ghế từ Hero action, chọn 2 ghế VIP C3 & C4, kiểm tra cập nhật dock tổng tiền 230.000đ, chụp ảnh bằng chứng `seat_map_selected_1791014478809.png`, đóng modal mượt mà.

### [2026-10-03] Phase 4: Hoàn thành Sprint 3 (Đặt vé, Giữ ghế F03, Thanh toán VNPay F04, Xuất vé QR F05)
- [x] Triển khai Backend Module Orders (`order.schema.ts`, `order.service.ts`, `order.controller.ts`, `order.routes.ts`):
  - Transaction giữ ghế 10 phút (BR-01): `status: HELD`, `holdExpiresAt: now + 10m`.
  - Ràng buộc BR-03 bảo vệ đơn đang giữ chỗ thông qua bảng `pending_order_guards` (chặn tạo nhiều đơn đồng thời cho cùng 1 suất chiếu, trả về 409 Conflict).
  - Ràng buộc số lượng ghế: tối thiểu 1 ghế, tối đa 8 ghế (BR-03).
  - Snapshot toàn bộ thông tin phim, phòng, rạp, giá vé theo CSDL chuẩn vào `orders` và `order_items`.
  - Hủy đơn hàng và tự động giải phóng ghế sang `AVAILABLE`.
- [x] Triển khai Backend Module Payments (`vnpay.adapter.ts`, `payment.service.ts`, `payment.controller.ts`, `payment.routes.ts`):
  - Bộ chuyển đổi VNPay Sandbox tính chữ ký bảo mật HMAC-SHA512 theo chuẩn VNPAY 2.1.0.
  - Webhook IPN (`GET /api/v1/payment/vnpay/ipn`) và Return redirect (`GET /api/v1/payment/vnpay/return`).
  - Kiểm tra tính toàn vẹn chữ ký, idempotency guard trả về `RspCode: 02` nếu đơn đã được xác nhận.
  - Giao dịch thanh toán thành công (F04 + F05): chuyển `orders.status -> PAID`, `showtime_seats.status -> SOLD`, tích lũy điểm thưởng thành viên, phát hành vé `Ticket` với mã định danh duy nhất `TKXXXXXXXXXX` (`status: VALID`).
  - Cung cấp endpoint mô phỏng thanh toán sandbox tức thì cho môi trường kiểm thử tự động.
- [x] Bộ kiểm thử tự động API Đặt vé & Thanh toán (`backend/tests/booking-payment.test.ts`):
  - 9 ca kiểm thử chuyên sâu: giữ ghế, chặn trùng lặp BR-03, giới hạn 8 ghế, sinh paymentUrl VNPay, từ chối hash giả mạo (97), xác nhận thanh toán & xuất vé, tính lũy thừa idempotent, hủy đơn giải phóng ghế.
  - Toàn bộ test suite chạy thành công: **27/27 tests PASSED (100%)** trên 4 test file.
- [x] Phát triển Frontend CheckoutModal & TicketModal:
  - `CheckoutModal.tsx`: Đồng hồ đếm ngược 10 phút giữ ghế, thẻ tóm tắt phim/rạp, danh sách ghế đã chọn, xác nhận độ tuổi BR, lựa chọn cổng VNPay / Sandbox tức thì.
  - `TicketModal.tsx`: Thiết kế CineX Pass chuẩn phòng chiếu IMAX, hiển thị mã đơn hàng, vị trí ghế VIP, mã QR điện tử độ nét cao qua `qrcode.react`, trạng thái "HỢP LỆ — SẴN SÀNG SOÁT VÉ", tính năng in/lưu vé.
- [x] Kiểm thử trực quan end-to-end bằng browser subagent (`ticket_flow_pass`):
  - Đăng nhập `customer@gmail.com`, chọn 2 ghế VIP C1 & C2 (230.000đ), xác nhận checkout, thực hiện thanh toán và hiển thị màn hình vé CineX Pass có mã QR đầy đủ.
  - Lưu ảnh bằng chứng: `cinex_ticket_pass_1791016816379.png`.

### [2026-10-03] Phase 5: Hoàn thành Sprint 4 (Nghiệm thu Core MVP - F06, F08, F19)
- [x] Triển khai Backend Module Soát vé Check-in (`checkin.schema.ts`, `checkin.service.ts`, `checkin.controller.ts`, `checkin.routes.ts`):
  - Tra cứu và xác thực vé xem phim qua mã vé QR hoặc ID (F08).
  - Áp dụng chặt chẽ quy tắc BR-11: Mỗi vé chỉ được check-in duy nhất một lần. Chặn vé đã qua sử dụng với mã lỗi 409 `TICKET_ALREADY_USED` kèm thời gian và nhân viên soát vé trước đó.
  - Kiểm tra thẩm quyền cụm rạp: Nhân viên rạp nào chỉ được soát vé cho suất chiếu tại rạp đó (`checkStaffCinemaAccess`).
  - Cung cấp API thống kê soát vé thời gian thực (`GET /api/v1/checkin/stats`) và lịch sử quét gần nhất (`GET /api/v1/checkin/history`).
- [x] Triển khai Backend Lịch sử đặt vé khách hàng (F06):
  - Endpoint `GET /api/v1/orders/my/history` và `GET /api/v1/me/orders` tra cứu toàn bộ đơn đặt vé của người dùng kèm chi tiết vé, ghế, rạp, phòng, suất chiếu, phân trang và trạng thái thanh toán.
- [x] Triển khai Backend Background Sweeper Worker (F19):
  - `worker.service.ts`: Quét và giải phóng các đơn hàng quá hạn giữ chỗ (`status: PENDING_PAYMENT` và `expiresAt < NOW()`), chuyển đơn sang `EXPIRED`, hoàn trả ghế về `AVAILABLE`, xóa guard `pending_order_guards`.
  - Endpoint quản trị `POST /api/v1/ops/sweep-expired` cho phép kích hoạt dọn dẹp chủ động hoặc tích hợp cronjob.
- [x] Bộ kiểm thử tự động API Soát vé, Lịch sử và Worker (`backend/tests/checkin-history-worker.test.ts`):
  - 9 ca kiểm thử: soát vé hợp lệ, chặn soát lần hai (BR-11), chặn mã vé không tồn tại, chặn nhân viên sai cụm rạp, tra cứu lịch sử đơn hàng của khách, worker quét và giải phóng đơn quá hạn.
  - Toàn bộ test suite chạy thành công: **36/36 tests PASSED (100%)** trên 5 test files.
- [x] Phát triển Frontend MyTicketsDrawer & StaffCheckinModal:
  - `MyTicketsDrawer.tsx`: Drawer xem danh sách vé đã đặt, phân loại Đã thanh toán / Chờ thanh toán / Đã hủy, thẻ vé chi tiết hiển thị mã vé, phim, phòng, ghế và mã QR điện tử.
  - `StaffCheckinModal.tsx`: Giao diện trạm soát vé điện tử dành cho nhân viên/quản lý (`STAFF`, `MANAGER`, `ADMIN`), hiển thị thẻ thống kê hôm nay (Tổng vé, Đã vào phòng, Chưa soát), ô nhập/quét mã vé nhanh, và bảng lịch sử quét vé thời gian thực.
- [x] Kiểm thử trực tiếp giao diện (Browser Subagent verification):
  - Đăng nhập nhân viên `admin@cinex.vn`, kích hoạt nút "Soát vé" trên Header bar, mở modal trạm soát vé, kiểm tra hiển thị số liệu 22 vé / 4 đã vào phòng / 18 chưa soát.
  - Lưu ảnh bằng chứng: `staff_checkin_modal_verified_1791019079936.png` và `my_tickets_drawer_1791018631806.png`.




