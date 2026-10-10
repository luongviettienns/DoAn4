# 05. Thiết kế REST API

> Backend Node.js + Prisma + MySQL và frontend React đã có luồng Stage 1 hoạt động. Mục 0 và các operation `x-implementation-status=implemented` trong [openapi.json](openapi.json) mô tả contract hiện tại đã đối chiếu mã nguồn. Phần còn lại giữ hợp đồng thiết kế F01–F19 và không chứng minh endpoint/policy đã triển khai. Đọc cùng [01. Yêu cầu](01-tong-quan-va-yeu-cau.md), [02. Luồng F01–F19](02-luong-chuc-nang.md), [03. Màn hình](03-mo-ta-man-hinh.md), [04. Dữ liệu](04-thiet-ke-csdl.md) và [06. Kiến trúc](06-kien-truc-he-thong.md).

## 0. Contract Stage 1 đã đối chiếu mã nguồn

Phạm vi cập nhật ngày 04/10/2026: discovery công khai → giữ ghế ngay → sửa cùng đơn → VNPay → đọc trạng thái đơn/vé do IPN xác nhận. Nguồn thực thi là các route/controller/schema/service trong `backend/src/modules/{movies,cinemas,showtimes,orders,payments}`, wrapper `backend/src/shared/response.ts` và client `frontend/src/services/api.ts`. Đây là đối chiếu contract; không phải chứng nhận production hoặc toàn bộ F01–F19 đã hoàn tất.

OpenAPI 3.0.3 đánh dấu từng operation: `implemented` là 14 operation dưới đây; `design` giữ mục tiêu thiết kế chưa được xác minh trong đợt Stage 1 này. Trạng thái `design` không tự khẳng định route vắng mặt trong backend. Schema `Stage1*` mô tả DTO hiện tại; schema cũ như `Order`, `ShowtimeSeatMap`, `Error` được giữ để tham khảo thiết kế. Các mục 1–4 và 6–8 bên dưới là **thiết kế mục tiêu**, trừ phần được dẫn lại rõ trong mục 0. Bảng mục 5 ghi rõ các dòng đã đối chiếu.

### 0.1 Endpoint hiện tại

Base URL: `http://localhost:3000/api/v1`. Chi tiết/lệnh và danh sách không phân trang trả `{success:true,data,serverTime}`; riêng `GET /movies` thêm `meta:{page,limit,total}`. `serverTime` và timestamp là ISO UTC. IPN dùng ACK thô. Lỗi dùng `Stage1Error`, mã lỗi runtime là chuỗi và có thể khác enum thiết kế `Error`.

| Method / path | Query hoặc body hiện tại | Response thành công | Quyền hiện tại |
|---|---|---|---|
| `GET /movies` | `status`, `genreId` (một UUID), `search`, `page=1`, `limit=20` (1..100) | 200 `Stage1MoviePage` | PUBLIC |
| `GET /movies/{id}` | — | 200 `Stage1MovieResponse`; tối đa 50 upcomingShowtimes | PUBLIC |
| `GET /cinemas` | `city` khớp chính xác sau trim | 200 `Stage1CinemaListResponse`; không meta | PUBLIC |
| `GET /cinemas/{id}` | — | 200 `Stage1CinemaResponse`; rooms ACTIVE, `_count.seats` | PUBLIC |
| `GET /showtimes` | `movieId`, `cinemaId`, `date` YYYY-MM-DD tại UTC+7, `format` | 200 `Stage1ShowtimeListResponse`; không meta | PUBLIC |
| `GET /showtimes/{id}/seats` | — | 200 `Stage1SeatInventoryResponse`; seats phẳng | PUBLIC, bearer tùy chọn |
| `POST /orders` | `Stage1CreateOrder`: showtimeId, seatIds (1..8), ageConfirmed?, combos?, voucherCode? | 201 `Stage1OrderResponse` | Bearer, tạo đơn cho tài khoản hiện tại |
| `GET /orders/pending` | `showtimeId` tùy chọn | 200 `Stage1PendingOrderResponse`; data=null khi không có hold còn hạn | Bearer OWN |
| `GET /orders/{id}` | — | 200 `Stage1OrderResponse` | CUSTOMER OWN; STAFF/MANAGER CINEMA; ADMIN SYSTEM |
| `PATCH /orders/{id}` | `Stage1OrderUpdate`: seatIds?, ageConfirmed?, combos?, voucherCode?; ít nhất một field | 200 `Stage1OrderResponse` | Bearer, chỉ chủ đơn |
| `POST /orders/{id}/cancel` | `Stage1CancelOrder`: reason?, pendingOnly?; UI dùng pendingOnly=true | 200 `Stage1CancelResponse`; data={success:true,message} | OWN/CINEMA/SYSTEM như GET detail |
| `POST /orders/{id}/pay` | `Stage1PayRequest`: method=VNPAY, locale=vn hoặc en | 200 `Stage1PayResponse`; paymentUrl là chuỗi | Bearer, chỉ chủ đơn |
| `GET /payment/vnpay/ipn` | Query provider có chữ ký; amount×100, txnRef, responseCode, transactionStatus | 200 `VnpayAck` thô | PUBLIC, service verify HMAC |
| `GET /payment/vnpay/return` | Query provider có chữ ký; chọn response bằng Accept | 302 Location khi nhận HTML; 200 `Stage1VnpayReturnResponse` khi Accept application/json | PUBLIC, service verify HMAC |

`GET /movies` chỉ lọc isActive, sort releaseDate DESC rồi createdAt DESC; status còn nhận ENDED. Không triển khai các filter thiết kế `q`, `genre`, cinemaId/date/ageRating/sort tại route này. `GET /showtimes` chỉ trả OPEN, phim isActive, startTime > hiện tại; date luôn loại suất đã bắt đầu. Format query nhận `2D`, `3D`, `TWO_D`, `THREE_D`, `IMAX`; response hiện trả `TWO_D`/`THREE_D`/`IMAX`. releaseDate/endDate và openTime/closeTime hiện serialize từ Prisma DateTime thành timestamp ISO, không phải chuỗi date/giờ thiết kế.

### 0.2 Giữ ghế và sửa cùng đơn

Inventory hiện tại là `{showtime,movie,cinema,room,seats:[]}`. Mỗi seat có `id` (showtime-seat ID), `seatId` (seat UUID dùng khi đặt), rowLabel, seatNumber, seatType, x, y, columnSpan, status, price và **heldByCurrentUser boolean**. Không có ownerId, heldByUserId, orderId hoặc holdExpiresAt trong DTO công khai. Bearer hợp lệ giúp backend tính hold của chính tài khoản; guest nhận false. Hold hết hạn được đọc như AVAILABLE ngay cả khi worker chưa nhả DB; ghế BLOCKED có status BLOCKED, price=0.

Sau chọn ghế đầu tiên, gọi `POST /orders` để giữ thật. Dùng id/expiresAt do server trả về; thay ghế/combo/voucher bằng `PATCH /orders/{id}`, không tạo đơn mới để sửa lựa chọn. Nếu có pending cùng user+showtime, POST trả 409 `ACTIVE_PENDING_ORDER`; đọc `GET /orders/pending?showtimeId=...` để khôi phục. PATCH giữ nguyên id và expiresAt, claim/release ghế atomically; bỏ field giữ giá trị cũ, seatIds/combos thay toàn bộ lựa chọn, `combos:[]` xóa combo, `voucherCode:null` gỡ voucher. Không lặp seatId/comboId trong PATCH. Field không biết bị Zod loại bỏ, không bị từ chối như thiết kế mục 8.

`Stage1Order` có snapshot, items[], combos[], voucher nullable, tổng tiền, expiresAt, payments[]. Vé nằm trong `items[].ticket` (null trước fulfillment), không có tickets[] cấp đơn. DTO hiện không có pricingLocked, paymentInProgress, expectedPoints, settledPaymentId hoặc refunds. GET đọc pending quá hạn thành EXPIRED; snapshot.posterUrl và snapshot.endTime vẫn lấy từ phim/suất hiện tại.

Mã lỗi giữ/sửa đáng chú ý: 400 `AGE_CONFIRMATION_REQUIRED`/`AGE_RESTRICTED`/`BOOKING_CLOSED`/`INVALID_SEATS`; 409 `ACTIVE_PENDING_ORDER`/`SEAT_ALREADY_RESERVED`/`ORDER_NOT_PENDING`/`PAYMENT_IN_PROGRESS`; 410 `ORDER_EXPIRED`. PATCH hiện chặn khi còn attempt PENDING, chưa khóa vĩnh viễn mọi attempt cũ. Cancel với pendingOnly=true trả 409 ORDER_NOT_PENDING nếu đơn vừa PAID, tránh thao tác thoát UI hủy vé đã thanh toán. Cancel trả message DTO; muốn xem trạng thái mới phải GET order.

Ví dụ PATCH sau khi đã giữ ghế (UUID chỉ minh họa):

`PATCH /api/v1/orders/55555555-5555-4555-8555-555555555555`

```json
{"seatIds":["11111111-1111-4111-8111-111111111111"],"combos":[{"comboId":"66666666-6666-4666-8666-666666666666","quantity":1}],"voucherCode":null}
```

Response cancel hiện tại:

```json
{"success":true,"data":{"success":true,"message":"Đã hủy đơn hàng giữ chỗ"},"serverTime":"2026-10-04T01:30:00.000Z"}
```

### 0.3 Thanh toán và kết quả do IPN xác nhận

Pay lấy order.total phía server và tạo VNPay attempt. IPN verify HMAC-SHA512, lookup txnRef, so amount/100; chỉ responseCode=00 và transactionStatus=00 mới ghi payment SUCCESS. Khi pending còn hạn và mọi ghế HELD vẫn thuộc đơn, transaction chuyển order PAID, ghế SOLD, phát ticket, tiêu thụ voucher và cộng điểm. Callback thành công sau khi mất hold ghi khoản thu và yêu cầu hoàn: PAID_UNFULFILLED/refund PENDING khi chưa có đơn PAID; attempt thu trùng tạo refund riêng và giữ PAID. Chưa có nhánh reclaim ghế của thiết kế mục 4.

Return **chỉ đọc**, không fulfill. Accept HTML (kể cả `*/*` theo Express) redirect 302 tới FRONTEND_PAYMENT_RESULT_URL với query `orderId,code,status,amount,message`; Accept application/json trả envelope. Khi valid callback báo 00/00 nhưng IPN chưa chốt, return status=PENDING. SUCCESS chỉ có khi payment SUCCESS và order PAID. Chữ ký/payment/amount sai trả kết quả false và không tiết lộ orderId. `code` là mã đơn trong kết quả hợp lệ; kết quả lỗi dùng INVALID_SIGNATURE/PAYMENT_NOT_FOUND/INVALID_AMOUNT.

Trang kết quả phải đọc/poll `GET /orders/{id}` bằng phiên hiện tại; query redirect chỉ là gợi ý và không đủ để hiển thị vé. Chỉ coi là đã thanh toán khi API trả PAID cùng ticket. Nếu IPN còn trễ, tiếp tục hiển thị đang xác nhận; PAID_UNFULFILLED là khoản thu cần hoàn, không phải vé hợp lệ.

### 0.4 Chính sách thiết kế chưa được runtime Stage 1 bảo đảm

- Client có gửi Idempotency-Key cho create/cancel/pay, nhưng controller/service hiện chưa đọc/lưu/replay. Header này không bắt buộc trong các operation implemented; retry POST có thể tạo attempt mới hoặc gặp ACTIVE_PENDING_ORDER. Khi mất response create, đọc pending trước khi thử tạo lại.
- Pay hiện tạo attempt mới mỗi lần gọi, chưa tái sử dụng attempt/URL PENDING, chưa kiểm còn ít nhất 60 giây, chưa xử lý tổng 0 bằng INTERNAL/FREE. requestExpiresAt lưu theo expiresAt, nhưng adapter chưa gửi vnp_ExpireDate.
- Chưa có pricingLocked trong DTO hoặc khóa sửa vĩnh viễn sau mọi payment attempt. PATCH chỉ chặn attempt PENDING; pricing của ghế/combo giữ lại dùng snapshot, phần mới dùng catalog hiện tại.
- Verify callback hiện có kiểm scalar/HMAC và amount, nhưng chưa đối chiếu TmnCode hoặc ghi PaymentLog/outbox tại payment service. Return đang dùng redirect 302 và không có Cache-Control:no-store/allowlist middleware được mô tả trong thiết kế.
- Các route auth, combo/voucher catalog, lịch sử/quầy/checkin/báo cáo và vận hành ngoài 14 operation trên chưa được đồng bộ contract trong đợt này. Có route đang tồn tại nhưng DTO/policy vẫn cần audit riêng; nhãn design không phải danh sách route 404.

## 1. Quy ước và lựa chọn MVP (thiết kế mục tiêu)

Base URL ứng dụng là `/api/v1`; bảng endpoint ghi path tương đối. Giữ callback số ít: `/api/v1/payment/vnpay/ipn` và `/api/v1/payment/vnpay/return`. Hai endpoint health và service ML nội bộ dùng server riêng, được mô tả trong phụ lục và có `servers` override trong OpenAPI.

JSON dùng `camelCase`; database dùng `snake_case` qua Prisma mapping. ID tài nguyên là UUID v4, MySQL `CHAR(36)`. Mã `MVyyMMddXXXXXX` và `TKXXXXXXXXXX` phục vụ tra cứu, không thay khóa UUID. Ngày trong mã đơn theo lịch Việt Nam; chuỗi ngẫu nhiên phải kiểm unique.

Timestamp luôn ISO 8601 UTC có `Z`, ví dụ `2026-10-03T12:30:00Z`. Các ngày không giờ như `date`, `releaseDate`, `effectiveFrom`, `fromDate`, `toDate`, và giờ mở cửa rạp, theo `Asia/Ho_Chi_Minh`. Backend chuyển biên ngày Việt Nam sang UTC trước khi query. Khoảng ngày inclusive, tối đa 366 ngày; UI đổi timestamp sang UTC+7. Tuổi tính tại ngày chiếu theo lịch Việt Nam.

Tiền là số nguyên VND, không số thập phân hoặc chuỗi định dạng. Giá trị tiền trên từng dòng/đơn được giới hạn bảo thủ 0–2.147.483.647 để tương thích Prisma Int 32 bit dù MySQL dùng unsigned INT. Backend kiểm range sau mọi phép cộng/nhân và rollback khi vượt. Tổng báo cáo dùng phép cộng an toàn, không ép tổng nhiều đơn trở lại INT. Server là nguồn sự thật của trạng thái ghế, snapshot giá và tổng tiền. Client không được gửi `total`, `price`, `role`, `createdBy` hoặc `status` vào lệnh tạo đơn.

| Quyết định | MVP |
|---|---|
| Thanh toán | VNPay sandbox; chưa bật MoMo |
| Ghế realtime | Polling 5 giây; chưa WebSocket |
| Xác minh email | Tắt; route verify/resend tùy chọn trả 404 khi tắt |
| ML | Service tùy chọn; `/me/recommendations` dùng fallback phổ biến khi ML tắt/lỗi |
| Bulk showtimes, reviews | Could, có feature flag; triển khai sau luồng cốt lõi |
| Hủy vé | Hoàn 100% số tiền đã thu, phí 0; xử lý tiền thủ công |
| Xuất báo cáo | CSV UTF-8, Excel mở được; `.xlsx` ngoài bản đầu |
| Đơn tổng tiền 0 | Server tự chốt bằng INTERNAL/FREE, không gọi VNPay |

Một ghế `COUPLE` là một seat UUID, một vé và một đơn vị trong giới hạn 8, nhưng có `capacityUnits=2`. Không được chọn một nửa. Lối đi là ô không có seat; ghế hỏng dùng `SeatType=BLOCKED` và không được bán. `isBlocked` trong response là trường dẫn xuất, không là đầu vào độc lập. Bỏ quy tắc chống để lại ghế trống lẻ ở MVP. Giá trị API/DB cho định dạng là `2D`, `3D`, `IMAX`; Prisma `TWO_D`/`THREE_D` được adapter chuyển đổi. Ngôn ngữ suất là `SUBTITLED` hoặc `DUBBED`; voucher scope là `TICKETS`, `COMBOS`, `ORDER`.

Settings mặc định giữ nguyên 02: giữ ghế online 10 phút, quầy 3 phút, tối đa 8 ghế, ngừng bán trước 15 phút, hủy trước 2 giờ, checkin từ 30 phút trước đến 15 phút sau giờ bắt đầu, quảng cáo/dọn phòng 15 phút, 10.000 VND cho một điểm. Thay settings không sửa `expiresAt` hoặc snapshot của đơn đã tạo.

### 1.1 Phản hồi và phân trang

Chi tiết/lệnh JSON trả `{"success":true,"data":{...},"serverTime":"...Z"}`. Danh sách phân trang giữ cấu trúc 02: `{"data":[],"meta":{"page":1,"limit":20,"total":0},"serverTime":"...Z"}`. `serverTime` giúp frontend tính countdown thay vì tin đồng hồ thiết bị. `GET /orders/pending` trả `data:null` khi không có đơn. HTTP 204 không có body. Print trả HTML; export trả CSV; IPN/return có protocol riêng.

`page>=1`, `limit=1..100`, mặc định 20; lịch sử checkin mặc định 10. Default sort `createdAt DESC,id DESC`; suất công khai `startTime ASC,id ASC`; movies theo enum `sort`. Không nhận SQL sort tùy ý. `total` chỉ đếm bản ghi trong scope. UUID/date sai trả 400; query boolean nhận `true|false`; `genre` nhiều UUID phân tách dấu phẩy. `q` trim, tối đa 255 ký tự và escape wildcard khi LIKE. Array không phân trang như seats, recommendations hoặc report rows có giới hạn rõ trong schema.

### 1.2 Error contract

```json
{"success":false,"error":{"code":"SEAT_UNAVAILABLE","message":"Ghế A5 vừa được người khác chọn","details":[{"seatId":"11111111-1111-4111-8111-111111111111","message":"Ghế A5 không còn trống"}]}}
```

Giữ nguyên mã nghiệp vụ trong phụ lục D của 02. `details` luôn là array: validation có `field`/`message`, đơn đang dở có `orderId`, vé đã dùng có `checkedInAt`. Lỗi kỹ thuật bất ngờ dùng HTTP 500 `INTERNAL_ERROR`, là mã kỹ thuật bổ sung. Trả `X-Request-Id` để đối chiếu log; không trả stacktrace, hash mật khẩu, refresh/reset token hoặc secret.

| HTTP | Mã |
|---|---|
| 400 | `VALIDATION_ERROR`, `TOO_MANY_SEATS`, các `VOUCHER_*`, `PAYMENT_SIGNATURE_INVALID`, `PAYMENT_AMOUNT_MISMATCH`, `INVALID_TICKET` |
| 401 | `UNAUTHORIZED`: chưa đăng nhập, token sai/hết hạn hoặc sai thông tin đăng nhập với message chung |
| 403 | `FORBIDDEN`, `ACCOUNT_LOCKED`, `AGE_RESTRICTED` |
| 404 | `NOT_FOUND`: tài nguyên không tồn tại, ngoài quyền đọc hoặc feature tắt |
| 409 | `EMAIL_EXISTS`, `PHONE_EXISTS`, `SHOWTIME_CLOSED`, `SEAT_UNAVAILABLE`, `PENDING_ORDER_EXISTS`, `ORDER_INVALID_STATE`, `CANCEL_WINDOW_PASSED`, `TICKET_ALREADY_USED`, `TICKET_CANCELLED`, `WRONG_SHOWTIME`, `WRONG_CINEMA`, `OUTSIDE_CHECKIN_WINDOW`, `SHOWTIME_OVERLAP`, `HAS_DEPENDENCIES`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS` |
| 410 | `ORDER_EXPIRED` |
| 429 | `TOO_MANY_ATTEMPTS`; có `Retry-After` |
| 500 | `INTERNAL_ERROR`: không lộ chi tiết hạ tầng |

CSRF/sai role dùng `FORBIDDEN`; media hoặc đầu vào sai dùng 400 `VALIDATION_ERROR`. Hai mã mở rộng của tài liệu này là `IDEMPOTENCY_KEY_REUSED` và `IDEMPOTENCY_IN_PROGRESS` (HTTP 409); không đổi mapping mã gốc trong 02. QR/mã vé không hợp lệ là 400, vé đã dùng/hủy/sai suất/sai rạp/ngoài window là 409. Chặn role trước lookup trả 403; object ngoài scope thường trả 404. Checkin biết vé ở rạp khác trả `WRONG_CINEMA` nhưng không tiết lộ thông tin vé/rạp ngoài quyền. IPN dùng ACK provider, không áp envelope này.

## 2. Xác thực, phân quyền và scope (thiết kế mục tiêu)

### 2.1 JWT, refresh cookie và CSRF/CORS

Access JWT sống 15 phút, trả JSON và giữ trong bộ nhớ `authSlice`; request gửi `Authorization: Bearer <token>`. Refresh token là chuỗi opaque ngẫu nhiên sống 7 ngày, chỉ đặt cookie **host-only, HttpOnly, Secure, SameSite=Lax, Path=/api/v1/auth**. Không trả refresh token JSON hoặc lưu Redux/localStorage. DB chỉ lưu hash, family, expiry và revoked. Login/refresh/response chứa token có `Cache-Control:no-store`. Bcrypt cost 10–12; password 8–72 ký tự ASCII có chữ và số để không vượt 72 byte. Nếu mở Unicode, validate giới hạn byte riêng.

`GET /auth/csrf` cấp cookie bootstrap có chữ ký `CSRF_SECRET` và `csrfToken`. Client gửi `X-CSRF-Token` cho register/login/refresh/logout/forgot/reset và verify/resend. Token phải ràng buộc cookie/session đã ký; không dùng cookie double-submit tùy ý có thể bị injection. Backend kiểm `Origin` đúng allowlist, hoặc Referer trusted nếu browser không có Origin.

CORS whitelist chính xác origin frontend, cho `Access-Control-Allow-Credentials:true`, không dùng wildcard `*`; cho header `Authorization`, `Content-Type`, `X-CSRF-Token`, `Idempotency-Key`, trả `Vary:Origin`. OPTIONS không tạo session/ghi nghiệp vụ. Các request bearer không cần CSRF vì không có access cookie; backend không tự lấy access từ cookie. Callback VNPay có chữ ký provider và được loại khỏi CSRF, không bật CORS credentials.

Refresh rotation dùng token một lần; phát hiện reuse thu hồi family. Frontend dùng single-flight refresh, phối hợp các tab, retry API gốc tối đa một lần. Nếu refresh response thất lạc, yêu cầu login lại; không tái sử dụng token cũ. Logout thu hồi family và xóa đúng Path/flags, lặp vẫn 204. Reset mật khẩu thu hồi mọi phiên; đổi mật khẩu giữ phiên hiện tại, thu hồi phiên khác. Khóa/đổi role/assignment thu hồi refresh và kiểm role/status/assignment hiện tại từ DB trên mọi request để quyền cũ mất hiệu lực ngay; không thêm tokenVersion vào schema.

Development nên dùng HTTPS. Chỉ HTTP localhost được override Secure=false trong cấu hình dev. SPA và API nên cùng site để SameSite=Lax hoạt động. Nếu triển khai cross-site thật sự, phải chủ động đổi SameSite=None;Secure, vẫn kiểm Origin+CSRF và không nới CORS mặc định. Browser tự gửi refresh cookie bằng `credentials:include`; JavaScript không đọc cookie đó.

### 2.2 Scope thực thi

| Scope | Quy tắc backend |
|---|---|
| `OWN` | User, phiên, media hoặc `order.userId` phải thuộc user authenticated; không nhận userId tùy ý từ body |
| `CINEMA` | Tra `user_cinemas`, quan hệ nhiều-nhiều STAFF/MANAGER–Cinema; join tài nguyên tới rạp và chặn mọi cinemaId ngoài assignment |
| `SYSTEM` | ADMIN toàn hệ thống; MANAGER dùng SYSTEM chỉ với catalog phim/thể loại/ngày lễ và duyệt reviews dùng chung theo matrix 02 |
| `PUBLIC` | Dữ liệu công khai đã lọc; không là role lưu trong DB |

ADMIN không tự động có quyền quầy/soát: `/counter/*` và `/checkin*` chỉ STAFF/MANAGER với CINEMA. Rạp mới chỉ ADMIN tạo; MANAGER sửa/xóa rạp được gán. MANAGER không sửa user/role/assignment/settings/audit. Combo nhiều rạp chỉ được MANAGER sửa khi **tất cả rạp cũ và mới** đều thuộc assignment. Voucher thuộc một rạp; ngày lễ dùng chung hệ thống.

`GET /orders/{id}` cho CUSTOMER OWN, STAFF/MANAGER CINEMA, ADMIN SYSTEM. `GET /me/orders` và `/me/orders/{id}` chỉ CUSTOMER. Mọi role có `/me`. Danh sách và count áp scope ngay trong query DB. Báo cáo `type=CINEMA` chỉ ADMIN. Cấm tự khóa/hạ quyền và giữ ít nhất một ADMIN ACTIVE bằng transaction lock. Chuyển role STAFF/MANAGER cần ít nhất một rạp cùng transaction; CUSTOMER/ADMIN không giữ assignment.

## 3. Idempotency và transaction cho ghế/tiền (thiết kế mục tiêu)

Header `Idempotency-Key: <UUID>` bắt buộc với tạo đơn online/quầy, pay, hủy pending/paid/quầy/suất, confirm-payment quầy, confirm-refund, checkin và bulk create. Khóa theo `(actorId,method,path,key)`, lưu canonical request hash, trạng thái và HTTP response. TTL replay 24 giờ. Cùng key/body trả nguyên response lần đầu; khác body trả 409 `IDEMPOTENCY_KEY_REUSED`; đang chạy trả 409 `IDEMPOTENCY_IN_PROGRESS`, `Retry-After:1`. Kiểm quyền hiện tại trước replay. Vì response cũ có thể mô tả trạng thái cũ, frontend GET lại order sau replay. Unique/conditional update vẫn giữ invariant khi key hết TTL.

Tạo đơn chạy trong một transaction: kiểm showtime/tuổi/cutoff, pending guard unique khách+suất, ghi order/snapshot và giữ ghế bằng UPDATE có điều kiện. Thiếu một ghế rollback toàn bộ. Hold hết hạn theo server ngay cả khi job chậm. Seat IDs phải thuộc đúng room/showtime. Pending cũ cùng khách/suất với intent khác trả 409 `PENDING_ORDER_EXISTS` kèm orderId để tiếp tục/hủy; không thay ghế âm thầm.

Combo/voucher chỉ sửa khi pending còn hạn và **chưa từng có payment attempt**. `pricingLocked` là trường response dẫn xuất từ `EXISTS Payment`, không thêm cột DB; giá trị true sau attempt đầu tiên không mở lại sau FAILED/EXPIRED. Muốn đổi combo/voucher sau đó phải hủy rồi tạo đơn mới. Snapshot vé và combo là giá đã chốt, không lấy lại từ catalog khi pay. Voucher reserve quota ngay khi apply dưới khóa tổng/per-user; gỡ/expire/cancel release, paid consume, replay không đếm hai lần. Walk-in không userId không dùng voucher per-user.

Pay khóa order, kiểm còn ít nhất 60 giây. Cùng key replay; key mới khi attempt PENDING còn hiệu lực trả attempt/URL hiện hành. Sau FAILED/EXPIRED có thể retry với txnRef `<mãđơn>-<lầnthử>` mới, amount giữ nguyên và hold phải còn hạn. Không gia hạn `expiresAt`; provider request expiry không vượt hold. Nếu total=0, server chốt payment INTERNAL/FREE SUCCESS, order PAID/vé/điểm/voucher/outbox trong cùng transaction; response `paymentUrl:null`, `orderStatus:PAID`. Client không chọn FREE hoặc gửi amount.

Chỉ một `settledPaymentId` được fulfill: ghế SOLD, order PAID, vé, điểm, voucher và email outbox cùng transaction. Payment SUCCESS thứ hai không phát lại vé/điểm/quota; tạo RefundRequest riêng với lý do `DUPLICATE_PAYMENT`. Failure đến sau SUCCESS không hạ trạng thái. Checkin UPDATE WHERE status=VALID; retry mạng cùng key trả OK, lần scan mới vé USED bị từ chối.

Hủy pending nhả ghế, release guard/quota và chuyển CANCELLED; chưa thu tiền không có refund. Hủy PAID là toàn đơn, chưa có vé USED và còn tối thiểu 2 giờ: order/tickets CANCELLED, ghế AVAILABLE, revert điểm/release voucher đúng một lần, refund PENDING nếu có tiền đã thu. Đơn giá 0 không cần yêu cầu hoàn tiền và refundStatus giữ NONE. Giữ ticket/order_items/snapshot làm lịch sử; lần bán ghế sau tạo vé mới.

Cancellation preview là GET chỉ đọc. `policyVersion` là chuỗi tính từ cấu hình hủy hiện tại, không cần cột version; commit kiểm lại scope/state/window/USED dưới transaction lock. Policy đã đổi trả 409 ORDER_INVALID_STATE và frontend tải preview mới. Hủy suất có reason/confirmed và kiểm lại tác động hiện tại dưới khóa chung với create/pay; hủy mọi đơn và thu hồi cả vé USED theo ngoại lệ vận hành của F11, giữ checkedInAt/By để audit. Lập hoàn toàn bộ khoản thu chưa hoàn, gửi outbox và ghi audit.

Bảng giá đã có đơn tham chiếu là bất biến: muốn đổi tạo bộ theo `effectiveFrom` mới, không sửa rule đã dùng (HAS_DEPENDENCIES). Tạo/sửa phòng cần `rowCount` và `columnCount`; `rows/columns` của seat-map phải khớp lưới phòng. `GenreWrite` cần name và slug ASCII duy nhất; trùng trả 400 VALIDATION_ERROR theo field. Settings và seat-map không dùng trường optimistic version khi DB chưa có cột tương ứng; backend khóa transaction và ghi audit, settings áp dụng last-write-wins. Sửa sơ đồ bị hạn chế theo các suất tương lai, không làm thay đổi showtime seat snapshot đã sinh.

Manual refund xác nhận bằng **refundId**, không chỉ orderId, sau khi bên ngoài đã hoàn tiền; nhập method/manualReference/notes. Mỗi payment có tối đa một yêu cầu hoàn, một order có thể có nhiều yêu cầu. `orders.refundStatus` chỉ phản ánh khoản hoàn của **settledPaymentId**: NONE/PENDING/REFUNDED theo khoản thu chính. RefundRequest của payment thu trùng theo dõi riêng trong danh sách hoàn, không đổi refundStatus hoặc trạng thái PAID của đơn. PAID_UNFULFILLED sau khi hoàn khoản thu chính chuyển CANCELLED. Không trừ điểm hoặc trả voucher lần hai lúc confirm refund.

## 4. VNPay sandbox: request ký hash, IPN và return (thiết kế mục tiêu)

Theo [tài liệu PAY chính thức VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), tích hợp 2.1.0 dùng GET, amount×100, HMAC-SHA512 và txnRef duy nhất; IPN cập nhật trạng thái, return chỉ hiển thị. ACK: 00 xác nhận, 01 không tìm thấy, 02 đã xác nhận, 04 sai tiền, 97 sai chữ ký, 99 lỗi xử lý. Thành công cần ResponseCode và TransactionStatus đều 00. Dữ liệu ký sắp theo tên và URLencode, bỏ SecureHash/SecureHashType khi verify. Nguồn kiểm ngày 03/10/2026; đối chiếu cấu hình merchant trước tích hợp thực.

Secret/cấu hình từ ENV: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`, `QR_SECRET`, `FRONTEND_PAYMENT_RESULT_URL`; không trả secret qua API/log. URL sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`. FRONTEND_PAYMENT_RESULT_URL đã gồm đường dẫn `/payment/result`; backend chỉ thêm query, không nối đường dẫn lần nữa. Return URL cố định allowlist, không nhận từ client. Verify các `vnp_*` scalar, chặn query key trùng/encoding mơ hồ, so chữ ký constant-time và kiểm TmnCode. Tên query provider giữ nguyên, là ngoại lệ của JSON camelCase.

IPN không JWT/CSRF; verify trước business write, HTTP 200 JSON **`{"RspCode":"00","Message":"Confirm Success"}`** hoặc ACK lỗi tương ứng, không envelope error chung. ACK 02 chỉ dùng với chính attempt đã xác nhận; order PAID không có nghĩa mọi attempt khác là duplicate vô hại. Chỉ ACK 00 sau commit; lỗi transaction tạm thời trả 99 để provider retry. Log payload đã lọc cho đối soát, không cache endpoint.

Return verify/log rồi HTTP 303 đến `/payment/result?orderId=...&returnStatus=...` trên frontend allowlist. Chữ ký sai chuyển `INVALID_SIGNATURE`, không tiết lộ orderId. Không fulfill qua return. Frontend GET order theo OWN mỗi 5 giây, tối đa khoảng 30 giây; chưa có IPN hiển thị “Đang xác nhận”, sau đó hướng dẫn kiểm Vé của tôi. Không suy ra PAID từ query.

| Tình huống SUCCESS hợp lệ tại IPN | Transaction |
|---|---|
| Pending, ghế còn thuộc hold của đơn | Chọn settledPaymentId, SOLD, PAID và tạo vé/điểm/voucher/outbox |
| EXPIRED, mọi ghế AVAILABLE, trước giờ chiếu và quota reserve lại được | Cấp lại toàn bộ ghế atomically và PAID; không lấy ghế HELD của người khác |
| EXPIRED nhưng mất ghế/quota, suất bị hủy hoặc đã bắt đầu | Payment SUCCESS, order PAID_UNFULFILLED, không tạo vé, refund PENDING |
| Order CANCELLED hoặc showtime CANCELLED | Payment SUCCESS và refund PENDING; giữ CANCELLED, không hồi sinh vé |
| SUCCESS của settledPaymentId đã xử lý | ACK 02, không tạo lại vé/điểm |
| Order PAID nhưng attempt khác SUCCESS | Lưu khoản thu và refund riêng DUPLICATE_PAYMENT; giữ PAID, không cấp vé lần hai |

`Showtime=CLOSED` chỉ ngừng bán, không tự cấm fulfill đơn đã tạo hợp lệ. IPN trước startTime vẫn có thể fulfill khi đúng hold/quota; late reclaim không chạy khi now>=startTime hoặc suất CANCELLED. Voucher đã snapshot hợp lệ không bị bác chỉ vì catalog hết hạn/tạm dừng sau redirect; late reclaim chỉ kiểm và reserve lại quota hiện tại. Quy tắc này bổ sung các race của 02, không thêm state enum. Đối soát/query provider và hoàn ngân hàng tự động nằm ngoài MVP API; quản lý xử lý bằng danh sách hoàn thủ công.

## 5. Danh mục endpoint theo F01–F19

Các dòng có **[Stage 1]** đã đồng bộ với operation implemented và schema Stage1* trong OpenAPI. Các dòng khác giữ hợp đồng thiết kế và operation design; không phải xác nhận runtime đã triển khai. Path UUID luôn bắt buộc. Cột body ghi request schema; response ghi schema đầy đủ gồm wrapper/meta/serverTime (tên kết thúc Response hoặc Page). Query có `!` là bắt buộc. `★` cần Idempotency-Key; `◇` tùy chọn. Role/scope ghi `ROLE:SCOPE`. IPN dùng response thô; return redirect; health/ML nằm trong phụ lục vì server riêng.

### F01. Tài khoản và xác thực

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /auth/csrf` | — | — | 200 `CsrfTokenResponse` | GUEST:PUBLIC; CUSTOMER:PUBLIC; STAFF:PUBLIC; MANAGER:PUBLIC; ADMIN:PUBLIC |
| `POST /auth/register` | — | `RegisterRequest` | 201 `UserResponse` | GUEST:PUBLIC |
| `POST /auth/login` | — | `LoginRequest` | 200 `AuthSessionResponse` | GUEST:PUBLIC |
| `POST /auth/refresh` | — | — | 200 `AuthSessionResponse` | CUSTOMER:OWN; STAFF:OWN; MANAGER:OWN; ADMIN:OWN |
| `POST /auth/logout` | — | — | 204 không body | CUSTOMER:OWN; STAFF:OWN; MANAGER:OWN; ADMIN:OWN |
| `POST /auth/forgot-password` | — | `EmailRequest` | 202 `MessageResponse` | GUEST:PUBLIC |
| `POST /auth/reset-password` | — | `ResetPasswordRequest` | 200 `MessageResponse` | GUEST:PUBLIC |
| `POST /auth/verify-email` ◇ | — | `TokenRequest` | 200 `MessageResponse` | GUEST:PUBLIC |
| `POST /auth/resend-verification` ◇ | — | `EmailRequest` | 202 `MessageResponse` | GUEST:PUBLIC |
| `GET /me` | — | — | 200 `UserResponse` | CUSTOMER:OWN; STAFF:OWN; MANAGER:OWN; ADMIN:OWN |
| `PUT /me` | — | `ProfileUpdate` | 200 `UserResponse` | CUSTOMER:OWN; STAFF:OWN; MANAGER:OWN; ADMIN:OWN |
| `PUT /me/password` | — | `ChangePasswordRequest` | 200 `MessageResponse` | CUSTOMER:OWN; STAFF:OWN; MANAGER:OWN; ADMIN:OWN |
| `GET /me/loyalty-transactions` | `page`, `limit` | — | 200 `LoyaltyTransactionPage` | CUSTOMER:OWN |
| `POST /media` | — | `MediaUpload` | 201 `MediaResultResponse` | CUSTOMER:OWN; STAFF:OWN; MANAGER:SYSTEM; ADMIN:SYSTEM |

### F02. Duyệt phim và suất

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| **[Stage 1]** `GET /movies` | `status`, `genreId`, `search`, `page`, `limit` | — | 200 `Stage1MoviePage` | PUBLIC |
| **[Stage 1]** `GET /movies/{id}` | — | — | 200 `Stage1MovieResponse` | PUBLIC |
| `GET /genres` | `page`, `limit` | — | 200 `GenrePage` | GUEST:PUBLIC; CUSTOMER:PUBLIC; STAFF:PUBLIC; MANAGER:PUBLIC; ADMIN:PUBLIC |
| **[Stage 1]** `GET /cinemas` | `city` | — | 200 `Stage1CinemaListResponse` | PUBLIC |
| **[Stage 1]** `GET /cinemas/{id}` | — | — | 200 `Stage1CinemaResponse` | PUBLIC |
| **[Stage 1]** `GET /showtimes` | `movieId`, `cinemaId`, `date`, `format` | — | 200 `Stage1ShowtimeListResponse` | PUBLIC |
| `GET /showtimes/{id}` | — | — | 200 `ShowtimeResponse` | GUEST:PUBLIC; CUSTOMER:PUBLIC; STAFF:PUBLIC; MANAGER:PUBLIC; ADMIN:PUBLIC |
| **[Stage 1]** `GET /showtimes/{id}/seats` | — | — | 200 `Stage1SeatInventoryResponse` | PUBLIC; bearer tùy chọn |
| `GET /combos` | `cinemaId`!, `page`, `limit` | — | 200 `ComboPage` | GUEST:PUBLIC; CUSTOMER:PUBLIC; STAFF:PUBLIC; MANAGER:PUBLIC; ADMIN:PUBLIC |
| `GET /vouchers` | `cinemaId`!, `page`, `limit` | — | 200 `VoucherSummaryPage` | GUEST:PUBLIC; CUSTOMER:PUBLIC; STAFF:PUBLIC; MANAGER:PUBLIC; ADMIN:PUBLIC |

### F03. Đặt vé online

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| **[Stage 1]** `POST /orders` | — | `Stage1CreateOrder` | 201 `Stage1OrderResponse` | Bearer OWN |
| **[Stage 1]** `GET /orders/pending` | `showtimeId` | — | 200 `Stage1PendingOrderResponse` | Bearer OWN |
| **[Stage 1]** `GET /orders/{id}` | — | — | 200 `Stage1OrderResponse` | CUSTOMER:OWN; STAFF:CINEMA; MANAGER:CINEMA; ADMIN:SYSTEM |
| **[Stage 1]** `PATCH /orders/{id}` | — | `Stage1OrderUpdate` | 200 `Stage1OrderResponse` | Bearer, chỉ chủ đơn |
| `PUT /orders/{id}/combos` | — | `OrderCombosWrite` | 200 `OrderResponse` | CUSTOMER:OWN |
| `POST /orders/{id}/voucher` | — | `ApplyVoucher` | 200 `OrderResponse` | CUSTOMER:OWN |
| `DELETE /orders/{id}/voucher` | — | — | 200 `OrderResponse` | CUSTOMER:OWN |
| **[Stage 1]** `POST /orders/{id}/cancel` | — | `Stage1CancelOrder` | 200 `Stage1CancelResponse` | OWN/CINEMA/SYSTEM |

### F04. Thanh toán

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| **[Stage 1]** `POST /orders/{id}/pay` | — | `Stage1PayRequest` | 200 `Stage1PayResponse` | Bearer, chỉ chủ đơn |
| **[Stage 1]** `GET /payment/vnpay/ipn` | Query provider ký HMAC, xem mục 0.3/OpenAPI | — | 200 `VnpayAck` thô | PUBLIC, service verify |
| **[Stage 1]** `GET /payment/vnpay/return` | Query provider ký HMAC; Accept quyết định kiểu trả | — | 302 Location hoặc 200 `Stage1VnpayReturnResponse` | PUBLIC, service verify |

### F05. Vé và email

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `POST /orders/{id}/resend-email` | — | — | 202 `MessageResponse` | CUSTOMER:OWN; STAFF:CINEMA; MANAGER:CINEMA; ADMIN:SYSTEM |

### F06. Lịch sử, hủy và hoàn

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /me/orders` | `status`, `tab`, `sort`, `page`, `limit` | — | 200 `OrderSummaryPage` | CUSTOMER:OWN |
| `GET /me/orders/{id}` | — | — | 200 `OrderResponse` | CUSTOMER:OWN |
| `GET /me/orders/{id}/cancellation-preview` | — | — | 200 `CancelPreviewResponse` | CUSTOMER:OWN |
| `POST /me/orders/{id}/cancel` ★ | — | `CancelPaidRequest` | 200 `OrderResponse` | CUSTOMER:OWN |
| `GET /admin/orders` | `cinemaId`, `q`, `fromDate`, `toDate`, `status`, `source`, `refundStatus`, `page`, `limit` | — | 200 `OrderSummaryPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/orders/{id}/payment-logs` | `page`, `limit` | — | 200 `PaymentLogPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/orders/{id}/cancellation-preview` | — | — | 200 `CancelPreviewResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/orders/{id}/cancel` ★ | — | `CancelPaidRequest` | 200 `OrderResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/refunds` | `cinemaId`, `status`, `orderId`, `paymentId`, `fromDate`, `toDate`, `page`, `limit` | — | 200 `RefundPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/refunds/{id}/confirm` ★ | — | `RefundConfirm` | 200 `RefundResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |

### F07. Bán tại quầy

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /counter/dashboard` | `cinemaId`!, `date` | — | 200 `CounterDashboardResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `GET /counter/orders` | `cinemaId`, `q`, `status`, `source`, `page`, `limit` | — | 200 `OrderSummaryPage` | STAFF:CINEMA; MANAGER:CINEMA |
| `POST /counter/orders` ★ | — | `CounterCreateOrder` | 201 `OrderResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `PUT /counter/orders/{id}/combos` | — | `OrderCombosWrite` | 200 `OrderResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `POST /counter/orders/{id}/voucher` | — | `ApplyVoucher` | 200 `OrderResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `DELETE /counter/orders/{id}/voucher` | — | — | 200 `OrderResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `POST /counter/orders/{id}/confirm-payment` ★ | — | `CounterPaymentRequest` | 200 `CounterPaymentResultResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `GET /counter/orders/{id}/print` | — | — | 200 text/html | STAFF:CINEMA; MANAGER:CINEMA |
| `GET /counter/customers` | `cinemaId`!, `phone`! | — | 200 `CounterCustomerResponse` | STAFF:CINEMA; MANAGER:CINEMA |

### F08. Soát vé

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `POST /checkin` ★ | — | `CheckinRequest` | 200 `CheckinResultResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `GET /checkin/stats` | `showtimeId`! | — | 200 `CheckinStatsResponse` | STAFF:CINEMA; MANAGER:CINEMA |
| `GET /checkin/history` | `cinemaId`, `showtimeId`, `page`, `limit` | — | 200 `CheckinLogPage` | STAFF:CINEMA; MANAGER:CINEMA |

### F09. Quản lý phim và thể loại

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/movies` | `q`, `status`, `isActive`, `genre`, `page`, `limit` | — | 200 `MoviePage` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `POST /admin/movies` | — | `MovieWrite` | 201 `MovieResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `GET /admin/movies/{id}` | — | — | 200 `MovieResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `PATCH /admin/movies/{id}` | — | `MovieUpdate` | 200 `MovieResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `DELETE /admin/movies/{id}` | — | — | 204 không body | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `GET /admin/genres` | `page`, `limit` | — | 200 `GenrePage` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `POST /admin/genres` | — | `GenreWrite` | 201 `GenreResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `PUT /admin/genres/{id}` | — | `GenreWrite` | 200 `GenreResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `DELETE /admin/genres/{id}` | — | — | 204 không body | MANAGER:SYSTEM; ADMIN:SYSTEM |

### F10. Rạp, phòng và ghế

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/cinemas` | `q`, `status`, `page`, `limit` | — | 200 `CinemaPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/cinemas` | — | `CinemaWrite` | 201 `CinemaResponse` | ADMIN:SYSTEM |
| `GET /admin/cinemas/{id}` | — | — | 200 `CinemaResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PUT /admin/cinemas/{id}` | — | `CinemaWrite` | 200 `CinemaResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `DELETE /admin/cinemas/{id}` | — | — | 204 không body | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/cinemas/{id}/staff` | `page`, `limit` | — | 200 `UserPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/rooms` | `cinemaId`, `status`, `page`, `limit` | — | 200 `RoomPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/rooms` | — | `RoomWrite` | 201 `RoomResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/rooms/{id}` | — | — | 200 `RoomResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PUT /admin/rooms/{id}` | — | `RoomWrite` | 200 `RoomResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `DELETE /admin/rooms/{id}` | — | — | 204 không body | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/rooms/{id}/seat-map` | — | — | 200 `SeatMapResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PUT /admin/rooms/{id}/seat-map` | — | `SeatMapWrite` | 200 `SeatMapResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |

### F11. Suất chiếu

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/showtimes` | `cinemaId`, `roomId`, `movieId`, `date`, `fromDate`, `toDate`, `status`, `page`, `limit` | — | 200 `ShowtimePage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/showtimes` | — | `ShowtimeWrite` | 201 `ShowtimeResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/showtimes/{id}` | — | — | 200 `ShowtimeResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PUT /admin/showtimes/{id}` | — | `ShowtimeWrite` | 200 `ShowtimeResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `DELETE /admin/showtimes/{id}` | — | — | 204 không body | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/showtimes/{id}/cancellation-preview` | — | — | 200 `ShowtimeCancelPreviewResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/showtimes/{id}/cancel` ★ | — | `ShowtimeCancelRequest` | 200 `ShowtimeCancelResultResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/showtimes/bulk-preview` ◇ | — | `BulkShowtimeRequest` | 200 `BulkShowtimePreviewResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/showtimes/bulk` ★ ◇ | — | `BulkShowtimeRequest` | 201 `ShowtimePage` | MANAGER:CINEMA; ADMIN:SYSTEM |

### F12. Bảng giá và ngày lễ

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/pricing` | `cinemaId`!, `effectiveDate` | — | 200 `PricingResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PUT /admin/pricing` | — | `PricingWrite` | 200 `PricingResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/holidays` | `year`, `page`, `limit` | — | 200 `HolidayPage` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `POST /admin/holidays` | — | `HolidayWrite` | 201 `HolidayResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `DELETE /admin/holidays/{id}` | — | — | 204 không body | MANAGER:SYSTEM; ADMIN:SYSTEM |

### F13. Voucher và combo

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/vouchers` | `cinemaId`, `q`, `status`, `page`, `limit` | — | 200 `VoucherPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/vouchers` | — | `VoucherWrite` | 201 `VoucherResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/vouchers/{id}` | — | — | 200 `VoucherResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PATCH /admin/vouchers/{id}` | — | `VoucherUpdate` | 200 `VoucherResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `DELETE /admin/vouchers/{id}` | — | — | 204 không body | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/vouchers/{id}/redemptions` | `status`, `page`, `limit` | — | 200 `VoucherRedemptionPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/combos` | `cinemaId`, `isActive`, `q`, `page`, `limit` | — | 200 `ComboPage` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `POST /admin/combos` | — | `ComboWrite` | 201 `ComboResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/combos/{id}` | — | — | 200 `ComboResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `PATCH /admin/combos/{id}` | — | `ComboUpdate` | 200 `ComboResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `DELETE /admin/combos/{id}` | — | — | 204 không body | MANAGER:CINEMA; ADMIN:SYSTEM |

### F14. Dashboard và báo cáo

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/dashboard` | `cinemaId` | — | 200 `DashboardResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/reports/overview` | `fromDate`, `toDate`, `cinemaId`, `movieId` | — | 200 `ReportOverviewResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/reports` | `type`!, `fromDate`, `toDate`, `cinemaId`, `movieId` | — | 200 `ReportResponse` | MANAGER:CINEMA; ADMIN:SYSTEM |
| `GET /admin/reports/export` | `type`!, `format`, `fromDate`, `toDate`, `cinemaId`, `movieId` | — | 200 text/csv | MANAGER:CINEMA; ADMIN:SYSTEM |

### F15. Người dùng và phân quyền

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/users` | `q`, `role`, `status`, `cinemaId`, `page`, `limit` | — | 200 `UserPage` | ADMIN:SYSTEM |
| `POST /admin/users` | — | `StaffCreate` | 201 `UserResponse` | ADMIN:SYSTEM |
| `GET /admin/users/{id}` | — | — | 200 `UserResponse` | ADMIN:SYSTEM |
| `PATCH /admin/users/{id}` | — | `UserAdminUpdate` | 200 `UserResponse` | ADMIN:SYSTEM |
| `PUT /admin/users/{id}/role` | — | `UserRoleWrite` | 200 `UserResponse` | ADMIN:SYSTEM |
| `PUT /admin/users/{id}/cinemas` | — | `UserCinemasWrite` | 200 `UserResponse` | ADMIN:SYSTEM |
| `PATCH /admin/users/{id}/status` | — | `UserStatusWrite` | 200 `UserResponse` | ADMIN:SYSTEM |
| `GET /admin/users/{id}/orders` | `page`, `limit` | — | 200 `OrderSummaryPage` | ADMIN:SYSTEM |
| `GET /admin/users/{id}/loyalty-transactions` | `page`, `limit` | — | 200 `LoyaltyTransactionPage` | ADMIN:SYSTEM |

### F16. Cấu hình và audit

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /admin/settings` | — | — | 200 `SettingsResponse` | ADMIN:SYSTEM |
| `PUT /admin/settings` | — | `SettingsWrite` | 200 `SettingsResponse` | ADMIN:SYSTEM |
| `GET /admin/audit-logs` | `actorId`, `action`, `entity`, `entityId`, `fromTime`, `toTime`, `page`, `limit` | — | 200 `AuditLogPage` | ADMIN:SYSTEM |
| `GET /admin/audit-logs/{id}` | — | — | 200 `AuditLogResponse` | ADMIN:SYSTEM |

### F17. Gợi ý ML

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /me/recommendations` ◇ | `k` | — | 200 `RecommendationsResponse` | CUSTOMER:OWN |

### F18. Đánh giá

| Method / path | Query | Body | Thành công | Role / scope |
|---|---|---|---|---|
| `GET /movies/{id}/reviews` ◇ | `page`, `limit` | — | 200 `ReviewPage` | GUEST:PUBLIC; CUSTOMER:PUBLIC; STAFF:PUBLIC; MANAGER:PUBLIC; ADMIN:PUBLIC |
| `GET /me/reviews` ◇ | `movieId`, `page`, `limit` | — | 200 `ReviewPage` | CUSTOMER:OWN |
| `PUT /movies/{id}/review` ◇ | — | `ReviewWrite` | 200 `ReviewResponse` | CUSTOMER:OWN |
| `GET /admin/reviews` ◇ | `movieId`, `isHidden`, `page`, `limit` | — | 200 `ReviewPage` | MANAGER:SYSTEM; ADMIN:SYSTEM |
| `PATCH /admin/reviews/{id}` ◇ | — | `ReviewModerate` | 200 `ReviewResponse` | MANAGER:SYSTEM; ADMIN:SYSTEM |

### F19. Job nền và tác vụ nội bộ

Không có API public để chạy job. Worker dùng khóa DB/leader lock và các service transaction chung với API: nhả hold mỗi phút, đóng suất mỗi 5 phút, chuyển trạng thái phim/dọn token hằng ngày, hết hạn vé mỗi giờ, nhắc lịch mỗi 15 phút nếu bật. Ghế HELD hết hạn luôn được coi là trống trong query, kể cả job chậm. Email outbox retry/backoff; lỗi email không hỏng order/vé. Jobs chạy idempotent khi nhiều instance, ghi log/metrics. Vận hành bằng tiến trình worker theo 06, không route dành cho GUEST hoặc lệnh ADMIN tùy ý.

## 6. Mẫu request/response cốt lõi (thiết kế mục tiêu)

Các mẫu trong mục 6 giữ **thiết kế mục tiêu**, không thay thế DTO Stage1* tại mục 0; đặc biệt Order mẫu, route combo/voucher riêng, idempotency và FREE chưa phản ánh runtime. UUID là dữ liệu minh họa; không dùng làm seed hay dữ liệu đặt vé thật. Request protected gửi `Authorization: Bearer <accessToken>`; lệnh có ký hiệu ★ thêm `Idempotency-Key: <UUID>`. JSON dưới đây là body/response mẫu theo schema thiết kế cũ trong OpenAPI; operation implemented dùng schema Stage1* thay thế. Các response lớn giữ đầy đủ schema để frontend thấy ticket, snapshot và payment.

### 6.1 Login, refresh và phiên

Gọi `GET /api/v1/auth/csrf` với `credentials:include`, lấy token và bootstrap cookie. Login gửi `X-CSRF-Token` và `Origin`:

`POST /api/v1/auth/login`

```json
{
  "identifier": "khach@example.com",
  "password": "Movie123"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "accessToken": "example.jwt.access",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "22222222-2222-4222-8222-222222222222",
      "fullName": "Nguyễn An",
      "email": "khach@example.com",
      "phone": "0901234567",
      "birthDate": "2000-01-01",
      "avatarUrl": null,
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "points": 0,
      "cinemas": [],
      "createdAt": "2026-10-03T12:00:00Z"
    }
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

Response còn có cookie `refreshToken=<opaque>; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=604800` và `Cache-Control:no-store`. Không có refreshToken trong JSON. `POST /api/v1/auth/refresh` không body, browser gửi cookie + X-CSRF-Token, trả AuthSession và cookie mới. Nếu 401, clear state và login; không tạo vòng refresh. Reload app lấy CSRF rồi refresh.

### 6.2 Giữ ghế, combo, voucher và pay

`POST /api/v1/orders` với Idempotency-Key mới

```json
{
  "showtimeId": "44444444-4444-4444-8444-444444444444",
  "seatIds": [
    "11111111-1111-4111-8111-111111111111"
  ],
  "ageConfirmed": true
}
```

Response 201:

```json
{
  "success": true,
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "code": "MV261003K8Q2ZA",
    "userId": "22222222-2222-4222-8222-222222222222",
    "showtimeId": "44444444-4444-4444-8444-444444444444",
    "cinemaId": "13131313-1313-4313-8313-131313131313",
    "source": "ONLINE",
    "status": "PENDING_PAYMENT",
    "refundStatus": "NONE",
    "snapshot": {
      "movieTitle": "Phim minh họa",
      "posterUrl": "https://media.example.com/poster.webp",
      "ageRating": "T16",
      "cinemaName": "Rạp trung tâm",
      "cinemaAddress": "TP. Hồ Chí Minh",
      "roomName": "Phòng1",
      "format": "2D",
      "language": "SUBTITLED",
      "startTime": "2026-10-03T17:00:00Z",
      "endTime": "2026-10-03T19:15:00Z"
    },
    "items": [
      {
        "seatId": "11111111-1111-4111-8111-111111111111",
        "seatLabel": "A5",
        "seatType": "VIP",
        "capacityUnits": 1,
        "price": 95000
      }
    ],
    "combos": [],
    "ticketSubtotal": 95000,
    "comboSubtotal": 0,
    "subtotal": 95000,
    "discount": 0,
    "total": 95000,
    "currency": "VND",
    "voucherCode": null,
    "expectedPoints": 9,
    "expiresAt": "2026-10-03T12:40:00Z",
    "createdAt": "2026-10-03T12:30:00Z",
    "paidAt": null,
    "paymentInProgress": false,
    "tickets": [],
    "payments": [],
    "refunds": [],
    "pricingLocked": false,
    "settledPaymentId": null
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

Ghế tranh chấp trả 409 SEAT_UNAVAILABLE và frontend refetch sơ đồ; tạo thành công nhưng mất response thì retry cùng key trước khi tìm pending. Thay combo trước payment attempt:

```http
PUT /api/v1/orders/55555555-5555-4555-8555-555555555555/combos
Authorization: Bearer <accessToken>
Content-Type: application/json

{"items":[{"comboId":"66666666-6666-4666-8666-666666666666","quantity":1}]}
```

`POST /api/v1/orders/{id}/voucher` body `{"code":"FILM20"}` reserve quota và trả Order với tổng do server tính. Sau attempt đầu tiên, sửa combo/voucher trả ORDER_INVALID_STATE; hủy rồi tạo lại nếu muốn thay giá.

`POST /api/v1/orders/55555555-5555-4555-8555-555555555555/pay` với key mới

```json
{
  "method": "VNPAY",
  "locale": "vn"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "orderId": "55555555-5555-4555-8555-555555555555",
    "payment": {
      "id": "88888888-8888-4888-8888-888888888888",
      "orderId": "55555555-5555-4555-8555-555555555555",
      "provider": "VNPAY",
      "txnRef": "MV261003K8Q2ZA-1",
      "amount": 95000,
      "status": "PENDING",
      "createdAt": "2026-10-03T12:30:00Z",
      "paidAt": null,
      "method": "VNPAY"
    },
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=9500000&vnp_TxnRef=MV261003K8Q2ZA-1",
    "expiresAt": "2026-10-03T12:40:00Z",
    "orderStatus": "PENDING_PAYMENT"
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

URL mẫu được rút gọn; URL thực phải có đủ tham số và chữ ký server. Sau IPN, `GET /api/v1/orders/{id}` trả Order PAID cùng tickets VALID. `ticketCode` ví dụ `TK8F3K29QXAZ` (TK + 10 ký tự), QR chứa mã và chữ ký. Email chậm không đổi trạng thái PAID. Khi tổng bằng 0, response cùng PayResult có provider INTERNAL, method FREE, SUCCESS, amount 0, paymentUrl null, orderStatus PAID; frontend mở chi tiết vé ngay.

### 6.3 Xem trước hủy, hủy toàn đơn và hoàn thủ công

`GET /api/v1/me/orders/{id}/cancellation-preview` chỉ đọc

Response 200:

```json
{
  "success": true,
  "data": {
    "orderId": "55555555-5555-4555-8555-555555555555",
    "canCancel": true,
    "reasonCode": null,
    "policyVersion": "cancel-v1-2h-full",
    "cancelBefore": "2026-10-03T15:00:00Z",
    "refundAmount": 95000,
    "fee": 0,
    "currency": "VND"
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

`POST /api/v1/me/orders/{id}/cancel` với key mới

```json
{
  "reason": "Không thể đến rạp",
  "confirmed": true,
  "policyVersion": "cancel-v1-2h-full"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "code": "MV261003K8Q2ZA",
    "userId": "22222222-2222-4222-8222-222222222222",
    "showtimeId": "44444444-4444-4444-8444-444444444444",
    "cinemaId": "13131313-1313-4313-8313-131313131313",
    "source": "ONLINE",
    "status": "CANCELLED",
    "refundStatus": "PENDING",
    "snapshot": {
      "movieTitle": "Phim minh họa",
      "posterUrl": "https://media.example.com/poster.webp",
      "ageRating": "T16",
      "cinemaName": "Rạp trung tâm",
      "cinemaAddress": "TP. Hồ Chí Minh",
      "roomName": "Phòng1",
      "format": "2D",
      "language": "SUBTITLED",
      "startTime": "2026-10-03T17:00:00Z",
      "endTime": "2026-10-03T19:15:00Z"
    },
    "items": [
      {
        "seatId": "11111111-1111-4111-8111-111111111111",
        "seatLabel": "A5",
        "seatType": "VIP",
        "capacityUnits": 1,
        "price": 95000
      }
    ],
    "combos": [],
    "ticketSubtotal": 95000,
    "comboSubtotal": 0,
    "subtotal": 95000,
    "discount": 0,
    "total": 95000,
    "currency": "VND",
    "voucherCode": null,
    "expectedPoints": 9,
    "expiresAt": "2026-10-03T12:40:00Z",
    "createdAt": "2026-10-03T12:30:00Z",
    "paidAt": "2026-10-03T12:30:00Z",
    "paymentInProgress": false,
    "tickets": [
      {
        "id": "14141414-1414-4414-8414-141414141414",
        "ticketCode": "TK8F3K29QXAZ",
        "seatId": "11111111-1111-4111-8111-111111111111",
        "seatLabel": "A5",
        "seatType": "VIP",
        "price": 95000,
        "status": "CANCELLED",
        "qrPayload": "TK8F3K29QXAZ.example-signature",
        "checkedInAt": null
      }
    ],
    "payments": [
      {
        "id": "88888888-8888-4888-8888-888888888888",
        "orderId": "55555555-5555-4555-8555-555555555555",
        "provider": "VNPAY",
        "txnRef": "MV261003K8Q2ZA-1",
        "amount": 95000,
        "status": "SUCCESS",
        "createdAt": "2026-10-03T12:30:00Z",
        "paidAt": "2026-10-03T12:30:00Z",
        "method": "VNPAY"
      }
    ],
    "refunds": [
      {
        "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "orderId": "55555555-5555-4555-8555-555555555555",
        "paymentId": "88888888-8888-4888-8888-888888888888",
        "amount": 95000,
        "reason": "ORDER_CANCELLED",
        "status": "PENDING",
        "method": null,
        "manualReference": null,
        "notes": null,
        "createdAt": "2026-10-03T12:30:00Z",
        "refundedAt": null
      }
    ],
    "pricingLocked": true,
    "settledPaymentId": "88888888-8888-4888-8888-888888888888"
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

Vé hủy vẫn trong lịch sử. Quá hạn trả CANCEL_WINDOW_PASSED; đã có vé USED trả TICKET_ALREADY_USED. Nếu cancel cạnh tranh IPN, khóa transaction quyết định trạng thái, không ghi chồng. Sau khi quản lý thực sự hoàn tiền ngoài hệ thống:

`POST /api/v1/admin/refunds/{refundId}/confirm` với manager/admin và key mới

```json
{
  "method": "BANK_TRANSFER",
  "manualReference": "BANK-20261003-001",
  "notes": "Đã hoàn tiền theo sao kê",
  "confirmed": true
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "orderId": "55555555-5555-4555-8555-555555555555",
    "paymentId": "88888888-8888-4888-8888-888888888888",
    "amount": 95000,
    "reason": "ORDER_CANCELLED",
    "status": "REFUNDED",
    "method": "BANK_TRANSFER",
    "manualReference": "BANK-20261003-001",
    "notes": "Đã hoàn tiền theo sao kê",
    "createdAt": "2026-10-03T12:30:00Z",
    "refundedAt": "2026-10-03T13:00:00Z"
  },
  "serverTime": "2026-10-03T13:00:00Z"
}
```

### 6.4 Quầy, liên kết khách và soát vé

Trước tạo, `GET /api/v1/counter/customers?cinemaId=<UUID>&phone=0901234567` chỉ trả safe DTO `found/customerId/fullNameMasked/points`; thiếu khách trả found=false, các field null. Không lộ email, DOB hoặc lịch sử. Backend tra lại customerPhone ở create, không nhận userId tùy ý.

`POST /api/v1/counter/orders` với key mới

```json
{
  "showtimeId": "44444444-4444-4444-8444-444444444444",
  "seatIds": [
    "11111111-1111-4111-8111-111111111111"
  ],
  "ageConfirmed": true,
  "customerPhone": "0901234567"
}
```

Response 201 là Order nguồn COUNTER, expiresAt sau 3 phút; userId nullable nếu walk-in. Xác nhận thu tiền:

`POST /api/v1/counter/orders/{id}/confirm-payment` với key mới

```json
{
  "method": "CASH",
  "cashReceived": 100000
}
```

Response 200 CounterPaymentResult gồm order PAID, cashReceived và change do server tính (ví dụ giá 95.000, khách đưa 100.000, thối 5.000). Cùng key không tạo payment/vé mới. GET print trả HTML có QR; hủy quầy chỉ MANAGER/ADMIN.

`POST /api/v1/checkin` với key mới

```json
{
  "ticketCode": "TK8F3K29QXAZ",
  "showtimeId": "44444444-4444-4444-8444-444444444444"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "result": "OK",
    "ticket": {
      "id": "14141414-1414-4414-8414-141414141414",
      "ticketCode": "TK8F3K29QXAZ",
      "seatId": "11111111-1111-4111-8111-111111111111",
      "seatLabel": "A5",
      "seatType": "VIP",
      "price": 95000,
      "status": "USED",
      "qrPayload": "TK8F3K29QXAZ.example-signature",
      "checkedInAt": "2026-10-03T16:45:00Z"
    },
    "showtime": {
      "id": "44444444-4444-4444-8444-444444444444",
      "movieId": "ffffffff-ffff-4fff-8fff-ffffffffffff",
      "movieTitle": "Phim minh họa",
      "posterUrl": "https://media.example.com/poster.webp",
      "ageRating": "T16",
      "cinemaId": "13131313-1313-4313-8313-131313131313",
      "cinemaName": "Rạp trung tâm",
      "roomId": "12121212-1212-4212-8212-121212121212",
      "roomName": "Phòng1",
      "startTime": "2026-10-03T17:00:00Z",
      "endTime": "2026-10-03T19:15:00Z",
      "format": "2D",
      "language": "SUBTITLED",
      "status": "OPEN",
      "availableSeats": 80,
      "capacity": 100,
      "priceFrom": 95000,
      "bookingClosesAt": "2026-10-03T16:45:00Z",
      "canBook": true
    },
    "checkedInBy": "15151515-1515-4515-8515-151515151515"
  },
  "serverTime": "2026-10-03T16:45:00Z"
}
```

QR gửi `qrPayload` thay ticketCode, không gửi cả hai. Quét lại bằng key mới trả:

```json
{"success":false,"error":{"code":"TICKET_ALREADY_USED","message":"Vé đã được soát","details":[{"checkedInAt":"2026-10-03T16:45:00Z"}]}}
```

Scan network retry cùng key trả OK cũ. QR hash sai trả INVALID_TICKET. Nhập tay được phép cho STAFF/MANAGER có log; ADMIN gọi checkin bị 403.

### 6.5 Quản trị, upload và phân trang

`POST /api/v1/admin/showtimes` với manager/admin

```json
{
  "movieId": "ffffffff-ffff-4fff-8fff-ffffffffffff",
  "roomId": "12121212-1212-4212-8212-121212121212",
  "startTime": "2026-10-03T17:00:00Z",
  "format": "2D",
  "language": "SUBTITLED"
}
```

Response 201:

```json
{
  "success": true,
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "movieId": "ffffffff-ffff-4fff-8fff-ffffffffffff",
    "movieTitle": "Phim minh họa",
    "posterUrl": "https://media.example.com/poster.webp",
    "ageRating": "T16",
    "cinemaId": "13131313-1313-4313-8313-131313131313",
    "cinemaName": "Rạp trung tâm",
    "roomId": "12121212-1212-4212-8212-121212121212",
    "roomName": "Phòng1",
    "startTime": "2026-10-03T17:00:00Z",
    "endTime": "2026-10-03T19:15:00Z",
    "format": "2D",
    "language": "SUBTITLED",
    "status": "OPEN",
    "availableSeats": 80,
    "capacity": 100,
    "priceFrom": 95000,
    "bookingClosesAt": "2026-10-03T16:45:00Z",
    "canBook": true
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

Ví dụ phim 120 phút + quảng cáo 15 phút: kết thúc 19:15Z, dọn phòng đến 19:30Z; suất mới bắt đầu đúng 19:30Z không overlap. Backend khóa phòng để tránh hai manager cùng xếp lịch. Phòng ngoài scope bị từ chối; overlap trả SHOWTIME_OVERLAP.

`GET /api/v1/admin/orders?cinemaId=<UUID>&status=PAID&page=1&limit=20` có response rỗng hợp lệ:

```json
{"data":[],"meta":{"page":1,"limit":20,"total":0},"serverTime":"2026-10-03T12:30:00Z"}
```

Upload poster: `POST /api/v1/media`, multipart fields `file=<JPEG/PNG/WebP>` và `purpose=POSTER`. Frontend để browser set boundary. Response 201 MediaResult có id/url/contentType/sizeBytes/width/height; dùng URL đó trong MovieWrite.posterUrl. Backend kiểm binary, không nhận HTML/SVG/executable hoặc fetch URL ngoài.

`PUT /api/v1/admin/users/{id}/role` chỉ ADMIN

```json
{
  "role": "MANAGER",
  "cinemaIds": [
    "13131313-1313-4313-8313-131313131313"
  ],
  "reason": "Phân công rạp"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "fullName": "Nguyễn An",
    "email": "khach@example.com",
    "phone": "0901234567",
    "birthDate": "2000-01-01",
    "avatarUrl": null,
    "role": "MANAGER",
    "status": "ACTIVE",
    "points": 0,
    "cinemas": [
      {
        "cinemaId": "13131313-1313-4313-8313-131313131313",
        "cinemaName": "Rạp trung tâm"
      }
    ],
    "createdAt": "2026-10-03T12:00:00Z"
  },
  "serverTime": "2026-10-03T12:30:00Z"
}
```

Role/assignment/revoke/audit cùng transaction. STAFF/MANAGER không tự phân quyền, `/me` không cho sửa role. Không tự khóa hoặc hạ quyền ADMIN cuối cùng.

## 7. API vận hành và service ML riêng (thiết kế mục tiêu)

| Method / URL | Query/body | Response | Security / scope |
|---|---|---|---|
| `GET /health/live` (backend origin, ngoài /api/v1) | Không | 200 Health, status=ok | PUBLIC, không token |
| `GET /health/ready` (backend origin, ngoài /api/v1) | Không | 200 ready hoặc 503 not_ready | PUBLIC, không token |
| `GET http://ml-service:8000/recommend` | `user_id` UUID bắt buộc, `k=1..20` mặc định 10 | 200 MlRecommendations `{items:[{movie_id,score}]}` | X-Service-Token, INTERNAL_SERVICE:SYSTEM |

Health chỉ trả trạng thái/service, không lộ cấu hình/secret. Liveness không phụ thuộc DB; readiness kiểm DB với timeout ngắn, không chặn vì VNPay/SMTP/ML tạm thời lỗi. Service ML là mạng private, không expose qua gateway; frontend không gọi trực tiếp. `ML_SERVICE_TOKEN` từ ENV và header `X-Service-Token` là credential giữa service; snake_case user_id/movie_id giữ theo contract Python. Backend timeout 2 giây và fallback. Không gửi email/SĐT cho ML.

## 8. Kiểm tra hợp đồng khi triển khai (thiết kế mục tiêu)

Import [openapi.json](openapi.json) theo [OpenAPI 3.0.3 chính thức](https://spec.openapis.org/oas/v3.0.3.html). `operationId` phải duy nhất; mọi role/scope được middleware/service thực thi. Request JSON không nhận field lạ; không dùng Prisma entity trực tiếp làm DTO để tránh mass assignment. Security trong OAS không thay backend RBAC hoặc constraint DB.

Trước demo, kiểm race giữ cùng ghế, hai tab một khách, IPN duplicate, success muộn sau expire/cancel, hủy suất cùng pay, success attempt thứ hai, scan đồng thời và quota cuối. Đối chiếu revenue với order PAID và refund theo payment; khoản thu trùng không được tính thành vé bán. Kiểm cookie/CSRF/CORS trên domain HTTPS thật, không chỉ Swagger. F19 không có public API chạy job; kiểm worker/outbox ở tầng service/DB theo 06.
