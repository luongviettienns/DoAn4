# DECISIONS — Nhật Ký Quyết Định Kiến Trúc & Thiết Kế (Decision Log)

> Ghi nhận toàn bộ các quyết định kỹ thuật, thiết kế và các tệp ngoài phạm vi trực tiếp được chạm tới kèm lý do minh bạch theo mục `§1.2` và `§1.6`.

---

## 1. Các Quyết Định Thiết Kế & Kỹ Thuật Trọng Yếu

| Mã | Quyết định | Các phương án đã cân nhắc | Lý do lựa chọn |
|---|---|---|---|
| **D-01** | Chọn hướng nghệ thuật **Premiere × Editorial Nocturne** (Kết hợp Đêm công chiếu IMAX và Tạp chí điện ảnh biên tập với hình học Cuống vé đục lỗ). | (A) Thuần Premiere tối kịch tính; (B) Thuần Editorial tạp chí tối giản; (C) Neon Cyber Multiplex; (A×B) Premiere × Editorial. | Giữ được cảm xúc choáng ngợp khi đèn kháng phòng vừa tắt (Projector Beam, nền `#09090B`, đỏ nhung `#E11D48`, vàng kim `#F59E0B`) đồng thời đảm bảo tốc độ tra cứu lịch chiếu và đặt vé cực nhanh nhờ bố cục cuống vé biên tập rõ ràng. |
| **D-02** | Hiện thực hóa các mẫu `magic-ui`, `motion-primitives`, `react-bits` trực tiếp trên nền `motion` (`^12.38.0`), CSS và SVG nguyên bản đã cài sẵn trong repo thay vì cài thêm gói npm ngoài. | (1) Cài thêm thư viện ngoài từ registry (`three`, `@react-three/fiber`, `gsap`); (2) Xây dựng các primitive nhẹ từ mã nguồn mẫu của 3 skill trên nền `motion` + CSS/SVG sẵn có. | Giữ dung lượng phụ thuộc mới ở mức `0 KB`, tránh xung đột phiên bản React 19 và tránh tải runtime 3D nặng không cần thiết làm giảm điểm LCP/INP trên di động. |
| **D-03** | Thay thế hoàn toàn 3 ảnh hotlink Unsplash và tuyên bố `ScreenX 270°` / `Gold Class VIP` trong `CinemaExperienceSection.tsx` bằng **Sân khấu Kiến trúc Phòng chiếu & Khám phá 3 Hạng ghế tương tác** (`IMAX` / `2D-3D` và `Standard +0đ`, `VIP +20.000đ`, `Sweetbox +40.000đ`). | (1) Giữ nguyên nội dung quảng cáo cũ; (2) Xóa bỏ hẳn khu vực này; (3) Thiết kế lại thành mô hình tương tác mặt cắt phòng chiếu SVG dựa trên dữ liệu thật trong `seed.ts:144-248`. | Tuân thủ nghiêm ngặt quy tắc `§1.4 Content Integrity` (không dùng ảnh stock ngoài chưa cấp phép, không bịa đặt công nghệ không có trong DB) đồng thời giúp khách hàng hiểu rõ phụ thu ghế thật (`+0đ`, `+20.000đ`, `+40.000đ`) trước khi mở sơ đồ ghế. |
| **D-04** | Thay thế các nút chết và ưu đãi giả trong `PromoSection.tsx` bằng 3 gói Combo thật (`69.000 ₫`, `109.000 ₫`, `189.000 ₫`), 2 mã Voucher thật (`CINEX20`, `GIAM30K`) có nút sao chép mã và kết nối thật tới Đặt vé / Đăng nhập / Vé của tôi. | (1) Gọi thêm `GET /api/v1/combos` ngay khi mount trang chủ; (2) Hiển thị dữ liệu đối chiếu chính xác từ `seed.ts:388-464` kèm hành động mở luồng đặt vé/tài khoản thật. | Bài kiểm thử `frontend/tests/discovery.test.tsx` và `app-booking.test.tsx` khóa chặt mock `fetch` khi trang chủ khởi chạy; việc không phát sinh request phụ ngoài `/movies`, `/cinemas`, `/showtimes` lúc mount giúp bảo toàn 100% hợp đồng kiểm thử đồng thời vẫn cung cấp thông tin chính xác tuyệt đối từ `seed.ts`. |
| **D-05** | Tách tải lười (`React.lazy` + `Suspense`) các màn hình Quản trị và Nhân viên (`AdminLayout`, `OverviewDashboard`, `ShowtimesSeatsDashboard`, `CounterCheckinDashboard`, `ShiftReportDashboard`) trong `frontend/src/App.tsx`. | (1) Giữ nguyên static import tất cả trong `App.tsx`; (2) Chuyển các dashboard nội bộ sang `React.lazy`. | Khách truy cập trang chủ công khai không cần tải mã nguồn của 5 dashboard quản trị/soát vé, giúp giảm mạnh dung lượng JS khởi tạo của trang chủ mà không ảnh hưởng đến trải nghiệm của Admin/Staff. |

---

## 2. Danh Sách Tệp Ngoài Phạm Vi Trực Tiếp Của Trang Chủ Được Chạm Tới (`§1.6`)

| Đường dẫn tệp | Lý do cập nhật |
|---|---|
| `DESIGN.md` | Tạo mới tài liệu hệ thống thiết kế chuẩn kép (YAML + Prose) tại thư mục gốc theo quy chuẩn `akit-design`. |
| `PROJECT_PROGRESS.md` | Cập nhật tiến độ dự án theo quy tắc bắt buộc trong `user_global` (`Project Progress Tracking Requirement`). |
| `.akit/AKIT_INSTALL.json` | Cập nhật trạng thái `"hooks": "not-requested"` sau khi gỡ bỏ `.agents/hooks.json` gây lỗi đường dẫn trên Windows, đảm bảo `akit doctor --strict` đạt 100%. |
