# 08. Quy ước phát triển và dựng môi trường

> Đọc cùng [01. Yêu cầu](01-tong-quan-va-yeu-cau.md), [02. Luồng](02-luong-chuc-nang.md), [03. Màn hình](03-mo-ta-man-hinh.md), [04. Dữ liệu](04-thiet-ke-csdl.md), [05. API](05-thiet-ke-api.md), [06. Kiến trúc](06-kien-truc-he-thong.md) và [07. Kế hoạch](07-ke-hoach-du-an.md).
> Repository hiện là bộ tài liệu thiết kế. Cấu trúc mã nguồn, scripts, lệnh scaffold và `.env.example` dưới đây là **hợp đồng triển khai đề xuất**, chưa khẳng định repository đã có app, `package.json`, migration, seed hay scripts chạy được. Không chạy các lệnh `npm run ...` trước khi scaffold và tạo các file được yêu cầu.

## 1. Baseline và quyết định còn cần thống nhất

| Thành phần | Đã chốt theo 01 | Baseline triển khai đề xuất |
|---|---|---|
| Frontend | React + TypeScript, Redux Toolkit | Vite, React Router; RTK Query cho server state; access token chỉ trong bộ nhớ |
| Backend | Node.js REST API | Node.js **22.12+** trong major 22, Express + TypeScript + Zod; modular monolith, tách route/controller/service/repository |
| ORM | Prisma | CLI và `@prisma/client` cùng **6.19.0** để tái lập schema tham chiếu; nâng version qua PR riêng |
| Database | MySQL | MySQL **8.0.16+**, InnoDB, `utf8mb4`, kết nối/thời gian UTC; CHECK được thực thi từ mốc này, kiểm tra constraint/migration thực tế theo 04 |
| Thanh toán | VNPay sandbox (MoMo là lựa chọn thay thế) | MVP chỉ VNPay sandbox; không mở đồng thời nhiều provider khi chưa có nhu cầu |
| Xác thực | JWT (access token + refresh token) | Access **JWT** 15 phút; refresh **opaque ngẫu nhiên** 7 ngày qua cookie HttpOnly, DB lưu SHA-256 hash/family; rotation/thu hồi phiên |
| ML | Python FastAPI/Flask, tùy chọn | FastAPI service nội bộ, `127.0.0.1:8000` local; chỉ làm sau MVP; backend timeout/fallback |
| Nền | Job định kỳ theo F19 | Cron cho hết hạn; một worker MVP dùng DB/outbox để gửi email/retry; **không yêu cầu Redis** |
| Ghế | Gần realtime 5–10 giây hoặc WebSocket | RTK Query polling **5 giây**, tạm dừng khi không cần; server luôn quyết định khả dụng |
| Đăng ký | Có thể bật xác minh email | Mặc định **không yêu cầu xác minh email**; user mới ACTIVE; reset mật khẩu vẫn có token một lần và mail thử nghiệm |

Node 22, MySQL 8 và Prisma 6.19.0 là baseline tái lập đề xuất, không phải tuyên bố phiên bản mới nhất. Nhóm chốt package version vào lockfile khi scaffold; đổi stack đã chốt hoặc điều kiện nghiệp vụ phải theo quy trình thay đổi [07](07-ke-hoach-du-an.md). Các lựa chọn Express/Zod/Vite/FastAPI/cấu trúc thư mục là khuyến nghị chưa được coi là quyết định cuối nếu nhóm chưa xác nhận.

## 2. Git, commit và pull request

### 2.1 Branch

Thư mục hiện chưa được khởi tạo Git. Khi bắt đầu triển khai, nhóm chạy `git init -b main` một lần tại gốc dự án, thêm `.gitignore` và cấu hình remote bằng URL repository thực được cấp trước khi áp dụng quy trình PR bên dưới.

- `main`: bản đã qua kiểm tra và có thể dựng demo; bảo vệ branch, cấm force-push, merge qua PR.
- Nhánh ngắn từ `main`: `feat/F03-seat-hold`, `fix/F04-ipn-idempotency`, `docs/07-project-plan`, `chore/ci-typecheck`. Gắn F hoặc issue ID khi phù hợp.
- Chưa yêu cầu `develop` riêng cho nhóm 4 người. Nếu nhóm cần branch tích hợp thì phải ghi rõ chủ trì, gate và cách đồng bộ; không duy trì hai lịch sử release mơ hồ.
- Đồng bộ `main` trước bắt đầu và trước merge. Không rebase/force-push lịch sử đang được người khác sử dụng nếu chưa phối hợp. Không commit artifact build, `node_modules`, `.venv`, dữ liệu DB hoặc secret.

### 2.2 Conventional Commits

Mẫu: `<type>(<scope>): <mô tả hành động>`; có thể viết mô tả tiếng Việt rõ ràng. Type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`. Scope theo miền (`auth`, `booking`, `payment`, `admin`, `db`, `frontend`, `worker`). Breaking change dùng `!` và footer `BREAKING CHANGE:` nêu người dùng/API/migration cần đổi.

```text
feat(booking): giữ ghế bằng transaction và pending guard
fix(payment): bỏ qua IPN đã xử lý cho cùng payment
docs(api): bổ sung lỗi ORDER_EXPIRED
feat(api)!: thống nhất response danh sách theo data và meta

BREAKING CHANGE: client phải đọc danh sách từ data thay vì items.
```

Một commit tập trung một mục đích. Không dùng tên commit kiểu `update`, `fix all`, không trộn đổi nghiệp vụ với format toàn repository.

### 2.3 Review và merge

PR có vấn đề/kết quả, F/FR hoặc issue, cách kiểm chứng, thay đổi DB/API/env, migration/rollback nếu cần và ảnh/demo cho UI. Tác giả tự đọc diff, chạy kiểm tra phù hợp rồi yêu cầu **ít nhất một reviewer khác tác giả**; reviewer theo ma trận [07](07-ke-hoach-du-an.md). PR chạm tiền/ghế/auth hoặc migration cần TV1 hoặc TV2 review kỹ và TV4 kiểm chứng các kịch bản rủi ro. Người tham gia viết không thay thế reviewer độc lập.

Merge khi CI đạt và acceptance được chứng minh; ưu tiên squash cho task ngắn, giữ message Conventional Commit. Không merge PR chỉ có màn hình mock để đóng task end-to-end. Reviewer xem quyền/ownership/rạp, validation, transaction, idempotency, dữ liệu nhạy cảm, xử lý lỗi và tài liệu hợp đồng. Các thay đổi low-impact không cần test chỉ lặp lại implementation; các invariant ghế/tiền/quyền cần test có ý nghĩa trên MySQL thật.

### 2.4 Secret và dữ liệu

`.env`, `.env.*.local`, credential, database dump, token và khóa ký phải bị loại khỏi Git; chỉ commit `.env.example` chứa placeholder. Trước merge kiểm tra diff và dùng secret scanner CI khi cấu hình. Nếu lộ secret, thu hồi/rotate trước, ghi issue sự cố với owner; xóa file khỏi commit mới không đủ vô hiệu hóa secret đã lộ. Không đưa secret thật vào issue/PR, ảnh chụp, log hoặc bộ dữ liệu demo. `.gitignore` phải cho phép các file mẫu bằng ngoại lệ `!.env.example` khi dùng pattern rộng.

## 3. Naming, kiểu dữ liệu và hợp đồng API

| Phạm vi | Quy ước | Ví dụ |
|---|---|---|
| TypeScript | Biến/hàm/property `camelCase`; type/interface/class/React component `PascalCase`; constant `UPPER_SNAKE_CASE` | `holdExpiresAt`, `createOrder`, `SeatMap`, `MAX_SEATS_PER_ORDER` |
| File backend | `kebab-case` + hậu tố lớp; không viết tắt khó hiểu | `order.routes.ts`, `order.controller.ts`, `order.service.ts`, `order.repository.ts`, `order.schema.ts` |
| File frontend | Component `PascalCase.tsx`; hook bắt đầu `use`; domain API/slice mô tả rõ | `SeatMap.tsx`, `useCountdown.ts`, `bookingApi.ts`, `authSlice.ts` |
| Prisma | Model `PascalCase`, field `camelCase`; `@@map`/`@map` để ánh xạ DB | `ShowtimeSeat` → `showtime_seats`; `holdExpiresAt` → `hold_expires_at` |
| SQL | Tên bảng số nhiều `snake_case`, cột `snake_case`; constraint/index có tên dễ truy vết | `showtime_seats`, `user_cinemas`, `order_id`, `uq_showtime_seat` |
| Enum nghiệp vụ | Giá trị `UPPER_SNAKE_CASE`, dùng đúng 02/04/05 | `PENDING_PAYMENT`, `PAID_UNFULFILLED`, `STANDARD` |
| API | JSON/query camelCase; resource URL số nhiều, `/api/v1`; lỗi code uppercase | `showtimeId`, `expiresAt`, `/api/v1/orders`, `SEAT_UNAVAILABLE` |
| ID | UUID dạng chuỗi **36 ký tự**; DB `CHAR(36)` theo schema | `id`, `userId`; khác mã hiển thị `MV...`/`TK...` |
| Tiền | VND số nguyên, không float; validate integer/min/max ở backend | `total: 95000`; VNPay amount = VND × 100 tại adapter |
| Thời gian | DB UTC; API ISO 8601 UTC có `Z`; UI Asia/Ho_Chi_Minh (UTC+7) | `2026-10-03T12:30:00.000Z` hiển thị `19:30` |

Không dùng ID tuần tự hoặc mã đơn làm khóa chính thay UUID. Không dùng chuỗi tiền đã format cho phép tính. `ticketCode` và `order.code` là mã hiển thị có unique, không chứng minh quyền truy cập. Dữ liệu API không trả trực tiếp Prisma object nếu chứa hash/token hoặc nội bộ; chuyển DTO rõ ràng. `date` dùng cho ngày địa phương phải được hợp đồng API định nghĩa và backend quy đổi khoảng UTC, không mặc định midnight UTC là midnight Việt Nam.

Nguồn hợp đồng API là [05](05-thiet-ke-api.md) và [OpenAPI 3.0.3](openapi.json). Request mới phải được Zod validate ở backend; frontend validation phục vụ trải nghiệm. Cập nhật schema request/response/error, status HTTP và ví dụ trong OpenAPI cùng PR. Dùng lỗi chuẩn `{ success: false, error: { code, message, details } }`; danh sách dùng `data` và `meta` theo 05. Không thay envelope hoặc status giữa module theo sở thích cá nhân.

`POST /orders` với cùng idempotency key và payload phải replay response gốc; key cũ với payload khác bị từ chối theo 05. Một key mới khi đã có đơn dở/cùng khách/suất trả `409 PENDING_ORDER_EXISTS` kèm `orderId`. Giới hạn UI hoặc polling không thay thế transaction và pending guard ở backend.

## 4. Monorepo và phân lớp đề xuất

```text
DoAn4/
  docs/                         # bộ tài liệu, openapi.json
    prisma/schema.prisma        # schema tham chiếu cho thiết kế
  frontend/                     # npm workspace: React + TypeScript
    src/
      app/                      # store, router, RequireAuth/RequireRole
      api/                      # RTK Query base API + endpoints
      features/                 # auth, movies, booking, tickets, staff, admin
      components/               # SeatMap, QR, StatusBadge, form, table...
      layouts/                  # PublicLayout, StaffLayout, AdminLayout
      hooks/
      utils/
      types/
    .env.example
  backend/                      # npm workspace: Express + TypeScript
    prisma/
      schema.prisma             # bản triển khai từ schema tham chiếu
      migrations/               # Prisma migration + SQL constraints đã review
      seed.ts                   # dữ liệu local/test/demo
    src/
      app.ts                    # tạo Express app, không tự listen khi import test
      server.ts                 # listen API port 3000
      worker.ts                 # cron + xử lý DB outbox ở process riêng
      config/                   # load/validate env một lần lúc khởi động
      middleware/               # auth, RBAC/scope, errors, requestId, rate limit
      modules/
        booking/
          order.routes.ts
          order.controller.ts
          order.schema.ts
          order.service.ts
          order.repository.ts
          order.dto.ts
        auth/ movies/ cinemas/ showtimes/ pricing/ payments/ tickets/
        checkin/ users/ promotions/ reports/ settings/ reviews/
      integrations/             # VNPay adapter, SMTP, ML client
      jobs/                     # expiry, cleanup, outbox retry
      shared/                   # Prisma client, error, money/time, audit/logging
    tests/                      # unit/integration, MySQL test riêng
    .env.example
  ml-service/                   # tùy chọn; không thuộc npm workspace
    app/
    tests/
    requirements.txt            # khóa baseline sau khi nhóm chọn
    .env.example
  package.json                  # private:true, workspaces frontend/backend
  package-lock.json
  .gitignore
```

Đây là cây **đề xuất**, các thư mục app chưa được tạo bởi tài liệu này. Tránh hai nguồn schema lệch nhau: khi triển khai, copy schema tham chiếu sang `backend/prisma/schema.prisma`, xác định file runtime là nguồn migration và cập nhật bản docs trong cùng PR mỗi khi schema đổi. Các CHECK bổ sung tham chiếu [docs/prisma/constraints.sql](prisma/constraints.sql); đưa SQL này vào migration đã review theo 04, không giả định Prisma tự sinh đủ constraint. Khóa/invariant nghiệp vụ vẫn cần service/transaction; `prisma validate` chỉ kiểm tra schema, không chứng minh constraint SQL hoặc correctness transaction.

Luồng một request: **route → middleware → controller → service → repository → MySQL**. Route nối endpoint và middleware. Controller nhận dữ liệu đã validate, lấy actor/request context, gọi service, map DTO/status; không chứa SQL hoặc quy tắc tính tiền. Service quyết định BR, authorization theo ownership/rạp, state transition và ranh giới transaction. Repository thực hiện query/update/lock, nhận Prisma transaction client từ service; không tự mở transaction lồng làm mất tính nguyên tử. Integration adapter chịu ký/xác minh VNPay, gửi SMTP, gọi ML; không chốt trạng thái đơn độc lập khỏi service.

Không gọi SMTP/ML hoặc cổng thanh toán trong transaction đang giữ lock DB. Tạo vé, cập nhật ghế/payment/order và outbox event liên quan trong cùng transaction; worker đọc outbox sau commit. `user_cinemas` là quan hệ gán nhiều rạp, không dựa vào một `cinema_id` trên user. `pending_order_guards`, `idempotency_keys` và RefundRequest theo payment bảo vệ retry/đơn dở/khoản success thừa theo 04/06. `POST /admin/refunds/{id}/confirm` chỉ ghi xác nhận thao tác hoàn tiền đã làm ngoài hệ thống, không giả định cổng tự hoàn tiền.

## 5. State frontend và phiên đăng nhập

- RTK Query quản lý dữ liệu server (phim/suất/ghế/đơn/báo cáo), cache tags và invalidation. Redux slice thường chỉ giữ phiên auth/UI và lựa chọn đang dở; tránh copy cùng dữ liệu server vào hai nơi.
- Sơ đồ ghế polling 5 giây. Sau `SEAT_UNAVAILABLE`, refresh sơ đồ và bỏ lựa chọn không còn khả dụng. Sau create/cancel/pay/check-in, invalidate dữ liệu liên quan; server luôn kiểm tra lại trước ghi DB.
- Countdown dùng `expiresAt` và thời gian server/độ lệch đã xác định, không lấy giờ local làm quyền giữ ghế. Mọi giá/tổng/voucher backend trả về; frontend chỉ format.
- Access token giữ trong memory (có thể trong `authSlice` không persist); **không lưu access hoặc refresh token vào localStorage/sessionStorage**. Tải lại trang thì gọi refresh cookie để khôi phục phiên.
- Refresh token là chuỗi opaque ngẫu nhiên, đặt cookie **HttpOnly**, `SameSite=Lax` mặc định cho bố trí frontend/backend cùng site; local HTTP `Secure=false`, môi trường HTTPS `Secure=true`; Path giới hạn `/api/v1/auth`. Backend chỉ lưu SHA-256 hash và family, rotate/thu hồi, phát hiện dùng lại để thu hồi family; không trả refresh token trong JSON. Không có `JWT_REFRESH_SECRET` vì refresh này không phải JWT.
- Frontend gọi `GET /auth/csrf` để bootstrap cookie/token trước auth mutation; gửi `X-CSRF-Token` cho register/login/refresh/logout/forgot/reset và các endpoint xác minh email tùy chọn theo [05](05-thiet-ke-api.md). RTK Query gửi `credentials: 'include'` cho luồng này. Backend xác minh signed CSRF bằng `CSRF_SECRET` cùng kiểm tra Origin/CORS allow đúng origin và credentials; không dùng wildcard hoặc coi HttpOnly/SameSite là thay kiểm tra CSRF. Với nhiều request 401 đồng thời, chỉ một refresh đang chạy (phối hợp cả nhiều tab) rồi retry mỗi request tối đa một lần; refresh lỗi thì xóa auth và yêu cầu đăng nhập.
- Route guard/menu theo 03 hỗ trợ UX; backend vẫn kiểm tra role, owner và rạp cho mọi endpoint. Logout và đổi mật khẩu/khóa user thu hồi phiên theo 02/05.

Nếu deploy frontend/backend khác site, phải quyết định cookie/CORS/CSRF qua ADR; `SameSite=None` cần HTTPS + `Secure=true`, không tự thay trong production khi chưa kiểm chứng trình duyệt. Cấu hình reverse proxy cùng site là hướng đề xuất để đơn giản vận hành.

## 6. Ma trận môi trường và biến cấu hình

| Thành phần | Local development | Test/CI | Demo/staging |
|---|---|---|---|
| Frontend | `http://localhost:5173` | Mock contract hoặc trỏ API test | URL public HTTPS; build dùng API của demo |
| Backend API | `http://localhost:3000/api/v1` | Port riêng, DB test riêng, fixture callback | HTTPS; origin giới hạn; VNPay sandbox |
| MySQL | `127.0.0.1:3306`, DB `cinema_booking_dev` | DB `cinema_booking_test`, tài khoản test riêng | DB riêng, tài khoản least privilege; backup trước migration |
| Worker | Một process riêng dùng DB local | Chạy/điều khiển job để test deterministic | Một worker MVP, giám sát heartbeat/outbox/retry |
| ML tùy chọn | `http://127.0.0.1:8000` | Mock/fixture; có test timeout/fallback | Nội bộ, không public endpoint cho frontend |
| SMTP | Mail thử nghiệm/local inbox | Fake transport, không gửi người thật | SMTP thử nghiệm được cấp; không dùng dữ liệu khách thật |
| VNPay | Sandbox; IPN qua HTTPS tunnel public | Fixture đã ký bằng key test + test adapter | Sandbox public HTTPS; không có thanh toán thật |

| Biến / nhóm biến | Nơi sử dụng | Public hay secret | Quy ước |
|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend build | Public | **Biến VITE duy nhất cần cho baseline**, chứa URL API; mọi `VITE_*` đều đọc được trong bundle |
| `NODE_ENV`, `PORT`, `CORS_ALLOWED_ORIGINS` | Backend | Cấu hình server | Validate khi khởi động, không suy ra từ input khách |
| `DATABASE_URL` | Backend/Prisma/worker | **Secret** | Có user/password DB; chỉ backend, worker, CI migration được cấp |
| `JWT_ACCESS_SECRET`, `CSRF_SECRET` | Backend auth | **Secret** | Khóa JWT access và signed CSRF riêng; không reuse QR/VNPay key |
| `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL` | Backend auth | Cấu hình server | Baseline `15m`, `7d`; refresh opaque không cần khóa JWT, cookie/DB expiry nhất quán |
| `QR_SECRET` | Backend vé/soát | **Secret** | Backend ký/xác minh; frontend nhận QR payload đã ký |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Backend VNPay adapter | Server-only; hash là **secret** | Không đưa cả cấu hình merchant vào frontend; cấp sandbox riêng |
| `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, `FRONTEND_PAYMENT_RESULT_URL` | Backend adapter/redirect | Cấu hình server | URL sandbox và callback cố định allowlist, không nhận return URL tùy ý từ khách |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Backend worker/auth mail | Credential SMTP là **secret** | Chỉ backend/worker; môi trường test dùng fake transport |
| `REFRESH_COOKIE_SECURE`, `REFRESH_COOKIE_SAME_SITE` | Backend | Cấu hình server | Local false/lax; demo HTTPS true/lax với bố trí cùng site |
| `EMAIL_VERIFY_REQUIRED` | Backend auth | Cấu hình server | Mặc định `false`; thay đổi phạm vi cần cập nhật acceptance |
| `ML_ENABLED`, `ML_BASE_URL`, `ML_TIMEOUT_MS`, `ML_SERVICE_TOKEN` | Backend ML client; cùng token ở ML service | Nội bộ, token là **secret** | Mặc định tắt; timeout đề xuất 2000 ms, backend gửi service token và ML xác minh; lỗi trả fallback |
| `MEDIA_ROOT` | Backend media adapter | Cấu hình server-only | Thư mục ảnh ngoài mã nguồn, đường dẫn tuyệt đối; backend sinh tên file và kiểm tra upload |
| `SEED_PASSWORD` | Seed local/test theo 04 | Secret thử nghiệm, tùy chọn | Chỉ dùng với DB sandbox được phép; không tạo mật khẩu mặc định trên môi trường public |

Không thêm `VITE_DATABASE_URL`, `VITE_JWT_SECRET`, `VITE_VNPAY_HASH_SECRET`, `VITE_QR_SECRET` hoặc `VITE_SMTP_PASSWORD`. Frontend chỉ cần URL API và dữ liệu đã được API cho phép. Env được validate bằng schema lúc khởi động; thông báo thiếu tên biến mà không in giá trị. Test phải chặn việc trỏ DB/demo thật hoặc gửi SMTP thật do nhầm env. Không tự biến config nghiệp vụ động trong `settings` thành env bắt buộc; 02/04 xác định thông số nào được Admin sửa.

### 6.1 Mẫu `.env.example` — chưa phải secret dùng được

Frontend `frontend/.env.example`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Backend `backend/.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=mysql://<DB_USER>:<URL_ENCODED_DB_PASSWORD>@127.0.0.1:3306/cinema_booking_dev
JWT_ACCESS_SECRET=<GENERATE_RANDOM_ACCESS_SECRET>
CSRF_SECRET=<GENERATE_RANDOM_CSRF_SECRET>
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL=7d
QR_SECRET=<GENERATE_RANDOM_QR_SECRET>
REFRESH_COOKIE_SECURE=false
REFRESH_COOKIE_SAME_SITE=lax
EMAIL_VERIFY_REQUIRED=false
VNPAY_TMN_CODE=<SANDBOX_MERCHANT_CODE>
VNPAY_HASH_SECRET=<SANDBOX_HASH_SECRET>
VNPAY_PAYMENT_URL=<VNPAY_SANDBOX_PAYMENT_URL>
VNPAY_RETURN_URL=http://localhost:3000/api/v1/payment/vnpay/return
VNPAY_IPN_URL=https://<PUBLIC_SANDBOX_HOST>/api/v1/payment/vnpay/ipn
FRONTEND_PAYMENT_RESULT_URL=http://localhost:5173/payment/result
SMTP_HOST=<TEST_SMTP_HOST>
SMTP_PORT=<TEST_SMTP_PORT>
SMTP_USER=<TEST_SMTP_USER>
SMTP_PASSWORD=<TEST_SMTP_PASSWORD>
SMTP_FROM=<TEST_SENDER_ADDRESS>
MEDIA_ROOT=<ABSOLUTE_MEDIA_DIRECTORY>
ML_ENABLED=false
ML_BASE_URL=http://127.0.0.1:8000
ML_TIMEOUT_MS=2000
ML_SERVICE_TOKEN=<OPTIONAL_INTERNAL_ML_SERVICE_TOKEN>
```

Các `<...>` là placeholder, phải thay tại máy/môi trường được cấp quyền; không copy nguyên rồi coi app đã sẵn sàng. URL có ký tự đặc biệt trong password DB phải URL-encode. Backend và worker dùng cùng cấu hình DB cần thiết nhưng cấp secret theo nhiệm vụ; ML chỉ nhận `ML_SERVICE_TOKEN` cần để xác minh lời gọi, không cần JWT/VNPay/SMTP. Không yêu cầu ML env/service khi `ML_ENABLED=false`; mail thử nghiệm có thể dùng transport local không auth theo cấu hình backend đã triển khai. `MEDIA_ROOT` chỉ bắt buộc khi adapter upload/lưu ảnh đã triển khai, không đưa đường dẫn này vào bundle frontend.

### 6.2 VNPay local: return và IPN

Return URL `/api/v1/payment/vnpay/return` nhận trình duyệt quay lại, xác minh dữ liệu rồi redirect tới `/payment/result?orderId=...`; trạng thái hiển thị lấy từ API đơn. IPN `/api/v1/payment/vnpay/ipn` là callback server-to-server xác nhận theo chữ ký, txnRef và amount; response phải theo giao thức VNPay mô tả ở 05, không dùng envelope JSON lỗi chung thay giao thức provider.

`localhost` không truy cập được từ server VNPay. Muốn kiểm chứng IPN sandbox, dùng HTTPS tunnel public trỏ vào API port 3000 hoặc API demo public, đăng ký/cấu hình `VNPAY_IPN_URL` theo hướng dẫn sandbox được cấp. Tunnel thay hostname thì cập nhật env và cấu hình tương ứng; hạn chế public endpoints/rate limit theo phạm vi demo, giữ hash secret ở backend. Frontend polling kết quả 5 giây có giới hạn theo 03; quá hạn hiển thị chưa xác nhận và dẫn tới lịch sử vé. Không dùng return thành công để tự tạo vé hoặc giả định IPN đã đến.

## 7. Thứ tự dựng từ repository chỉ có tài liệu

### 7.1 Chuẩn bị và scaffold — chỉ là lệnh đề xuất

Kiểm tra Git, Node **22.12+**/npm và MySQL 8 được nhóm cài/chọn trước. [Hướng dẫn Vite](https://vite.dev/guide/) yêu cầu Node 20.19+ hoặc 22.12+, một số template có thể cần cao hơn; baseline này chọn nhánh Node 22, kiểm tra yêu cầu `engines` của toolchain thực tế khi khóa package version. Chạy từ thư mục gốc `DoAn4`. Nếu thư mục tài liệu chưa là Git repository, chạy `git init` khi bắt đầu quản lý mã nguồn; không hiểu lỗi `git status` là lỗi scaffold. Chỉ scaffold khi bắt đầu triển khai và repository chưa có các thư mục app; kiểm tra trước để không ghi đè mã hiện có.

```powershell
node --version
npm --version
git status --short
npm init -y
npm create vite frontend -- --template react-ts
New-Item -ItemType Directory -Path backend
Push-Location backend
npm init -y
Pop-Location
```

Sau đó chỉnh root `package.json` thành `private: true`, `workspaces: ["frontend", "backend"]`, đặt tên package nhất quán; tạo cây backend, TypeScript config, env loader, các entrypoint và scripts theo mục 7.2. Chốt version Vite/React/Express/Zod/test tools được scaffold vào lockfile; `npm create vite` không thay thế việc review package version và baseline Node. Không coi scaffold mặc định là ứng dụng nghiệp vụ đã hoạt động.

Lệnh cài dependencies minh họa **sau khi workspace tồn tại**:

```powershell
npm install --workspace backend express cors helmet cookie-parser bcrypt jsonwebtoken zod dotenv node-cron @prisma/client@6.19.0
npm install --save-dev --workspace backend typescript tsx prisma@6.19.0 @types/node @types/express @types/cors @types/cookie-parser @types/bcrypt @types/jsonwebtoken vitest supertest @types/supertest
npm install --workspace frontend @reduxjs/toolkit react-redux react-router-dom
```

Thêm tool lint/format/test UI theo cấu hình nhóm đã chọn; không cài Redis/BullMQ chỉ để chạy MVP. SMTP và QR library được chọn sau khi thống nhất adapter/cách render trong API/UI. Sau scaffold, commit `package-lock.json` và dùng `npm ci` trên checkout mới/CI. Không dùng `npm install` vô điều kiện trên CI để âm thầm đổi dependency.

### 7.2 Hợp đồng npm workspace scripts — cần tạo khi scaffold

Các dòng dưới là contract cho `package.json`, **hiện chưa có scripts để thực thi**. Root phải forward đúng workspace; backend/frontend phải định nghĩa scripts tương ứng và source/config phải tồn tại.

| Lệnh từ root đề xuất | Script workspace / ý nghĩa |
|---|---|
| `npm run dev:frontend` | Forward `npm run dev --workspace frontend`; Vite port 5173 |
| `npm run dev:backend` | Forward `npm run dev --workspace backend`; `tsx watch src/server.ts`, API port 3000 |
| `npm run dev:worker` | Forward `npm run dev:worker --workspace backend`; `tsx watch src/worker.ts` |
| `npm run build` | Build frontend rồi backend; frontend Vite, backend `tsc` với output `dist` |
| `npm run typecheck` | Typecheck tất cả npm workspaces; backend `tsc --noEmit`, frontend theo tsconfig scaffold |
| `npm run lint` | Lint cả hai workspace; cần ESLint config đã commit |
| `npm run test` | Unit/integration đã cấu hình của cả hai workspace; không silently bỏ workspace thiếu test script |
| `npm run test:integration --workspace backend` | Integration trên MySQL test thật, không DB local/demo; setup/cleanup deterministic |
| `npm run prisma:generate --workspace backend` | `prisma generate --schema prisma/schema.prisma` |
| `npm run db:validate --workspace backend` | `prisma validate --schema prisma/schema.prisma` |
| `npm run db:migrate --workspace backend -- --name init` | `prisma migrate dev --schema prisma/schema.prisma`, chỉ DB development |
| `npm run db:deploy --workspace backend` | `prisma migrate deploy --schema prisma/schema.prisma`, CI/demo; có backup/checklist môi trường |
| `npm run db:seed --workspace backend` | `tsx prisma/seed.ts`; seed được viết và review trước, kiểm tra env đích |
| `npm run start --workspace backend` | `node dist/server.js` sau build |
| `npm run start:worker --workspace backend` | `node dist/worker.js` sau build |

Root tối thiểu có thể forward `build/typecheck/lint/test` bằng `npm run <script> --workspaces`; chọn thứ tự build nếu phát sinh package dùng chung. Không dùng `--if-present` để giấu checks thiếu. Không có npm script cho Python trừ khi nhóm chủ động thêm wrapper; `ml-service` không thuộc `workspaces` mặc định.

### 7.3 DB/schema → migration → seed → backend → frontend

1. **DB và schema**: tạo DB local và user riêng bằng MySQL client/quy trình được cấp; user app không dùng root trên demo. Đọc schema tham chiếu [docs/prisma/schema.prisma](prisma/schema.prisma) và 04. Dùng Prisma **6.19.0** khi kiểm tra tham chiếu; cần một `DATABASE_URL` đúng cú pháp được cấp qua env, không lộ password ra log.

   ```powershell
   npx --yes prisma@6.19.0 validate --schema docs/prisma/schema.prisma
   ```

   Lệnh này có thể chạy để kiểm tra file tài liệu trước scaffold; nó không tạo database/migration/client/app. CLI cần truy cập package hoặc cache, và biến env tương ứng phải được cấu hình. Kết quả schema hợp lệ không chứng minh test đồng thời hoặc SQL constraint đã đúng.

2. **Migration**: sau scaffold, copy schema tham chiếu sang runtime, tạo migration development ở chế độ `--create-only`, thêm CHECK từ [constraints.sql](prisma/constraints.sql) vào `migration.sql`, rồi review toàn bộ SQL trước áp dụng. Các khóa và kiểm tra đồng thời thuộc trách nhiệm service/transaction, không tự được Prisma giải quyết. Môi trường chung dùng `db:deploy`, không `db:migrate` hoặc `db push` để tránh drift/reset.

   ```powershell
   Copy-Item -LiteralPath docs/prisma/schema.prisma -Destination backend/prisma/schema.prisma
   Copy-Item -LiteralPath backend/.env.example -Destination backend/.env
   Copy-Item -LiteralPath frontend/.env.example -Destination frontend/.env
   ```

   Các thư mục/file mẫu phải được tạo trước; điền env riêng trước lệnh DB. Copy schema chỉ dùng lần đầu hoặc có review, không ghi đè runtime schema đang thay đổi. Sau đó, **khi scripts mục 7.2 đã được tạo**:

   ```powershell
   npm run db:validate --workspace backend
   npm run db:migrate --workspace backend -- --name init --create-only
   ```

   Dừng để bổ sung/review SQL constraints vào migration mới, rồi áp dụng trên DB local:

   ```powershell
   npm run db:migrate --workspace backend
   npm run prisma:generate --workspace backend
   npm run db:seed --workspace backend
   ```

3. **Seed**: thực hiện dữ liệu theo 04, đủ actor và hai rạp để test scope, phòng/ghế, phim đủ độ tuổi, suất tương đối thời điểm seed, giá. Seed phải xác định được trạng thái đầu vào và cách lặp trên DB local/test; không reset DB chung và không cố định secret/tài khoản thật. Dữ liệu cũ/USED phục vụ ML phải ghi rõ tổng hợp.

4. **Backend và worker**: env loader kiểm tra cấu hình, chạy API và worker ở hai terminal. Kiểm tra DB connection, auth, API phim/suất và log worker; worker MVP duy nhất, job/outbox idempotent. Nếu chạy nhiều worker phải triển khai claim/lock DB và retry an toàn trước, không giả định cron tự chống chạy trùng.

   ```powershell
   npm run dev:backend
   ```

   Terminal khác:

   ```powershell
   npm run dev:worker
   ```

5. **Frontend**: trỏ `VITE_API_BASE_URL` vào `/api/v1`, xác nhận CORS/cookie, chạy UI rồi test đăng nhập/refresh và luồng phim → ghế → sandbox → vé → soát. Chạy sandbox IPN bằng tunnel theo mục 6.2.

   ```powershell
   npm run dev:frontend
   ```

6. **ML optional**: chỉ tạo service khi backlog Could được nhận. Ví dụ dưới cần `requirements.txt` và module `app/main.py` với FastAPI instance `app` đã tồn tại; không phải lệnh chạy được ngay từ bộ tài liệu.

   ```powershell
   Push-Location ml-service
   python -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   Pop-Location
   ```

Không cần ML để nghiệm thu MVP. Backend không bật gọi service chưa triển khai; khi có ML phải test timeout, cold start và fallback.

## 8. Transaction, payment, job và kiểm thử

Ghế/đơn/payment/vé được cập nhật trong transaction đúng ranh giới service; dùng cập nhật có điều kiện và kiểm tra số dòng, không đọc ghế trống rồi ghi ở request khác. Query raw dùng parameter binding, không nối input vào SQL. Thứ tự khóa nhất quán giữa tạo đơn, callback, hủy và job để giảm deadlock; retry deadlock có giới hạn và giữ idempotency. Test MySQL thật cho ghế tranh chấp, hai tab/guard, trùng lịch và check-in đồng thời; SQLite/mock không thay bằng chứng invariant DB.

VNPay adapter quy đổi VND × 100, ký/xác minh theo giao thức 05; server đối chiếu **payment**/txnRef/amount, lưu callback đã redaction và không lưu thông tin thẻ. Success IPN không tạo vé/điểm/voucher hai lần; success khác cho đơn đã được thanh toán tạo RefundRequest cho payment thừa thay vì cấp thêm vé. Thanh toán muộn phải kiểm tra ghế và điều kiện cấp vé theo 04/05/06, không ghi đè ghế của đơn khác. Luồng hoàn tiền là ghi nhận và xác nhận thủ công ngoài hệ thống trong phạm vi đồ án.

Cron và outbox là hai việc riêng: cron làm expiry/cleanup theo F19, worker đọc `outbox_events` để thực hiện gửi mail sau commit. MVP một worker không cần Redis; outbox có trạng thái/claim, retry có backoff và không nhận lại event đã hoàn thành. Delivery là **ít nhất một lần**: crash sau SMTP nhận nhưng trước ghi SENT có thể gửi mail lặp; dùng message ID/dedupe provider khi có, không hứa exactly-once email. Lỗi SMTP không đổi PAID hoặc xóa vé; frontend chỉ nói đã gửi email nếu có trạng thái xác nhận tương ứng, không suy từ PAID. Query/tạo đơn vẫn xử lý ghế HELD quá hạn ngay cả khi job chậm.

Check phù hợp trước PR: build/typecheck/lint; unit cho tính tiền/biên thời gian/validation; integration cho transaction, RBAC/ownership và callback; E2E cho lát nghiệp vụ ảnh hưởng người dùng. CI test dùng secret test riêng, không gọi thanh toán thật hoặc email người thật. Schema validate không thay migration trên DB sạch; endpoint test không thay demo toàn tuyến; screenshot không thay test API quyền.

## 9. Log, lỗi và tài liệu đi cùng mã

Log JSON đề xuất có timestamp UTC, level, requestId, actorId nếu phù hợp, module/action và error code; đủ truy callback/payment/worker mà không lộ password, Authorization, cookie, reset/refresh token, QR secret, hash secret hoặc SMTP credential. Raw provider payload được lưu theo 04 với quyền truy cập hạn chế/redaction; không in nguyên URL có token nhạy cảm vào console. Frontend nhận message an toàn, không stack trace/SQL.

Audit khác operational log: lưu actor, hành động, đối tượng, thay đổi và thời gian cho đổi giá, hủy suất/vé, hoàn tiền, quyền/khóa tài khoản; chỉ đọc, không sửa/xóa từ API thường. Chỉ số vận hành tối thiểu: lỗi API, worker heartbeat, đơn hết hạn chờ xử lý, outbox retry/thất bại, `PAID_UNFULFILLED` và RefundRequest chưa xử lý. Owner theo [07](07-ke-hoach-du-an.md).

PR thay API/schema/BR phải cập nhật tài liệu tương ứng và changelog release khi được tạo. Không ghi “đã test”, “đã triển khai” hoặc “chạy được” nếu chưa có output/bằng chứng của bản mã hiện tại. Hướng dẫn chạy và script cần được kiểm chứng trên checkout sạch trước G6; trạng thái đề xuất của tài liệu này chỉ được đổi sang áp dụng khi nhóm đã triển khai và phê duyệt.
