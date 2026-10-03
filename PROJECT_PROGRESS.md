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
| **Phase 3: Sprint 2 - Quản lý Suất chiếu & Sơ đồ ghế** | Suất chiếu & Ghế (F11, F02), Bảng giá (F12), Giao diện chọn ghế | [/] Đang thực hiện |
| **Phase 4: Sprint 3 - Đặt vé & Thanh toán VNPay** | Giữ ghế transaction (F03), Tích hợp VNPay sandbox (F04), Xuất vé QR (F05) | [ ] Chưa bắt đầu |
| **Phase 5: Sprint 4 - Nghiệm thu Core MVP (Must)** | Soát vé (F08), Lịch sử đặt vé (F06), Worker hết hạn đơn (F19), Smoke test MVP | [ ] Chưa bắt đầu |
| **Phase 6: Sprint 5 - Tính năng mở rộng (Should)** | Combo/Voucher (F13), Bán tại quầy (F07), Báo cáo doanh thu (F14), Hủy/Hoàn vé | [ ] Chưa bắt đầu |
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


