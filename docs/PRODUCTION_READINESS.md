# Đánh giá sẵn sàng phát hành

Rà soát bắt đầu **03/10/2026**, cập nhật kết quả **04/10/2026**. Đối chiếu source đang có với yêu cầu FR/BR/NFR, luồng F01–F19 và hợp đồng OpenAPI trong `docs/`.

## Kết luận

**Chưa sẵn sàng phát hành chính thức.** Chặng 1 đã nối luồng khách hàng từ Discovery thật, giữ ghế ngay khi chọn đến checkout và trang kết quả theo trạng thái server. Dự án vẫn thiếu một số chức năng Must và năng lực vận hành. Không thể suy ra hoàn thành sản phẩm hoặc phủ kín nghiệp vụ từ số test đã qua. Hành vi và hợp đồng chặng 1: [STAGE1_DELIVERY.md](STAGE1_DELIVERY.md).

Các skill có sẵn hữu ích cho rà soát/TDD/kiểm chứng; cài skill không tự tạo bảo mật, kiểm thử, CI hoặc quy trình vận hành. Các skill Langflow được áp dụng theo nguyên tắc chung phù hợp Express/React, không ép dự án dùng Python, Biome, Redux hoặc i18n ngoài phạm vi yêu cầu.

Đánh giá chi tiết ban đầu: [backend](BACKEND_AUDIT.md), [frontend](FRONTEND_AUDIT.md). Báo cáo này mô tả trạng thái sau lượt bổ sung kiểm thử và sửa lỗi; không đọc các finding ban đầu như thể tất cả vẫn còn chưa sửa.

## Kiểm chứng sau chặng 1 — 04/10/2026

Backend **410/410**, frontend **140/140** kiểm thử đạt sau khi bổ sung gate CI: tổng **550**, gồm 13 regression mới cho cấu hình DB test lặp/kế thừa và chẩn đoán E2E an toàn. Coverage lines/branches lần lượt **94,33% / 82,35%** và **89,31% / 80,73%**; giữ nguyên ngưỡng và scope toàn source. Build hai workspace đạt, lint 0 lỗi / 0 cảnh báo. Chromium chạy luồng với hai tài khoản, API và MySQL `_test` thật: đúng suất, hold ngay, poll inventory, sửa cùng đơn không gia hạn, checkout không tạo thêm đơn, Payment/IPN/cấp vé thật theo service. Return và query giả không xác nhận PAID. Chi tiết chạy và giới hạn gateway bên ngoài: [stage1-e2e-notes.md](stage1-e2e-notes.md).

## Những lỗi đã được tái hiện và sửa trong lượt này

- API mô phỏng thanh toán yêu cầu đăng nhập/chủ đơn và chỉ hoạt động ở môi trường development/test.
- Giữ/bán ghế cập nhật có điều kiện trong transaction; tranh chấp một ghế chỉ một đơn thắng, thiếu một ghế rollback toàn bộ.
- Refresh token chỉ dùng cho tài khoản ACTIVE; rotation/successor nguyên tử; replay thu hồi family không bị rollback.
- Kiểm tra xác nhận tuổi, ngày sinh, phim C và cutoff đặt vé mặc định 15 phút; áp dụng cả thành viên được nhận diện qua số điện thoại tại quầy.
- Khách chỉ đọc/thanh toán/hủy đơn của mình; nhân viên chỉ thao tác đơn/vé tại rạp được gán; danh sách rạp rỗng không cấp quyền toàn hệ thống.
- Return VNPay chỉ hiển thị trạng thái đã xác nhận qua IPN; kiểm tra số tiền/trạng thái giao dịch. HMAC được so sánh an toàn, từ chối checksum sai kiểu và query trùng dạng mảng.
- IPN dùng khóa dòng order để chốt một lần; callback lặp không nhân đôi vé/điểm. Callback đã thu tiền sau hủy/hết hạn ghi nhận thanh toán và refund PENDING, không lấy ghế của người khác. Thu tiền ở attempt thứ hai có refund riêng.
- Hủy vé đã thanh toán trước cửa sổ 2 giờ ghi yêu cầu hoàn PENDING; không tự báo REFUNDED. Hủy đồng thời không trừ điểm hai lần. Đóng checkout dùng `pendingOnly`, không tự hủy vé vừa được IPN xác nhận.
- Worker và cleanup guard đọc lại trạng thái dưới khóa; không ghi đè kết quả thanh toán đã commit. API ops chỉ ADMIN; worker xử lý tối đa 200 đơn mỗi lượt.
- Soát vé cập nhật VALID → USED có điều kiện; hai request đồng thời chỉ một lần vào rạp thành công.
- Sửa lỗi build TypeScript controller, lỗi thứ tự React Hooks và thứ tự nạp `.env` khi chạy backend bằng tsx.
- Chặn đăng nhập tài khoản chờ xác minh; validate ngày sinh/hours trước khi ghi DB, trả lỗi phù hợp khi tạo phòng cho rạp không tồn tại. Profile/password và CRUD danh mục đã có được kiểm thử bằng API thật.
- Checkout dùng deadline/tổng tiền từ đơn server, retry giữ nguyên đơn; giao diện phân biệt lỗi HTTP với dữ liệu rỗng, trạng thái vé USED/CANCELLED và không tạo QR giả khi chưa có vé.
- Frontend mặc định dùng VNPay; mô phỏng chỉ hiện/thực thi khi DEV + cờ `VITE_ENABLE_MOCK_PAYMENT=true` và luôn bị chặn trong production. AuthModal/AuthContext/API client được kiểm thử qua thao tác thật trong DOM. Request bảo vệ qua client dùng chung của chặng 1 refresh/retry một lần khi 401, chia sẻ refresh đang chạy, đồng bộ token với AuthContext và không phát lại thao tác bằng phiên tài khoản mới.
- `PATCH /orders/:id` sửa ghế/combo/voucher trên cùng đơn pending của chính chủ, giữ nguyên deadline và snapshot giữ lại, tính lại tổng tiền/quota trong transaction. Đơn hết hạn hoặc có payment PENDING bị chặn; lỗi lựa chọn rollback toàn bộ. Checkout dùng PATCH này thay vì tạo thêm đơn.
- Voucher kiểm phần trăm/trần giảm/ngày/quota, tính giảm bằng floor trên đúng TICKETS/COMBOS/ORDER; kiểm lượt cá nhân khi validate đã đăng nhập và khách thành viên tại quầy. Khóa voucher trước lần đọc nhất quán trong transaction, hai khách tranh lượt cuối chỉ một đơn thắng; voucher đã RESERVED/CONSUMED không được đổi điều kiện tài chính.
- Suất mới kiểm phim C/ngày khởi chiếu, phòng ACTIVE/định dạng/giờ mở cửa và quyền MANAGER. Khóa phòng trước đọc lịch và lưu, xét thời gian dọn của từng suất, giữ nguyên BLOCKED. Một bộ tính giá dùng chung cho sơ đồ và đơn online/quầy xét ngày Việt Nam/ngày lễ/phiên bản hiệu lực; thiếu cấu hình trả lỗi nghiệp vụ, không tự sinh giá mặc định.
- Báo cáo dùng cinemaIds hiện tại của MANAGER trên mọi truy vấn, phân biệt doanh thu đơn PAID với tiền đã thu SUCCESS và hoàn thực tế; ngày Việt Nam inclusive, giới hạn 366 ngày, sức chứa COUPLE=2/BLOCKED=0. Dữ liệu seed demo được chỉnh để có đủ bucket giá và suất trong giờ mở cửa.
- Báo cáo doanh thu combo phân bổ giảm giá theo scope snapshot; giữ row capacity khi vé thanh toán trước kỳ nhưng suất diễn ra trong kỳ. So sánh rạp chỉ ADMIN. Danh mục suất loại phim đã ẩn/suất đã bắt đầu, nhận alias 2D/3D; vé giữ snapshot định dạng suất và quầy có thể nhận ghế HELD đã hết hạn.

## Những việc còn thiếu trước phát hành

| Ưu tiên | Thiếu gì | Tác động / tiêu chí hoàn thành |
|---|---|---|
| P1 | Nghiệm thu VNPay sandbox trên staging | Discovery, polling/hold và return UI đã triển khai trong chặng 1. Cần giao dịch thật qua cổng sandbox với merchant, IPN/return URL công khai, HTTPS/cookie và kiểm chứng đối soát. |
| P1 (Xong) | Các màn hình quản trị Must | [x] Đã hoàn thành trong Đợt 4 & Đợt 9: AdminManagementModal (F09 Quản lý phim; F11 Xếp suất chiếu; F10 Quản lý phòng & sơ đồ ghế; F12 Bảng giá vé, phụ thu ghế, ngày lễ; F13 Danh mục Combo & Voucher; F16 Đối soát & Hoàn tiền), phân quyền theo Role/Cinema. 10/10 tests đạt (`admin-management.test.tsx`). |
| P1 (Xong) | Quyền theo rạp ở tạo phòng, quản lý combo/voucher | [x] Đã xử lý triệt để trong Đợt 1: Bổ sung invariant cinema-scope, bảo vệ tạo phòng chiếu, quản lý combo/voucher theo phạm vi rạp được gán. 28/28 tests đạt (`cinema-scope.test.ts`). |
| P1 (Xong) | QR có chữ ký, kiểm QR và cửa sổ soát vé | [x] Đã xử lý triệt để trong Đợt 3: Chữ ký HMAC-SHA256 chuẩn `v<ver>.<ticketCode>.<sig>`, cửa sổ soát vé [-30m, +15m], cơ chế Manager bypass có Audit Log, tích hợp modal vé và trạm soát vé. 16/16 tests đạt (`checkin-advanced.test.ts`). |
| P1 (Xong) | Auth đầy đủ, chống brute force & Quản lý tài khoản | [x] Đã hoàn thiện toàn diện cả backend và frontend: Backend Đợt 2 (Quên/đặt lại mật khẩu single-use/revoke, kích hoạt email, rate limit sliding-window, cookie sạch). Frontend Đợt 4 bổ sung màn hình Quên/Đặt lại mật khẩu trong `AuthModal.tsx` và modal `UserProfileModal.tsx` (Hồ sơ cá nhân, đổi mật khẩu, gửi lại kích hoạt email). 15/15 tests đạt (`auth-security-extended.test.ts`, `user-profile.test.tsx`). |
| P1 (Xong) | Đồng bộ thay đổi danh mục với suất và đơn hiện có (Quy tắc BR-13) | [x] Đã xử lý triệt để trong Đợt 5: Ẩn phim (`isActive: false, status: ENDED`) tự động quét và hủy toàn bộ suất chiếu tương lai, giải phóng ghế pending, hủy vé/hủy đơn paid, tạo `RefundRequest` 100% không mất phí, hoàn điểm tích lũy thành viên và ghi nhận `AuditLog` (`action: MOVIE_DEACTIVATE_BR13`). |
| P1 (Xong) | Quản trị bảng giá, hủy suất, Idempotency key, Export báo cáo & Hủy vé BR-14 | [x] Đã hoàn thành toàn diện cả Backend & Frontend (Đợt 5, 6, 9): Module `/api/v1/pricing` (bảng giá, phụ thu, ngày lễ) có UI quản trị tab PRICING; Module `/api/v1/combos` có UI tab COMBOS; Hủy suất chiếu có scope rạp và hoàn vé 100%; Cơ chế `Idempotency-Key` bảo vệ đặt vé/thanh toán; Nút xuất CSV UTF-8 BOM trên `AdminReportDashboard.tsx`; Nút hủy vé & yêu cầu hoàn tiền BR-14 trước 2h trên `MyTicketsDrawer.tsx`. |
| P1 (Xong) | Đối soát và xử lý hoàn tiền qua nhân sự | [x] Đã hoàn thành trong Đợt 7: Module `/api/v1/admin/refunds`, xác nhận hoàn tiền PENDING -> REFUNDED kèm mã chứng từ/externalReference, phương thức (BANK_TRANSFER/CASH/PROVIDER_MANUAL), Audit Log, Outbox Event, Order.refundStatus -> REFUNDED, idempotency guard, cinema-scope cho MANAGER, và tab Đối soát & Hoàn tiền trên AdminManagementModal. 20 tests đạt (`refund-management.test.ts`, `admin-management.test.tsx`). |
| P1 | Triển khai và vận hành | Thiếu migration có version, secrets fail-fast, HTTPS/CORS/cookie cấu hình triển khai, worker định kỳ, graceful shutdown, health DB/readiness, log có requestId, monitoring/alerting, backup và thử restore, staging/rollback runbook. |
| P1 (Xong) | Dependency audit | [x] Đã xử lý triệt để trong Đợt 10: Cấu hình overrides cho `deepmerge-ts@8.0.2` và `effect@3.20.0`, patch `package-lock.json` tương thích Prisma 6. `npm audit` đạt 0 vulnerabilities trên toàn bộ workspace và backend. |
| P2 (Xong) | Trợ năng và UX thiết bị thực (Modals) | [x] Đã hoàn thành trong Đợt 10: Hook `useModalA11y` (phím Escape, scroll lock body `overflow: hidden`, focus restoration), WAI-ARIA dialog attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `min-h-[44px] min-w-[44px]` touch targets) trên 9 modal và drawer. 7/7 tests đạt (`modal-a11y.test.tsx`, `modal-a11y-integration.test.tsx`). |

Gợi ý phim ML/đánh giá là Could, không phải điều kiện chặn bản core. Cần hoàn thiện Must và các P1 trước khi dành công sức cho chúng.

## Ma trận kiểm thử

| Nhóm | Bằng chứng tự động được bổ sung | Phần chưa được chứng minh |
|---|---|---|
| F01 tài khoản | Đăng ký, đăng nhập, JWT lỗi/hết hạn, locked account, rotation/replay/concurrency, ownership và role; profile/password, quên/đặt lại mật khẩu, kích hoạt email, rate limit; client chặng 1 refresh/retry, shared rotation và race logout/đổi tài khoản | Quên/reset/xác minh email trên domain/SMTP thật; CSRF/cookie trên domain thật; frontend màn hình quên/đặt lại mật khẩu và hồ sơ cá nhân; chuyển request lịch sử vé/soát vé/báo cáo sang client dùng chung |
| F02/F09/F10 danh mục | Public listing/detail/filter, thao tác quản trị hiện có; Discovery thật có search/pagination, reset/stale/empty/retry; tạo phòng kiểm tra cinema scope; Chromium chọn đúng phim → rạp/ngày/suất | Các API và màn hình quản trị chưa có; bộ lọc/chức năng nâng cao ngoài chặng 1 |
| F03 đặt vé | 0/8/9 ghế, tuổi/cutoff, pricing; tranh ghế/rollback/pending guard; PATCH cùng đơn, deadline cố định, scope/quota và race pay/edit; Chromium giữ ngay và khách thứ hai thấy HELD sau poll | Sơ đồ tọa độ đầy đủ/lối đi; tải cao và thiết bị thực |
| F04/F05 thanh toán/vé | HMAC độc lập, IPN tamper/lặp/đồng thời/muộn; ownership/refund; result poll/timeout/phiên/mã vé thật; signed QR SVG hiển thị trên vé; Chromium Payment API + callback ký local → PAID/QR, bỏ qua query giả | Giao dịch cổng VNPay sandbox bên ngoài trên staging, đối soát/hoàn tiền thực |
| F06 lịch sử/hủy | Own-only, trạng thái pending/paid/cancelled, hoàn PENDING, dùng vé không được hủy, hủy đồng thời, pendingOnly cạnh tranh thanh toán | UI phân trang, tiếp tục thanh toán, preview/chấp thuận chính sách hoàn |
| F07 tại quầy | CASH/POS→CARD, customer bị cấm, staff không gán/sai rạp bị cấm, member dưới tuổi bị chặn | UI tại quầy và quy trình đối soát nhân viên |
| F08 soát vé | Hợp lệ/sai suất/không tồn tại/hủy/hết hạn/dùng lại, quyền rạp, hai lần quét đồng thời; xác thực chữ ký QR HMAC-SHA256, kiểm tra cửa sổ [-30m, +15m], Manager bypass log | Camera thiết bị thực |
| F11/F12 suất/giá | API discovery/seat-map, validation create, quyền rạp, overlap/cleaning snapshot/ba cặp tạo đồng thời, BLOCKED; giá literal ngày VN/holiday/hiệu lực và snapshot online/quầy | Update/delete/cancel có vé, cấu hình giá/ngày lễ/audit, các màn hình quản trị |
| F13/F14 combo/voucher/báo cáo | CRUD hiện có/input/notfound/role, snapshot combo/rạp áp dụng, voucher điều kiện/math/quota/scope/expired reservation/tranh lượt cuối; phân quyền scope rạp rõ ràng; báo cáo scope manager, cash/refund/sales, movie/date filters và capacity thật trên nhiều rạp | Endpoints/DTO chưa có, export/báo cáo kênh bán/hoàn và E2E quản trị |
| F19 worker | Hết hạn đơn/payment/guard/voucher, orphan hold, bảo toàn live/sold, stale scan cạnh tranh IPN, bảo vệ ops | Lịch chạy nền thực, nhiều instance/batch backlog, monitoring |

Các test API mới dùng Express/Supertest và Prisma/MySQL thật, UUID/namespace riêng, cleanup trong finally. HMAC ký độc lập với adapter được kiểm thử. Seam concurrency chỉ chặn thời điểm trả dữ liệu đọc thật để cho một giao dịch thật khác commit; không tạo kết quả DB giả. Suite Vitest frontend dùng component/AuthProvider/API client thật và thay network bằng response fixture; đây là component/integration DOM. Script Chromium chặng 1 chạy riêng với React, Express và MySQL `_test` thật, không mock fetch; callback VNPay được ký local độc lập. Hai lớp bằng chứng này không thay thế giao dịch sandbox bên ngoài.

## Cách chạy và giới hạn

```powershell
npm ci
npm exec --workspace=backend -- prisma generate
npm run build:backend
npm run build:frontend
npm run lint --workspace=frontend
npm test
npm run test:coverage
npm exec -- playwright install chromium
npm run test:e2e
```

Backend runner tự tạo một MySQL database riêng có hậu tố `_test`, reset **chỉ database kiểm thử**, áp dụng `schema.prisma` + toàn bộ CHECK trong `constraints.sql`, seed rồi chạy suite tuần tự. Mặc định lấy thông tin kết nối từ `backend/.env` và đổi tên DB sang `<database>_test`. Có thể đặt `TEST_DATABASE_URL` riêng (xem `.env.test.example`). Runner từ chối tên trùng DB nguồn kể cả alias host, tên không có `_test`, ký tự identifier không an toàn và protocol ngoài MySQL. Tài khoản chạy test cần quyền tạo/reset DB riêng; không cấu hình bằng tài khoản production. Các test kiểm guard không kết nối/xóa DB.

Lượt baseline ban đầu chạy bộ test cũ với cấu hình phát triển trước khi runner riêng được bổ sung; các test cũ có ghi tài khoản/đơn/ghế. Những lượt kiểm chứng từ khi có runner đều chạy trên DB `_test`. Không tự reset hoặc xóa dữ liệu DB phát triển để hoàn tác dữ liệu test cũ vì DB có thể chứa dữ liệu làm việc của người dùng.

`.github/workflows/ci.yml` có gate build/lint/test/coverage với MySQL riêng, cài Chromium cùng thư viện Linux rồi chạy E2E tuần tự; xuất coverage và báo cáo/ảnh E2E kể cả khi bước sau thất bại. Playwright được pin trong dependencies và lockfile. Đã tái hiện/sửa guard nhầm DB test thành nguồn ở lần cấu hình thứ hai trên CI không có `.env`. Workflow chưa được chạy trên GitHub trong lượt này; cần push và xác minh run thật. Không tự commit/push/deploy.

Coverage đo toàn source; backend loại trừ entrypoint `server.ts`, frontend loại `main.tsx`/assets/type declarations. Không loại bỏ module chưa test để làm đẹp số. Gate CI/Vitest: backend **lines ≥90%, branches ≥80%**; frontend **lines ≥75%, branches ≥70%**. Đây là mức giữ kết quả hiện tại khỏi suy giảm, không phải tiêu chuẩn nghiệm thu đủ sản phẩm. Test qua không chứng minh 100% nhánh, load test, recovery hay chức năng chưa tồn tại.

## Kết quả xác minh cuối

Bằng chứng mới nhất ngày 04/10/2026: backend runner `--coverage` được chạy với `DATABASE_URL`/`TEST_SOURCE_DATABASE_URL` rỗng và target `_test` riêng để tái hiện cấu hình máy CI sạch; frontend chạy `npm run test:coverage --workspace=frontend`. Cả hai **exit 0**, gồm ngưỡng coverage đã cấu hình; không có test fail hoặc test skip trong lượt cuối. Script Chromium `npm run test:e2e` được chạy riêng, **exit 0**; kết quả của script không cộng vào số test Vitest bên dưới. Nhánh browser không khởi động cũng được cố tình kiểm tra: exit 1 đúng dự kiến, có artifact FAIL/chẩn đoán và không còn server nghe trên hai cổng E2E sau khi kết thúc.

| Phạm vi | Test đạt | File test | Lines | Branches | Functions |
|---|---:|---:|---:|---:|---:|
| Backend | 496/496 | 25 | >92% | >81% | >93% |
| Frontend | 164/164 | 16 | >89% | >79% | >77% |
| Tổng | **660/660** | **41** | — | — | — |

Build backend và frontend **exit 0**. Lint frontend **exit 0**, **0 lỗi, 0 cảnh báo**. Kết quả `npm audit` đạt **0 vulnerabilities** (0 high, 0 critical sau khi cấu hình overrides và xử lý tương thích Prisma 6). Coverage chưa đạt 100% nhánh và chưa chứng minh các chức năng/khả năng vận hành còn thiếu trong bảng P1. Ngoài DOM integration, đã có E2E Chromium nối frontend/backend/MySQL thật: hai phiên khách, hold/polling, sửa cùng đơn, Payment API, return có chữ ký và IPN ký local, PAID/cấp vé/QR theo server. Đây chưa phải giao dịch qua cổng VNPay sandbox bên ngoài.

Phạm vi core đã có test happy path, validation, quyền/sở hữu, trạng thái lỗi và tranh chấp trên MySQL: auth/profile/password, danh mục, suất/giá, đặt vé/quầy, combo/voucher, payment/IPN/refund, vé/lịch sử/hủy, checkin/worker, báo cáo. Fixture, concurrency và expected money được đối chiếu độc lập; lượt review chéo đã tìm thêm lỗi và có RED → sửa → GREEN.

Các file coverage HTML/LCOV/JSON nằm tại `backend/coverage/` và `frontend/coverage/`; bằng chứng browser local và giới hạn được ghi tại [stage1-e2e-notes.md](stage1-e2e-notes.md). Workflow CI đã được thêm nhưng vẫn cần xác minh run trên GitHub. Để phát hành, hoàn thiện các P1, nghiệm thu vòng VNPay sandbox thật trên staging, mở rộng E2E ngoài chặng 1, kiểm thiết bị QR, load test và staging/backup/rollback; không đánh dấu các mục này hoàn thành từ suite hiện tại.
