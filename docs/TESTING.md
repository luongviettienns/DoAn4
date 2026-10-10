# Kiểm thử dự án

Kế hoạch nghiệm thu từng bước theo vai trò, phân hệ và vòng nghiệp vụ khép kín: [Kế hoạch kiểm thử luồng người dùng CineX — 08/10/2026](superpowers/plans/2026-10-08-ke-hoach-kiem-thu-luong-nghiep-vu.md). Kế hoạch ghi rõ kịch bản, dữ liệu đối soát, khoảng trống triển khai và điều kiện PASS; không thay thế bằng chứng chạy test.

## Chạy trên máy phát triển

Điều kiện đã kiểm chứng: Node.js 24, MySQL 8, dependencies từ lockfile và Prisma Client sinh từ schema hiện tại. Không dùng CSDL production để chạy test.

```powershell
npm ci
npm exec --workspace=backend -- prisma generate
npm test
npm run test:coverage
```

`npm test` chạy cả frontend và backend. `npm run test:coverage` chạy cả hai và sinh báo cáo HTML/LCOV/JSON. Lint và build là kiểm tra độc lập:

```powershell
npm run build:backend
npm run build:frontend
npm run lint --workspace=frontend
```

## CSDL riêng cho test

Runner backend lấy kết nối phát triển từ `backend/.env`, tự đổi tên DB thành `<database>_test`. Có thể chỉ định DB khác:

```powershell
$env:TEST_DATABASE_URL = 'mysql://test_user:test_password@127.0.0.1:3306/cinema_booking_ci_test'
npm run test:coverage --workspace=backend
```

Mỗi lượt `npm test --workspace=backend` hoặc `test:coverage` **reset DB kiểm thử**, áp dụng schema + CHECK SQL, seed rồi chạy suite tuần tự. DB này phải dành riêng cho test. Runner từ chối tên trùng DB nguồn kể cả khác host, tên không có hậu tố `_test` hoặc identifier không an toàn. Tài khoản test cần quyền tạo/reset DB đó; có thể dùng một MySQL instance riêng cho team/CI.

Các suite cũ còn sử dụng dữ liệu seed và phụ thuộc thứ tự một số case; runner cung cấp baseline mới mỗi lượt để không tích lũy ghế đã bán. Các suite bổ sung dùng UUID/namespace riêng và cleanup trong finally. Không chạy nhiều lượt reset hoặc suite worker toàn DB cùng lúc trên cùng test database.

Sau khi đã chuẩn bị DB, có thể chạy riêng một file **không reset**:

```powershell
npm exec --workspace=backend -- vitest run tests/core.integration.test.ts
npm exec --workspace=frontend -- vitest run tests/checkout.test.tsx
```

Tên file frontend thực tế xem trong `frontend/tests/`; CLI nhận đường dẫn hoặc filter tên phù hợp. Cấu hình Vitest backend vẫn đổi `DATABASE_URL` sang DB test trước khi nạp Prisma, kể cả chạy trực tiếp bằng CLI.

## Bộ kiểm thử được bổ sung

| File/nhóm | Bảo vệ hành vi nào |
|---|---|
| `backend/tests/core.integration.test.ts` | Core booking, quyền/sở hữu, thanh toán/IPN và refund, soát vé, worker; includes các tranh chấp trên MySQL thật. |
| `backend/tests/auth-security.test.ts` | Refresh inactive account, rotation/concurrency/replay và thu hồi family. |
| `backend/tests/auth-profile.test.ts` | Hồ sơ, đổi mật khẩu, revoke session, input và tài khoản chờ xác minh. |
| `backend/tests/catalog-management.test.ts` | Danh mục phim/rạp/phòng được triển khai, CRUD có quyền và lỗi nghiệp vụ. |
| `backend/tests/showtime-management.test.ts` | Danh mục suất, phạm vi MANAGER, validation/cleaning/tranh lịch phòng/BLOCKED; giá ngày VN/ngày lễ/hiệu lực và snapshot online/quầy. |
| `backend/tests/voucher-combo-management.test.ts` | CRUD hiện có, input/role, giá combo snapshot/phạm vi rạp; voucher scope/math/ngày/quota/biên hết hạn, tranh lượt cuối và khách thành viên tại quầy. |
| `backend/tests/report-scope.test.ts` | Giới hạn rạp hiện tại của MANAGER, literal sales/cash/refund, movie/date filters và sức chứa snapshot có COUPLE/BLOCKED. |
| `backend/tests/payment-security.test.ts` | API mô phỏng yêu cầu auth và không hoạt động ở production. |
| `backend/tests/vnpay-adapter.test.ts` | Request encoding/số tiền, chữ ký độc lập, query/checksum malformed và duplicate field. |
| `backend/tests/test-environment.test.ts` | Chặn reset DB nguồn/alias/tên không an toàn; cấu hình lặp và kế thừa nguồn ở CI không có `.env`; chỉ chạy cấu hình trong process con, không ghi MySQL. |
| `backend/tests/e2e-diagnostics.test.ts` | Chẩn đoán lỗi browser/server có giới hạn, không xuất URL ký/credential/token/cookie hoặc raw server logs. |
| `frontend/tests/` | Component/AuthProvider/API client thật: đăng nhập/đăng ký, refresh, chọn ghế, checkout/retry/deadline/cancel, vé, lịch sử, checkin/báo cáo và lỗi HTTP. |

Fixture ký callback bằng crypto độc lập với `VnpayAdapter` để không tự kiểm chính thuật toán bị lỗi. Các case concurrency đặt thời điểm giao nhau bằng thao tác DB thật; mock network frontend là response HTTP kiểm soát được, không phải mock toàn component cần kiểm thử.

## Coverage và gate

- Backend: `backend/coverage/index.html`, `backend/coverage/coverage-summary.json`, `backend/coverage/lcov.info`.
- Frontend: `frontend/coverage/index.html`, `frontend/coverage/coverage-summary.json`, `frontend/coverage/lcov.info`.
- CI: `.github/workflows/ci.yml` dựng MySQL test riêng, generate Prisma, build, lint và test/coverage, sau đó chạy Chromium E2E tuần tự; lỗi làm job fail, coverage và báo cáo/ảnh E2E được upload thành artifact.

Coverage tính toàn source; chỉ loại entrypoint/asset/type declaration. Vitest và CI fail nếu backend dưới **90% lines / 80% branches** hoặc frontend dưới **75% lines / 70% branches**. Các ngưỡng giữ baseline hiện tại, không thay thế nghiệm thu từng nghiệp vụ hoặc E2E; không bỏ module chưa test để tuyên bố phủ kín. Kết quả mới nhất sau gate CI ngày 04/10/2026: **410 backend + 140 frontend = 550 test đạt**, lines **94.33% / 89.31%**, branches **82.35% / 80.73%**. Số liệu và khoảng trống nằm trong [đánh giá phát hành](PRODUCTION_READINESS.md).

Browser E2E hai phiên đã bổ sung cho Chặng 1. Các kiểm thử hiện có chưa thay thế: giao dịch VNPay sandbox bên ngoài, quét QR/camera/in vé thật, load/soak test, rollback triển khai, backup/restore và các chức năng chưa tồn tại trong source.
# Chặng 1

Kiểm thử giữ ghế và trả kết quả gồm `backend/tests/booking-hold.test.ts`, các suite frontend Discovery/Seat/Checkout/App/PaymentResult/API/Auth/Ticket, và browser E2E `backend/scripts/stage1-browser-e2e.cjs`. Hành vi và hợp đồng: [STAGE1_DELIVERY.md](STAGE1_DELIVERY.md).

Browser E2E dùng Chromium, React/Vite, Express và MySQL `_test` thật; cần chuẩn bị DB bằng backend runner trước. Không chạy song song với runner reset DB. Script tự mở hai server ở port riêng, dọn browser/server cuối và chỉ gọi cổng thanh toán giả lập đích local với IPN ký qua service thật. Xem [hướng dẫn E2E](stage1-e2e-notes.md) để cấu hình Playwright/Chromium. Giao dịch VNPay sandbox bên ngoài vẫn là bước nghiệm thu staging riêng.
