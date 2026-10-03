# Theo dõi tiến độ dự án - Đồ án 4: Hệ thống đặt vé xem phim online

> **Cập nhật lần cuối:** 2026-10-03  
> **Repository GitHub:** [luongviettienns/DoAn4](https://github.com/luongviettienns/DoAn4) (Private)

---

## 1. Tổng quan các giai đoạn (Phases)

| Giai đoạn | Mô tả | Trạng thái |
|---|---|---|
| **Phase 0: Khảo sát & Thiết kế hệ thống** | Phân tích yêu cầu, luồng F01–F19, CSDL, kiến trúc, OpenAPI 3.0.3, kế hoạch | [x] Hoàn thành |
| **Phase 1: Khởi tạo môi trường & Kho mã nguồn** | Git init, cấu hình .gitignore, liên kết remote GitHub, tài liệu tiến độ | [x] Hoàn thành |
| **Phase 2: Sprint 1 - Nền tảng Core & Dữ liệu** | Scaffold Frontend (Vite+React) & Backend (Node+Express+Prisma), Auth/RBAC (F01), Danh mục Phim/Rạp (F09, F10) | [/] Đang thực hiện |
| **Phase 3: Sprint 2 - Quản lý Suất chiếu & Sơ đồ ghế** | Suất chiếu & Ghế (F11, F02), Bảng giá (F12), Giao diện chọn ghế | [ ] Chưa bắt đầu |
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

### [2026-10-03] Phase 2: Khởi tạo khung Monorepo (Scaffold)
- [x] Cấu hình Monorepo với npm workspaces (`frontend`, `backend`) tại `package.json` gốc.
- [x] Khởi tạo Frontend React + Vite + TypeScript (`frontend/`), đã xác minh build thành công.
- [x] Khởi tạo Backend Express + TypeScript + Zod (`backend/`) kèm entrypoint `app.ts` và `server.ts`.
- [x] Đồng bộ Prisma schema tham chiếu (`backend/prisma/schema.prisma`), xác thực `prisma validate` hợp lệ và sinh Prisma Client v6.19.0.
- [x] Cấu hình mẫu môi trường `.env.example` cho cả Frontend và Backend theo đúng tài liệu quy ước.

