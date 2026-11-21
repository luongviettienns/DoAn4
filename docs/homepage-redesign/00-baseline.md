# 00 — Báo Cáo Trạng Thái Nền Tảng (Phase 0 Baseline)

> **Dự án:** CineX — Hệ thống Đặt vé & Quản lý Rạp chiếu phim  
> **Nhánh làm việc:** `feat/cinematic-homepage` (tách từ `main`)  
> **Thời điểm ghi nhận:** `2026-11-09`

---

## 1. Môi Trường Thực Thi (Runtime & Tooling)

| Thành phần | Phiên bản thực tế | Bằng chứng lệnh |
|---|---|---|
| **Hệ điều hành** | Windows (win32) | PowerShell session |
| **Node.js** | `v24.19.0` | `node -v` → `v24.19.0` |
| **Package Manager** | `npm 11.17.0` (Workspaces: `backend`, `frontend`) | `npm -v` → `11.17.0` |
| **Frontend Bundler** | `vite 8.0.5` + `@tailwindcss/vite 4.2.2` | `frontend/package.json` |
| **Frontend Framework** | `react ^19.2.8` + `react-dom ^19.2.8` + `motion ^12.38.0` | `frontend/package.json` |
| **Frontend Linter** | `oxlint ^1.58.0` | `frontend/package.json` |
| **Test Runner** | `vitest ^4.1.2` (`jsdom` trên frontend, `node` trên backend) | `frontend/package.json`, `backend/package.json` |
| **Browser Automation** | `playwright ^1.59.1` (`chromium`) | `package.json` (root) |

---

## 2. Kết Quả Kiểm Tra Baseline Trước Khi Thay Đổi (`[EVIDENCE]`)

### 2.1. Linter (`npm run lint --workspace=frontend`)
```text
> cinex-frontend@1.0.0 lint
> oxlint src tests

Found 0 warnings and 0 errors.
Finished in 131ms on 42 files with 99 rules using 12 threads.
```

### 2.2. Typecheck & Build (`npm run build:frontend` & `npm run build:backend`)
- **Backend (`tsc`):** Exit code `0` (0 lỗi TypeScript).
- **Frontend (`tsc && vite build`):** Exit code `0`.

| Tệp đầu ra (`frontend/dist`) | Kích thước thô (Raw) | Kích thước nén (`gzip`) | Ghi chú |
|---|---:|---:|---|
| `dist/index.html` | `1.16 kB` | `0.68 kB` | Shell HTML + Google Fonts (`Barlow Condensed`, `Plus Jakarta Sans`) |
| `dist/assets/index-Cj9ONofg.css` | `57.70 kB` | `10.31 kB` | Tailwind CSS v4 bundle |
| `dist/assets/index-DASqv7UU.js` | `474.03 kB` | `124.80 kB` | Monolithic bundle (bao gồm cả Admin/Staff dashboards chưa tách `React.lazy`) |

> **Nhận xét hiệu năng Baseline:** Toàn bộ ứng dụng (`CustomerView`, `AdminLayout`, `OverviewDashboard`, `ShowtimesSeatsDashboard`, `CounterCheckinDashboard`, `ShiftReportDashboard`, `SeatMapModal`, `CheckoutModal`, `TicketModal`) đang được import tĩnh trong `frontend/src/App.tsx:3-18`, dẫn đến 1 chunk JS duy nhất `474.03 kB` (`124.80 kB` gzip).

### 2.3. Bộ Kiểm Thử Tự Động (`npm run test`)
- **Frontend (`vitest run`):** `17 passed (17)` test files — **`169 passed (169)`** tests (`9.03s`).
- **Backend (`vitest run`):** `28 passed (28)` test files — **`519 passed (519)`** tests (`6.32s`).
- **Tổng cộng toàn kho mã:** **`45 passed` test files / `688 passed` test cases (`0 failed`, `0 skipped`)**.

---

## 3. Ảnh Chụp Màn Hình Trước Khi Thiết Kế Lại (`screenshots/before/`)

Toàn bộ 6 khung nhìn chuẩn (`§11 Viewport Matrix`) đã được chụp tự động bằng Playwright Chromium đối chiếu với dữ liệu chuẩn từ `seed.ts` (trạng thái Populated):

| Viewport | Độ phân giải | Ảnh Above-the-fold | Ảnh Full-page |
|---|---|---|---|
| **Mobile Portrait** | `375 × 812` | `screenshots/before/375x812-mobile-portrait-above-fold.png` | `screenshots/before/375x812-mobile-portrait-full.png` |
| **Tablet Portrait** | `768 × 1024` | `screenshots/before/768x1024-tablet-portrait-above-fold.png` | `screenshots/before/768x1024-tablet-portrait-full.png` |
| **Tablet Landscape** | `1024 × 768` | `screenshots/before/1024x768-tablet-landscape-above-fold.png` | `screenshots/before/1024x768-tablet-landscape-full.png` |
| **Desktop Standard** | `1440 × 900` | `screenshots/before/1440x900-desktop-standard-above-fold.png` | `screenshots/before/1440x900-desktop-standard-full.png` |
| **Desktop Wide** | `1920 × 1080` | `screenshots/before/1920x1080-desktop-wide-above-fold.png` | `screenshots/before/1920x1080-desktop-wide-full.png` |
| **Mobile Landscape** | `812 × 375` | `screenshots/before/812x375-mobile-landscape-above-fold.png` | `screenshots/before/812x375-mobile-landscape-full.png` |

---

## 4. Trạng Thái Cổng Kiểm Soát (`[GATE 0]`)

- [x] Nhánh `feat/cinematic-homepage` đã được tạo an toàn không làm mất thay đổi hiện có.
- [x] Build, Lint và 688 bài test đều chạy xanh 100%.
- [x] Ứng dụng khởi chạy trên trình duyệt thật và chụp đủ bộ ảnh `before/` trên 6 khung nhìn.
- **Kết luận Gate 0:** **ĐẠT (PASSED)**.
