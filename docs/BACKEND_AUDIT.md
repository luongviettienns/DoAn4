# Code Review Summary

> Đây là snapshot các finding **trước khi sửa** ngày 03/10/2026. Nhiều lỗi bên dưới đã được tái hiện bằng regression test và sửa trong cùng lượt làm việc. Trạng thái cuối cùng, việc còn thiếu và số liệu kiểm chứng được tổng hợp tại [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

Rà soát tĩnh ngày 03/10/2026, đối chiếu `docs/01-tong-quan-va-yeu-cau.md` và `docs/02-luong-chuc-nang.md`. Phạm vi: `backend/src`, `backend/prisma`, các test hiện có và điểm khởi động server. Giai đoạn audit không đọc/in bí mật `.env`, không sửa code ứng dụng, không chạy test có ghi DB. Các finding dưới đây là snapshot trước đợt sửa lỗi; các kịch bản mô tả cách tái hiện theo source, chưa phải toàn bộ kết quả chạy trên DB. Kết quả sửa/xác minh mới cần đối chiếu báo cáo tổng của phiên làm việc.

**Kết luận: chưa sẵn sàng đưa lên sản phẩm chính thức.** Các lỗi có thể tạo vé chưa thu tiền, bán trùng ghế, nhận vé khi ghế thuộc đơn khác, soát cùng vé nhiều lần và thao tác ngoài rạp được phân quyền.

Cập nhật sau audit: đã sửa riêng refresh token trong `auth.service.ts` và thêm `auth-security.test.ts` trên DB `_test` với tài khoản riêng, cleanup theo ID test. Trước sửa: 3/6 test thất bại (LOCKED, PENDING_VERIFY và rotation đồng thời). Sau sửa: 6/6 đạt; `tsc --noEmit` exit 0. Các test chứng minh chặn refresh tài khoản không ACTIVE, rotation nguyên tử và thu hồi family khi token bị replay; chưa chứng minh toàn bộ an toàn xác thực/triển khai production.

Found 10+ critical issues need to be fixed; liệt kê 10 nhóm ưu tiên cao nhất dưới đây.

## 🔴 Critical (Must Fix)

### 1. [P0] Endpoint mô phỏng thanh toán công khai có thể xuất vé mà không thu tiền

FilePath: `backend/src/modules/payments/payment.routes.ts` line 12; `payment.service.ts` line 191.

#### Explanation

`/simulate-mock` và `/simulate/:orderId` dùng `optionalAuth`, không giới hạn môi trường. Khi không có JWT, `currentUserId` là undefined nên kiểm tra sở hữu ở dòng 201 không chạy. Gửi `POST /api/v1/payment/simulate/<orderId>` không có Authorization vẫn gọi `fulfillPaidOrder`, chuyển payment SUCCESS, order PAID, cấp vé và cộng điểm. Endpoint được mount cả khi `NODE_ENV=production`.

#### Suggested Fix

1. Không đăng ký route mô phỏng trong ứng dụng production; chỉ bật bằng cấu hình test/dev rõ ràng mặc định false.
2. Endpoint test phải yêu cầu xác thực, giới hạn chủ đơn và không được dùng để xác nhận tiền production.
3. Test production app với cả hai endpoint: phải 404 và không thay đổi DB.

---

### 2. [P0] Giữ/bán ghế không nguyên tử, hai khách có thể cùng mua một ghế

FilePath: `backend/src/modules/orders/order.service.ts` line 326; line 645.

#### Explanation

Availability được đọc ở dòng 109/422 và kiểm tra ở 120/433 trước transaction. Trong transaction, `showtimeSeat.update({where:{id}})` ghi đè status và orderId vô điều kiện. Hai khách khác nhau đọc AVAILABLE cùng lúc đều tạo order item hợp lệ; giao dịch sau có thể ghi đè chủ ghế của giao dịch trước. `UNIQUE(showtimeId, seatId)` chỉ bảo đảm một slot, không bảo đảm một đơn sở hữu slot; `OrderItem` chỉ unique theo cặp orderId/slot, nên không ngăn trùng bán. Luồng quầy còn cấp vé ngay sau cập nhật vô điều kiện.

#### Suggested Fix

1. Cập nhật có điều kiện `AVAILABLE OR HELD đã hết hạn` trong cùng transaction; kiểm tra affected count bằng số ghế duy nhất được yêu cầu, thiếu một ghế phải rollback toàn bộ.
2. Dùng cơ chế khóa/điều kiện giống nhau cho online và quầy, thứ tự ghế ổn định; retry có giới hạn khi deadlock/serialization failure.
3. Test cạnh tranh nhiều khách online/online và online/quầy trên MySQL thật: chính xác một đơn thành công cho cùng ghế.

---

### 3. [P1] Callback muộn cấp vé cho ghế đã bị nhả hoặc bán cho khách khác

FilePath: `backend/src/modules/payments/payment.service.ts` line 256; line 284; line 315.

#### Explanation

`fulfillPaidOrder` chỉ dừng khi không có đơn hoặc status PAID; đơn EXPIRED/CANCELLED/FAILED đều được chuyển PAID. Nó cập nhật các slot đang có orderId khớp nhưng không kiểm tra số ghế, trạng thái HELD, hết hạn hoặc các slot gốc của order item. Kịch bản: A hết hạn, sweeper nhả ghế; B mua ghế đó; IPN thành công của A đến muộn vẫn cấp vé VALID cho A mà không lấy được slot nào. Ngay cả khi ghế còn AVAILABLE, không cấp lại ownership nên ghế vẫn có thể bị bán tiếp. Không có luồng PAID_UNFULFILLED/refund request theo F04.2. Không khóa dòng order trước đọc trạng thái; callback và hủy/sweeper có thể đan xen.

#### Suggested Fix

1. Khóa order và slot liên quan trong transaction, xác nhận rõ chuyển trạng thái hợp lệ.
2. Đơn hết hạn: chỉ cấp lại đủ toàn bộ ghế nếu vẫn AVAILABLE; nếu không đủ, lưu payment SUCCESS, order PAID_UNFULFILLED và yêu cầu hoàn PENDING, không tạo vé.
3. Callback cho đơn hủy hoặc payment attempt thứ hai đã thu tiền phải được ghi nhận và đối soát/hoàn, không hồi sinh vé.
4. Test callback muộn ghế còn trống, ghế mất một phần/toàn bộ, IPN đồng thời, IPN cạnh tranh hủy/sweeper, hai payment attempts đều thành công.

---

### 4. [P1] Return URL chốt tiền dù thiếu kiểm tra số tiền và trạng thái giao dịch

FilePath: `backend/src/modules/payments/payment.service.ts` line 173.

#### Explanation

`handleVnpayReturn` chỉ xác minh HMAC và `vnp_ResponseCode === '00'` rồi chốt đơn, không kiểm tra `vnp_Amount`, `vnp_TransactionStatus`, merchant, currency. Theo F04, return chỉ phục vụ hiển thị; IPN là nguồn xác nhận chính thức. Payload có HMAC hợp lệ nhưng amount lệch hoặc transaction status thất bại vẫn chốt PAID. `handleVnpayIpn` có kiểm tra amount và transaction status nhưng không lưu `payment_logs`; catch mọi lỗi thành RspCode 99 không có log để điều tra. Khi order PAID, một IPN từ attempt khác bị bỏ qua trước khi ghi nhận khoản thu đó.

#### Suggested Fix

1. Return chỉ xác minh dữ liệu để hiển thị và để frontend lấy/poll trạng thái đơn.
2. IPN validate cấu trúc scalar, chữ ký, merchant/currency/amount/provider và trạng thái; lưu callback thô cùng kết quả xác minh kể cả thất bại.
3. Ghi nhận từng payment attempt riêng, xử lý trường hợp thu tiền kép thay vì bỏ qua dựa riêng order.status.
4. Test signed return sai amount/status không thay đổi đơn; callback thiếu/sai/trùng tham số, signature sai, replay và thu tiền kép.

---

### 5. [P1] Quyền theo rạp bị bỏ qua trên nhiều API

FilePath: `backend/src/modules/orders/order.service.ts` line 772; line 896; `backend/src/modules/reports/report.controller.ts` line 10.

#### Explanation

Mọi STAFF/MANAGER được đọc/hủy mọi đơn vì service chỉ kiểm tra role. `getOrderById` còn cho CUSTOMER đọc đơn quầy `userId=null` vì điều kiện ở 773 yêu cầu order.userId truthy. Report controller đọc `(user as any).cinemaId` trong khi authenticate chỉ cung cấp cinemaIds, nên manager có thể xem toàn hệ thống hoặc rạp bất kỳ qua query. Các route tạo phòng/suất và CRUD combo/voucher chỉ dùng requireRole; không áp dụng requireCinemaAccess hay kiểm tra ownership trong service. `createCounterOrder` dòng 416 và checkin dòng 60 chỉ chặn khi danh sách rạp không rỗng; nhân sự chưa gán rạp được phép thao tác mọi rạp. STAFF còn được hủy đơn quầy, trái F07.

#### Suggested Fix

1. Enforce scope trong service bằng dữ liệu đối tượng lấy từ DB; ADMIN có quyền toàn hệ thống, STAFF/MANAGER chỉ danh sách rạp được gán; danh sách rỗng phải từ chối.
2. CUSTOMER cần `order.userId === currentUserId` chính xác; đơn khách quầy không thuộc mọi customer.
3. Manager báo cáo dùng mảng cinemaIds và giao của bộ lọc; không tin cinemaId từ client.
4. Test đầy đủ ma trận GUEST/CUSTOMER/STAFF/MANAGER/ADMIN, nhân sự rạp A truy cập rạp B, nhân sự chưa gán rạp, đơn quầy khách vãng lai.

---

### 6. [P1] Soát vé không bảo đảm dùng một lần và không xác minh QR/cửa sổ thời gian

FilePath: `backend/src/modules/checkin/checkin.service.ts` line 18; line 102.

#### Explanation

Hai request cùng đọc ticket VALID rồi cùng `ticket.update({where:{id}})` đều trả OK; lần sau ghi đè checkedInAt/checkedInBy. Không dùng cập nhật có điều kiện VALID → USED theo F08/BR-11. QR payload chỉ split theo `|` lấy mã vé, bỏ toàn bộ chữ ký. Không kiểm tra order PAID, showtime CANCELLED hoặc thời gian mở/đóng soát vé; vé VALID của suất nhiều ngày sau hoặc đã qua lâu vẫn vào được. Không có job hết hạn vé bổ sung việc này.

#### Suggested Fix

1. Dùng update có điều kiện status VALID trong transaction và kiểm tra count=1; đồng bộ khóa với luồng hủy.
2. Phát hành và xác minh QR HMAC theo version; mã nhập tay vẫn được phép nhưng phải áp dụng kiểm tra nghiệp vụ như QR.
3. Kiểm tra order PAID, showtime hợp lệ và cửa sổ từ settings theo giờ UTC.
4. Test quét đồng thời đúng một OK; QR bị sửa/signature sai; vé tương lai/quá hạn/suất hủy; soát vé cạnh tranh hủy đơn.

---

### 7. [P1] Hủy vé ghi REFUNDED khi chưa hoàn tiền và có thể trừ điểm nhiều lần

FilePath: `backend/src/modules/orders/order.service.ts` line 947; line 960; line 986; line 1004.

#### Explanation

Hủy đơn PAID được ghi `refundStatus='REFUNDED'` trực tiếp, không tạo RefundRequest, không chuyển tiền hoặc ghi tham chiếu hoàn. F06 yêu cầu PENDING rồi quản lý xử lý thực tế mới REFUNDED. Cửa sổ hủy dùng 60 phút thay vì 2 giờ/cấu hình. Status đơn và trạng thái ticket được kiểm tra trước transaction: hai lần hủy đồng thời đều có thể trừ điểm; vé được USED sau precheck vẫn bị cập nhật CANCELLED. Callback cũng có thể chốt tiền trong khi nhánh hủy pending dùng trạng thái cũ. Lần gọi lại sau hủy trả lỗi CANNOT_CANCEL_ORDER thay vì kết quả idempotent.

#### Suggested Fix

1. Khóa/claim trạng thái đơn và ticket trong transaction; hủy một lần, liên kết loyalty EARN/REVERT có unique guard.
2. Tạo RefundRequest PENDING với policy snapshot và amount, luồng manager/admin ghi chứng từ bên ngoài rồi đánh dấu REFUNDED.
3. Áp dụng 2 giờ hoặc settings, scope/role đúng; retry hủy trả kết quả hiện tại.
4. Test 119/120/121 phút, USED bất kỳ vé, hủy đồng thời/replay, cạnh tranh checkin/IPN, điểm không âm và không REVERT hai lần.

---

### 8. [P1] Sweeper có thể ghi đè PAID thành EXPIRED và chưa được lập lịch

FilePath: `backend/src/modules/worker/worker.service.ts` line 29; `backend/src/modules/worker/ops.routes.ts` line 8; `backend/src/server.ts` line 9.

#### Explanation

Sweeper lấy danh sách PENDING_PAYMENT hết hạn bên ngoài transaction. Khi updateMany bên trong chỉ lọc id, một IPN chốt PAID giữa hai bước vẫn bị ghi thành EXPIRED; ghế SOLD/vé VALID còn tồn tại và voucher có thể bị release. ops sweep public không xác thực, dễ bị gọi liên tục làm quét DB/transaction lớn. Server chỉ listen, không có cron/worker process/lịch gọi đã commit trong repository. Chỉ nhả ghế được implement; đóng suất, đổi trạng thái phim, hết hạn vé và dọn token chưa có. Toàn bộ đơn hết hạn được nạp không có batch limit.

#### Suggested Fix

1. Claim các đơn còn PENDING_PAYMENT và thực sự hết hạn dưới khóa/cập nhật có điều kiện; chỉ xử lý tập order đã claim.
2. Worker định kỳ có single leader hoặc khóa phân tán; batch và retry an toàn; bảo vệ ops bằng service credential/ADMIN.
3. Test chạy hai worker, worker cạnh tranh IPN/cancel, gọi lại không thay đổi; monitor lag/lỗi và kiểm tra lịch thực tế.

---

### 9. [P1] Backend bỏ qua độ tuổi và giờ đóng bán

FilePath: `backend/src/modules/orders/order.service.ts` line 90; line 292; line 409.

#### Explanation

Tạo đơn chỉ kiểm tra showtime.status OPEN, không kiểm tra startTime/cutoff 15 phút, movie C/inactive hoặc rạp/phòng bảo trì. Nếu worker chưa đóng suất, vẫn có thể mua suất đã bắt đầu/kết thúc. Không kiểm tra ngày sinh so với T13/T16/T18; `ageConfirmed=false` vẫn tự ghi ageConfirmedAt=new Date ở dòng 292, khiến DB CHECK cũng bị vượt qua về mặt nghiệp vụ. Counter tự xác nhận tuổi bất kể đầu vào ở dòng 609.

#### Suggested Fix

1. Áp dụng eligibility/cutoff và độ tuổi ở backend trong transaction, dùng settings được snapshot khi cần.
2. Yêu cầu khách xác nhận thật và chặn hồ sơ dưới tuổi; không tạo thời gian xác nhận giả.
3. Test chính xác trước/đúng/sau cutoff, suất quá khứ status OPEN, tuổi ở ranh giới ngày sinh, false/missing consent, phim C, phòng/rạp không ACTIVE.

---

### 10. [P1] Tạo suất chiếu có thể trùng lịch, sai định dạng và biến ghế BLOCKED thành AVAILABLE

FilePath: `backend/src/modules/showtimes/showtime.service.ts` line 209; line 243; `backend/prisma/schema.prisma` line 453.

#### Explanation

Overlap check ở ngoài transaction nên hai create đồng thời cùng phòng/cùng giờ có thể cùng thành công. Không kiểm tra movie C/isActive/releaseDate, room/cinema ACTIVE, format phù hợp room hoặc giờ mở cửa. Check dọn phòng cũ dùng input.cleaningMinutes của suất mới thay vì cleaningMinutes của suất có sẵn. Schema cho min cleaning=10 trong khi BR-10 yêu cầu >=15. Khi snapshot room.seats, không gán status cho seat BLOCKED nên Prisma default AVAILABLE; order service kiểm tra status AVAILABLE rồi gặp seatType BLOCKED làm thiếu surchargeInfo hoặc vi phạm CHECK. Suất đã có vé chưa có API hủy kèm refund/notification.

#### Suggested Fix

1. Khóa room trước overlap check và create trong cùng transaction; tính khoảng dọn phòng của từng suất đúng.
2. Validate eligibility/format/opening hours, gán BLOCKED khi snapshot, luôn từ chối bán seatType BLOCKED.
3. Implement edit/cancel an toàn theo BR-14, refund/outbox/audit.
4. Test hai create đồng thời, sát ranh giới 15 phút, movie C/chưa khởi chiếu, phòng bảo trì/sai format, seat BLOCKED không thể mua.

---

Found 7 suggestions for improvement (nhiều mục là điều kiện bắt buộc trước release).

## 🟡 Suggestions (Should Consider)

### 1. Fail-fast cấu hình bảo mật và gia cố phiên đăng nhập

FilePath: `backend/src/modules/auth/auth.service.ts` line 9; line 142; `backend/src/modules/payments/vnpay.adapter.ts` line 19; `backend/src/modules/auth/auth.controller.ts` line 12.

#### Explanation

JWT/VNPay secrets có fallback cố định trong source; nếu deploy quên env, ứng dụng vẫn chạy bằng khóa ai đọc repository cũng biết. Cookie Secure chỉ true khi env được đặt đúng. App không có rate limit/lock tạm sau 5 lần sai trong 15 phút như F01/NFR-03. Refresh kiểm tra/revoke/create ở các bước riêng, hai refresh đồng thời có thể sinh hai token con; không kiểm tra user status khi refresh. Access token cũ vẫn hợp lệ sau logout/đổi mật khẩu đến khi hết 15 phút vì không ràng buộc phiên/token version. Adapter formatDate dùng timezone OS, không buộc UTC+7 và URL không có vnp_ExpireDate theo expiresAt.

#### Suggested Fix

1. Validate env lúc startup, production không có mặc định bí mật; pin allowed JWT algorithm/issuer/audience, enforce HTTPS cookie.
2. Rate limit theo IP/tài khoản; refresh rotation nguyên tử với reuse detection, khóa trạng thái phiên và kiểm tra tài khoản ACTIVE.
3. Cân nhắc session version/revocation ngay khi đổi mật khẩu/khóa; timezone provider rõ ràng và expire date theo hold.

---

### 2. Bảng giá, ngày lễ và giá preview chưa đúng thời điểm hiệu lực

FilePath: `backend/src/modules/orders/order.service.ts` line 130; line 140; line 151; `backend/src/modules/showtimes/showtime.service.ts` line 111.

#### Explanation

Weekday dùng getUTCDay nhưng khung giờ chuyển UTC+7; suất sáng thứ Bảy VN có thể lấy giá Friday. Không đọc Holiday. PriceRule/SeatSurcharge chọn effectiveFrom mới nhất không lọc <= ngày chiếu/ngày hiệu lực, nên giá tương lai áp dụng sớm. Thiếu rule lại chọn rule bất kỳ của rạp hoặc tự tạo rule/phụ thu trong request đặt vé. Preview sơ đồ không tạo phụ thu mặc định nhưng createOrder có tạo, dẫn đến hiển thị khác số tiền thật. F12 chưa có route quản lý.

#### Suggested Fix

1. Dùng một pricing service duy nhất cho preview/order/quầy theo calendar VN, holiday và ngày hiệu lực xác định.
2. Không thay đổi cấu hình giá trong request đặt vé; thiếu cấu hình phải báo lỗi rõ cho quản lý.
3. Test Friday UTC/Saturday VN, ngày lễ, trước/đúng/sau effectiveFrom và preview bằng snapshot được tạo.

---

### 3. Voucher/Combo có scope và quota chưa được bảo đảm

FilePath: `backend/src/modules/vouchers/voucher.service.ts` line 52; line 90; line 155; `backend/src/modules/orders/order.service.ts` line 227; line 565.

#### Explanation

Voucher count quota ngoài transaction tạo redemption nên nhiều khách có thể cùng vượt totalLimit/perUserLimit. Scope TICKET/COMBO chỉ được trả về, tính giảm trên toàn subtotal; percent dùng round thay vì floor theo F03.5; maxDiscount=0 bị coi như không có trần. Counter validate với userId undefined trước khi tìm thành viên nên bỏ qua giới hạn lượt khách. Update voucher cho đổi type/value sau khi consumed. Order load combo chỉ theo id/isActive, không kiểm tra comboCinema, có thể mua combo chỉ áp dụng rạp khác. Validate public không optionalAuth nên không tính giới hạn theo user đang đăng nhập.

#### Suggested Fix

1. Lock/claim quota voucher trong cùng transaction tạo order, tính đúng base scope, floor và maxDiscount rõ ràng.
2. Tìm thành viên quầy trước validate, kiểm tra scope comboCinema, chặn sửa type/value khi đã dùng.
3. Test lượt cuối đồng thời, per-user qua hai suất, voucher TICKET/COMBO/ORDER, fixed>base, maxDiscount=0, combo rạp khác và ngày hết hạn.

---

### 4. Báo cáo có số liệu giả và sai mốc ngày

FilePath: `backend/src/modules/reports/report.service.ts` line 121; line 154; line 155.

#### Explanation

Breakdown trả capacity=sold*2 và occupancy=75.0 cho mọi nhóm có vé; không phản ánh sức chứa thực. Daily group dùng UTC date, không ngày VN. Query thiếu movieId/source/refund state, toDate dạng YYYY-MM-DD kết thúc lúc 00:00 UTC nên bỏ phần lớn ngày cuối. Top movies gộp theo title thay vì movieId. Tất cả báo cáo đọc orders/items/combos vào bộ nhớ không có giới hạn thay vì DB aggregation; scope manager đã nêu ở critical #5.

#### Suggested Fix

1. Aggregate từ PAID và capacity thật, thống nhất COUPLE units và loại trừ BLOCKED; định nghĩa net/gross/refund theo chứng từ.
2. Bộ lọc thời gian VN half-open, movie/source/cinema; export CSV/Excel theo F14.
3. Fixture 1 ghế bán/10 ghế phải 10%, nhóm không vé vẫn 0%, boundary UTC+7, số tổng khớp breakdown và dữ liệu refund.

---

### 5. Hợp đồng API/Prisma/CHECK còn lệch nhau

FilePath: `backend/src/modules/orders/order.schema.ts` line 5; line 30; `backend/prisma/schema.prisma` line 127; `backend/prisma/constraints.sql` line 111.

#### Explanation

Counter API chấp nhận paymentMethod POS nhưng Prisma enum là CARD; cast any ở order.service:706 che lỗi compile rồi request lỗi runtime. Combo quantity API tới 20 trong khi CHECK/đặc tả giới hạn 10, gây 500 nếu CHECK được áp dụng hoặc dữ liệu ngoài yêu cầu nếu chưa áp dụng. Voucher PERCENT cho value>100 và validTo<=validFrom ở Zod, phụ thuộc CHECK để phát hiện thay vì trả 400. Các limit/page/date trong history/checkin/report chưa validate/giới hạn. Không có thư mục migrations trong backend/prisma; constraints.sql mới là file rời, chưa có bằng chứng CHECK được triển khai vào DB.

#### Suggested Fix

1. Dùng native enum/DTO thống nhất OpenAPI và Prisma, refine giá trị/ngày, giới hạn pagination và input lengths.
2. Tạo migration được review kèm CHECK, thêm migrate deploy cho production; kiểm tra thực tế INFORMATION_SCHEMA khi triển khai.
3. Test boundary schema và chạy migration từ DB trống trên MySQL đúng phiên bản.

---

### 6. Bộ test hiện tại không cô lập và chưa chứng minh các invariant cốt lõi

FilePath: `backend/tests/checkin-history-worker.test.ts` line 46; line 226; `backend/tests/booking-payment.test.ts` line 30.

#### Explanation

Các test tìm suất/ghế/customer/staff hiện có rồi ghi đơn/payment/ticket vào DB; test checkin thay passwordHash tài khoản STAFF đã có nếu đăng nhập seed thất bại. Cleanup không xóa hết dữ liệu phát sinh. Test worker return sớm khi thiếu fixture khiến case được báo pass dù không kiểm tra. Test suites phụ thuộc seed và thứ tự case; không guard tên DB test. Chỉ kiểm tra replay tuần tự/ghế tuần tự, không kiểm tra contention/late callback/races/RBAC cross-cinema. Tên test nói QR nhưng chỉ xác nhận mã vé, không chữ ký.

#### Suggested Fix

1. Tách DB disposable `_test` và account riêng, fail nếu DB không đúng môi trường; tạo fixture có namespace và cleanup đầy đủ, không sửa nhân sự/demo thật.
2. Chạy unit pure/mocked để kiểm tra business branches và integration MySQL thật để kiểm tra locks/FK/CHECK/races; mocking không chứng minh tính đồng thời DB.
3. Lấy yêu cầu làm oracle; không sửa assertion để chấp nhận REFUNDED giả/75% hay dùng mock payment như kiểm chứng payment gateway.

---

### 7. Thiếu module và cơ chế vận hành production

FilePath: `backend/src/app.ts` line 53; `backend/src/server.ts` line 9.

#### Explanation

Schema có nhiều model nhưng source không dùng PasswordResetToken, Setting, AuditLog, LoyaltyTransaction, PaymentLog, RefundRequest, IdempotencyKey, OutboxEvent hoặc Review. Không có route thực thi F12/F15/F16/F17/F18. Server thiếu shutdown SIGTERM/SIGINT drain request và prisma disconnect, startup DB/env validation/readiness, request ID/structured log/metrics, scheduler/outbox worker và runbook triển khai. /health luôn 200 kể cả DB mất. Repository chưa có CI/deployment manifests/backup restore chứng minh được. Đây là thiếu triển khai/bằng chứng trong repository; hạ tầng bên ngoài chưa được xác minh.

#### Suggested Fix

1. Hoàn tất nhóm Must trước release, định nghĩa rõ nhóm Should/Could được hoãn trong scope sản phẩm.
2. Production gate: migration+constraints, secret validation, health readiness, graceful shutdown, trusted proxy/CORS allowlist, rate limits, TLS, worker scheduling, mail sink/sandbox staging, logging/alerting, backup restore drill, manual refund/reconciliation runbook.
3. Tạo CI chạy build/typecheck/unit/integration/e2e trên DB test sạch và yêu cầu gate xanh trước triển khai.

#### Ma trận đối chiếu F01–F19 (backend)

| Luồng | Mức hiện tại | Còn thiếu hoặc sai |
|---|---|---|
| F01 Tài khoản | Một phần | Có bcrypt/JWT/refresh/profile/password; thiếu forgot/reset, brute force; rotation/status/revocation còn yếu |
| F02 Duyệt phim/suất | Một phần | Search/genre/page và suất rạp/ngày có; movie filter rạp/ngày, giá từ/số ghế trống, loại phim C/cutoff chưa đầy đủ |
| F03 Đặt vé | Có happy path, lỗi chặn release | Hold/counter race, age/time eligibility, pricing/holiday, quota/scope voucher, idempotency |
| F04 Thanh toán | Có sandbox, lỗi chặn release | Public mock, return chốt tiền, late callback/thu kép/lock/log, gateway live và đối soát chưa chứng minh |
| F05 Vé/thông báo | Một phần | Có ticket transaction; thiếu QR chữ ký, email/retry/outbox, loyalty ledger |
| F06 Lịch sử/hủy | Một phần | Lịch sử/chi tiết có; hủy 60 phút và REFUNDED giả, thiếu refund workflow/QR/status filter, races |
| F07 Quầy | Một phần | Tạo PAID trực tiếp; thiếu hold 3 phút/confirm riêng, cash received/change thật, POS enum, scope/tra cứu/in lại |
| F08 Soát vé | Có happy path, lỗi chặn release | Single-use concurrency, QR HMAC, window/order/showtime validation, scope empty |
| F09 Phim | Một phần | CRUD phim soft delete có; thiếu CRUD genre/upload validation/audit; status không sửa được qua DTO |
| F10 Rạp/phòng/ghế | Phần nhỏ | Chỉ list/create rạp/phòng/read seats; thiếu update/delete, seat map CRUD/editor, structural constraints/scope |
| F11 Suất | Phần nhỏ | Chỉ create/list/seats; thiếu edit/cancel/refund/email, overlap lock, eligibility/blocked snapshot |
| F12 Giá | Chưa có API | Schema/seed có; thiếu quản lý price matrix/surcharge/holiday/effective date/audit |
| F13 Voucher/combo | Một phần | CRUD phần lớn có; thiếu quota nguyên tử/scope/used-value protection/manager scope |
| F14 Báo cáo | Một phần | Revenue cơ bản có; occupancy giả, manager scope sai, movie/source/date/export thiếu |
| F15 Người dùng | Chưa triển khai | Thiếu quản trị nhân sự/assignment/lock/last-admin/self-lock/revoke/audit |
| F16 Cấu hình/audit | Chưa triển khai | Setting/AuditLog chỉ schema/seed; hầu hết policy hardcode, thiếu API/màn hình/audit write |
| F17 ML | Chưa triển khai, Could | Không route/service/fallback |
| F18 Review | Chưa triển khai, Could | Chỉ model, thiếu eligibility USED/API/moderation |
| F19 Job nền | Phần nhỏ | Chỉ sweeper callable, chưa scheduler; race PAID→EXPIRED; thiếu showtime/movie/ticket/token/outbox jobs |

#### Bộ kịch bản test bắt buộc trước release

| Nhóm | Kịch bản/điều kiện cần chứng minh |
|---|---|
| Booking contention | 20 khách cùng ghế; online/quầy cùng ghế; mua [A1,A2] cạnh tranh [A2,A3] rollback toàn bộ; cùng user hai tab/cùng suất; ghế HELD hết hạn; BLOCKED/foreign seat/duplicate/0/8/9 ghế |
| Booking policy | Cutoff 15 phút trước/đúng/sau; OPEN suất quá khứ; birthday boundary T13/T16/T18; false consent; movie C/inactive; phòng/rạp maintenance; snapshot giá/combo |
| Pricing | Weekday/weekend UTC+7, holiday precedence, 11:59/12:00/16:59/17:00, effective date cũ/mới/tương lai, STANDARD/VIP/COUPLE, preview/order/counter thống nhất |
| Payment validation | Independent known HMAC vector; signature/merchant/currency/amount/status sai/thiếu/trùng query; return không chốt; fail/cancel/retry; hết hold/url; lỗi DB không commit một phần |
| Payment races | 20 IPN cùng attempt chỉ một settlement/ticket/points; hai attempts thu tiền; IPN vs worker/cancel; late seats AVAILABLE/HELD bởi người khác/SOLD bởi người khác; CANCELLED order; PAID_UNFULFILLED refund |
| Check-in | QR signature/version/tamper; manual code; correct/wrong cinema/showtime; VALID/USED/CANCELLED/EXPIRED; window trước/đúng/sau; 20 scans đúng một OK; scan vs cancel |
| Cancel/refund | CUSTOMER own vs foreign vs anonymous counter; STAFF hạn chế; 119/120/121 phút; USED một vé; đồng thời/replay; points EARN/REVERT đúng một; refund PENDING→REFUNDED chỉ có chứng từ |
| Auth/RBAC | Password/login malformed, wrong five times lock, locked/pending user; expiry/reuse/parallel refresh/logout/password change; từng role × route × own/foreign cinema/empty assignments |
| Voucher/combo | Scope TICKET/COMBO/ORDER; cap=0/nonzero; rounding floor; quota cuối cạnh tranh; per-user qua online/quầy; expired reserved release; edit consumed restriction; combo foreign cinema |
| Showtime/admin | Concurrent overlap creation; cleaning boundary theo mỗi suất; invalid C/release/opening hours/format; edit sold denied; cancel paid orders full refunds; seat map cấu trúc với suất tương lai |
| Reports | Fixture revenue/discount/combo/refund/source/day/movie/cinema khớp order ledger; UTC+7 day boundaries; true occupancy 0/10/100% và COUPLE/BLOCKED; scope; CSV formula escaping |
| Worker/operations | Two instances/idempotent/lag/retry; IPN conflict; expired token/ticket/showtime/movie; email retry/dedupe; DB down readiness; SIGTERM drain; apply migrations clean; backup→restore |

---

## ✅ What's Good

- Có tách routes/controllers/services, Zod validation và response/error chung.
- Mật khẩu được bcrypt, refresh token lưu SHA-256, authenticate đọc role/status/assignments mới từ DB.
- Có snapshot order item/combo/movie/showtime và vé được tạo cùng transaction settlement thông thường.
- Schema có unique slot/guard/payment gateway transaction và composite FK cho nhiều quan hệ quan trọng; các invariant tiền/trạng thái đã được thiết kế trong constraints.sql.
- Seat map đọc HELD hết hạn thành AVAILABLE, history query scope theo user, movie/combo soft delete bảo toàn lịch sử.

Những điểm này là nền tảng tốt cho đồ án, nhưng không thay thế được các sửa lỗi đồng thời, tiền và quyền ở trên.
