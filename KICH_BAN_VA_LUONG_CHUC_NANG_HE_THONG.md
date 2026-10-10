# TỔNG HỢP KIẾN TRÚC, LUỒNG NGHIỆP VỤ & KỊCH BẢN DEMO HỆ THỐNG
## ĐỒ ÁN TỐT NGHIỆP: HỆ THỐNG ĐẶT VÉ XEM PHIM TRỰC TUYẾN CINEX

> **Sinh viên thực hiện:** Lương Viết Tiến  
> **Mã sinh viên:** 12523083  
> **Hệ thống phát triển:** CineX Online Cinema Booking & Management System  
> **Repository GitHub:** [luongviettienns/DoAn4](https://github.com/luongviettienns/DoAn4) (Private)  
> **Trạng thái kiểm thử:** **687 / 687 automated tests PASSED (100%)** (Backend: 518, Frontend: 169) | **0 Lint Errors** | **0 Security Vulnerabilities**

---

## MỤC LỤC

1. [TỔNG QUAN HỆ THỐNG & ĐẶC TẢ CÔNG NGHỆ](#1-tổng-quan-hệ-thống--đặc-tả-công-nghệ)
2. [MA TRẬN PHÂN QUYỀN VAI TRÒ (RBAC MATRIX)](#2-ma-trận-phân-quyền-vai-trò-rbac-matrix)
3. [DANH MỤC CÁC LUỒNG CHỨC NĂNG ĐÃ TRIỂN KHAI (F01 – F19)](#3-danh-mục-các-luồng-chức-năng-đã-triển-khai-f01--f19)
4. [CÁC KỊCH BẢN DEMO THỰC TẾ DÀNH CHO BUỔI BẢO VỆ / REVIEW](#4-các-kịch-bản-demo-thực-tế-dành-cho-buổi-bảo-vệ--review)
   - [Kịch bản 1: Luồng Khách hàng Đặt vé & Thanh toán Online (End-to-End)](#kịch-bản-1-luồng-khách-hàng-đặt-vé--thanh-toán-online-end-to-end)
   - [Kịch bản 2: Luồng Nhân viên Soát vé tại Rạp (Check-in & QR Scanning)](#kịch-bản-2-luồng-nhân-viên-soát-vé-tại-rạp-check-in--qr-scanning)
   - [Kịch bản 3: Luồng Khách hàng Hủy vé & Quản trị Đối soát Hoàn tiền](#kịch-bản-3-luồng-khách-hàng-hủy-vé--quản-trị-đối-soát-hoàn-tiền)
   - [Kịch bản 4: Luồng Quản trị Danh mục Phim & Tích hợp TMDB API](#kịch-bản-4-luồng-quản-trị-danh-mục-phim--tích-hợp-tmdb-api)
   - [Kịch bản 5: Luồng Quản lý Suất chiếu, Bảng giá & Chống xung đột](#kịch-bản-5-luồng-quản-lý-suất-chiếu-bảng-giá--chống-xung-đột)
   - [Kịch bản 6: Luồng Báo cáo Doanh thu & Xuất dữ liệu Excel/CSV](#kịch-bản-6-luồng-báo-cáo-doanh-thu--xuất-dữ-liệu-excelcsv)
5. [ĐIỂM SÁNG KỸ THUẬT NỔI BẬT (TECHNICAL HIGHLIGHTS)](#5-điểm-sáng-kỹ-thuật-nổi-bật-technical-highlights)
6. [TÀI KHOẢN TRUY CẬP DEMO & HƯỚNG DẪN KHỞI CHẠY](#6-tài-khoản-truy-cập-demo--hướng-dẫn-khởi-chạy)

---

## 1. TỔNG QUAN HỆ THỐNG & ĐẶC TẢ CÔNG NGHỆ

Hệ thống **CineX** là nền tảng quản lý và đặt vé xem phim trực tuyến hiện đại, giải quyết trọn vẹn bài toán vận hành của chuỗi rạp chiếu phim chuẩn quốc tế (tương tự mô hình CGV, Lotte Cinema, Galaxy Cinema):
- **Phía Người dùng (Customer-facing):** Duyệt danh mục phim đang chiếu/sắp chiếu, chọn cụm rạp, chọn suất chiếu, chọn ghế trên sơ đồ trực quan theo thời gian thực, giữ chỗ tạm thời (Pessimistic Hold), đặt combo bắp nước, áp mã giảm giá (Voucher), thanh toán qua cổng VNPay, nhận vé điện tử QR Code và Email hóa đơn HTML sang trọng.
- **Phía Quản lý & Vận hành (Staff & Admin Portal):** Trạm soát vé điện tử quét mã QR, quản lý lịch chiếu phim chống xung đột phòng chiếu, cấu hình biểu giá linh hoạt theo loại ngày/khung giờ/loại ghế, quản lý rạp và phòng chiếu, quản lý kho voucher/combo, xử lý yêu cầu hủy vé/hoàn tiền và phân tích báo cáo doanh thu đa chiều.

### Kiến trúc Công nghệ (Modern Full-Stack Architecture)

```mermaid
graph TD
    A["Frontend Client (React 19 + TypeScript + Vite)"] -->|RESTful API / JSON| B["Backend Server (Node.js + Express)"]
    B -->|Prisma ORM (Schema & Migrations)| C[("MySQL 8.0 Database (ACID Transactions)")]
    
    B -->|HMAC-SHA512 Payment Gateway| D["VNPay Sandbox API"]
    B -->|ID Token Verification| E["Google Identity Services (OAuth 2.0)"]
    B -->|Live Catalog & Media Sync| F["The Movie Database (TMDB v3/v4 API)"]
    B -->|SMTP STARTTLS / HTML E-Ticket| G["Google SMTP Mail Server"]
    B -->|Crypto Signatures| H["QR Signature Engine (HMAC-SHA256)"]
    B -->|Cron Sweeper Task| I["Background Worker (Hold Timeout)"]
```

| Tầng kiến trúc | Công nghệ sử dụng | Chi tiết kỹ thuật & Vai trò |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons | Kiến trúc Component module hóa, tối ưu kích thước bundle (CSS ~57kB), quản lý trạng thái phiên AuthContext, hỗ trợ trợ năng WAI-ARIA (WCAG 2.1), khóa cuộn modal và phím Escape tự động. |
| **Backend** | Node.js, Express, TypeScript | Clean Architecture (Controller - Service - Repository), Fail-fast environment validation, Request Correlation ID (`X-Request-Id`), Graceful shutdown (`SIGTERM`/`SIGINT`), Sliding-window Rate Limiting. |
| **Cơ sở dữ liệu** | MySQL 8.0, Prisma ORM | 24 bảng dữ liệu chuẩn hóa 3NF, 143 ràng buộc nghiệp vụ CHECK SQL (`constraints.sql`), sử dụng khóa dòng `SELECT ... FOR UPDATE` triệt tiêu Race Condition. |
| **Cổng thanh toán** | VNPay Sandbox (Chuẩn 2.1.0) | Ký số bảo mật `HMAC-SHA512`, xử lý webhook IPN ngầm (`/api/v1/payment/vnpay/ipn`) và Return URL client (`/payment/result`), cơ chế bảo vệ lũy thừa (Idempotency). |
| **Xác thực mạng xã hội** | Google Identity Services (GIS) | Đăng nhập Google 1 chạm (OAuth 2.0), xác thực token phía máy chủ qua Google OAuth API, tự động xử lý tài khoản mới kèm bước bổ sung SĐT chuẩn Việt Nam. |
| **Dữ liệu Điện ảnh** | The Movie Database (TMDB API) | Tự động hóa tìm kiếm và đồng bộ dữ liệu phim, poster W500, trailer YouTube chính thức, phân giải DNS dự phòng vượt tường lửa mạng viễn thông. |
| **Dịch vụ Email** | Nodemailer & Google SMTP | Bộ 3 mẫu email HTML giao diện nền tối CineX Luxury (Xác thực tài khoản, Đặt lại mật khẩu 15 phút, Vé điện tử E-Ticket kèm mã QR). |
| **Bảo mật Soát vé** | HMAC-SHA256 Ticket Signature | Mã QR định dạng `v1.<ticketCode>.<sig>` chống làm giả vé, kiểm tra cửa sổ soát vé $[-30\text{ phút}, +15\text{ phút}]$, kiểm soát ngoại lệ quản lý (Manager Bypass) kèm Audit Log. |

---

## 2. MA TRẬN PHÂN QUYỀN VAI TRÒ (RBAC MATRIX)

Hệ thống thiết lập 4 vai trò tác nhân với phạm vi truy cập phân định nghiêm ngặt:

| Nhóm chức năng / Tài nguyên | GUEST (Khách vãng lai) | CUSTOMER (Khách thành viên) | STAFF (Nhân viên rạp) | MANAGER (Quản lý cụm rạp) | ADMIN (Quản trị tối cao) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Xem Phim, Lịch chiếu, Rạp** | [x] | [x] | [x] | [x] | [x] |
| **Đăng ký, Đăng nhập (Local/Google)** | [x] | [x] | [x] | [x] | [x] |
| **Đặt vé, Giữ ghế, Thanh toán VNPay** | [ ] | [x] | [ ] | [ ] | [ ] |
| **Xem Vé của tôi & Lịch sử đơn** | [ ] | [x] | [ ] | [ ] | [ ] |
| **Yêu cầu Hủy vé & Hoàn tiền ($\ge 2h$)** | [ ] | [x] | [ ] | [ ] | [ ] |
| **Cập nhật Hồ sơ cá nhân & Đổi mật khẩu** | [ ] | [x] | [x] | [x] | [x] |
| **Trạm Soát vé QR (Check-in)** | [ ] | [ ] | [x] *(Chỉ rạp gán)* | [x] *(Chỉ rạp gán)* | [x] *(Toàn hệ thống)* |
| **Duyệt Soát vé trễ giờ (Bypass)** | [ ] | [ ] | [ ] *(Bị từ chối)* | [x] *(Rạp gán + Lý do)* | [x] *(Toàn hệ thống)* |
| **Quản lý Danh mục Phim (CRUD/TMDB)** | [ ] | [ ] | [ ] | [x] | [x] |
| **Xếp Suất chiếu & Bảng giá vé** | [ ] | [ ] | [ ] | [x] *(Chỉ rạp gán)* | [x] *(Toàn hệ thống)* |
| **Quản lý Combo & Voucher** | [ ] | [ ] | [ ] | [x] *(Chỉ rạp gán)* | [x] *(Toàn hệ thống)* |
| **Đối soát & Duyệt Hoàn tiền (F16)** | [ ] | [ ] | [ ] | [x] *(Chỉ rạp gán)* | [x] *(Toàn hệ thống)* |
| **Báo cáo Doanh thu & Xuất CSV** | [ ] | [ ] | [ ] | [x] *(Chỉ rạp gán)* | [x] *(Toàn hệ thống)* |

---

## 3. DANH MỤC CÁC LUỒNG CHỨC NĂNG ĐÃ TRIỂN KHAI (F01 – F19)

### [F01] Quản lý Tài khoản & Bảo mật (Account & Authentication)
- **Đăng ký tài khoản:** Xác thực họ tên, email chuẩn hóa, số điện thoại 10 chữ số chuẩn Việt Nam (`0[0-9]{9}`), mật khẩu băm bảo mật cao bằng `bcryptjs` (salt 10 rounds).
- **Đăng nhập & Quản lý phiên:** Cấp Access Token ngắn hạn (15 phút) và Refresh Token dài hạn (7 ngày) lưu trữ trong cookie an toàn `HttpOnly` với cờ bảo vệ CSRF và đường dẫn cookie scoped `/api/v1/auth`.
- **Đăng nhập 1-chạm qua Google (GIS OAuth 2.0):** Tích hợp Google Identity Services; tự động liên kết tài khoản cũ hoặc mở modal bổ sung SĐT cho tài khoản mới để thỏa mãn ràng buộc toàn vẹn CSDL.
- **Quên mật khẩu & Đặt lại mật khẩu:** Cấp mã Token ngẫu nhiên 32-byte lưu mã băm SHA-256 (`tokenHash`), tự động gửi email liên kết đặt lại mật khẩu có thời hạn 15 phút, tự hủy sau 1 lần sử dụng và tự động hủy toàn bộ phiên làm việc cũ trên mọi thiết bị.
- **Hồ sơ cá nhân:** Xem cấp bậc thành viên, điểm thưởng, cập nhật họ tên, SĐT và chức năng đổi mật khẩu.
- **Rate Limiting:** Chống tấn công brute-force với bộ đếm sliding-window (5 lần đăng nhập/15 phút, 3 lần yêu cầu quên mật khẩu/15 phút) kèm header phản hồi chuẩn RFC `Retry-After`.

### [F02] Duyệt Phim, Cụm Rạp & Suất Chiếu (Discovery & Catalog)
- **Danh mục phim thời gian thực:** Kết nối CSDL MySQL và TMDB; hiển thị poster độ nét cao, nhãn phân loại độ tuổi (`P`, `K`, `T13`, `T16`, `T18`), thời lượng và điểm đánh giá.
- **Bộ lọc đa tiêu chí:** Lọc linh hoạt theo cụm rạp, theo ngày chiếu (hôm nay, ngày mai, các ngày trong tuần) và theo thể loại phim.
- **Chi tiết phim & Trailer:** Modal hiển thị thông tin tóm tắt nội dung, đạo diễn, diễn viên và player nhúng trailer chính thức từ YouTube.

### [F03] Đặt Ghế & Giữ Chỗ Tạm Thời (Seat Reservation & Hold)
- **Sơ đồ ghế trực quan:** Mô phỏng phòng chiếu màn cong IMAX hiện đại, lưới ghế đa phân hạng: Ghế Thường (Standard), Ghế VIP, Ghế Đôi (Couple).
- **Cơ chế Khóa giữ chỗ (Pessimistic Hold - BR-01):** Khi khách hàng chọn ghế và nhấn tiếp tục, hệ thống mở transaction CSDL với `SELECT ... FOR UPDATE`, chuyển trạng thái ghế sang `HELD` trong **10 phút** (`holdExpiresAt = NOW() + 10m`).
- **Chống giữ chỗ trùng lặp (BR-03):** Chặn người dùng tạo nhiều đơn giữ chỗ đồng thời cho cùng một suất chiếu qua bảng `pending_order_guards`, giới hạn tối đa 8 ghế/đơn.
- **Đồng hồ đếm ngược:** Đếm lùi thời gian 10 phút trên giao diện; khi hết hạn, ghế tự động giải phóng sang `AVAILABLE`.

### [F04] Thanh Toán Trực Tuyến VNPay (Online Payment Integration)
- **Tích hợp cổng VNPay Sandbox 2.1.0:** Sinh URL thanh toán có mã băm bảo mật chữ ký điện tử `vnp_SecureHash` bằng thuật toán `HMAC-SHA512`.
- **Xử lý phản hồi đa kênh:**
  - **Kênh Webhook IPN (`GET /api/v1/payment/vnpay/ipn`):** Máy chủ VNPay gọi ngầm đến Backend, xác thực chữ ký, kiểm tra số tiền khớp lệnh và xác nhận đơn hàng độc lập với trình duyệt khách hàng.
  - **Kênh Return URL (`GET /api/v1/payment/vnpay/return`):** Trình duyệt người dùng chuyển hướng về trang kết quả `/payment/result`, hiển thị trạng thái giao dịch.
- **Bảo vệ tính lũy thừa (Idempotency):** Xử lý lặp callback từ cổng thanh toán một cách an toàn mà không bị nhân đôi số tiền hay phát hành vé thừa.
- **Cơ chế thanh toán mô phỏng (Sandbox Simulation):** Hỗ trợ nút thanh toán thử nghiệm tức thời phục vụ quá trình chấm điểm và demo thuận tiện.

### [F05] Phát Hành Vé Điện Tử (E-Ticket) & Gửi Mail Tự Động
- **Vé điện tử CineX Pass:** Hiển thị mã đơn hàng, poster phim, định dạng phòng, vị trí ghế ngồi, mã vé và mã QR chữ ký số bảo mật trên giao diện web.
- **Chữ ký số Cryptographic QR Code:** Mã QR được mã hóa cấu trúc `v1.<ticketCode>.<sig>` bằng HMAC-SHA256, triệt tiêu nguy cơ khách hàng tự tạo mã QR giả mạo.
- **Dịch vụ gửi Email tự động:** Sau khi thanh toán thành công, hệ thống tự động gửi vé xem phim điện tử HTML (E-Ticket) có đầy đủ mã QR, danh sách combo và hướng dẫn check-in tới hòm thư cá nhân của khách hàng qua máy chủ Google SMTP.

### [F06] Lịch Sử Vé & Hủy Vé Đặt (Ticket History & Cancellation)
- **Drawer "Vé của tôi":** Tra cứu toàn bộ các đơn hàng đã đặt kèm trạng thái: Đã thanh toán (`PAID`), Chờ thanh toán (`PENDING_PAYMENT`), Đã hủy (`CANCELLED`).
- **Chính sách hủy vé (BR-14):** Cho phép khách hàng tự gửi yêu cầu hủy vé khi suất chiếu **còn tối thiểu 2 giờ** trước giờ bắt đầu chiếu.
- **Tự động xử lý hủy:** Khi gửi yêu cầu hủy vé hợp lệ, hệ thống tự động:
  - Chuyển trạng thái đơn hàng sang `CANCELLED`.
  - Hủy trạng thái các vé liên quan (`TicketStatus.CANCELLED`).
  - Lập tức giải phóng ghế về `AVAILABLE` để khách hàng khác có thể đặt lại.
  - Tạo bản ghi yêu cầu hoàn tiền `RefundRequest` với trạng thái `PENDING` phục vụ quản lý đối soát.
  - Trừ lại số điểm tích lũy thành viên đã cộng của đơn hàng.

### [F08] Trạm Soát Vé Điện Tử Tại Rạp (Staff Check-in Terminal)
- **Giao diện nhân viên soát vé (`StaffCheckinModal.tsx`):** Thiết kế cho nhân viên tại cửa rạp; hiển thị thẻ thống kê thời gian thực (Tổng vé bán ra, Đã vào phòng, Chưa soát) và bảng lịch sử quét vé mới nhất.
- **Quét mã QR / Nhập mã vé:** Xác thực vé và chuyển trạng thái từ `VALID` sang `USED`.
- **Chống tái sử dụng vé (BR-11):** Chặn đứng vé đã quét trước đó với thông báo lỗi rõ ràng kèm thời gian và tên nhân viên đã soát lần đầu.
- **Cửa sổ thời gian soát vé:** Quy định cửa sổ hợp lệ từ 30 phút trước giờ chiếu (`startTime - 30m`) đến 15 phút sau khi phim bắt đầu (`startTime + 15m`).
  - Quét vé quá sớm (> 30 phút): Bị từ chối.
  - Quét vé quá trễ (> 15 phút): Bị chặn đối với nhân viên thường (`STAFF`). Chỉ cho phép Quản lý rạp (`MANAGER`) hoặc `ADMIN` duyệt ngoại lệ (Bypass) khi có lý do chính đáng và ghi lại Audit Log bất biến.

### [F09] Quản Trị Danh Mục Phim & Tích Hợp TMDB (Movie Management)
- **Tra cứu và Tự động điền (Auto-fill) từ TMDB:** Nhập tên phim $\rightarrow$ Hệ thống tự động truy vấn TMDB API và điền chính xác tên gốc, thời lượng, poster HD, trailer YouTube, ngày công chiếu và thể loại.
- **Quy tắc Ẩn phim thông minh (BR-13):** Khi dừng chiếu/ẩn một bộ phim, hệ thống tự động quét và hủy toàn bộ các suất chiếu tương lai của bộ phim đó, giải phóng ghế đang giữ và tự động sinh yêu cầu hoàn tiền 100% không mất phí cho các khách hàng đã mua vé.

### [F10] Quản Trị Cụm Rạp, Phòng Chiếu & Sơ Đồ Ghế (Cinema & Room)
- **Quản lý cụm rạp:** Danh sách rạp, địa chỉ, số hotline liên hệ.
- **Tạo phòng chiếu & Tự động sinh ma trận ghế:** Cho phép nhập số hàng (A-F), số cột (1-8), định dạng phòng (`2D`, `3D`, `IMAX`) $\rightarrow$ Backend tự động khởi tạo toàn bộ các bản ghi `Seat` tương ứng.
- **Bảo vệ phạm vi rạp (Cinema-Scope):** Quản lý cụm rạp (`MANAGER`) chỉ được thao tác trên rạp mình được phân công quản lý.

### [F11] Quản Trị Suất Chiếu & Kiểm Tra Trùng Lịch (Showtime Scheduling)
- **Lập lịch chiếu linh hoạt:** Chọn phim, chọn phòng, chọn thời gian bắt đầu, định dạng chiếu và ngôn ngữ (Phụ đề/Lồng tiếng).
- **Thuật toán kiểm tra xung đột phòng chiếu (BR-10):** Chặn tạo suất chiếu nếu thời gian chiếu bị trùng lặp hoặc không đủ **15 phút giãn cách dọn dẹp vệ sinh phòng chiếu** (`cleaningMinutes`).
- **Hủy suất chiếu quản trị:** Cho phép Quản lý/Admin hủy suất chiếu khẩn cấp kèm lý do $\rightarrow$ Tự động hủy vé và hoàn tiền toàn bộ cho người xem.

### [F12] Quản Trị Bảng Giá Vé Động & Ngày Lễ (Pricing & Holidays)
- **Biểu giá vé cơ bản (`PriceRule`):** Cấu hình linh hoạt giá vé dựa trên ma trận 3 chiều: Định dạng phòng (`2D`, `3D`, `IMAX`) $\times$ Loại ngày (`WEEKDAY`, `WEEKEND`, `HOLIDAY`) $\times$ Khung giờ chiếu (`Sáng`, `Chiều`, `Tối`).
- **Phụ thu theo loại ghế (`SeatSurcharge`):** Cấu hình phụ thu cộng thêm cho ghế VIP và ghế Đôi (Couple).
- **Danh mục Ngày lễ toàn quốc (`Holiday`):** Admin khai báo danh sách ngày lễ (Tết, 30/4, 1/5, Quốc khánh...) $\rightarrow$ Hệ thống tự động áp biểu giá `HOLIDAY` vào các ngày này.

### [F13] Quản Trị Combo Bắp Nước & Voucher Khuyến Mãi (Concessions & Promo)
- **Combo bắp nước:** Quản lý danh mục combo (mã, tên combo, giá bán, chi tiết các món). Khách hàng có thể chọn mua kèm ngay trong bước thanh toán vé.
- **Voucher giảm giá:** Cấu hình mã voucher, loại giảm (theo phần trăm hoặc tiền cố định), trần giảm tối đa, giá trị đơn hàng tối thiểu, tổng lượt dùng toàn hệ thống và giới hạn mỗi khách hàng (BR-09).

### [F14] Báo Cáo Doanh Thu & Xuất Dữ Liệu Excel/CSV (Analytics & Export)
- **Dashboard trực quan:** Biểu đồ doanh thu thuần, tổng số vé bán ra, tổng đơn hàng và tỷ lệ lấp đầy rạp.
- **Xuất báo cáo CSV chuẩn quốc tế:** Hỗ trợ xuất dữ liệu phân tích doanh thu theo ngày, theo rạp và theo phim. Tệp CSV được định dạng chuẩn **UTF-8 kèm ký tự BOM (`\uFEFF`)**, giúp mở trực tiếp trên Microsoft Excel mà không bao giờ bị lỗi font tiếng Việt.

### [F16] Đối Soát & Xử Lý Hoàn Tiền Tập Trung (Refund Management)
- **Giao diện đối soát hoàn tiền:** Tab chuyên dụng dành cho Quản lý rạp và Admin theo dõi toàn bộ các yêu cầu hoàn tiền phát sinh từ việc khách tự hủy vé ($\ge 2h$) hoặc do rạp hủy suất chiếu.
- **Xác nhận hoàn tiền đa kênh:** Hỗ trợ xử lý hoàn qua Chuyển khoản ngân hàng (`BANK_TRANSFER`), Tiền mặt tại quầy (`CASH`), hoặc Cổng thanh toán (`PROVIDER_MANUAL`), ghi lại mã tham chiếu đối soát và cập nhật trạng thái đơn hàng.

### [F19] Background Sweeper Worker (Tự Động Thu Hồi Ghế Quá Hạn)
- **Tiến trình ngầm độc lập:** Định kỳ rà soát các đơn hàng `PENDING_PAYMENT` có `expiresAt < NOW()`.
- **Tự động dọn dẹp:** Đổi trạng thái đơn sang `EXPIRED`, giải phóng các ghế liên quan về `AVAILABLE`, hoàn trả voucher về kho và xóa `pending_order_guards`.

---

## 4. CÁC KỊCH BẢN DEMO THỰC TẾ DÀNH CHO BUỔI BẢO VỆ / REVIEW

Để buổi thuyết trình với Giảng viên diễn ra mạch lạc, thuyết phục và làm nổi bật các điểm mạnh kỹ thuật, dưới đây là **6 kịch bản demo mẫu** được chuẩn bị theo từng luồng nghiệp vụ thực tế:

---

### Kịch bản 1: Luồng Khách hàng Đặt vé & Thanh toán Online (End-to-End)
*Mục đích: Chứng minh luồng trải nghiệm khách hàng hoàn chỉnh, mượt mà và tích hợp thật 100%.*

* **Bước 1 (Đăng nhập):**
  - Mở trang chủ CineX (`http://localhost:5173`).
  - Bấm nút **"Đăng nhập"** trên thanh Header.
  - *Phương án A:* Đăng nhập bằng tài khoản thành viên `customer@gmail.com` / mật khẩu `Password123!`.
  - *Phương án B (Gây ấn tượng):* Bấm nút **"Đăng nhập bằng Google"** để demo tính năng Google OAuth 2.0 Identity Services thực tế.
* **Bước 2 (Chọn phim & Suất chiếu):**
  - Tại trang chủ, xem danh mục phim đang chiếu.
  - Chọn cụm rạp **"CineX Cầu Giấy"** hoặc **"CineX Landmark 81"**.
  - Chọn bộ phim bom tấn (VD: *Dune: Part Two* hoặc *Godzilla x Kong*).
  - Chọn suất chiếu định dạng cao cấp **IMAX LASER**.
* **Bước 3 (Chọn ghế trên sơ đồ động & Giữ chỗ 10 phút):**
  - Sơ đồ ghế hiện ra với màn chiếu cong IMAX phát sáng.
  - Chọn 2 ghế VIP (VD: **F05, F06**). Thanh Dock phía dưới tự động tính tổng tiền (gồm giá cơ bản + phụ thu ghế VIP).
  - Bấm **"Tiếp tục đặt vé"**.
  - *Điểm nhấn kỹ thuật cần thuyết minh:* Backend ngay lập tức kích hoạt transaction khóa hàng (`SELECT ... FOR UPDATE`), đặt trạng thái ghế thành `HELD` và kích hoạt đồng hồ đếm ngược 10 phút. Nếu mở một trình duyệt khác cùng lúc, 2 ghế này sẽ hiển thị màu cam/khóa đối với người khác.
* **Bước 4 (Chọn Combo bắp nước & Thanh toán):**
  - Tại màn hình Checkout, chọn thêm **1 Combo Solo Bắp nước**.
  - Bấm xác nhận điều kiện độ tuổi theo quy định.
  - Bấm **"Xác nhận thanh toán"** $\rightarrow$ Hệ thống chuyển sang giao diện cổng thanh toán VNPay Sandbox hoặc chế độ giả lập tức thời.
* **Bước 5 (Nhận vé điện tử & Mã QR):**
  - Thanh toán thành công $\rightarrow$ Giao diện điều hướng về trang kết quả và mở modal **CineX Pass**.
  - Màn hình hiển thị vé với mã đơn hàng, vị trí ghế, và **mã QR Code có chữ ký số HMAC-SHA256**.
* **Bước 6 (Kiểm tra Email E-Ticket thật):**
  - Mở hòm thư Gmail cá nhân (`luongviettienns@gmail.com`) để cho Giáo viên thấy email xác nhận vé vừa được gửi đến tự động với đầy đủ poster, thông tin suất chiếu, mã QR và hóa đơn thanh toán.

---

### Kịch bản 2: Luồng Nhân viên Soát vé tại Rạp (Check-in & QR Scanning)
*Mục đích: Chứng minh khả năng vận hành tại rạp, tính toàn vẹn của mã QR và kiểm soát gian lận.*

* **Bước 1 (Đăng nhập Nhân viên rạp):**
  - Đăng xuất tài khoản khách, đăng nhập tài khoản nhân viên cụm rạp Cầu Giấy:
    - Email: `staff.caugiay@cinex.vn` | Mật khẩu: `Password123!`
* **Bước 2 (Mở Trạm Soát vé):**
  - Trên thanh Header, xuất hiện thêm nút **"Soát vé"** (chỉ hiển thị cho Staff/Manager/Admin).
  - Nhấp vào nút "Soát vé" để mở **Trạm Soát Vé Điện Tử**.
  - Thuyết minh giao diện: Bảng số liệu thống kê thời gian thực hôm nay (Tổng số vé, Đã soát vào phòng, Chưa soát) và lịch sử quét gần nhất.
* **Bước 3 (Soát vé lần 1 - Thành công):**
  - Nhập mã vé hoặc mã QR vừa đặt ở Kịch bản 1 vào ô quét vé nhanh $\rightarrow$ Bấm **"Xác nhận soát vé"**.
  - Hệ thống báo: **"SOÁT VÉ THÀNH CÔNG"** (Màu xanh), hiển thị đúng tên phim, phòng chiếu, số ghế và cập nhật trạng thái vé sang `USED`. Thẻ thống kê "Đã vào phòng" lập tức tăng thêm 1.
* **Bước 4 (Soát vé lần 2 - Chặn gian lận BR-11):**
  - Nhập lại đúng mã vé vừa quét thêm một lần nữa $\rightarrow$ Bấm "Xác nhận soát vé".
  - Hệ thống lập tức từ chối và cảnh báo đỏ: **"VÉ ĐÃ QUA SỬ DỤNG (TICKET_ALREADY_USED)"**, hiển thị rõ thời gian quét lần trước và nhân viên đã thực hiện soát vé.
* **Bước 5 (Kiểm tra Ngoại lệ Cửa sổ Giờ chiếu - Manager Bypass):**
  - Nhập một mã vé của suất chiếu đã trễ hơn 15 phút.
  - Tài khoản `STAFF` sẽ bị hệ thống từ chối thẳng thừng (`CHECKIN_WINDOW_EXPIRED`).
  - Đăng nhập tài khoản `MANAGER` $\rightarrow$ Hệ thống cho phép hiển thị ô **"Nhập lý do duyệt ngoại lệ"** và ghi nhận Audit Log vết duyệt của Quản lý.

---

### Kịch bản 3: Luồng Khách hàng Hủy vé & Quản trị Đối soát Hoàn tiền
*Mục đích: Chứng minh chính sách bảo vệ người tiêu dùng và quy trình đối soát tài chính chặt chẽ (F16 & BR-14).*

* **Bước 1 (Khách hàng yêu cầu Hủy vé):**
  - Đăng nhập tài khoản khách hàng `customer@gmail.com`.
  - Bấm vào tên người dùng $\rightarrow$ Chọn **"Vé của tôi"** để mở Drawer lịch sử vé.
  - Chọn một vé thuộc suất chiếu diễn ra vào ngày mai (thỏa mãn điều kiện trước giờ chiếu $\ge 2$ giờ).
  - Bấm nút **"Hủy vé / Yêu cầu hoàn tiền"** $\rightarrow$ Nhập lý do (VD: *"Có lịch công tác đột xuất"*).
  - Hệ thống thông báo yêu cầu hủy vé thành công, đơn hàng chuyển trạng thái **"CHỜ HOÀN TIỀN (PENDING)"**.
  - *Điểm nhấn:* Ngay khi bấm hủy, ghế trên sơ đồ rạp lập tức được tự động giải phóng sang trạng thái trống để khách khác có thể mua.
* **Bước 2 (Quản trị viên Đối soát & Xử lý Hoàn tiền):**
  - Đăng nhập tài khoản Quản lý: `manager.caugiay@cinex.vn` hoặc `admin@cinex.vn`.
  - Mở mục **"Quản trị"** $\rightarrow$ Chọn Tab **"5. Đối Soát & Hoàn Tiền"**.
  - Thấy ngay yêu cầu hoàn tiền của khách hàng vừa tạo hiển thị ở đầu danh sách với đầy đủ: Mã đơn hàng, tên khách, số tiền hoàn, lý do hủy.
  - Bấm **"Xử lý hoàn tiền"** $\rightarrow$ Chọn phương thức `Chuyển khoản ngân hàng` $\rightarrow$ Nhập mã chứng từ giao dịch $\rightarrow$ Bấm **"Xác nhận hoàn tất"**.
  - Yêu cầu chuyển sang trạng thái xanh **ĐÃ HOÀN TIỀN (REFUNDED)** và lưu vết kiểm toán vĩnh viễn.

---

### Kịch bản 4: Luồng Quản trị Danh mục Phim & Tích hợp TMDB API
*Mục đích: Thể hiện tính tự động hóa cao, không phải nhập liệu phim thủ công.*

* **Bước 1:** Đăng nhập tài khoản `admin@cinex.vn` $\rightarrow$ Mở modal **"Quản trị"** $\rightarrow$ Tab **"1. Quản lý Phim"**.
* **Bước 2:** Nhấp vào nút **"+ Thêm phim mới"**.
* **Bước 3 (Tìm kiếm TMDB trực tiếp):**
  - Tại ô tìm kiếm *"🔍 Tìm & Tự động điền nhanh từ TMDB"*, gõ tên một bộ phim mới (VD: `Avatar`, `Spider-Man`, `Oppenheimer`...).
  - Danh sách gợi ý từ kho dữ liệu The Movie Database hiển thị tức thì kèm ảnh poster thu nhỏ và điểm đánh giá.
* **Bước 4 (Tự động điền Auto-fill):**
  - Bấm nút **"Chọn"** cạnh bộ phim muốn thêm.
  - *Kết quả ấn tượng:* Toàn bộ biểu mẫu được tự động điền trong 0.1 giây: Tiêu đề tiếng Việt, Tên gốc tiếng Anh, Thời lượng chính xác từng phút, Link Poster chuẩn HD, Link Trailer YouTube chính thức, Mô tả nội dung và tự động tích chọn thể loại khớp với hệ thống.
* **Bước 5:** Bấm **"Lưu phim"** $\rightarrow$ Phim mới lập tức xuất hiện trên giao diện trang chủ của khách hàng.

---

### Kịch bản 5: Luồng Quản lý Suất chiếu, Bảng giá & Chống xung đột
*Mục đích: Chứng minh các thuật toán nghiệp vụ logic phức tạp của hệ thống rạp chiếu phim.*

* **Bước 1 (Xếp lịch chiếu & Chống xung đột phòng BR-10):**
  - Mở Tab **"2. Xếp Suất Chiếu"** trong bảng Quản trị.
  - Chọn Cụm rạp Cầu Giấy $\rightarrow$ Phòng chiếu số 1.
  - Cố tình chọn một khung giờ bị trùng hoặc cách suất chiếu trước đó dưới 15 phút (chưa đủ thời gian dọn phòng dọn dẹp vệ sinh).
  - Bấm lưu $\rightarrow$ Hệ thống lập tức kích hoạt validate và chặn lại với thông báo: *"Xung đột thời gian sử dụng phòng chiếu hoặc không đủ 15 phút giãn cách dọn dẹp"*.
  - Điều chỉnh giờ chiếu hợp lệ $\rightarrow$ Hệ thống tạo suất chiếu thành công và tự động sinh toàn bộ ma trận ghế cho suất đó.
* **Bước 2 (Cấu hình Bảng giá động & Ngày lễ):**
  - Mở Tab **"4. Bảng Giá & Ngày Lễ"**.
  - Cho Giáo viên xem biểu giá vé theo định dạng phòng (2D / 3D / IMAX) và loại ngày (Ngày thường / Cuối tuần / Ngày lễ).
  - Cho xem bảng phụ thu loại ghế: Ghế Standard (+0đ), Ghế VIP (+15.000đ), Ghế Đôi (+30.000đ).
  - Cho xem danh sách Ngày lễ toàn quốc (30/4, 1/5, 2/9...) $\rightarrow$ Hệ thống tự động tính giá vé ngày lễ nếu suất chiếu rơi trúng các ngày này mà quản lý không cần can thiệp bằng tay.

---

### Kịch bản 6: Luồng Báo cáo Doanh thu & Xuất dữ liệu Excel/CSV
*Mục đích: Thể hiện tính năng phân tích số liệu kinh doanh dành cho chủ doanh nghiệp.*

* **Bước 1:** Đăng nhập tài khoản `admin@cinex.vn` $\rightarrow$ Nhấp vào nút **"Báo cáo"** (Biểu tượng BarChart) trên Header.
* **Bước 2:** Màn hình **Admin Report Dashboard** hiển thị:
  - Thẻ tổng doanh thu thuần, tổng số vé đã bán, tổng số đơn hàng.
  - Biểu đồ phân bổ doanh thu theo từng ngày và theo từng cụm rạp.
  - Tỷ lệ lấp đầy ghế ngồi theo từng khung giờ chiếu.
* **Bước 3 (Xuất dữ liệu Excel/CSV):**
  - Bấm nút **"Xuất CSV"** trên thanh công cụ lọc.
  - Trình duyệt tự động tải xuống tệp dữ liệu có tên dạng `cinex-report-daily-2026-10-07.csv`.
  - Mở tệp trực tiếp bằng phần mềm Microsoft Excel: Tiêu đề tiếng Việt, tên phim, tên rạp và số tiền hiển thị hoàn hảo, sắc nét, không bị bất kỳ lỗi vỡ font ký tự nào nhờ xử lý chuẩn mã hóa UTF-8 BOM (`\uFEFF`).

---

## 5. ĐIỂM SÁNG KỸ THUẬT NỔI BẬT (TECHNICAL HIGHLIGHTS)

Khi bảo vệ trước Hội đồng, đây là **5 luận điểm kỹ thuật then chốt** chứng minh đồ án đạt tiêu chuẩn kỹ thuật phần mềm chất lượng cao:

### 1. Giải quyết triệt để bài toán Đua tranh dữ liệu (Race Condition) bằng Khóa dòng CSDL
- **Vấn đề thực tế:** Khi 100 khách hàng cùng bấm chọn duy nhất một ghế VIP tại cùng 1 giây (như các đợt mở bán vé phim bom tấn), các hệ thống thông thường sẽ gặp lỗi bán trùng ghế (Overbooking).
- **Giải pháp của CineX:** Áp dụng mô hình **Pessimistic Locking** thông qua câu lệnh SQL `SELECT ... FOR UPDATE` kết hợp bảng khóa tạm thời `pending_order_guards`. Mọi yêu cầu giữ ghế được xếp hàng tuần tự hóa ở cấp độ Engine lưu trữ InnoDB của MySQL. Một ghế chỉ có thể thuộc về duy nhất 1 đơn hàng tại 1 thời điểm.

### 2. An toàn dữ liệu & Tính lũy thừa (Idempotency Protection)
- Toàn bộ các API nhạy cảm liên quan đến tài chính và xuất vé (`POST /orders`, `POST /orders/counter`, callback VNPay) đều được bảo vệ bởi middleware `idempotency.middleware.ts` theo cơ chế hash SHA-256 (`method + path + body + actorId`).
- Khách hàng vô tình nhấn đúp chuột nhiều lần khi mạng chậm, hoặc cổng thanh toán retry webhook IPN nhiều lần đều được nhận diện và xử lý an toàn mà không bao giờ bị trừ tiền 2 lần hay tạo trùng đơn hàng.

### 3. Bảo mật Phân quyền Phạm vi Cụm rạp (Cinema-Scope Invariants)
- Không chỉ dừng lại ở phân quyền theo vai trò (Role-based), hệ thống xây dựng cơ chế kiểm soát theo ngữ cảnh rạp ([`cinema-scope.ts`](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/cinema-scope.ts)).
- Quản lý hay nhân viên của rạp *CineX Cầu Giấy* tuyệt đối không thể xem báo cáo, không thể sửa phòng chiếu, không thể soát vé của rạp *CineX Landmark 81*, bảo đảm tính toàn vẹn dữ liệu đa chi nhánh.

### 4. Chữ ký số mã hóa cho Vé điện tử & Chống gian lận cửa rạp
- Mã QR không lưu trữ chuỗi text đơn thuần mà được ký số bằng thuật toán mã hóa `HMAC-SHA256` với khóa bí mật xoay vòng (`QR_SECRET`).
- Kết hợp với thuật toán so sánh chuỗi an toàn thời gian thực `crypto.timingSafeEqual` và cửa sổ soát vé chặt chẽ $[-30m, +15m]$, hệ thống ngăn chặn hoàn toàn việc chụp ảnh vé cũ để vào lại rạp hoặc tự tạo vé giả.

### 5. Bộ Kiểm thử tự động khổng lồ đạt độ bao phủ cao (687 Automated Tests)
- Toàn bộ các quy tắc nghiệp vụ (BR-01 đến BR-15) đều được kiểm chứng bằng phương pháp Test-Driven Development (TDD).
- Dự án sở hữu **687 ca kiểm thử tự động đạt tỷ lệ đậu 100%**, độ bao phủ mã nguồn Backend đạt trên **93% dòng lệnh**, xây dựng theo chuẩn mực kỹ thuật công nghiệp nghiêm ngặt.

---

## 6. TÀI KHOẢN TRUY CẬP DEMO & HƯỚNG DẪN KHỞI CHẠY

Toàn bộ tài khoản thử nghiệm đã được nạp sẵn vào cơ sở dữ liệu (`seed.ts`):

| Vai trò người dùng | Địa chỉ Email đăng nhập | Mật khẩu chung | Phạm vi quyền hạn kiểm thử |
|---|---|---|---|
| **QUẢN TRỊ VIÊN TỐI CAO** | `admin@cinex.vn` | `Password123!` | Toàn quyền hệ thống: Quản lý phim, rạp, bảng giá, duyệt hoàn tiền, xem toàn bộ báo cáo doanh thu. |
| **QUẢN LÝ CỤM RẠP** | `manager.caugiay@cinex.vn` | `Password123!` | Quản lý rạp Cầu Giấy: Xếp suất chiếu, duyệt hoàn tiền rạp mình, soát vé có quyền duyệt ngoại lệ. |
| **NHÂN VIÊN SOÁT VÉ** | `staff.caugiay@cinex.vn` | `Password123!` | Trạm soát vé rạp Cầu Giấy: Quét QR check-in vé, xem lịch sử soát vé. |
| **KHÁCH HÀNG THÀNH VIÊN** | `customer@gmail.com` | `Password123!` | Đặt vé online, thanh toán VNPay, xem vé của tôi, yêu cầu hủy vé & tích điểm. |
| **KHÁCH HÀNG GOOGLE** | *(Đăng nhập bằng tài khoản Google bất kỳ)* | N/A | Tự động đăng nhập qua nút "Sign in with Google" chuẩn OAuth 2.0. |

### Hướng dẫn Khởi chạy Hệ thống trên máy tính

1. **Khởi động Backend:**
   ```bash
   cd backend
   npm run dev
   # Máy chủ API lắng nghe tại: http://localhost:3000 (Health check: http://localhost:3000/health)
   ```
2. **Khởi động Frontend:**
   ```bash
   cd frontend
   npm run dev
   # Giao diện web người dùng tại: http://localhost:5173
   ```
3. **Chạy toàn bộ Bộ kiểm thử tự động (Quality Gates):**
   ```bash
   # Kiểm thử toàn diện Backend (518 tests):
   npm test --workspace=backend

   # Kiểm thử toàn diện Frontend (169 tests):
   npm test --workspace=frontend
   ```

---
*Tài liệu được biên soạn phục vụ công tác báo cáo tiến độ và bảo vệ Đồ án tốt nghiệp chuyên ngành Công nghệ Thông tin.*
