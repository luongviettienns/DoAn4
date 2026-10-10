# Theo dõi tiến độ dự án - Đồ án 4: Hệ thống đặt vé xem phim online

> **Cập nhật lần cuối:** 2026-10-10  
> **Repository GitHub:** [luongviettienns/DoAn4](https://github.com/luongviettienns/DoAn4) (Public)
> **Trạng thái kiểm thử:** 688/688 tests đạt (Backend 519, Frontend 169), 45 test files, Build 2 workspace đạt, Lint 0 lỗi / 0 cảnh báo, Dependency Audit 0 vulnerabilities

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
| **Phase 6: Sprint 5 - Tính năng mở rộng (Should)** | Combo/Voucher (F13), Bán tại quầy (F07), Báo cáo doanh thu (F14), Hủy/Hoàn vé (F16) | [x] Hoàn thành |
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

### [2026-10-03] Thiết lập Hệ thống Agent Customizations & Engineering Skills
- [x] Khởi tạo và đồng bộ kho kỹ năng AI Agent tại thư mục chuẩn `.agents/skills/` (36 skills):
  - **Superpowers Methodology (`obra/superpowers` - 15 skills):** `using-superpowers`, `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `receiving-code-review`, `requesting-code-review`, `finishing-a-development-branch`, `using-git-worktrees`, `writing-skills`, `diagnosing-superpowers`.
  - **Langflow AI Code Quality (`langflow-ai/langflow` - 10 skills):** `frontend-code-review`, `backend-code-review`, `component-refactoring`, `frontend-query-mutation`, `frontend-i18n`, `e2e-testing`, bộ 4 kỹ năng kiểm thử trợ năng Accessibility theo chuẩn IBM Equal Access.
  - **Browser Automation & Playwright (`microsoft/playwright-cli` - 1 skill):** `playwright-cli` chính chủ Microsoft hỗ trợ AI snapshot, click/fill, quay video, debug trace.
  - **Frontend Tinh hoa (`vercel-labs/agent-skills` & `lombiq` - 4 skills):** `vercel-composition-patterns` (React 19), `vercel-react-best-practices`, `tailwind-4-docs` (Tailwind CSS v4 `@theme`), `frontend-design` (Anthropic).
  - **Backend & CSDL (`prisma/skills` & `affaan-m/ecc` - 2 skills):** `prisma-client-api` (Prisma chính chủ), `prisma-patterns` (kiến trúc data layer nâng cao).
  - **Agent Guard & Multi-Agent Swarms (`wshobson/agents` - 4 skills):** `ai-debt-detector`, `session-guard`, `parallel-feature-development`, `task-coordination-strategies`.
- [x] Dọn dẹp thư mục dư thừa: Loại bỏ các thư mục `agent/` và `.claude/` phát sinh do cờ đa agent, chuẩn hóa duy nhất thư mục workspace `.agents/` phục vụ Antigravity IDE.

### [2026-10-04] Rà soát phát hành và mở rộng kiểm thử core
- Các tỷ lệ 100% ở những sprint trước là tỷ lệ test đã qua, không phải tỷ lệ chức năng hoàn thành hoặc mức phủ code. Trạng thái hiện tại: **chưa đủ điều kiện phát hành chính thức**.
- Đã đối chiếu backend/frontend với FR/BR/NFR và F01–F19; xem `docs/PRODUCTION_READINESS.md` để biết lỗi đã sửa, chức năng còn thiếu và phần chưa kiểm chứng.
- Đã thiết lập MySQL `_test` riêng, reset có guard, áp dụng CHECK SQL, fixture/cleanup riêng; thêm coverage, test frontend và CI build/lint/test.
- Đã bổ sung kiểm thử các nhánh voucher/combo, suất chiếu/giá và báo cáo theo rạp; các lỗi nghiệp vụ được chạy RED trước khi sửa và kiểm chứng GREEN toàn bộ.
- Kiểm chứng cuối: **436/436 test đạt** (370 backend/66 frontend); backend **94.12% lines, 81.31% branches**, frontend **76.13% lines, 71.17% branches**. Build đạt; lint **0 lỗi/13 cảnh báo**; dependency audit còn **4 high**.
- CI/Vitest chặn tụt coverage dưới backend **90% lines/80% branches**, frontend **75%/70%**; lượt chạy có gate đã exit 0. Workflow GitHub chưa chạy; chưa commit/push/deploy. E2E trình duyệt/VNPay thật, QR thiết bị và vận hành/backup/rollback chưa được chứng minh.

### [2026-10-04] Chặng 1: Luồng khách hàng và thanh toán
- [x] Discovery lấy phim/rạp/ngày/suất từ API; search/pagination, giờ Việt Nam, reset downstream, abort stale, loading/error/retry/empty; bỏ chọn suất đầu tiên và vị trí mẫu mặc định.
- [x] SeatMap polling 5 giây, đăng nhập/xác nhận tuổi rồi giữ ghế ngay. PATCH cập nhật cùng đơn nguyên tử, cố định expiresAt, owner-only, quota voucher đúng và khóa sửa khi payment PENDING. Bỏ/đóng hủy pendingOnly; khôi phục pending, tránh stale poll và phản hồi phiên cũ.
- [x] Checkout dùng đơn đã giữ và tổng tiền server, combo/voucher PATCH, retry không tạo đơn khác, xử lý mất phản hồi/hết hạn/IPN thắng lúc hủy; chỉ chuyển vé khi đủ mã vé thật.
- [x] /payment/result tra order bằng UUID và phiên chủ đơn, bỏ qua querystatus/amount/code; poll 5 giây tối đa 2 phút có retry, PAID cần đủ vé; thông báo EXPIRED/CANCELLED/PAID_UNFULFILLED, abort/timer cleanup và khôi phục auth.
- [x] Kiểm thử cuối: backend 397/397, frontend 140/140 = 537/537. Coverage backend lines94.33%/branches82.35%; frontend lines89.31%/branches80.73%, giữ ngưỡng cũ. Build hai workspace đạt; lint0 lỗi/12 cảnh báo.
- [x] Chromium với hai tài khoản + Express/MySQL_test thật: Discovery đúng suất, hold ngay/poll inventory/owner masking, thêm bỏ cùngid/deadline, checkout1order, Payment thật qua service, signed browser return chỉ đọc, query giả bị bỏ qua, IPN→PAID/QR và callback lặp không nhân đôi vé.
- [ ] Nghiệm thu cổng VNPay sandbox bên ngoài trên staging (merchant/IPN HTTPS/đối soát), triển khai vận hành và các Must/P1 khác trước phát hành chính thức. Không commit/push/deploy trong chặng này.
- Tài liệu: docs/STAGE1_DELIVERY.md, docs/stage1-e2e-notes.md; cập nhật docs/PRODUCTION_READINESS.md và docs/TESTING.md. Browser smoke script không reset DB; chỉ runner guard chuẩn bị database _test.

### [2026-10-04] Gate CI cho luồng core và đồng bộ API
- [x] Pin Playwright 1.63.0 trong root package/lockfile, thêm `npm run test:e2e`. CI chạy coverage trước rồi cài Chromium/thư viện Linux, E2E trên MySQL riêng và xuất artifact coverage/ảnh/báo cáo.
- [x] Tái hiện lỗi cấu hình DB test bị nhầm làm nguồn ở lần nạp thứ hai khi CI không có `.env`; sửa và thêm kiểm thử cấu hình lặp/process con. Các ca từ chối DB nguồn/alias/tên không an toàn vẫn đạt.
- [x] Báo cáo E2E lỗi có phase và trạng thái server/nhóm lỗi; không xuất raw logs/secret/cookie/token/URL ký. Thêm 10 test chẩn đoán, kiểm cả Unicode/giá trị multiline và URL escaped.
- [x] OpenAPI đồng bộ 14 operation/35 schema chặng 1; giữ 117 operation thiết kế và 170 schema cũ. Swagger validator đạt; 1.311 ref được phân giải, 131 operationId duy nhất. Hướng dẫn API ghi rõ các chính sách idempotency/attempt reuse/FREE/log/outbox chưa triển khai.
- [x] Kiểm chứng mới: `npm ci`, Prisma generate, build hai workspace, lint 0 lỗi/12 cảnh báo; backend 410/410 trên cấu hình nguồn rỗng như CI sạch, frontend 140/140; **550/550** test đạt, coverage không giảm. E2E bằng browser mặc định PASS; nhánh cố tình thiếu executable FAIL đúng và dọn cả hai server. Không còn listener cổng 3101/5176 sau mỗi lượt.
- [x] Xử lý triệt để 12 cảnh báo lint trên frontend (`oxlint`): cấu hình fast-refresh cho `useAuth`, khởi tạo ref/state thuần khiết loại bỏ `Date.now()` trong render (`Hero`, `AdminReportDashboard`), bọc `useCallback` thiếu dependency (`StaffCheckinModal`), và bất đồng bộ hóa cập nhật reset state trong `useEffect` (`SeatMapModal`, `MyTicketsDrawer`). Đưa frontend lint về **0 lỗi / 0 cảnh báo**, build và test 140/140 đạt 100%.
- [ ] Push/xác minh workflow GitHub và nghiệm thu VNPay sandbox bên ngoài trên staging; các Must/P1 còn lại theo docs/PRODUCTION_READINESS.md. Chưa commit/push/deploy trong lượt này.

### [2026-10-04] Đợt 1: Cinema Scope (Bảo vệ phân quyền cụm rạp cho Phòng chiếu, Combo, Voucher)
- [x] Xác thực nguồn `cinemaIds`: Được truy vấn trực tiếp từ bảng `user_cinemas` trong `auth.middleware.ts` theo `userId` ở mỗi request có token (không lưu trong JWT), bảo đảm cập nhật quyền tức thì khi Admin thay đổi gán rạp.
- [x] Xây dựng module invariant dùng chung [cinema-scope.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/cinema-scope.ts): `assertCinemaScope`, `assertCinemaScopeMulti`, `assertAdminForGlobal`.
- [x] Khắc phục triệt để lỗ hổng scope rạp:
  - **Phòng chiếu (`Room`):** Kiểm tra quyền Manager tại `input.cinemaId` khi tạo phòng ([cinema.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/cinemas/cinema.service.ts)). Từ chối Manager có `cinemaIds` rỗng.
  - **Combo (`Combo`):** Combo global (`cinemaIds: []`) chỉ Admin được tạo/sửa/xóa. Combo gắn rạp yêu cầu Manager có quyền trên toàn bộ các rạp đó. Khi sửa/xóa combo, đọc entity từ DB để lấy danh sách rạp cũ, không tin payload ([combo.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/combos/combo.service.ts)). Lọc danh sách combo cho Manager/Staff chỉ thấy combo global + combo rạp mình ([combo.routes.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/combos/combo.routes.ts)).
  - **Voucher (`Voucher`):** Voucher global (`cinemaId: null`) chỉ Admin được tạo/sửa/xóa. Manager tạo voucher bắt buộc có `cinemaId` thuộc quyền quản lý. Khi sửa/xóa voucher, đọc entity từ DB, cấm Manager sửa voucher global hoặc voucher rạp khác ([voucher.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/vouchers/voucher.service.ts)). Lọc danh sách voucher cho Manager/Staff tự động giới hạn rạp được gán + global; chặn query rạp ngoài scope với mã 403.
- [x] Viết bộ test tích hợp chuyên sâu [cinema-scope.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/cinema-scope.test.ts) (28 test cases) bao quát toàn bộ ma trận create/update/delete/list × Admin / Manager đúng rạp / Manager sai rạp / Manager không có rạp / Staff.
- [x] Kiểm chứng toàn diện Đợt 1:
  - Backend: **438/438 tests PASSED (100%)** trên 19 test files (tăng 28 tests so với 410 tests trước đó).
  - Coverage Backend: **93.95% lines / 81.74% branches** (vượt chuẩn gate CI ≥90% lines / ≥80% branches).
  - Frontend: **140/140 tests PASSED (100%)**, Lint **0 lỗi / 0 cảnh báo**, Build 2 workspace thành công 100%.

### [2026-10-04] Đợt 2: Auth & Security (Quên/Đặt lại mật khẩu F01 Must, Xác thực Email, Rate Limiting, Cookie Cleanliness)
- [x] **Dịch vụ gửi Mail [mail.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/mail.service.ts):**
  - Triển khai mock in-memory có tracking mảng `sentEmails` phục vụ kiểm thử tự động không phụ thuộc SMTP bên ngoài.
  - Template HTML/Text chuẩn hóa cho Quên/Đặt lại mật khẩu và Kích hoạt tài khoản.
  - Sẵn sàng cấu hình SMTP qua biến môi trường (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
- [x] **Rate Limiting Middleware [rate-limit.middleware.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/middleware/rate-limit.middleware.ts):**
  - Xây dựng factory `createLimiter` thuật toán sliding window in-memory theo IP client.
  - Xuất đầy đủ RFC headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. Khi chạm ngưỡng, trả về HTTP 429 `TOO_MANY_REQUESTS` kèm header `Retry-After`.
  - Cấu hình cờ `skipInTest: true` mặc định để không làm gián đoạn test suite hiện có, cho phép test chuyên sâu kích hoạt có chọn lọc.
  - Áp dụng các limiter chuyên biệt: `loginLimiter` (5 req / 15m), `forgotPasswordLimiter` (3 req / 15m), `resetPasswordLimiter` (5 req / 15m), `verifyEmailLimiter` (5 req / 15m), `registerLimiter` (5 req / 1h).
- [x] **Cấu hình Reverse Proxy [app.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/app.ts):**
  - Thêm `app.set('trust proxy', 1);` để lấy đúng IP client phía sau proxy/load balancer cho rate limiting.
- [x] **Quên mật khẩu (`POST /api/v1/auth/forgot-password`):**
  - Chống timing attack: Gửi email hoàn toàn bất đồng bộ (không `await`) trong background.
  - Chống user enumeration: Trả về HTTP 200 kèm generic message y hệt nhau dù email có tồn tại trong hệ thống hay không.
  - Bảo mật token: Token ngẫu nhiên 32 bytes (64 hex chars), mã hóa SHA-256 (`tokenHash`) trước khi lưu CSDL bảng `password_reset_tokens`, thời hạn 1 giờ.
  - Tự động vô hiệu hóa toàn bộ token quên mật khẩu cũ chưa dùng của user trước khi cấp token mới.
- [x] **Đặt lại mật khẩu (`POST /api/v1/auth/reset-password`):**
  - Tra cứu theo SHA-256 hash của token gửi lên; xác thực token chưa hết hạn và chưa từng sử dụng (`usedAt === null`).
  - Cập nhật `passwordHash` mới bằng `bcryptjs` (salt 10 rounds).
  - Đánh dấu token đã sử dụng (`usedAt: new Date()`) — triệt để tuân thủ quy tắc Single-use.
  - **Bảo mật phiên:** Vô hiệu hóa toàn bộ refresh tokens đang hoạt động (`revokedAt: new Date()`) của user trên mọi thiết bị, ép buộc đăng nhập lại toàn diện.
- [x] **Xác thực Email (`POST /api/v1/auth/verify-email`, `POST /api/v1/auth/resend-verification`):**
  - Thêm cờ môi trường `REQUIRE_EMAIL_VERIFICATION` (mặc định `false` cho dev/test, chuyển `true` khi bật sản xuất).
  - Tự động sinh `EmailVerificationToken` và gửi mail kích hoạt khi người dùng đăng ký mới.
  - Xác thực thành công: Ghi nhận `emailVerifiedAt: new Date()`, vô hiệu hóa token (Single-use).
- [x] **Bảo mật Cookie Refresh Token [auth.controller.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/auth/auth.controller.ts):**
  - Giới hạn phạm vi cookie `refreshToken` vào đường dẫn `/api/v1/auth`.
  - Cơ chế dọn dẹp kép (`clearRefreshCookie`): Xóa đồng thời ở cả hai đường dẫn `/api/v1/auth` và `/` để triệt tiêu toàn bộ rủi ro orphan cookie trên trình duyệt.
- [x] **Bộ kiểm thử tự động chuyên sâu [auth-security-extended.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/auth-security-extended.test.ts):**
  - 11 ca kiểm thử bao quát toàn bộ 5 nhóm: Quên mật khẩu & chống timing/enumeration, Đặt lại mật khẩu & single-use & revoke sessions, Xác thực email & single-use, Cookie path kép & logout cleanliness, Rate limiting factory & HTTP 429 headers.
- [x] **Kiểm chứng toàn diện:**
  - Backend: **449/449 tests PASSED (100%)** trên 20 test files (tăng 11 tests).
  - Coverage Backend: **92.43% lines / 80.85% branches** (vượt chuẩn gate CI ≥90% lines / ≥80% branches).
  - Frontend: **140/140 tests PASSED (100%)**, Lint **0 lỗi / 0 cảnh báo**, Build 2 workspace thành công 100%.

### [2026-10-04] Đợt 3: Soát vé nâng cao (Signed QR + Cửa sổ soát vé [-30m, +15m] + Manager Bypass Log)
- [x] **Dịch vụ Chữ ký Cryptographic QR [qr-signature.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/qr-signature.service.ts):**
  - Cấu trúc payload chuẩn: `v<keyVersion>.<ticketCode>.<sig>` với định dạng HMAC-SHA256 cắt gọn 16 bytes (128-bit security) base64url-encoded.
  - Hỗ trợ key rotation (`QR_KEY_SECRET_V1`, `QR_KEY_SECRET_V2`,...).
  - Chống tấn công timing attack: Sử dụng `crypto.timingSafeEqual`.
  - Hỗ trợ fallback migration mềm: Chấp nhận raw ticketCode legacy khi `STRICT_QR_SIGNATURE=false` (mặc định strict mode trong production).
- [x] **Cửa sổ soát vé theo thời gian thực [checkin.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/checkin/checkin.service.ts):**
  - Định nghĩa cửa sổ soát vé hợp lệ: Từ 30 phút trước giờ chiếu (`startTime - 30m`) đến 15 phút sau khi phim bắt đầu (`startTime + 15m`).
  - Quét vé quá sớm (< -30 phút): Từ chối ngay lập tức với mã lỗi HTTP 400 `CHECKIN_WINDOW_EARLY`.
  - Quét vé quá muộn (> +15 phút):
    - Mặc định từ chối với HTTP 400 `CHECKIN_WINDOW_EXPIRED`.
    - Cơ chế duyệt ngoại lệ (Bypass): Cho phép `MANAGER` (thuộc đúng rạp của suất chiếu) hoặc `ADMIN` bỏ qua cửa sổ với cờ `bypassWindow: true` và bắt buộc nhập lý do (`bypassReason` tối thiểu 5 ký tự).
    - Nhân viên thông thường (`STAFF`) bị từ chối tuyệt đối quyền bypass (HTTP 403 `STAFF_CANNOT_BYPASS_WINDOW`).
    - Ghi nhận Audit Log bất biến vào bảng `audit_logs` (`action: 'CHECKIN_WINDOW_BYPASS'`, `lateMinutes`, `bypassReason`, `actorId`, `showtimeId`).
- [x] **Tích hợp Phát hành Vé và Giao diện Quét QR [StaffCheckinModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/StaffCheckinModal.tsx), [TicketModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/TicketModal.tsx):**
  - Backend `OrderService` tự động sinh signed QR payload cho mọi vé phát hành sau thanh toán.
  - `TicketModal.tsx` mã hóa SVG QR bằng chuỗi signed QR `v1.<ticketCode>.<sig>`.
  - `StaffCheckinModal.tsx` phát hiện lỗi vé trễ giờ và tự động kích hoạt khung xác nhận phê duyệt ngoại lệ dành cho Quản lý / Admin, hiển thị badge "QUẢN LÝ DUYỆT NGOẠI LỆ" khi soát vé thành công.
- [x] **Bộ kiểm thử tự động chuyên sâu [checkin-advanced.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/checkin-advanced.test.ts):**
  - 16 ca kiểm thử bao quát toàn bộ: Xác thực chữ ký QR hợp lệ / giả mạo / sai format / sai version, Cửa sổ soát vé hợp lệ, Quét sớm, Quét trễ, Staff không được bypass, Manager sai rạp không được bypass, Manager đúng rạp bypass thành công kèm ghi nhận Audit Log.
### [2026-10-04] Đợt 4: Màn hình Quản trị Must (F09, F10, F11, F13) & Quản lý Tài khoản (Hồ sơ cá nhân, Đổi/Quên mật khẩu)
- [x] **Backend Enhancements:**
  - Bổ sung endpoint `GET /api/v1/movies/genres` trong [movie.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/movies/movie.service.ts), [movie.controller.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/movies/movie.controller.ts), và [movie.routes.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/movies/movie.routes.ts) phục vụ bộ chọn thể loại khi tạo phim mới.
- [x] **API Client Extensions [api.ts](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/services/api.ts):**
  - Khai báo kiểu dữ liệu và API methods: `updateProfile`, `changePassword`, `forgotPassword`, `resetPassword`, `resendVerification`, `getGenres`, `createMovie`, `updateMovie`, `deleteMovie`, `createShowtime`, `createRoom`, `createCinema`, `getCinemaDetails`, `getAdminVouchers`.
- [x] **Hồ sơ Cá nhân & Bảo mật [UserProfileModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/UserProfileModal.tsx):**
  - Thông tin tài khoản: Xem email, điểm thưởng, vai trò, trạng thái xác thực email, nút gửi lại email kích hoạt, cập nhật họ tên & số điện thoại (kiểm tra chặt chẽ số điện thoại 10 chữ số bắt đầu bằng 0).
  - Đổi mật khẩu: Kiểm tra mật khẩu hiện tại, mật khẩu mới (tối thiểu 6 ký tự), xác nhận mật khẩu khớp nhau, gọi API `/auth/change-password`.
- [x] **Quên & Đặt lại mật khẩu [AuthModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AuthModal.tsx):**
  - Tích hợp 2 tab bổ sung `forgot` (nhập email nhận hướng dẫn đặt lại mật khẩu) và `reset` (nhập token đặt lại và mật khẩu mới).
- [x] **Trung tâm Quản trị Hệ thống [AdminManagementModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminManagementModal.tsx):**
  - **Quản lý Phim (F09):** Danh sách phim, tìm kiếm lọc phim theo tên, xem thông tin poster/độ tuổi/thời lượng/thể loại, nút ẩn/xóa phim, form thêm phim mới đầy đủ trường dữ liệu.
  - **Xếp Suất Chiếu (F11):** Lọc theo cụm rạp, xem lịch chiếu theo phòng/thời gian/định dạng/trạng thái, form xếp suất chiếu mới (chọn phim, phòng chiếu, giờ bắt đầu, format 2D/3D/IMAX, SUB/DUB, adMinutes/cleaningMinutes kiểm tra xung đột BR-10).
  - **Rạp & Phòng Chiếu (F10):** Xem danh sách phòng chiếu & số ghế hoạt động theo từng rạp, form tạo phòng chiếu mới (tên, định dạng, số hàng, số cột, tự động sinh sơ đồ ghế).
  - **Khuyến Mãi & Voucher (F13):** Bảng danh sách voucher, hiển thị mã, giảm giá, quota và điều kiện tài chính.
- [x] **Tích hợp Điều hướng [Header.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/Header.tsx) & [App.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/App.tsx):**
  - Header: Thêm nút "Quản trị" (biểu tượng Clapperboard) tự động kích hoạt cho vai trò `ADMIN` và `MANAGER`.
  - Tích hợp sự kiện mở modal Hồ sơ cá nhân khi click vào thông tin người dùng trên thanh header (cả Desktop và Mobile menu).
  - App: Quản lý trạng thái hiển thị của `UserProfileModal` và `AdminManagementModal`.
- [x] **Bộ kiểm thử tự động Frontend mới:**
  - [user-profile.test.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/tests/user-profile.test.tsx): 4 ca kiểm thử giao diện hồ sơ, cập nhật thông tin cá nhân, validate số điện thoại, và đổi mật khẩu thành công.
  - [admin-management.test.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/tests/admin-management.test.tsx): 6 ca kiểm thử danh sách phim, tìm kiếm phim, thêm phim mới, chuyển tab suất chiếu, tạo phòng chiếu mới, và xem danh sách voucher.
  - [role-navigation.test.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/tests/role-navigation.test.tsx): Cập nhật kiểm tra nút "Quản trị" chỉ hiển thị đúng cho `ADMIN` và `MANAGER`.
- [x] **Kiểm chứng toàn diện:**
  - Backend: **465/465 tests PASSED (100%)** trên 21 test files.
  - Frontend: **150/150 tests PASSED (100%)** trên 14 test files (tăng 10 tests).
  - Tổng số kiểm thử: **615/615 tests PASSED (100%)**.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint`).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.

### [2026-10-04] Đợt 5: Quy tắc BR-13 & Quản lý Bảng giá / Ngày lễ (Admin Lifecycle & Pricing Management)
- [x] **Quy tắc BR-13 (Movie Soft Delete & Showtime Cancellation) [movie.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/movies/movie.service.ts):**
  - Khi ẩn phim (`isActive: false`, `status: ENDED`), hệ thống tự động quét và hủy toàn bộ suất chiếu tương lai (`startTime > now`, `status != CANCELLED`).
  - Đối với đơn giữ chỗ (`PENDING_PAYMENT`): Hủy đơn, giải phóng ghế sang `AVAILABLE`, xóa guard `pending_order_guards`, hoàn trả voucher, chuyển payment PENDING sang FAILED.
  - Đối với đơn đã thanh toán (`PAID`): Hủy đơn hàng, hủy toàn bộ vé (`TicketStatus.CANCELLED`), giải phóng ghế `AVAILABLE`, hoàn tiền 100% không mất phí (`RefundRequest` với `reason: SHOWTIME_CANCELLED`, `amount: order.total`, `cancellationFee: 0`), tự động trừ điểm loyalty tích lũy đã cộng và ghi nhận `LoyaltyTransaction` loại `REVERT`.
  - Ghi nhận `AuditLog` cho hành động ẩn phim (`action: 'MOVIE_DEACTIVATE_BR13'`) và từng suất chiếu bị hủy (`action: 'SHOWTIME_CANCEL'`).
- [x] **API Hủy Suất Chiếu Quản Trị [showtime.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/showtimes/showtime.service.ts), [showtime.controller.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/showtimes/showtime.controller.ts), [showtime.routes.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/showtimes/showtime.routes.ts):**
  - Endpoint `POST /api/v1/showtimes/:id/cancel` cho phép Admin, Manager hoặc Staff có gán rạp hủy suất chiếu kèm lý do bắt buộc.
  - Kiểm tra thẩm quyền rạp qua `checkStaffCinemaAccess`: Nhân viên/Quản lý rạp khác bị từ chối 403 `CINEMA_SCOPE_DENIED`.
  - Chặn hủy lại suất chiếu đã ở trạng thái `CANCELLED` với mã 400 `SHOWTIME_ALREADY_CANCELLED`.
  - Tự động hủy đơn hàng, hủy vé, sinh yêu cầu hoàn tiền 100% và ghi `AuditLog`.
- [x] **Module Quản lý Bảng giá, Phụ thu & Ngày lễ [backend/src/modules/pricing/](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/pricing/):**
  - `pricing.schema.ts`, `pricing.service.ts`, `pricing.controller.ts`, `pricing.routes.ts` được mount tại `/api/v1/pricing` trong [app.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/app.ts).
  - **Bảng giá vé (`PriceRule`):** Tra cứu danh sách theo rạp, upsert theo định dạng phòng / loại ngày / khung giờ / ngày hiệu lực, kiểm tra thẩm quyền rạp, chặn xóa bảng giá đang được tham chiếu bởi đơn hàng (`PRICE_RULE_IN_USE`), ghi Audit Log `PRICE_RULE_UPSERT` / `PRICE_RULE_DELETE`.
  - **Phụ thu ghế (`SeatSurcharge`):** Tra cứu và upsert phụ thu theo loại ghế (VIP, Standard, Couple), kiểm tra quyền rạp, chặn xóa khi có đơn hàng tham chiếu (`SEAT_SURCHARGE_IN_USE`), ghi Audit Log.
  - **Ngày lễ toàn hệ thống (`Holiday`):** Danh sách ngày lễ công khai cho khách hàng và quản trị viên; chỉ Quản trị viên (ADMIN) mới có quyền tạo/xóa ngày lễ, tự động kích hoạt tính giá ngày lễ cho mọi suất chiếu trùng ngày, ghi Audit Log.
- [x] **Bộ kiểm thử tự động chuyên sâu [admin-lifecycle-pricing.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/admin-lifecycle-pricing.test.ts):**
  - 6 ca kiểm thử bao quát toàn bộ luồng:
    1. Ẩn phim tự động hủy suất chiếu tương lai, giải phóng ghế pending, hủy guard và ghi Audit Log BR-13.
    2. Hủy vé đã thanh toán khi ẩn phim, tạo RefundRequest 100% không mất phí, hoàn điểm loyalty và ghi nhận transaction REVERT.
    3. Hủy suất chiếu trực tiếp kèm kiểm tra phân quyền rạp (`foreignStaff` bị 403, `staff` rạp được phép), sinh hoàn tiền, chặn hủy lần hai 400.
    4. Thêm, sửa, liệt kê và chặn xóa Bảng giá vé đang được đơn hàng tham chiếu (`PRICE_RULE_IN_USE`).
    5. Quản lý phụ thu ghế theo rạp và ghi Audit Log.
    6. Thêm, liệt kê và xóa Ngày lễ áp dụng toàn hệ thống.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **471/471 tests PASSED (100%)** trên 22 test files (tăng 6 tests).
  - Frontend: **150/150 tests PASSED (100%)** trên 14 test files.
  - Tổng số kiểm thử toàn dự án: **621/621 tests PASSED (100%)**.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint --deny-warnings frontend`).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.

### [2026-10-04] Đợt 6: Cơ chế Idempotency Key & Xuất Báo Cáo Doanh Thu (CSV/Excel UTF-8 BOM)
- [x] **Cơ chế Idempotency Key [idempotency.middleware.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/middleware/idempotency.middleware.ts):**
  - Chống trùng lặp đơn hàng và thanh toán khi người dùng click đúp hoặc mạng retry qua header `Idempotency-Key` / `X-Idempotency-Key`.
  - Tính hash SHA-256 từ `method + path + body` lưu cùng `actorId`, `scope`, `key` vào bảng `idempotency_keys` (`status: IN_PROGRESS`).
  - Trả về kết quả đã cache kèm header `X-Idempotent-Replay: true` khi gửi lại cùng key và payload, bảo vệ không tạo đơn trùng hay thanh toán lần 2.
  - Phát hiện và từ chối payload không khớp với mã 422 `IDEMPOTENCY_PAYLOAD_MISMATCH`.
  - Chặn request đồng thời với mã 409 `CONCURRENT_REQUEST`.
  - Đảm bảo commit trạng thái `COMPLETED` trước khi gửi response HTTP về client, loại trừ race condition.
  - Gắn vào các route trọng yếu: `POST /api/v1/orders`, `POST /api/v1/orders/counter`, `POST /api/v1/payment/simulate-success`, `POST /api/v1/payment/simulate-mock`.
- [x] **API Xuất Báo Cáo Doanh Thu CSV/Excel [report.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/reports/report.service.ts), [report.controller.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/reports/report.controller.ts), [report.routes.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/reports/report.routes.ts):**
  - Endpoint `GET /api/v1/admin/reports/export`: Hỗ trợ xuất dữ liệu phân tích doanh thu theo ngày (`DAILY`), theo rạp (`CINEMA`), theo phim (`MOVIE`).
  - Phân quyền: `ADMIN` toàn quyền; `MANAGER` bị giới hạn trong phạm vi rạp được phân công, chặn tuyệt đối xem so sánh liên rạp (`403 CINEMA_COMPARISON_FORBIDDEN`).
  - Định dạng chuẩn CSV UTF-8 với ký tự BOM `\uFEFF`, mở trực tiếp bằng Microsoft Excel không bị lỗi font tiếng Việt.
  - Tự động đặt header `Content-Type: text/csv; charset=utf-8` và `Content-Disposition: attachment; filename="..."`.
- [x] **Bộ kiểm thử tự động chuyên sâu [idempotency-and-export.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/idempotency-and-export.test.ts):**
  - 6 ca kiểm thử bao quát toàn bộ luồng:
    1. Tạo đơn hàng với Idempotency-Key và gửi lại cùng key -> Nhận đúng order ID cũ, `X-Idempotent-Replay: true`, DB chỉ tồn tại 1 đơn hàng duy nhất.
    2. Gửi cùng Idempotency-Key nhưng đổi ghế -> Trả về lỗi 422 `IDEMPOTENCY_PAYLOAD_MISMATCH`.
    3. Mô phỏng thanh toán với Idempotency-Key và replay -> Trả lại response thanh toán cache, không lỗi trùng lặp.
    4. Quản trị viên xuất báo cáo doanh thu theo ngày (DAILY) dạng CSV có BOM UTF-8, kiểm tra tiêu đề tiếng Việt và dữ liệu khớp thực tế.
    5. Xuất báo cáo doanh thu theo phim (MOVIE) dạng CSV.
    6. Quản lý rạp bị chặn khi cố tình xuất báo cáo so sánh liên rạp (CINEMA) với mã 403 `CINEMA_COMPARISON_FORBIDDEN`.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **477/477 tests PASSED (100%)** trên 23 test files (tăng 6 tests).
  - Frontend: **150/150 tests PASSED (100%)** trên 14 test files.
  - Tổng số kiểm thử toàn dự án: **627/627 tests PASSED (100%)**.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint --deny-warnings frontend`).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.

### [2026-10-04] Đợt 7: Quy trình Quản lý, Đối soát & Xử lý Hoàn tiền (F16 Refund Management & Reconciliation)
- [x] **Module Backend Hoàn Tiền [backend/src/modules/refunds/](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/refunds/):**
  - Mount tại `/api/v1/admin/refunds` trong [app.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/app.ts), bảo vệ bằng phân quyền `requireRoles('ADMIN', 'MANAGER')`.
  - **Danh sách yêu cầu hoàn tiền (`GET /api/v1/admin/refunds`):** Tra cứu theo trạng thái (`PENDING`, `REFUNDED`), lý do (`ORDER_CANCELLED`, `SHOWTIME_CANCELLED`, ...), phân trang; áp dụng cinema-scope bắt buộc cho vai trò `MANAGER` (chỉ xem các đơn thuộc cụm rạp được phân công, từ chối 403 nếu chưa gán rạp).
  - **Chi tiết yêu cầu hoàn tiền (`GET /api/v1/admin/refunds/:id`):** Trả về toàn diện thông tin đơn hàng, danh sách vé đã hủy, thông tin thanh toán gốc (nhà cung cấp, mã giao dịch, số tiền), audit log và trạng thái hoàn tiền.
  - **Xử lý hoàn tiền (`POST /api/v1/admin/refunds/:id/process`):**
    - Chạy trong transaction CSDL với khóa dòng `SELECT ... FOR UPDATE` chống race condition và xử lý đồng thời.
    - Cập nhật `RefundRequest.status` từ `PENDING` sang `REFUNDED`, phương thức (`BANK_TRANSFER`, `CASH`, `PROVIDER_MANUAL`), thông tin người xử lý và thời điểm xử lý.
    - Tự động sinh mã chứng từ/tham chiếu (`externalReference`) nếu chưa cung cấp để thỏa mãn nghiêm ngặt ràng buộc toàn vẹn CSDL `chk_refunds_processed`.
    - Cập nhật `Order.refundStatus -> REFUNDED`.
    - Ghi nhận `AuditLog` hành động `REFUND_PROCESS` với đầy đủ snapshot dữ liệu cũ/mới và IP truy cập.
    - Tạo `OutboxEvent` sự kiện `REFUND_PROCESSED` phục vụ gửi email thông báo cho khách hàng và luồng nghiệp vụ hạ nguồn.
    - Chống xử lý trùng lặp (Idempotency): Từ chối ngay lập tức với HTTP 409 `REFUND_ALREADY_PROCESSED` nếu yêu cầu đã ở trạng thái `REFUNDED`.
    - Kiểm tra cinema-scope: Chặn nhân viên/quản lý rạp khác xử lý đơn của rạp ngoài phạm vi quản lý với HTTP 400 `CINEMA_SCOPE_FORBIDDEN`.
- [x] **Giao diện Quản trị Frontend [AdminManagementModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminManagementModal.tsx):**
  - Bổ sung tab thứ 5 **"5. Đối Soát & Hoàn Tiền"** với biểu tượng `RotateCcw`, hiển thị badge số lượng yêu cầu chờ duyệt.
  - Bộ lọc trạng thái trực quan: Chờ duyệt (`PENDING`), Đã hoàn (`REFUNDED`), Tất cả (`ALL`).
  - Danh sách thẻ yêu cầu hoàn tiền chuyên nghiệp: Mã đơn hàng, tên khách, số điện thoại, phim, cụm rạp, phòng chiếu, suất chiếu, số tiền hoàn, phí hủy và mã chứng từ đối soát.
  - Form modal xử lý hoàn tiền: Cho phép chọn phương thức (Chuyển khoản ngân hàng, Tiền mặt tại quầy, Hoàn cổng VNPay), nhập mã giao dịch/số chứng từ, ghi chú đối soát nội bộ và gửi API xác nhận tức thì.
  - Mở rộng API client [api.ts](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/services/api.ts): Các phương thức `getAdminRefunds`, `getAdminRefundDetail`, `processAdminRefund` và kiểu dữ liệu `ApiRefundItem`, `ApiRefundListResponse`, `ProcessRefundInput`.
- [x] **Bộ kiểm thử tự động chuyên sâu:**
  - Backend [refund-management.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/refund-management.test.ts): **12/12 tests PASSED (100%)** bao quát toàn bộ luồng danh sách, chi tiết, chuyển trạng thái PENDING -> REFUNDED, ghi AuditLog/OutboxEvent, từ chối xử lý trùng lặp 409, validate phương thức, và ràng buộc cinema-scope cho MANAGER.
  - Frontend [admin-management.test.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/tests/admin-management.test.tsx): **8/8 tests PASSED (100%)** (thêm 2 tests giao diện danh sách hoàn tiền và form xác nhận xử lý hoàn tiền).
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **489/489 tests PASSED (100%)** trên 24 test files (tăng 12 tests).
  - Frontend: **152/152 tests PASSED (100%)** trên 14 test files (tăng 2 tests).
  - Tổng số kiểm thử toàn dự án: **641/641 tests PASSED (100%)**.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint`).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.

### [2026-10-04] Đợt 8: Năng lực Vận hành, Giám sát & Khởi động Hệ thống (Operational Readiness & Resilience)
- [x] **Fail-fast Configuration [env.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/config/env.ts):**
  - Hàm `validateEnvironment()` kiểm tra chặt chẽ các biến môi trường cốt lõi khi khởi động server.
  - Chặn đứng các lỗ hổng bí mật trong môi trường Production (`NODE_ENV=production`): Từ chối chuỗi secret mặc định hoặc ngắn dưới 32 ký tự đối với `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`, cảnh báo khi thiếu cấu hình `CORS_ALLOWED_ORIGINS`.
- [x] **Request ID Correlation Middleware [request-id.middleware.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/middleware/request-id.middleware.ts):**
  - Gắn UUID duy nhất `X-Request-Id` cho mỗi request HTTP gửi đến hệ thống.
  - Lan truyền mã truy vết xuyên suốt vòng đời request, hỗ trợ đắc lực phân tích log phân tán và truy cứu lỗi sản xuất.
- [x] **Health & Readiness Probes [app.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/app.ts):**
  - `GET /health`: Liveness probe tiêu chuẩn trả về HTTP 200 và metadata dịch vụ.
  - `GET /ready`: Readiness probe kiểm tra kết nối trực tiếp tới CSDL MySQL qua truy vấn `SELECT 1`, trả về HTTP 200 `database: connected` khi CSDL sẵn sàng hoặc HTTP 503 `database: disconnected` khi mất kết nối.
- [x] **Graceful Shutdown & Signal Trapping [server.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/server.ts):**
  - Lắng nghe các tín hiệu hệ điều hành `SIGTERM` và `SIGINT` (từ Docker, Kubernetes, Process Manager).
  - Đóng HTTP server để ngừng tiếp nhận request mới trong khi chờ các kết nối đang thực thi hoàn tất.
  - Ngắt kết nối Prisma client connection pool an toàn `prisma.$disconnect()`.
  - Thiết lập cơ chế timeout fallback 10s tự động thoát tiến trình chống tình trạng treo server.
- [x] **Bộ kiểm thử tự động chuyên sâu [operational-readiness.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/operational-readiness.test.ts):**
  - 7 ca kiểm thử bao quát toàn bộ luồng: Liveness probe 200, Readiness probe với CSDL 200, sinh UUID Request ID tự động, bảo toàn header Request ID từ client, xác thực cấu hình hợp lệ, và fail-fast khi thiếu DATABASE_URL hoặc secret không an toàn.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **496/496 tests PASSED (100%)** trên 25 test files (tăng 7 tests).
  - Frontend: **152/152 tests PASSED (100%)** trên 14 test files.
  - Tổng số kiểm thử toàn dự án: **648/648 tests PASSED (100%)**.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint`).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.

### [2026-10-05] Đợt 9: Hoàn thiện Frontend thiếu theo Backend APIs (Mục 1 PRODUCTION_READINESS.md)
- [x] **Tab 4: Bảng Giá Vé, Phụ Thu & Ngày Lễ (`PRICING`) trong [AdminManagementModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminManagementModal.tsx):**
  - Cung cấp bộ lọc theo rạp hoặc cấu hình dùng chung toàn hệ thống.
  - **Subtab 1: Bảng giá vé cơ bản (Base Price Rules):** Hiển thị danh sách quy tắc giá theo định dạng phòng (`TWO_D`, `THREE_D`, `IMAX`), loại ngày (`WEEKDAY`, `WEEKEND`, `HOLIDAY`), khung giờ (`MORNING`, `AFTERNOON`, `EVENING`), giá cơ bản và ngày hiệu lực. Form thêm/cập nhật cấu hình giá vé tức thì liên kết API `POST /api/v1/pricing/rules`.
  - **Subtab 2: Phụ thu loại ghế (Seat Surcharges):** Hiển thị danh sách phụ thu theo loại ghế (`STANDARD`, `VIP`, `COUPLE`), số tiền phụ thu và ngày hiệu lực. Form thêm/cập nhật phụ thu ghế liên kết API `POST /api/v1/pricing/surcharges`.
  - **Subtab 3: Quản lý Ngày lễ toàn quốc (Holidays):** Danh sách ngày lễ toàn quốc đã thiết lập; hệ thống tự động áp biểu giá `HOLIDAY` khi suất chiếu diễn ra vào các ngày này. Form thêm ngày lễ mới liên kết API `POST /api/v1/pricing/holidays`.
- [x] **Tab 5: Quản lý Combo Bắp Nước (`COMBOS`) trong [AdminManagementModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminManagementModal.tsx):**
  - Hiển thị danh mục combo bắp nước hiện có: Tên combo, mã combo, giá bán, chi tiết các món kèm và mô tả.
  - Bộ lọc combo theo phạm vi rạp (áp dụng riêng cho rạp được chọn hoặc toàn hệ thống).
  - Form modal tạo combo mới: Cho phép nhập mã, tên, giá bán, danh sách món và mô tả, liên kết API `POST /api/v1/combos`.
  - Chức năng xóa combo với xác nhận người dùng (`api.deleteCombo`).
- [x] **Nút Xuất Báo Cáo Doanh Thu CSV trên [AdminReportDashboard.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminReportDashboard.tsx):**
  - Tích hợp nút "Xuất CSV" chuyên nghiệp cạnh bộ lọc thời gian và cụm rạp.
  - Sử dụng hàm `api.exportReportCsv` gọi endpoint `GET /api/v1/admin/reports/export` kèm Bearer token xác thực.
  - Tải về file CSV kèm UTF-8 BOM chuẩn hiển thị tiếng Việt trên Microsoft Excel, tự động phân tích tên file từ header `Content-Disposition`.
- [x] **Nút Hủy Vé & Yêu Cầu Hoàn Tiền (BR-14) trên [MyTicketsDrawer.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/MyTicketsDrawer.tsx):**
  - Kiểm tra điều kiện thời gian hủy vé hợp lệ theo quy tắc BR-14: Suất chiếu còn tối thiểu 2 giờ trước giờ bắt đầu (`hoursUntilShowtime >= 2`).
  - Nút "Hủy vé / Hoàn tiền" kích hoạt modal xác nhận nhập lý do hủy vé, gọi API `POST /api/v1/orders/:id/cancel` với `{ reason }`.
  - Hiển thị badge `CHỜ HOÀN TIỀN (PENDING)` khi đơn đã được gửi yêu cầu hoàn tiền thành công.
  - Hiển thị cảnh báo trực quan khi suất chiếu còn dưới 2 giờ (vô hiệu hóa nút và thông báo chính sách không áp dụng hủy vé).
- [x] **Mở rộng API Client [frontend/src/services/api.ts](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/services/api.ts):**
  - Bổ sung nhóm hàm Pricing: `getPriceRules`, `upsertPriceRule`, `deletePriceRule`, `getSeatSurcharges`, `upsertSeatSurcharge`, `deleteSeatSurcharge`, `getHolidays`, `createHoliday`, `deleteHoliday`.
  - Bổ sung nhóm hàm Combos: `getAdminCombos`, `createCombo`, `updateCombo`, `deleteCombo`.
  - Bổ sung hàm xuất báo cáo: `exportReportCsv`.
  - Cải tiến `cancelOrder` tương thích backward cho cả object options `{ reason, pendingOnly }` và legacy string `key`.
  - Mở rộng các interface TypeScript: `ApiCombo`, `CreateComboInput`, `ApiPriceRule`, `CreatePriceRuleInput`, `ApiSeatSurcharge`, `CreateSeatSurchargeInput`, `ApiHoliday`, `CreateHolidayInput`.
- [x] **Bộ kiểm thử tự động chuyên sâu:**
  - `frontend/tests/admin-management.test.tsx`: Bổ sung 2 test cases kiểm tra chuyển tab `PRICING` (hiển thị quy tắc giá, phụ thu, ngày lễ) và tab `COMBOS` (danh sách combo, tạo combo mới). Đạt **10/10 tests PASSED (100%)**.
  - `frontend/tests/reports.test.tsx`: Bổ sung 1 test case kiểm tra chức năng xuất file báo cáo CSV từ dashboard. Đạt **5/5 tests PASSED (100%)**.
  - `frontend/tests/tickets.test.tsx`: Bổ sung 2 test cases kiểm tra luồng hủy vé $\ge 2$ giờ và chặn hủy vé $< 2$ giờ. Đạt **14/14 tests PASSED (100%)**.
  - `frontend/tests/api.test.ts`: Đạt **13/13 tests PASSED (100%)**.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **496/496 tests PASSED (100%)** trên 25 test files.
  - Frontend: **157/157 tests PASSED (100%)** trên 14 test files (tăng 5 tests).
  - Tổng số kiểm thử toàn dự án: **653/653 tests PASSED (100%)**.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint` trên 41 frontend files).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100% (`tsc -b && vite build`).

### [2026-10-05] Đợt 10: Kiểm toán Bảo Mật Phụ Thuộc (Audit) & Trợ Năng (A11y/Mobile UX) cho Modal
- [x] **Kiểm toán Bảo mật Phụ thuộc (Dependency Audit):**
  - Khắc phục triệt để 4 lỗ hổng mức High (`deepmerge-ts <8.0.0` và `effect <3.20.0`) trong chuỗi `@prisma/config` mà không phá vỡ cấu trúc Prisma ORM.
  - Cấu hình cơ chế `overrides` chuẩn npm cho `deepmerge-ts@8.0.2` và `effect@3.20.0` trong [package.json](file:///c:/Users/ASUS/Desktop/DoAn4/package.json) và [backend/package.json](file:///c:/Users/ASUS/Desktop/DoAn4/backend/package.json).
  - Cập nhật lockfile [package-lock.json](file:///c:/Users/ASUS/Desktop/DoAn4/package-lock.json); kết quả `npm audit` đạt **0 vulnerabilities** trên cả root và backend.
- [x] **Hook Trợ Năng & Mobile UX [useModalA11y.ts](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/hooks/useModalA11y.ts):**
  - **Phím Escape (WCAG 2.1 Criterion 2.1.2):** Tự động gắn và hủy sự kiện `keydown` phím `Escape` để đóng dialog theo chuẩn WAI-ARIA.
  - **Khóa cuộn trang nền (Scroll Lock):** Tự động gán `document.body.style.overflow = 'hidden'` khi modal mở và phục hồi nguyên vẹn khi đóng/unmount, ngăn chặn triệt để lỗi cuộn trượt trang nền trên màn hình cảm ứng di động.
  - **Phục hồi tiêu điểm (Focus Restoration):** Tự động ghi nhớ phần tử kích hoạt trước khi mở modal (`document.activeElement`) và trả lại focus cho phần tử đó khi đóng modal.
- [x] **Chuẩn hóa WAI-ARIA Modal Dialog trên toàn bộ 9 Modal & Drawer:**
  - [SeatMapModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/SeatMapModal.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="seatmap-modal-title"`, nút đóng đạt chuẩn `min-h-[44px] min-w-[44px]`.
  - [CheckoutModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/CheckoutModal.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="checkout-modal-title"`, tiêu đề `id="checkout-modal-title"`.
  - [TicketModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/TicketModal.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="ticket-modal-title"`, tiêu đề `id="ticket-modal-title"`.
  - [AuthModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AuthModal.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="auth-modal-title"`, tiêu đề `id="auth-modal-title"`.
  - [AdminManagementModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminManagementModal.tsx): Bổ sung `useModalA11y` đóng bằng phím Escape, nút đóng kích thước chuẩn 44px.
  - [AdminReportDashboard.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminReportDashboard.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="admin-report-title"`, nút đóng chuẩn 44px kèm `aria-label`.
  - [MyTicketsDrawer.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/MyTicketsDrawer.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="mytickets-drawer-title"`; subdialog xác nhận hủy vé có `role="dialog"`, `aria-modal="true"`, `aria-labelledby="cancel-confirm-title"`.
  - [StaffCheckinModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/StaffCheckinModal.tsx): Bổ sung `useModalA11y`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="checkin-modal-title"`, nút đóng chuẩn 44px.
  - [UserProfileModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/UserProfileModal.tsx): Bổ sung `useModalA11y`, nâng cấp nút đóng lên `min-w-[44px] min-h-[44px]`.
- [x] **Bộ kiểm thử tự động chuyên sâu:**
  - `frontend/tests/modal-a11y.test.tsx`: 4 unit tests kiểm tra toàn diện hook `useModalA11y` (đóng bằng phím Escape, tùy chọn `closeOnEscape: false`, khóa/phục hồi `document.body.style.overflow`, và phục hồi focus về trigger element). Đạt **4/4 tests PASSED (100%)**.
  - `frontend/tests/modal-a11y-integration.test.tsx`: 3 integration tests kiểm tra trực tiếp tương tác phím Escape và các thuộc tính WAI-ARIA trên `AdminReportDashboard`, `StaffCheckinModal`, và `UserProfileModal`. Đạt **3/3 tests PASSED (100%)**.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **496/496 tests PASSED (100%)** trên 25 test files.
  - Frontend: **164/164 tests PASSED (100%)** trên 16 test files (tăng 7 tests).
  - Tổng số kiểm thử toàn dự án: **660/660 tests PASSED (100%)** trên 41 test files.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint` trên 44 frontend files).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.
  - Audit: `npm audit` đạt **found 0 vulnerabilities**.

### [2026-10-05] Đợt 11: Tích Hợp TMDB API (The Movie Database) - Tìm Kiếm & Tự Động Điền Danh Mục Phim Rạp
- [x] **Cấu hình & Môi trường TMDB:**
  - Lưu trữ an toàn `TMDB_API_KEY` và `TMDB_READ_ACCESS_TOKEN` trong [backend/.env](file:///c:/Users/ASUS/Desktop/DoAn4/backend/.env) và cập nhật [backend/.env.example](file:///c:/Users/ASUS/Desktop/DoAn4/backend/.env.example).
  - Tích hợp cơ chế tự động chuyển tiếp DNS Google (`8.8.8.8`) và Cloudflare (`1.1.1.1`) vào [tmdb.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/tmdb.service.ts), khắc phục triệt để lỗi các nhà mạng tại Việt Nam (VNPT, Viettel, FPT) chặn tên miền `api.themoviedb.org`.
- [x] **Backend TMDB Service & Controller Endpoints:**
  - `tmdbService.searchMovies(query, page)`: Tìm kiếm danh sách phim theo từ khóa tiếng Việt hoặc tiếng Anh, trả về mã TMDB, tiêu đề, năm phát hành, poster W500 và điểm đánh giá.
  - `tmdbService.getMovieDetails(tmdbId)`: Trích xuất toàn diện chi tiết phim: tiêu đề tiếng Việt, thời lượng runtime (phút), poster W500, backdrop W1280, trailer chính thức trên YouTube (ưu tiên trailer tiếng Việt hoặc bản quốc tế), danh sách thể loại và tên đạo diễn.
  - Expose API endpoints bảo vệ bằng RBAC: `GET /api/v1/movies/tmdb/search` và `GET /api/v1/movies/tmdb/:tmdbId` cho phép các quyền `STAFF`, `MANAGER`, và `ADMIN` tra cứu khi quản lý danh mục.
- [x] **Frontend Tích hợp Tự động điền (Auto-fill) tại [AdminManagementModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AdminManagementModal.tsx):**
  - Bổ sung khối tìm kiếm thông minh *"🔍 Tìm & Tự động điền nhanh từ TMDB"* ngay trong biểu mẫu **Thêm phim mới** (Tab 1: Quản lý Phim).
  - Hiển thị danh sách kết quả dropdown trực quan (poster thumbnail, tên gốc, năm phát hành, điểm rating ⭐).
  - Bấm nút **"Chọn"**: Tự động điền tức thời toàn bộ form gồm Tên phim, Tên tiếng Anh, Thời lượng (phút), Ngày khởi chiếu, Link Poster HD, Link Trailer YouTube, Mô tả tóm tắt nội dung và tự động map thể loại khớp với hệ thống.
- [x] **Kịch bản Đồng bộ Hàng loạt (Bulk Sync CLI) [backend/scripts/sync-tmdb.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/scripts/sync-tmdb.ts):**
  - Hỗ trợ lệnh `npm run seed:tmdb` từ root hoặc backend để tự động kéo các phim hot/bom tấn từ TMDB, khởi tạo thể loại nếu chưa có, và lưu trực tiếp vào CSDL MySQL chỉ trong vài giây.
- [x] **Bộ kiểm thử tự động chuyên sâu:**
  - `backend/tests/tmdb-service.test.ts`: 9 tests kiểm tra toàn diện unit logic tìm kiếm, trích xuất chi tiết, bẫy lỗi `INVALID_TMDB_ID`, và RBAC bảo vệ endpoint (chặn 401 unauthenticated, chặn 403 CUSTOMER, cho phép STAFF/ADMIN). Đạt **9/9 tests PASSED (100%)**.
  - `frontend/tests/admin-management.test.tsx`: Bổ sung 1 test case kiểm tra luồng tìm kiếm TMDB và tự động điền form trên UI. Đạt **11/11 tests PASSED (100%)**.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **505/505 tests PASSED (100%)** trên 26 test files (tăng 9 tests).
  - Frontend: **165/165 tests PASSED (100%)** trên 16 test files (tăng 1 test).
  - Tổng số kiểm thử toàn dự án: **670/670 tests PASSED (100%)** trên 42 test files.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint` trên 44 frontend files).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.
  - Audit: `npm audit` đạt **found 0 vulnerabilities**.

### [2026-10-05] Đợt 12: Tích Hợp Đăng Nhập Bằng Google (Google OAuth 2.0 / Google Identity Services - GIS)
- [x] **Cấu hình Client ID Môi trường:**
  - Google Client ID: `654757631309-sjiqqi45ii97b592t419305qt3jkupoq.apps.googleusercontent.com`.
  - Cấu hình an toàn tại [backend/.env](file:///c:/Users/ASUS/Desktop/DoAn4/backend/.env) (`GOOGLE_CLIENT_ID`), [backend/.env.example](file:///c:/Users/ASUS/Desktop/DoAn4/backend/.env.example).
  - Cấu hình tại [frontend/.env](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/.env) (`VITE_GOOGLE_CLIENT_ID`), [frontend/.env.example](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/.env.example).
- [x] **Dịch vụ Backend Google Auth & Xác thực Token [google-auth.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/google-auth.service.ts):**
  - Xác thực trực tiếp ID token từ Google endpoint `https://oauth2.googleapis.com/tokeninfo`.
  - Kiểm tra tính hợp lệ của Audience (`aud`), Issuer (`iss` thuộc `accounts.google.com`), và yêu cầu email đã được xác thực từ Google (`email_verified = true`).
  - Hỗ trợ fallback mock trong môi trường unit testing cô lập.
- [x] **Nghiệp vụ Đăng nhập & Hoàn tất Đăng ký Google [auth.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/auth/auth.service.ts):**
  - **Tài khoản đã tồn tại có số điện thoại:** Đăng nhập tức thời, cấp Access Token và Refresh Token cookie an toàn (`HttpOnly`, `SameSite=Strict`), trả về thông tin User.
  - **Tài khoản mới hoặc chưa có số điện thoại:** Google OAuth không cung cấp số điện thoại. Để tuân thủ nghiêm ngặt ràng buộc cơ sở dữ liệu `chk_users_phone` (`0[0-9]{9}`):
    - Trả về cờ `requirePhone: true` kèm `tempToken` JWT (hết hạn 15 phút) mang thông tin `googleSub`, `email`, `fullName`, `avatarUrl`.
    - Người dùng được hiển thị bước bổ sung số điện thoại trên giao diện CineX.
    - Gọi endpoint hoàn tất `POST /api/v1/auth/google/complete` với `{ tempToken, phone }`.
    - Tạo tài khoản người dùng `ACTIVE` với mật khẩu ngẫu nhiên bảo mật cao 32-byte (thỏa mãn ràng buộc `chk_users_active_password`), lưu `avatarUrl`, lưu số điện thoại và đăng nhập thành công.
- [x] **API Endpoints & Controllers [auth.routes.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/auth/auth.routes.ts):**
  - `POST /api/v1/auth/google`: Đăng nhập/xác thực Google Credential.
  - `POST /api/v1/auth/google/complete`: Hoàn tất bổ sung số điện thoại cho tài khoản Google mới.
- [x] **Frontend Tích hợp Google Identity Services (GIS):**
  - Nhúng thư viện Google chuẩn `https://accounts.google.com/gsi/client` vào [frontend/index.html](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/index.html).
  - Cập nhật [frontend/src/services/api.ts](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/services/api.ts) và [frontend/src/context/AuthContext.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/context/AuthContext.tsx) với `loginWithGoogle` và `completeGoogleRegistration`.
  - Cải tiến [frontend/src/components/AuthModal.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/AuthModal.tsx):
    - Nút Google Sign-in chuẩn theo GIS `renderButton` với dark theme và phân cách trực quan "Hoặc tiếp tục với".
    - Màn hình phụ "HOÀN TẤT THÔNG TIN" mượt mà khi phát hiện tài khoản mới, hiển thị Avatar Google, Tên, Email và form nhập số điện thoại Việt Nam chuẩn 10 số.
    - Nút đăng nhập Google fallback phục vụ môi trường kiểm thử tự động / chặn script.
- [x] **Bộ kiểm thử tự động chuyên sâu:**
  - `backend/tests/google-auth.test.ts`: 6 tests kiểm tra toàn diện unit và integration của Google Auth (đăng nhập trực tiếp user cũ, yêu cầu số điện thoại cho user mới, hoàn tất đăng ký với phone hợp lệ, chặn phone sai format theo regex `chk_users_phone`, từ chối token Google giả mạo, chặn tempToken giả/hết hạn). Đạt **6/6 tests PASSED (100%)**.
  - `frontend/tests/auth-google.test.tsx`: 4 tests kiểm tra tích hợp giao diện (đăng nhập trực tiếp bằng Google, mở bước hoàn tất thông tin & nhập số điện thoại, bẫy lỗi xác thực từ máy chủ, và nút hủy quay lại đăng nhập). Đạt **4/4 tests PASSED (100%)**.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend: **511/511 tests PASSED (100%)** trên 27 test files (tăng 6 tests).
  - Frontend: **169/169 tests PASSED (100%)** trên 17 test files (tăng 4 tests).
  - Tổng số kiểm thử toàn dự án: **680/680 tests PASSED (100%)** trên 44 test files.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint` trên 45 frontend files).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.
  - Audit: `npm audit` đạt **found 0 vulnerabilities**.

### [2026-10-07] Đợt 13: Dọn Dẹp Mã Nguồn Giả Lập Cũ (Dead Code Cleanup) & Tối Ưu Hóa Giao Diện
- [x] **Xóa bỏ các tệp giả lập thừa (Dead Code Removal):**
  - Đã loại bỏ hoàn toàn mảng phim tĩnh cũ: `frontend/src/data/mockMovies.ts` (và dọn dẹp thư mục rỗng `frontend/src/data/`).
  - Đã loại bỏ hai component mock cũ không còn dùng trong trang chủ: `frontend/src/components/Hero.tsx` và `frontend/src/components/NowShowingSection.tsx`.
  - Toàn bộ trang chủ và luồng duyệt phim chạy 100% bằng [Discovery.tsx](file:///c:/Users/ASUS/Desktop/DoAn4/frontend/src/components/Discovery.tsx) kết nối trực tiếp CSDL MySQL và dịch vụ TMDB thật.
- [x] **Tối ưu hóa Bundle CSS/JS:**
  - CSS build giảm từ 66.11 kB xuống còn 57.70 kB (giảm ~13% CSS dư thừa từ component cũ).
- [x] **Kiểm chứng toàn diện:**
  - Frontend Tests: **169/169 tests PASSED (100%)** trên 17 test files.
  - Backend Tests: **511/511 tests PASSED (100%)** trên 27 test files.
  - Tổng số kiểm thử: **680/680 tests PASSED (100%)**.
  - Lint Frontend: **0 lỗi / 0 cảnh báo** (`oxlint` trên 42 tệp nguồn).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.

### [2026-10-07] Đợt 14: Tích Hợp Dịch Vụ Gửi Email Thật Qua SMTP (Nodemailer & CineX Branded Templates)
- [x] **Cài đặt & Thiết lập Thư viện Nodemailer:**
  - Cài đặt `nodemailer` và `@types/nodemailer` trong workspace `backend`.
  - Cấu hình các biến môi trường tại [backend/.env](file:///c:/Users/ASUS/Desktop/DoAn4/backend/.env) và [backend/.env.example](file:///c:/Users/ASUS/Desktop/DoAn4/backend/.env.example):
    - `SMTP_HOST`: Máy chủ SMTP (mặc định `smtp.gmail.com`).
    - `SMTP_PORT`: Cổng kết nối (`587` cho STARTTLS, `465` cho SSL).
    - `SMTP_SECURE`: Cờ bảo mật SSL/TLS.
    - `SMTP_USER`: Địa chỉ email gửi thư (VD: Gmail của bạn).
    - `SMTP_PASS`: Mật khẩu ứng dụng (Gmail App Password 16 ký tự hoặc API Key).
    - `SMTP_FROM`: Tên hiển thị người gửi (VD: `"CineX Cinema" <no-reply@cinex.vn>`).
- [x] **Nâng cấp Dịch vụ Mail [mail.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/shared/mail.service.ts):**
  - Tự động khởi tạo `nodemailer.createTransport` khi phát hiện đầy đủ thông tin SMTP.
  - Phương thức `isSmtpConfigured()` kiểm tra trạng thái kích hoạt SMTP.
  - Phương thức `verifyConnection()` kiểm tra bắt tay và xác thực với máy chủ SMTP.
  - Cơ chế **Fallback an toàn**: Khi chưa điền thông tin SMTP hoặc trong môi trường test tự động, dịch vụ tự động chuyển về in-memory + console log, đảm bảo không bao giờ làm gián đoạn luồng nghiệp vụ.
  - **Mẫu Email HTML chuẩn CineX Rewards**:
    - Email đặt lại mật khẩu: Giao diện nền tối điện ảnh (#0B0A0C), viền vàng (#FFB23E), nút CTA nổi bật "ĐẶT LẠI MẬT KHẨU", cảnh báo thời hạn 15 phút.
    - Email xác thực tài khoản: Hướng dẫn kích hoạt, nút CTA "KÍCH HOẠT TÀI KHOẢN", thông tin đặc quyền thành viên CineX Rewards.
- [x] **Bộ kiểm thử tự động chuyên sâu [mail-service.test.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/tests/mail-service.test.ts):**
  - 5 tests kiểm tra toàn diện: Chế độ fallback in-memory, khởi tạo transporter khi có config, gửi email đặt lại mật khẩu thật qua transporter, bẫy lỗi timeout/auth mà không làm sập server, và lưu/dọn dẹp lịch sử gửi thư. Đạt **5/5 tests PASSED (100%)**.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend Tests: **516/516 tests PASSED (100%)** trên 28 test files (tăng 5 tests).
  - Frontend Tests: **169/169 tests PASSED (100%)** trên 17 test files.
  - Tổng số kiểm thử toàn dự án: **687/687 tests PASSED (100%)** trên 45 test files.
  - Lint: **0 lỗi / 0 cảnh báo** (`oxlint`).
  - Build: Cả 2 workspace (`backend` và `frontend`) biên dịch thành công 100%.
  - Audit: `npm audit` đạt **found 0 vulnerabilities**.

### [2026-10-07] Hoàn thiện Thiết kế Bộ mẫu Email (HTML Form Email) & Tích hợp Tự động gửi Vé E-Ticket (Đợt 15)
- [x] **Thiết kế hoàn chỉnh bộ 3 mẫu thư điện tử HTML chuẩn CineX Cinematic Luxury:**
  1. **Email Xác thực tài khoản thành viên (`sendEmailVerification`):**
     - Banner CineX Rewards thương hiệu vàng kim (`#FFB23E`) trên nền than chì điện ảnh (`#0B0A0C`).
     - Lời chào cá nhân hóa, nút bấm hành động (CTA) kích hoạt nổi bật.
     - Khung thông tin quyền lợi thành viên (tích điểm 10%, vé đồng giá 55k thứ Ba, quà sinh nhật).
     - Thời hạn kích hoạt 24 giờ và link dự phòng.
  2. **Email Đặt lại mật khẩu tài khoản (`sendPasswordReset`):**
     - Nút CTA chuyển tiếp trực tiếp vào trang `/reset-password?token=...`.
     - Cảnh báo bảo mật thời hạn hiệu lực 15 phút, tự hủy sau 1 lần dùng.
  3. **Email Vé xem phim điện tử E-Ticket (`sendBookingConfirmation`):**
     - Poster phim chính thức chất lượng cao từ TMDB.
     - Tên rạp chiếu, định dạng phòng (2D / 3D / IMAX LASER), ngày giờ chiếu chính xác.
     - Danh sách ghế ngồi chi tiết (Vip / Standard / Couple).
     - Danh mục Combo bắp nước đi kèm (số lượng và tên combo).
     - Mã đơn hàng & Mã vé điện tử riêng biệt.
     - **Mã QR Code động** tạo tự động qua API chuẩn để nhân viên soát vé quét trực tiếp tại cửa rạp.
     - Bảng tổng tiền thanh toán (VND) và phương thức giao dịch (VNPay).
     - Khung lưu ý và hướng dẫn vào phòng chiếu (thời gian đến rạp, quy định nhận bắp nước).
- [x] **Tích hợp Tự động vào Luồng Thanh toán [payment.service.ts](file:///c:/Users/ASUS/Desktop/DoAn4/backend/src/modules/payments/payment.service.ts):**
  - Trong hàm `fulfillPaidOrder`, sau khi transaction hoàn tất (PAID ghế, SOLD vé), hệ thống tự động kích hoạt tiến trình gửi mail bất đồng bộ (non-blocking) tới email khách hàng hoặc email tài khoản đặt vé.
- [x] **Thực nghiệm Gửi Thư Thật thành công:**
  - Đã gửi trực tiếp email vé điện tử mẫu (Dune: Part 2, IMAX LASER, ghế F07-F08 VIP, mã QR) tới hòm thư cá nhân: `luongviettienns@gmail.com`.
- [x] **Bằng chứng kiểm chứng toàn diện:**
  - Backend Tests: **518/518 tests PASSED (100%)** trên 28 test files.
  - Frontend Tests: **169/169 tests PASSED (100%)** trên 17 test files.
  - Tổng số kiểm thử toàn dự án: **687/687 tests PASSED (100%)** trên 45 test files.
  - TypeScript build cả 2 workspace: `tsc -b` & `vite build` 100% không lỗi.

### [2026-10-07] Biên soạn Tài liệu Tổng hợp Kiến trúc, Luồng Nghiệp vụ & Kịch bản Demo Hệ thống cho Giáo viên (Đợt 16)
- [x] **Xây dựng hoàn chỉnh tài liệu chuyên sâu [KICH_BAN_VA_LUONG_CHUC_NANG_HE_THONG.md](file:///c:/Users/ASUS/Desktop/DoAn4/KICH_BAN_VA_LUONG_CHUC_NANG_HE_THONG.md):**
  - **Phần 1: Tổng quan hệ thống & Đặc tả công nghệ:** Sơ đồ kiến trúc Mermaid, giải trình toàn bộ ngăn xếp kỹ thuật React 19, Node.js Express, Prisma, MySQL 8.0, VNPay Sandbox, Google Identity Services OAuth 2.0, TMDB API, Google SMTP, HMAC-SHA256 Ticket Signature.
  - **Phần 2: Ma trận phân quyền RBAC:** Phân tách rõ ràng thẩm quyền của 4 nhóm tác nhân (`GUEST`, `CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`).
  - **Phần 3: Danh mục chi tiết các luồng chức năng F01–F19 đã hoàn thiện 100%:** Luồng tài khoản, duyệt phim, sơ đồ ghế trực quan, khóa giữ chỗ 10 phút Pessimistic Hold, thanh toán trực tuyến VNPay, xuất vé QR có chữ ký số, lịch sử vé & hủy vé $\ge 2h$, trạm soát vé điện tử, quản trị danh mục phim tự động điền TMDB, xếp suất chiếu chống xung đột BR-10, quản trị bảng giá động & ngày lễ, voucher/combo, báo cáo doanh thu CSV UTF-8 BOM, đối soát hoàn tiền F16 và Background Sweeper Worker F19.
  - **Phần 4: Thiết kế 6 Kịch bản Demo thực tế từng bước (Step-by-step Scripts):**
    1. Luồng Khách hàng Đặt vé & Thanh toán Online (End-to-End).
    2. Luồng Nhân viên Soát vé tại Rạp (Check-in, Quét QR, Chống tái sử dụng vé BR-11, Ngoại lệ trễ giờ Manager Bypass).
    3. Luồng Khách hàng Hủy vé & Quản trị Đối soát Hoàn tiền (F16 & BR-14).
    4. Luồng Quản trị Danh mục Phim & Tích hợp TMDB API (Auto-fill trong 0.1s).
    5. Luồng Quản lý Suất chiếu, Bảng giá & Chống xung đột phòng (BR-10).
    6. Luồng Báo cáo Doanh thu & Xuất dữ liệu Excel/CSV (UTF-8 BOM).
  - **Phần 5: 5 Luận điểm kỹ thuật then chốt để bảo vệ trước Hội đồng:** Khóa dòng CSDL `SELECT ... FOR UPDATE` chống Race Condition, Idempotency Token hash SHA-256, Cinema-Scope Invariant, Chữ ký số HMAC-SHA256 cho QR, Bộ kiểm thử tự động 687 tests (100% pass, coverage >93%).
### [2026-10-10] Đợt 17: Kiểm thử Tổng Thể, Đóng Gói & Đồng Bộ Toàn Diện Dự Án Lên GitHub
- [x] **Kiểm thử tự động tích hợp toàn hệ thống:**
  - Chạy `npm run test` trên cả 2 workspaces: **688/688 tests PASSED (100%)** trên 45 test files (Backend 519 tests / Frontend 169 tests).
  - Không có bất kỳ hồi quy (regression) hay bài kiểm thử nào thất bại.
- [x] **Biên dịch mã nguồn sản xuất (Production Build):**
  - Frontend: `tsc -b && vite build` biên dịch thành công (bundle tối ưu hóa, không có lỗi type).
  - Backend: `tsc` biên dịch thành công (0 lỗi TypeScript).
- [x] **Đóng gói tài liệu & kịch bản:**
  - Hoàn thiện tài liệu báo cáo [12523083_LuongVietTien.docx](file:///c:/Users/ASUS/Desktop/DoAn4/BaoCao/12523083_LuongVietTien.docx).
  - Tài liệu tổng hợp kiến trúc và kịch bản demo hội đồng [KICH_BAN_VA_LUONG_CHUC_NANG_HE_THONG.md](file:///c:/Users/ASUS/Desktop/DoAn4/KICH_BAN_VA_LUONG_CHUC_NANG_HE_THONG.md) và [CineX_Tong_hop_he_thong_va_kich_ban_demo.docx](file:///c:/Users/ASUS/Desktop/DoAn4/CineX_Tong_hop_he_thong_va_kich_ban_demo.docx).
- [x] **Đồng bộ kho lưu trữ Git & GitHub:**
  - Chuẩn hóa file theo dõi `.gitignore`, bảo đảm không rò rỉ secret hoặc `.env`.
  - Thực hiện commit toàn bộ thay đổi và push lên nhánh `main` repository `origin`.
- [x] **Xác thực Pipeline GitHub Actions CI ("Core verification"):**
  - Workflow CI chạy tự động trên Ubuntu Linux runner với MySQL 8.0 service container.
  - Vượt qua 100% toàn bộ 14 bước: `npm ci`, `prisma generate`, `build:backend`, `build:frontend`, `lint`, `test:coverage` (với ngưỡng coverage gate vững chắc), và `test:e2e` Playwright Chromium tương tác trình duyệt thật. Trạng thái: **GREEN / SUCCESS** ([Run #38031359351](https://github.com/luongviettienns/DoAn4/actions/runs/38031359351)).









