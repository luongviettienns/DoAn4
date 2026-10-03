# 03. Mô tả giao diện theo từng màn hình và phân hệ actor

> Dùng để thiết kế frontend (React + TypeScript + Redux Toolkit). Mỗi màn hình có: route, quyền truy cập, mục đích, bố cục, thành phần và dữ liệu, hành động, trạng thái giao diện, validate, ghi chú responsive.
> Luồng nghiệp vụ chi tiết xem `02-luong-chuc-nang.md` (mã F01-F19).

## Mục lục

- [0. Nguyên tắc chung](#0-nguyên-tắc-chung)
- [1. Sơ đồ điều hướng và route](#1-sơ-đồ-điều-hướng-và-route)
- [2. Phân hệ công khai và khách hàng](#2-phân-hệ-công-khai-và-khách-hàng)
- [3. Phân hệ nhân viên rạp](#3-phân-hệ-nhân-viên-rạp)
- [4. Phân hệ quản lý rạp](#4-phân-hệ-quản-lý-rạp)
- [5. Phân hệ quản trị hệ thống](#5-phân-hệ-quản-trị-hệ-thống)
- [6. Thành phần dùng chung](#6-thành-phần-dùng-chung)
- [7. Gợi ý cấu trúc Redux và thư mục](#7-gợi-ý-cấu-trúc-redux-và-thư-mục)
- [8. Checklist thiết kế](#8-checklist-thiết-kế)

---

## 0. Nguyên tắc chung

**Ba giao diện tách biệt (layout)**

| Layout | Dùng cho | Đặc điểm |
|---|---|---|
| `PublicLayout` | Khách và khách hàng | Header (logo, menu, tìm kiếm, tài khoản), nội dung, footer. Ưu tiên mobile, màu tối kiểu rạp phim, poster lớn |
| `StaffLayout` | Nhân viên | Tối giản, nút lớn dễ bấm trên máy quầy/tablet, ít điều hướng, hiển thị rạp và ca làm việc |
| `AdminLayout` | Quản lý và Admin | Sidebar trái (menu theo vai trò) + thanh trên (rạp đang chọn, tài khoản) + vùng nội dung dạng bảng/biểu đồ, ưu tiên desktop |

**Quy tắc áp dụng cho mọi màn hình**
- Mọi màn hình có đủ 4 trạng thái: **đang tải** (skeleton, không dùng spinner toàn trang), **rỗng** (hình minh họa + câu hướng dẫn + nút hành động), **lỗi** (thông báo + nút "Thử lại"), **thành công**.
- Form: validate theo trường, hiển thị lỗi ngay dưới ô nhập, nút gửi bị khóa khi đang gửi (chống bấm đúp), giữ dữ liệu đã nhập khi lỗi mạng.
- Thao tác nguy hiểm (xóa, hủy suất, khóa tài khoản): hộp thoại xác nhận nêu rõ hậu quả.
- Thông báo ngắn (toast) cho thành công/lỗi nhẹ; lỗi nghiệp vụ nghiêm trọng hiện hộp thoại.
- Tiền hiển thị dạng `95.000đ`; thời gian theo giờ Việt Nam `19:30, 03/10/2026`.
- Độ tuổi hiển thị bằng badge màu: `P` xanh lá, `K` xanh dương, `T13` vàng, `T16` cam, `T18` đỏ.
- Responsive: mobile < 640px, tablet 640-1024px, desktop > 1024px. Khu vực **khách hàng** thiết kế mobile-first; **quản lý/admin** desktop-first nhưng bảng cuộn ngang được trên mobile.
- Trợ năng: tương phản đủ, thao tác được bằng bàn phím, nhãn cho biểu tượng, **không dùng riêng màu để phân biệt trạng thái ghế** (kèm ký hiệu/viền).

**Ngôn ngữ giao diện**: tiếng Việt toàn bộ.

---

## 1. Sơ đồ điều hướng và route

### 1.1 Bảng route

| Route | Màn hình | Quyền | Layout |
|---|---|---|---|
| `/` | Trang chủ | Công khai | Public |
| `/movies` | Danh sách phim | Công khai | Public |
| `/movies/:id` | Chi tiết phim + chọn suất | Công khai | Public |
| `/login` | Đăng nhập | Khách (đã đăng nhập thì chuyển hướng) | Public (gọn) |
| `/register` | Đăng ký | Khách | Public (gọn) |
| `/forgot-password` | Quên mật khẩu | Khách | Public (gọn) |
| `/reset-password` | Đặt lại mật khẩu | Khách (có token) | Public (gọn) |
| `/booking/:showtimeId/seats` | Chọn ghế | CUSTOMER | Public (gọn, ẩn menu) |
| `/booking/:orderId/checkout` | Combo, voucher, xác nhận | CUSTOMER | Public (gọn) |
| `/payment/result` | Kết quả thanh toán | CUSTOMER | Public (gọn) |
| `/me/tickets` | Vé của tôi | CUSTOMER | Public |
| `/me/tickets/:orderId` | Chi tiết đơn/vé | CUSTOMER | Public |
| `/me/profile` | Hồ sơ cá nhân | CUSTOMER | Public |
| `/staff` | Bảng điều khiển quầy | STAFF, MANAGER | Staff |
| `/staff/sell` | Bán vé tại quầy | STAFF, MANAGER | Staff |
| `/staff/checkin` | Soát vé | STAFF, MANAGER | Staff |
| `/staff/orders` | Tra cứu đơn | STAFF, MANAGER | Staff |
| `/admin` | Dashboard | MANAGER, ADMIN | Admin |
| `/admin/movies` (+ `/new`, `/:id`) | Quản lý phim | MANAGER, ADMIN | Admin |
| `/admin/cinemas` | Quản lý rạp | MANAGER (rạp mình), ADMIN | Admin |
| `/admin/rooms/:id/seat-map` | Sơ đồ ghế phòng | MANAGER, ADMIN | Admin |
| `/admin/showtimes` | Quản lý suất chiếu | MANAGER, ADMIN | Admin |
| `/admin/pricing` | Bảng giá | MANAGER, ADMIN | Admin |
| `/admin/vouchers` | Voucher | MANAGER, ADMIN | Admin |
| `/admin/combos` | Combo | MANAGER, ADMIN | Admin |
| `/admin/orders` | Đơn hàng và hoàn tiền | MANAGER, ADMIN | Admin |
| `/admin/reports` | Báo cáo | MANAGER, ADMIN | Admin |
| `/admin/reviews` | Duyệt đánh giá | MANAGER, ADMIN | Admin |
| `/admin/users` | Người dùng | ADMIN | Admin |
| `/admin/settings` | Cấu hình hệ thống | ADMIN | Admin |
| `/admin/audit-logs` | Nhật ký | ADMIN | Admin |
| `/403`, `/404` | Không đủ quyền / không tìm thấy | Mọi người | - |

### 1.2 Route guard

- `RequireAuth`: chưa đăng nhập thì chuyển `/login?redirect=<url hiện tại>`.
- `RequireRole(roles[])`: sai vai trò thì chuyển `/403`.
- Sau đăng nhập: chuyển về `redirect` nếu có; nếu không thì `CUSTOMER` → `/`, `STAFF` → `/staff`, `MANAGER`/`ADMIN` → `/admin`.
- Menu hiển thị theo vai trò, nhưng **backend vẫn kiểm tra quyền** (ẩn nút không thay thế phân quyền).

### 1.3 Sơ đồ luồng điều hướng khách hàng

```
Trang chủ ──► Chi tiết phim ──► Chọn ghế ──► Checkout ──► Cổng thanh toán
   │              ▲                  ▲           │               │
   ▼              │                  └───────────┘ (quay lại)    ▼
Danh sách phim ───┘                                       Kết quả thanh toán
                                                                  │
                                              Vé của tôi ◄────────┘
```

---

## 2. Phân hệ công khai và khách hàng

### 2.1 Trang chủ - `/`

- **Mục đích**: thu hút xem phim, lối vào nhanh tới đặt vé.
- **Bố cục (trên xuống)**:
  1. **Header**: logo, menu (Phim, Rạp, Khuyến mãi), ô tìm kiếm phim, nút Đăng nhập/Đăng ký hoặc avatar (menu: Vé của tôi, Hồ sơ, Đăng xuất).
  2. **Banner** carousel 3-5 phim nổi bật: ảnh ngang, tên, nút **Đặt vé ngay**, tự chạy 5 giây, vuốt được trên mobile.
  3. **Thanh đặt vé nhanh**: chọn Rạp → Phim → Ngày → Suất → nút **Đặt vé** (mỗi ô phụ thuộc ô trước).
  4. **Tab "Đang chiếu" / "Sắp chiếu"**: lưới thẻ phim (poster, tên, badge độ tuổi, thời lượng, thể loại, điểm sao), nút **Đặt vé** hiện khi rê chuột (mobile: luôn hiện).
  5. **Gợi ý cho bạn** (chỉ khi đã đăng nhập và có dữ liệu): hàng ngang cuộn của thẻ phim.
  6. **Khuyến mãi**: thẻ voucher/ưu đãi nổi bật.
  7. **Footer**: giới thiệu, chính sách (hủy vé, bảo mật), liên hệ.
- **Hành động**: bấm thẻ phim → `/movies/:id`; bấm Đặt vé → chọn suất trong trang chi tiết.
- **Trạng thái**: skeleton các thẻ khi tải; rỗng "Hiện chưa có phim đang chiếu".

### 2.2 Danh sách phim - `/movies`

- **Bố cục**: thanh bộ lọc (trái trên desktop, nút "Bộ lọc" mở ngăn kéo trên mobile) + lưới phim + phân trang/"Xem thêm".
- **Bộ lọc**: tab trạng thái (Đang chiếu/Sắp chiếu), thể loại (chọn nhiều), rạp, ngày chiếu, độ tuổi, sắp xếp (Mới nhất, Điểm cao, Phổ biến).
- **Ô tìm kiếm**: gõ tên, chờ ~400 ms (debounce) rồi gọi API.
- **Thẻ phim**: poster tỷ lệ 2:3, badge độ tuổi góc trên, tên (tối đa 2 dòng), thể loại, thời lượng, điểm sao.
- **Trạng thái**: rỗng "Không tìm thấy phim phù hợp" + nút Xóa bộ lọc. Bộ lọc lưu trong URL query để chia sẻ/quay lại được.

### 2.3 Chi tiết phim - `/movies/:id`

- **Bố cục**:
  1. **Hero**: ảnh banner mờ làm nền, poster, tên, badge độ tuổi, thể loại, thời lượng, ngày khởi chiếu, điểm sao, nút **Xem trailer** (mở hộp thoại phát YouTube).
  2. **Thông tin**: mô tả, đạo diễn, diễn viên, ngôn ngữ, quốc gia.
  3. **Khối Chọn suất chiếu** (nổi bật, dính khi cuộn trên desktop):
     - Chọn **rạp** (ô chọn, nhớ lựa chọn gần nhất).
     - Dải **ngày** 7 ngày (thẻ ngang cuộn: thứ, ngày/tháng; ngày hôm nay làm nổi).
     - Nhóm suất theo **định dạng** (2D phụ đề, 3D lồng tiếng...): mỗi suất là nút giờ (`19:30`), dưới nhỏ là "còn 45 ghế"; hết ghế thì mờ + "Hết vé"; qua giờ bán thì mờ, không bấm được.
  4. **Đánh giá**: điểm trung bình + phân bố sao, danh sách bình luận (phân trang), nút **Viết đánh giá** (chỉ hiện khi đủ điều kiện).
  5. **Phim liên quan** (cùng thể loại).
- **Hành động**: bấm giờ chiếu → nếu chưa đăng nhập chuyển `/login?redirect=...`; nếu phim T13/T16/T18 hiện hộp thoại xác nhận độ tuổi (checkbox "Tôi xác nhận đủ X tuổi" + nút Tiếp tục); sau đó vào `/booking/:showtimeId/seats`.
- **Trạng thái**: rỗng suất "Chưa có suất chiếu ngày này, hãy chọn ngày khác"; phim sắp chiếu hiển thị "Khởi chiếu ngày dd/mm" và ẩn khối chọn suất (hoặc nút "Nhắc tôi" nếu làm).

### 2.4 Đăng nhập - `/login`

- **Bố cục**: thẻ giữa màn hình trên nền mờ, logo, tiêu đề.
- **Trường**: Email hoặc SĐT, Mật khẩu (nút hiện/ẩn).
- **Thành phần**: nút **Đăng nhập**, liên kết "Quên mật khẩu?", "Chưa có tài khoản? Đăng ký".
- **Validate**: bắt buộc cả hai; lỗi chung "Email hoặc mật khẩu không đúng".
- **Trạng thái**: nút có vòng quay khi gửi; khi tài khoản bị khóa/bị khóa tạm hiện thông báo kèm thời gian chờ.

### 2.5 Đăng ký - `/register`

- **Trường**: Họ tên, Email, SĐT, Mật khẩu (kèm thanh độ mạnh + danh sách tiêu chí), Nhập lại mật khẩu, Ngày sinh (tùy chọn, có chú thích "dùng để kiểm tra độ tuổi xem phim"), checkbox Đồng ý điều khoản.
- **Validate** ngay khi rời ô: email đúng định dạng, SĐT 10 số bắt đầu 0, mật khẩu ≥ 8 ký tự có chữ và số, nhập lại khớp, bắt buộc đồng ý điều khoản.
- **Kết quả**: thành công → thông báo và chuyển `/login` (hoặc màn "Kiểm tra email để xác minh").

### 2.6 Quên / đặt lại mật khẩu - `/forgot-password`, `/reset-password`

- Quên: một ô email + nút **Gửi liên kết**; sau gửi luôn hiện "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn".
- Đặt lại: Mật khẩu mới + Nhập lại; token trên URL; token sai/hết hạn hiện thông báo và nút "Yêu cầu liên kết mới".

### 2.7 Chọn ghế - `/booking/:showtimeId/seats`

Đây là màn hình quan trọng nhất của hệ thống, cần thiết kế kỹ.

- **Quyền**: CUSTOMER. **Layout**: gọn, không menu chính (chỉ logo + nút Thoát và các bước tiến trình).
- **Thanh tiến trình** phía trên: `1 Chọn ghế` › `2 Combo & Thanh toán` › `3 Hoàn tất` (bước hiện tại làm nổi).
- **Khối thông tin suất** (cố định trên cùng): tên phim + badge độ tuổi, rạp, phòng, định dạng, giờ chiếu, ngày.
- **Sơ đồ ghế**:
  - Thanh **MÀN HÌNH** (đường cong hoặc thanh ngang) ở trên cùng để định hướng.
  - Lưới ghế: nhãn hàng (A, B, C...) hai bên, số ghế bên trong; lối đi là khoảng trống theo tọa độ từ backend; ghế đôi vẽ rộng gấp 2.
  - Cho phép **phóng to/thu nhỏ và kéo** trên mobile (vì sơ đồ rộng).
  - **Chú giải** ở dưới: Trống / Đang chọn / Đã bán / Đang được giữ / VIP / Ghế đôi (kèm ký hiệu hình dạng, không chỉ màu).
  - Rê chuột/chạm giữ lên ghế: tooltip "Ghế A5 - VIP - 120.000đ".

  ```
                    ┌──────── MÀN HÌNH ────────┐
          A   [1] [2] [3]  ░░  [4] [5] [6] [7]  ░░ [8] [9] [10]
          B   [1] [2] [3]  ░░  [4] [5] [6] [7]  ░░ [8] [9] [10]
          ...
          H   [VIP][VIP]...
          J   [ ĐÔI ][ ĐÔI ][ ĐÔI ]
          Chú giải: ◻ Trống  ■ Đang chọn  ✕ Đã bán  ◔ Đang giữ  ★ VIP  ◫ Đôi
  ```
- **Thanh tổng kết** (dính dưới cùng trên mobile, cột phải trên desktop):
  - Danh sách ghế đã chọn (chip có nút xóa), số ghế `3/8`.
  - Tạm tính tiền vé.
  - Nút **Tiếp tục** (khóa khi chưa chọn ghế nào).
- **Hành động & hành vi**:
  - Bấm ghế để chọn/bỏ; vượt 8 ghế hiện thông báo "Tối đa 8 ghế mỗi lần đặt".
  - Bấm **Tiếp tục** → gọi tạo đơn; nút quay khi chờ.
  - Thành công → `/booking/:orderId/checkout`, bắt đầu đếm ngược.
  - `SEAT_UNAVAILABLE` → hộp thoại "Rất tiếc, ghế A5, A6 vừa có người chọn", sơ đồ tự tải lại, giữ các ghế còn trống đã chọn.
  - Tự làm mới trạng thái ghế định kỳ 5-10 giây; ghế đang chọn mà bị lấy thì bỏ khỏi danh sách kèm toast.
  - Nếu có đơn đang dở của chính khách ở suất này: hiện banner "Bạn có đơn đang giữ ghế, còn mm:ss" kèm nút **Tiếp tục thanh toán** / **Hủy đơn để chọn lại**.
- **Trạng thái**: skeleton sơ đồ khi tải; lỗi tải hiện "Không tải được sơ đồ ghế" + Thử lại; suất đã đóng bán hiện thông báo và nút quay lại.

### 2.8 Combo, voucher và xác nhận - `/booking/:orderId/checkout`

- **Đồng hồ đếm ngược** dính trên cùng: "Thời gian giữ ghế còn **09:41**" (đổi màu cam dưới 2 phút, đỏ dưới 1 phút). Hết giờ: hộp thoại "Hết thời gian giữ ghế" và nút "Chọn lại ghế".
- **Bố cục hai cột** (desktop; mobile xếp dọc, tóm tắt thu gọn được):
  - **Cột trái**:
    1. **Bắp nước (Combo)**: thẻ combo (ảnh, tên, mô tả, giá) với bộ tăng/giảm số lượng `- 0 +` (0-10).
    2. **Mã giảm giá**: ô nhập + nút **Áp dụng**; áp thành công hiện thẻ xanh "Giảm 20.000đ" kèm nút gỡ; lỗi hiện thông báo cụ thể theo mã lỗi.
    3. **Phương thức thanh toán**: chọn một (VNPay, MoMo) dạng thẻ chọn có logo.
  - **Cột phải - Tóm tắt đơn** (dính khi cuộn):
    - Poster nhỏ, tên phim, badge độ tuổi, rạp, phòng, giờ chiếu.
    - Ghế đã chọn (chip), tiền vé từng loại ghế.
    - Combo đã chọn.
    - Tạm tính, giảm giá, **Tổng thanh toán** (chữ lớn).
    - Điểm thưởng dự kiến.
    - Nút **Thanh toán `xxx.000đ`**; liên kết phụ "Quay lại chọn ghế" (có xác nhận vì sẽ hủy giữ ghế) và "Hủy đơn".
- **Hành vi**: mỗi lần đổi combo/voucher gọi API cập nhật và hiển thị lại số từ backend (hiện loading nhẹ ở dòng tiền); bấm Thanh toán → chuyển hướng cổng thanh toán, hiện lớp phủ "Đang chuyển đến cổng thanh toán...".
- **Trạng thái lỗi**: `ORDER_EXPIRED` → hộp thoại và về chọn ghế.

### 2.9 Kết quả thanh toán - `/payment/result?orderId=...`

- **Trạng thái "Đang xác nhận"** (khi chưa có kết quả cuối): vòng quay + "Đang xác nhận thanh toán, vui lòng không đóng trang" (poll vài giây, tối đa ~30 giây; quá thời gian hiện "Chưa xác nhận được, kiểm tra lại ở Vé của tôi" + nút).
- **Thành công**: biểu tượng dấu tích, "Đặt vé thành công!", mã đơn; thẻ vé: phim, rạp, phòng, suất, ghế, **mã QR lớn** (mỗi vé một mã, vuốt chuyển giữa các vé), tổng tiền; nút **Xem vé của tôi**, **Về trang chủ**, **Tải/Chụp vé**; dòng "Email xác nhận đã được gửi tới ..." và nút "Gửi lại email".
- **Thất bại / bị hủy**: biểu tượng cảnh báo, lý do (từ mã cổng), nếu đơn còn hạn hiển thị đồng hồ và nút **Thanh toán lại**, nếu hết hạn hiển thị nút **Đặt lại**.
- **Đã thu tiền nhưng ghế không còn**: thông báo rõ "Chúng tôi đã nhận thanh toán nhưng ghế không còn khả dụng, tiền sẽ được hoàn lại" + mã đơn và liên hệ hỗ trợ.

### 2.10 Vé của tôi - `/me/tickets`

- **Bố cục**: tiêu đề + 3 tab **Sắp tới** / **Đã xem** / **Đã hủy**; danh sách thẻ đơn, phân trang.
- **Thẻ đơn**: poster nhỏ, tên phim, rạp, giờ chiếu, số ghế (danh sách), tổng tiền, nhãn trạng thái (Đã thanh toán, Đã hủy, Đã dùng, Chờ hoàn tiền), nút **Xem vé**.
- **Trạng thái rỗng** theo tab: "Bạn chưa có vé sắp tới" + nút "Đặt vé ngay".
- Đơn đang giữ ghế (chờ thanh toán) hiện ở đầu danh sách với đồng hồ và nút **Tiếp tục thanh toán**.

### 2.11 Chi tiết đơn/vé - `/me/tickets/:orderId`

- **Bố cục**: thông tin đơn (mã, trạng thái, thời gian đặt, phương thức thanh toán), thông tin suất (phim, rạp, phòng, giờ), **danh sách vé** mỗi vé một khối: ghế, loại ghế, **QR** (bấm phóng to toàn màn hình, tăng độ sáng gợi ý), trạng thái vé (Hợp lệ/Đã dùng/Đã hủy).
- **Chi tiết tiền**: tiền vé, combo, giảm giá, tổng, điểm đã cộng.
- **Hành động**: **Hủy vé** (hiển thị khi còn đủ hạn; mở hộp thoại nêu chính sách và số tiền hoàn, yêu cầu xác nhận); **Gửi lại email**; **Đánh giá phim** (khi đã xem).
- **Trạng thái đặc biệt**: sau khi hủy hiển thị tình trạng hoàn tiền (Đang xử lý / Đã hoàn).

### 2.12 Hồ sơ cá nhân - `/me/profile`

- **Tab**: **Thông tin** (họ tên, email chỉ đọc, SĐT, ngày sinh, ảnh đại diện upload) · **Đổi mật khẩu** (mật khẩu cũ, mới, nhập lại) · **Điểm thành viên** (số điểm hiện có, lịch sử cộng/trừ).
- Lưu thành công hiển thị toast; đổi mật khẩu thành công thông báo các thiết bị khác bị đăng xuất.

---

## 3. Phân hệ nhân viên rạp

Giao diện `StaffLayout`: thanh trên có tên rạp, tên nhân viên, giờ hiện tại, nút Đăng xuất; thanh điều hướng ngang với 4 mục lớn: **Tổng quan · Bán vé · Soát vé · Tra cứu đơn**. Nút và chữ lớn, dùng được bằng cảm ứng.

### 3.1 Bảng điều khiển quầy - `/staff`

- **Thành phần**:
  - Hai ô lối tắt lớn: **Bán vé** và **Soát vé**.
  - Thẻ số liệu ca hiện tại: số vé đã bán tại quầy, doanh thu quầy hôm nay.
  - **Suất chiếu sắp diễn ra** (trong 2-3 giờ tới): giờ, phim, phòng, ghế đã bán/tổng, đã soát/đã bán; bấm một suất để vào Soát vé đã lọc sẵn suất đó.
- **Trạng thái**: rỗng "Hiện không có suất chiếu sắp tới".

### 3.2 Bán vé tại quầy - `/staff/sell`

- **Bố cục 3 bước ngang (stepper)**: `Chọn suất` → `Chọn ghế` → `Thanh toán`.
- **Bước 1 - Chọn suất**: danh sách phim đang có suất hôm nay (lưới poster nhỏ); chọn phim hiện các suất hôm nay dạng nút giờ (kèm số ghế trống, định dạng, phòng).
- **Bước 2 - Chọn ghế**: dùng lại thành phần sơ đồ ghế của khách (cùng cơ chế giữ ghế) nhưng ghế lớn hơn, cố định không cần zoom; bên phải khối tổng kết và đồng hồ giữ ghế ngắn (3 phút).
- **Bước 3 - Thanh toán**:
  - Combo nhanh: lưới nút lớn bấm để thêm (hiện số lượng đã chọn).
  - Mã giảm giá (ô nhập, tùy chọn).
  - SĐT khách (tùy chọn) để cộng điểm.
  - Chọn **hình thức**: Tiền mặt / Chuyển khoản / Quẹt thẻ.
  - Nếu **Tiền mặt**: ô "Khách đưa" (kèm các nút mệnh giá nhanh 50k/100k/200k/500k), hiển thị **Tiền thối** tự tính.
  - Nút **Xác nhận đã thu tiền** (lớn, xanh).
- **Sau xác nhận**: màn hình thành công + nút **In vé** (mở bản in phiếu vé với QR cho từng ghế), **Bán đơn mới**.
- **Lỗi**: ghế bị người khác lấy trước (từ web) → thông báo và làm mới; hết hạn giữ → quay lại bước 2.

### 3.3 Soát vé - `/staff/checkin`

- **Bố cục**: chia hai vùng.
  - **Vùng quét** (trái/trên): khung xem camera có khung ngắm, nút bật/tắt đèn flash (nếu thiết bị hỗ trợ), nút chuyển camera; bên dưới ô **Nhập mã vé thủ công** + nút **Kiểm tra**.
  - **Vùng kết quả và thống kê** (phải/dưới):
    - **Bộ lọc suất**: chọn suất đang soát (khuyến nghị) hoặc "Tất cả suất".
    - **Khối kết quả lớn** sau mỗi lần quét: nền **xanh** + dấu tích + chi tiết (phim, phòng, ghế, giờ chiếu) khi hợp lệ; nền **đỏ** + dấu X + lý do khi không hợp lệ (đã dùng lúc mấy giờ, sai suất, ngoài giờ, vé hủy, mã không tồn tại); phát âm thanh khác nhau cho hợp lệ/không hợp lệ; tự thu gọn sau 3-4 giây để sẵn sàng quét tiếp.
    - **Bộ đếm**: "Đã soát 87/120" của suất đang chọn.
    - **Lịch sử soát gần đây**: 10 lượt gần nhất (giờ, ghế, kết quả).
- **Trạng thái**: chưa cấp quyền camera hiện hướng dẫn cấp quyền + gợi ý nhập mã tay; mất mạng hiện cảnh báo đỏ trên cùng.

### 3.4 Tra cứu đơn - `/staff/orders`

- **Bố cục**: ô tìm kiếm lớn (mã đơn / SĐT / email) + bảng kết quả (mã, khách, phim, suất, ghế, tổng, trạng thái, kênh bán).
- **Chi tiết** (ngăn bên): thông tin đơn, danh sách vé và trạng thái từng vé; hành động: **In lại vé**, **Gửi lại email**; (quản lý) **Hủy đơn quầy**.

---

## 4. Phân hệ quản lý rạp

Dùng `AdminLayout`. Sidebar nhóm menu: **Tổng quan** · **Nội dung** (Phim) · **Rạp** (Rạp, Phòng & ghế, Suất chiếu) · **Kinh doanh** (Bảng giá, Voucher, Combo, Đơn hàng) · **Báo cáo** · **Đánh giá**. Thanh trên có **bộ chọn rạp** (nếu phụ trách nhiều rạp) ảnh hưởng toàn bộ dữ liệu hiển thị.

**Mẫu màn hình danh sách dùng chung (CRUD list)**: tiêu đề + nút **Thêm mới**; hàng công cụ (ô tìm kiếm, bộ lọc, sắp xếp); bảng (cột, hành động Sửa/Ẩn/Xóa ở cuối hàng); phân trang; chọn nhiều dòng để thao tác hàng loạt (nếu cần); trạng thái rỗng/lỗi/tải như mục 0.

### 4.1 Dashboard - `/admin`

- **Hàng thẻ số liệu** (hôm nay so với hôm qua, có mũi tên tăng/giảm): doanh thu, số vé, số đơn, tỷ lệ lấp đầy.
- **Biểu đồ**: doanh thu 7/30 ngày (đường); top 5 phim (cột ngang).
- **Danh sách cần xử lý**: yêu cầu hoàn tiền chờ xử lý, đơn `PAID_UNFULFILLED`, suất sắp chiếu còn ít người đặt.
- **Suất chiếu hôm nay**: bảng nhanh (giờ, phim, phòng, đã bán/tổng).

### 4.2 Quản lý phim - `/admin/movies`

- **Danh sách**: cột poster nhỏ, tên, thể loại, thời lượng, độ tuổi (badge), ngày khởi chiếu, trạng thái, hoạt động (công tắc bật/tắt); bộ lọc trạng thái/thể loại; tìm theo tên.
- **Form thêm/sửa** (`/admin/movies/new`, `/admin/movies/:id`), chia nhóm:
  - **Thông tin cơ bản**: tên, tên gốc, mô tả (nhiều dòng), thời lượng, độ tuổi (ô chọn), thể loại (chọn nhiều có thẻ), ngôn ngữ, quốc gia.
  - **Hình ảnh & video**: upload poster, upload banner (có xem trước, kiểm tra định dạng/dung lượng), URL trailer (xem trước nhúng).
  - **Nhân sự**: đạo diễn, diễn viên (nhập thẻ).
  - **Phát hành**: ngày khởi chiếu, ngày kết thúc dự kiến, trạng thái.
  - Nút **Lưu**, **Hủy**; cảnh báo khi rời trang có thay đổi chưa lưu.
- **Xóa**: nếu đã có suất thì chỉ cho **Ẩn** và giải thích lý do.

### 4.3 Quản lý rạp và phòng chiếu - `/admin/cinemas`

- **Danh sách rạp** (thẻ hoặc bảng): tên, địa chỉ, số phòng, trạng thái; bấm vào mở chi tiết.
- **Chi tiết rạp**: tab **Thông tin** (tên, địa chỉ, tỉnh/thành, SĐT, giờ mở/đóng cửa) · **Phòng chiếu** (bảng: tên phòng, định dạng, sức chứa, trạng thái; nút Thêm phòng, Sửa, nút **Sơ đồ ghế**) · **Nhân sự** (danh sách nhân viên/quản lý được gán; Admin gán thêm).

### 4.4 Trình chỉnh sơ đồ ghế - `/admin/rooms/:id/seat-map`

- **Bố cục**: thanh công cụ trái, vùng lưới giữa, bảng thông tin phải.
- **Thanh công cụ**:
  - Khai báo **số hàng / số cột** và nút **Tạo lưới**.
  - **Công cụ vẽ** (chọn một rồi bấm hoặc kéo trên lưới): Ghế thường, Ghế VIP, Ghế đôi, Lối đi (trống), Khóa ghế (hỏng), Tẩy.
  - **Đánh số tự động**: nhãn hàng A, B, C...; số ghế đánh lại theo thứ tự bỏ qua lối đi.
- **Vùng lưới**: có thanh **MÀN HÌNH** ở trên; hỗ trợ chọn hàng loạt (kéo vùng, bấm tiêu đề hàng để áp loại cho cả hàng).
- **Bảng phải**: thống kê (tổng ghế, số ghế theo loại), cảnh báo khi phòng đang có suất tương lai (chỉ cho đổi loại/khóa, không đổi cấu trúc).
- Nút **Lưu sơ đồ**, **Hoàn tác/Làm lại**, **Xem trước giống giao diện khách**.

### 4.5 Quản lý suất chiếu - `/admin/showtimes`

- **Bộ lọc trên**: rạp, ngày (hoặc khoảng ngày), phòng, phim; chuyển chế độ **Lịch** / **Danh sách**.
- **Chế độ Lịch**: lưới theo phòng (cột) × giờ (hàng) của một ngày; mỗi suất là khối màu theo phim, hiển thị tên phim, giờ bắt đầu-kết thúc, số vé đã bán; khoảng dọn phòng hiển thị bằng đường gạch; bấm ô trống để tạo suất tại giờ đó; kéo thả đổi giờ (chỉ suất chưa có vé).
- **Chế độ Danh sách**: bảng suất (giờ, phim, phòng, định dạng, ngôn ngữ, vé đã bán/tổng, trạng thái) + hành động Sửa/Hủy.
- **Form tạo/sửa suất** (hộp thoại): Phim, Phòng, Ngày, Giờ bắt đầu, Định dạng, Ngôn ngữ; **hiển thị tự tính giờ kết thúc** và cảnh báo trùng lịch ngay khi chọn; nút **Lưu**. Có chế độ **Tạo hàng loạt**: chọn phim + phòng + các khung giờ trong ngày + khoảng ngày áp dụng + xem trước danh sách suất sẽ tạo (loại trừ các suất trùng, đánh dấu đỏ).
- **Hủy suất có vé**: hộp thoại bắt buộc nhập lý do, nêu "X đơn sẽ bị hủy và hoàn tiền", yêu cầu gõ xác nhận.

### 4.6 Bảng giá - `/admin/pricing`

- **Chọn rạp** và **ngày hiệu lực** áp dụng.
- **Ma trận giá cơ bản**: hàng = định dạng phòng (2D/3D/IMAX), cột = loại ngày × khung giờ (Thường-Sáng, Thường-Chiều, Thường-Tối, Cuối tuần-..., Lễ-...), ô nhập số tiền trực tiếp, đánh dấu ô đã sửa chưa lưu.
- **Phụ thu loại ghế**: ba ô nhập (Thường, VIP, Đôi).
- **Ngày lễ**: danh sách ngày (thêm/xóa), mỗi ngày có tên.
- Nút **Lưu thay đổi** (hộp thoại xác nhận tóm tắt giá cũ → mới) và **Lịch sử thay đổi** (từ nhật ký).

### 4.7 Voucher - `/admin/vouchers`

- **Danh sách**: mã, tên, loại/giá trị, thời hạn, lượt dùng/tổng, trạng thái (Hoạt động/Tạm dừng/Hết hạn); bộ lọc trạng thái.
- **Form**: Mã (chữ hoa, kiểm tra trùng), Tên, Loại (Phần trăm/Số tiền), Giá trị, Giảm tối đa (với phần trăm), Đơn tối thiểu, Phạm vi (Vé/Combo/Toàn đơn), Thời gian hiệu lực, Tổng lượt, Lượt/người, Trạng thái.
- **Chi tiết**: bảng lượt đã dùng (khách, đơn, thời điểm). Voucher đã có lượt dùng: khóa các trường giá trị, chỉ cho gia hạn/tạm dừng.

### 4.8 Combo - `/admin/combos`

- **Danh sách dạng lưới thẻ**: ảnh, tên, giá, công tắc đang bán.
- **Form**: tên, mô tả, ảnh (upload), giá, rạp áp dụng (chọn nhiều), trạng thái.

### 4.9 Đơn hàng và hoàn tiền - `/admin/orders`

- **Bộ lọc**: khoảng ngày, trạng thái đơn, kênh (Online/Quầy), trạng thái hoàn tiền, tìm theo mã đơn/SĐT/email.
- **Bảng**: mã, khách, phim, suất, số vé, tổng, trạng thái, hoàn tiền.
- **Chi tiết đơn** (ngăn bên hoặc trang): toàn bộ thông tin, lịch sử thanh toán (kèm log callback), danh sách vé.
- **Tab "Chờ hoàn tiền"**: các đơn `refund_status = PENDING` (từ hủy vé, hủy suất, đơn `PAID_UNFULFILLED`); nút **Đánh dấu đã hoàn** (nhập hình thức hoàn, mã tham chiếu, ghi chú) → chuyển `REFUNDED`.

### 4.10 Báo cáo - `/admin/reports`

- **Thanh bộ lọc dính trên**: khoảng ngày (nhanh: Hôm nay, 7 ngày, 30 ngày, Tháng này, Tùy chọn), rạp, phim; nút **Xuất CSV/Excel**.
- **Tab**: Tổng quan (thẻ số + biểu đồ doanh thu theo ngày) · Theo phim (bảng + cột ngang) · Theo rạp (Admin) · Lấp đầy (heatmap giờ × thứ, hoặc bảng suất) · Kênh bán (biểu đồ tròn Online/Quầy) · Hủy/Hoàn.
- Mọi biểu đồ có tooltip, chú giải, trạng thái rỗng "Không có dữ liệu trong khoảng đã chọn".

### 4.11 Duyệt đánh giá - `/admin/reviews`

- Bảng đánh giá mới (phim, người dùng, sao, nội dung, thời gian) + bộ lọc "Đã ẩn"; nút **Ẩn/Hiện** từng đánh giá.

---

## 5. Phân hệ quản trị hệ thống

Admin dùng chung `AdminLayout` với quản lý, có thêm các mục dưới đây và xem được dữ liệu mọi rạp (bộ chọn rạp có "Tất cả").

### 5.1 Quản lý người dùng - `/admin/users`

- **Danh sách**: tên, email, SĐT, vai trò (badge), rạp (nhân sự), trạng thái (Hoạt động/Khóa), ngày tạo. Bộ lọc vai trò, trạng thái; tìm kiếm.
- **Thêm nhân sự** (hộp thoại): họ tên, email, SĐT, vai trò (Nhân viên/Quản lý), rạp được gán; gửi email thiết lập mật khẩu.
- **Chi tiết người dùng** (ngăn bên): thông tin, đổi vai trò, gán rạp, nút **Khóa/Mở khóa** (hộp thoại xác nhận, lý do), tab lịch sử đơn và điểm (với khách).
- **Chặn**: không cho tự khóa/tự hạ quyền mình, cảnh báo khi đổi vai trò admin cuối cùng.

### 5.2 Cấu hình hệ thống - `/admin/settings`

- Biểu mẫu nhóm theo chủ đề: **Đặt vé** (thời gian giữ ghế, số ghế tối đa, ngừng bán trước giờ chiếu), **Hủy vé** (thời hạn), **Soát vé** (mở/đóng), **Suất chiếu** (dọn phòng, quảng cáo), **Thành viên** (VND/điểm).
- Mỗi ô có đơn vị, giá trị mặc định (nút "Khôi phục mặc định") và chú thích tác động; nút **Lưu** hiển thị tóm tắt thay đổi để xác nhận.

### 5.3 Nhật ký hệ thống - `/admin/audit-logs`

- **Bộ lọc**: khoảng thời gian, người thao tác, loại hành động, đối tượng.
- **Bảng** (chỉ đọc): thời gian, người thao tác, hành động, đối tượng, IP; bấm dòng mở ngăn xem **giá trị cũ → mới** dạng so sánh.

---

## 6. Thành phần dùng chung

| Thành phần | Mô tả ngắn | Dùng ở |
|---|---|---|
| `MovieCard` | Poster, tên, badge độ tuổi, điểm sao, nút đặt vé | Trang chủ, danh sách, liên quan |
| `AgeBadge` | Badge P/K/T13/T16/T18 | Mọi nơi hiển thị phim |
| `ShowtimePicker` | Chọn rạp, ngày, suất | Chi tiết phim, đặt vé nhanh, quầy |
| `SeatMap` | Sơ đồ ghế (chế độ khách/quầy/xem trước/editor) | Chọn ghế, bán quầy, editor |
| `SeatLegend` | Chú giải trạng thái ghế | Chọn ghế, bán quầy |
| `CountdownTimer` | Đếm ngược theo `expiresAt` từ server | Chọn ghế, checkout, quầy |
| `OrderSummary` | Tóm tắt đơn (phim, ghế, combo, tiền) | Checkout, kết quả, chi tiết vé |
| `TicketCard` / `QRCodeView` | Hiển thị vé và mã QR | Kết quả, chi tiết vé, in vé |
| `QRScanner` | Quét QR bằng camera | Soát vé |
| `PriceText` | Định dạng tiền VND | Mọi nơi |
| `StatusBadge` | Nhãn trạng thái (đơn, vé, thanh toán, suất) | Bảng, chi tiết |
| `DataTable` | Bảng có sắp xếp, phân trang, hàng chờ tải | Màn hình quản trị |
| `FilterBar` | Thanh bộ lọc đồng bộ URL query | Danh sách |
| `ConfirmDialog` | Hộp thoại xác nhận thao tác nguy hiểm | Xóa, hủy, khóa |
| `FormField` | Ô nhập kèm nhãn, lỗi, trợ giúp | Mọi form |
| `ImageUploader` | Upload ảnh có xem trước và kiểm tra | Phim, combo, avatar |
| `EmptyState`, `ErrorState`, `Skeleton` | Ba trạng thái chuẩn | Mọi màn hình |
| `Toast` | Thông báo ngắn | Toàn ứng dụng |
| `StatCard`, `Chart` | Thẻ số liệu, biểu đồ | Dashboard, báo cáo |

---

## 7. Gợi ý cấu trúc Redux và thư mục

### 7.1 Redux Toolkit

| Slice / API | State chính | Ghi chú |
|---|---|---|
| `authSlice` | user, role, accessToken, trạng thái đăng nhập | Lưu refresh token an toàn (cookie httpOnly nếu được); khôi phục phiên khi tải trang |
| `bookingSlice` | showtimeId, ghế đang chọn (tạm), orderId, expiresAt, combo, voucher, tổng tiền (từ server) | Xóa khi hoàn tất/hủy/hết hạn; đồng bộ lại từ `GET /orders/pending` khi mở lại |
| `uiSlice` | toast, hộp thoại, trạng thái ngăn bên | |
| `counterSlice` | phiên bán quầy hiện tại | Chỉ khu vực nhân viên |
| **RTK Query** (`api`) | Cache dữ liệu từ server: phim, suất, ghế, đơn, báo cáo... | Dùng cho dữ liệu đọc; `tags` để tự làm mới sau thay đổi; polling cho sơ đồ ghế |

Nguyên tắc: dữ liệu từ server (phim, suất, ghế) để RTK Query quản lý; chỉ dữ liệu phiên làm việc của người dùng (lựa chọn đang dở) để slice thường.

### 7.2 Cấu trúc thư mục đề xuất

```
src/
  app/            # store, router, guards (RequireAuth, RequireRole)
  api/            # RTK Query: endpoints theo miền (movies, showtimes, orders, ...)
  features/
    auth/         # login, register, reset
    movies/       # list, detail, ShowtimePicker
    booking/      # seat selection, checkout, payment result
    tickets/      # my tickets, ticket detail
    staff/        # sell, checkin, order lookup
    admin/        # movies, cinemas, rooms, showtimes, pricing, vouchers, combos,
                  # orders, reports, reviews, users, settings, audit
  components/     # thành phần dùng chung (mục 6)
  layouts/        # PublicLayout, StaffLayout, AdminLayout
  hooks/          # useCountdown, useDebounce, usePolling...
  utils/          # format tiền/thời gian, validators
  types/          # kiểu TypeScript dùng chung (khớp response của API)
```

---

## 8. Checklist thiết kế

**Đối với mọi màn hình**
- [ ] Có đủ 4 trạng thái: tải, rỗng, lỗi, thành công
- [ ] Hiển thị và validate đúng theo quy tắc ở `02-luong-chuc-nang.md`
- [ ] Responsive 3 mốc, khu vực khách hàng mobile-first
- [ ] Thao tác nguy hiểm đều có xác nhận

**Riêng khu vực khách hàng**
- [ ] Chọn ghế: có chú giải không phụ thuộc riêng màu, zoom trên mobile, tự làm mới trạng thái
- [ ] Checkout: đồng hồ đếm ngược theo giờ server, số tiền luôn lấy từ backend
- [ ] Kết quả thanh toán: có trạng thái "đang xác nhận", thất bại, ghế không còn
- [ ] Vé: QR lớn, rõ, phóng to toàn màn hình được

**Riêng nhân viên**
- [ ] Nút lớn cho cảm ứng, phản hồi soát vé bằng màu + âm thanh
- [ ] In vé có QR; nhập mã tay khi không quét được

**Riêng quản lý/Admin**
- [ ] Bảng có tìm kiếm, lọc, phân trang; form có cảnh báo thay đổi chưa lưu
- [ ] Sơ đồ ghế editor trực quan; lịch suất chiếu thấy được xung đột
- [ ] Menu và dữ liệu theo vai trò và rạp phụ trách
