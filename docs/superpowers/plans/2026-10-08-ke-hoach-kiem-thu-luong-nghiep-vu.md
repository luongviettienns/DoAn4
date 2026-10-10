# Kế hoạch kiểm thử luồng người dùng và nghiệp vụ khép kín CineX

> Ngày lập: **08/10/2026**, múi giờ nghiệm thu **Asia/Ho_Chi_Minh (UTC+7)**. Đây là kế hoạch và kết quả rà soát tĩnh để thiết kế test; **chưa phải biên bản chạy test hoặc xác nhận hệ thống hoạt động đúng**.
>
> Người thực hiện kiểm thử: chạy từng kịch bản, ghi kết quả thực tế và bằng chứng; không đánh dấu PASS bằng số liệu test cũ. Các bước dùng checkbox để theo dõi đợt thực hiện. Khi cần bổ sung mã kiểm thử, có thể triển khai theo từng nhóm độc lập bằng `subagent-driven-development` hoặc `executing-plans`.

**Goal:** Kiểm chứng từng thao tác của GUEST, CUSTOMER, STAFF, MANAGER, ADMIN đúng nghiệp vụ và nối được thành vòng vận hành hoàn chỉnh, không thất thoát tiền, ghế, vé, điểm hoặc lượt voucher.

**Architecture:** Ba lớp kiểm chứng: quy tắc bằng API/MySQL thật, hành vi màn hình bằng component test, và hành trình bằng trình duyệt kết nối frontend/backend/DB thật. Mỗi luồng kết thúc bằng đối soát dữ liệu và thao tác của vai trò kế tiếp; các dịch vụ bên ngoài được nghiệm thu riêng trên staging.

**Tech Stack:** React/TypeScript/Vite, Express/TypeScript, Prisma/MySQL, Vitest/Supertest, Chromium/Playwright, VNPay sandbox, SMTP, Google Identity, TMDB.

**Spec:** [Yêu cầu FR/BR/NFR](../../01-tong-quan-va-yeu-cau.md), [F01–F19](../../02-luong-chuc-nang.md), [màn hình](../../03-mo-ta-man-hinh.md), [hợp đồng chặng 1](../../STAGE1_DELIVERY.md), [cách chạy test](../../TESTING.md). Đối chiếu với source hiện tại; tài liệu tiến độ có số test/ngày cập nhật khác nhau nên không được dùng làm bằng chứng cho đợt này.

## 1. Phạm vi và nguyên tắc nghiệm thu

- Kiểm thử toàn bộ **Must**, các **Should đã triển khai**, và liệt kê rõ phần chưa có. F17/F18 là Could, không tự coi là điều kiện chặn bản core nếu chưa nhận phạm vi này.
- Các tham số mặc định theo đặc tả: giữ ghế **10 phút**, **1–8 ghế/đơn**, một khách một đơn pending/cùng suất, ngừng đặt trước giờ chiếu **15 phút**, hủy trước ít nhất **2 giờ**, dọn phòng tối thiểu **15 phút**, điểm `floor(total/10.000)`, tiền **VND nguyên**.
- UTC trong DB; UI, email, giới hạn theo ngày và báo cáo phải nhất quán theo giờ Việt Nam. Thay timezone máy khách không được đổi ngày nghiệp vụ.
- Không giả định có chức năng chỉ vì có bảng trong Prisma, mục trong OpenAPI hoặc tab giao diện. Đánh giá riêng **UI / API / nghiệp vụ / dịch vụ ngoài**.
- Tài liệu và code bất đồng thì ghi `BLOCKED_SPEC`, xác định quyết định cần chốt; không lấy hành vi hiện tại làm chuẩn đúng một cách tự động.
- Môi trường DB `_test` riêng; không chạy runner reset DB đồng thời với E2E/UAT hoặc worker trên cùng DB. Dữ liệu có namespace `uat-<runId>`; không sửa/xóa dữ liệu làm việc để chuẩn bị test.
- Phạm vi yêu cầu này là **lập kế hoạch**. Không sửa sản phẩm, chạy giao dịch thật, gửi email tới khách thật, commit, push hay triển khai trong lượt lập kế hoạch.

### 1.1. Định nghĩa một luồng khép kín

Một luồng chỉ PASS khi thỏa cả các điều kiện áp dụng sau:

| Mã | Điều kiện cần chứng minh |
|---|---|
| C1 | Vai trò đúng có thể bắt đầu từ màn hình người dùng, không cần chỉnh DB/đổi URL nội bộ để vượt qua bước bị thiếu. Fixture DB chỉ dùng cho chuẩn bị dữ liệu hoặc tình huống biên đã công bố. |
| C2 | Mỗi bước có đầu vào, kết quả nhìn thấy và chuyển trạng thái hợp lệ; tải lại/đăng nhập lại vẫn đọc được kết quả đã commit. |
| C3 | Số tiền hiển thị = tổng snapshot đơn = số tiền payment; một ghế không thuộc hai đơn còn hiệu lực; số vé đúng với số ghế bán. |
| C4 | Thất bại/hủy/hết hạn có đường phục hồi hoặc kết thúc rõ; không giữ tài nguyên vô hạn và không hiển thị thành công khi chưa thành công. |
| C5 | Retry/callback/quét/hủy/hoàn đồng thời không tạo vé, điểm, refund, thu tiền hoặc hoàn tiền trùng. |
| C6 | Vai trò tiếp theo dùng được kết quả: khách tìm được vé, nhân viên soát được QR thật, quản lý tìm được refund, báo cáo đối soát được giao dịch. |
| C7 | Quyền sở hữu và phạm vi rạp được bảo vệ tại backend cả khi gọi API trực tiếp; trạng thái tài khoản và phạm vi hiện tại được áp dụng. |
| C8 | Có bằng chứng UI + requestId/ID nghiệp vụ + DB/đối soát độc lập; bước dịch vụ ngoài có chứng từ phù hợp. Không dùng dữ liệu bí mật trong artifact. |

**P0:** sai tiền/đặt trùng/phát vé sai/rò dữ liệu hoặc đứt hành trình cốt lõi. **P1:** luồng bắt buộc thiếu, thiếu quyền/khả năng phục hồi/đối soát. **P2:** chức năng mở rộng/UX không làm sai giao dịch. Đây là ưu tiên của kế hoạch, không phải kết luận lỗi đã tái hiện.

### 1.2. Danh mục phân hệ theo source

| Luồng | Phân hệ / actor | Khả năng hiện tại và cách kiểm |
|---|---|---|
| F01 | Tài khoản / mọi actor | AuthModal, UserProfileModal; API local/Google/reset/verify/profile. Kiểm thêm URL từ email và phiên trên staging. |
| F02 | Khám phá / GUEST, CUSTOMER | Discovery + API phim/rạp/suất; test bộ lọc và mở đúng suất. |
| F03 | Đặt vé / CUSTOMER | SeatMapModal giữ ngay lúc chọn ghế, PATCH cùng đơn, CheckoutModal. Khác tài liệu thiết kế ban đầu giữ khi bấm tiếp tục. |
| F04 | Thanh toán / CUSTOMER, VNPay | API payment/IPN/return + PaymentResultPage; mô phỏng local và sandbox ngoài phải ghi thành hai loại bằng chứng. |
| F05 | Vé/thông báo / CUSTOMER | TicketModal và SMTP; kiểm QR từng ghế, email và trạng thái không có vé. |
| F06 | Lịch sử/hủy / CUSTOMER | MyTicketsDrawer + API history/cancel; cần ưu tiên kiểm hợp đồng response thật (GAP-01). |
| F07 | Bán tại quầy / STAFF | Có `POST /orders/counter`; chưa thấy UI bán quầy/thu tiền/in vé/tra cứu quầy đầy đủ. API PASS chưa đủ nghiệm thu hành trình nhân viên. |
| F08 | Soát vé / STAFF, MANAGER, ADMIN | StaffCheckinModal + API QR/cửa sổ/bypass/stats/history; input text, chưa có luồng camera. |
| F09 | Phim / MANAGER, ADMIN | Có API quản lý/TMDB; UI tạo/ẩn còn thiếu sửa/khôi phục và mở trạng thái bán phù hợp. |
| F10 | Rạp/phòng/ghế / MANAGER, ADMIN | API tạo rạp/phòng, UI tạo phòng; chưa thấy bước tạo/chỉnh sơ đồ ghế hoàn chỉnh. |
| F11 | Suất / MANAGER, ADMIN | API list/create/cancel; UI list/create, chưa thấy thao tác hủy/sửa đầy đủ. |
| F12 | Giá / MANAGER, ADMIN | API + tab giá/phụ thu/ngày lễ; kiểm hiệu lực, snapshot, quyền đọc/ghi và lịch ngày Việt Nam. |
| F13 | Combo/voucher / MANAGER, ADMIN | API quản lý; UI combo còn từng phần, voucher chủ yếu danh sách. |
| F14 | Báo cáo / MANAGER, ADMIN | Dashboard/export; kiểm filter rạp/phim, quyền tab CINEMA và thời gian top phim. |
| F15 | Người dùng/phân quyền / ADMIN | Chưa thấy router/UI quản lý user/role/lock đầy đủ; cần kiểm API và UI khi có. |
| F16 | Cấu hình/audit / ADMIN | Có bảng settings/audit và một số nơi ghi log; chưa thấy UI/API cấu hình hoặc tra nhật ký đầy đủ. **F16 trong đặc tả không phải mã luồng refund.** |
| F17 | Gợi ý / CUSTOMER | Chưa thấy luồng ML hoàn chỉnh; Could, ghi NOT_IMPLEMENTED. |
| F18 | Đánh giá / CUSTOMER | Có model Review, chưa thấy API/UI vòng vé USED → đánh giá; Could. |
| F19 | Worker / hệ thống, ADMIN | Có sweep service + ops API; chưa thấy scheduler hết hạn đơn/suất/vé và dispatcher outbox hoàn chỉnh. |

## 2. Các điểm phải kiểm trước, không được bỏ qua bằng fixture

Đây là phát hiện **từ đọc source**, cần tái hiện bằng API/browser thật. Mã GAP không thay thế phiếu bug có actual result.

| Mã | Ưu tiên | Điểm cần chứng minh / quyết định | Chứng cứ source và test đích |
|---|---|---|---|
| GAP-01 | P0 | Response history trả trường top-level nhưng drawer đọc `order.snapshot.*`; mở lịch sử có đơn có thể lỗi render, kéo theo mất đường xem/hủy vé. | `backend/src/modules/orders/order.service.ts` phần getUserOrders (1033–1077); `frontend/src/components/MyTicketsDrawer.tsx` (174, 215, 226). TC-C07/E2E-01/E2E-02 dùng response thật. |
| GAP-02 | P0 | Input check-in đổi QR sang chữ hoa; prefix `v` và chữ ký base64url phải giữ nguyên case. Phải soát chính QR do TicketModal cung cấp. | `StaffCheckinModal.tsx:90,195`; `backend/src/shared/qr-signature.service.ts:35–40,53–76`. TC-S02. |
| GAP-03 | P0 | Tạo phim mặc định COMING_SOON, UI khách chỉ chọn suất phim NOW_SHOWING; cần đường công bố/mở bán từ UI quản lý. Không seed NOW_SHOWING để che bước thiếu này. | `backend/prisma/schema.prisma:332`; movie schema/service; `Discovery.tsx:66,187`. TC-M01/E2E-01. |
| GAP-04 | P0 | Tạo phòng không sinh Seat, trong khi UI mô tả sinh ghế; tạo suất từ phòng mới phải có ghế mua được. | `backend/src/modules/cinemas/cinema.service.ts:110–126`; `AdminManagementModal.tsx:1397`. TC-M02/E2E-01. |
| GAP-05 | P0 | Payment xác nhận thu tiền nhưng không cấp vé vẫn đi nhánh gửi email; fallback mã đơn làm ticket code có thể báo phát vé sai. Email hiện tạo QR từ mã vé đầu tiên thuần, khác signed QR từng ghế trên web; giờ email còn phụ thuộc timezone process. | `payment.service.ts:294–309,383–385,426–461`; `mail.service.ts` sendBookingConfirmation; `TicketModal.tsx:156–171`. TC-C03/C06/S02, X-P05; không được gửi email vé hợp lệ cho PAID_UNFULFILLED. |
| GAP-06 | P1 / BLOCKED_SPEC | Đặc tả F04 cho callback muộn cấp lại ghế còn trống; code chỉ fulfill pending còn hạn, ngoài đó refund. Chốt dùng chính sách nào, cập nhật đặc tả và test tương ứng. | `docs/02-luong-chuc-nang.md:307`; `payment.service.ts:279–306`. TC-C06 phải chạy cả ghế còn trống và đã có chủ mới. |
| GAP-07 | P1 | F07 thiếu UI quầy; API tạo PAID tức thì; schema không nhận số tiền khách đưa/tiền thừa, BANK_TRANSFER chưa có bước xác nhận từ dịch vụ ngoài. | `order.schema.ts` counterOrderSchema; `order.service.ts` createCounterOrder; TC-S01. Không coi record SUCCESS là chứng minh đã nhận tiền ngoài hệ thống. |
| GAP-08 | P0 / BLOCKED_SPEC | Quyền hủy đơn quầy chưa khớp đặc tả cần quản lý; STAFF hiện còn miễn cửa sổ hủy. Kiểm STAFF và member customer gọi trực tiếp cancel đơn COUNTER; chốt thẩm quyền, không mặc định đây là hành vi đúng. | `docs/02-luong-chuc-nang.md:434`; `order.service.ts:941–953`. X-R07. |
| GAP-09 | P0 | MANAGER đọc bảng giá không truyền cinemaId và voucher admin detail có khả năng vượt scope, trong đó detail gồm redemption. | `pricing.service.ts` getPriceRules/getSurcharges; `voucher.controller.ts` getById / `voucher.service.ts` getVoucherById. TC-A01/X-R05. |
| GAP-10 | P1 | Email reset/verify phải mở được đường dẫn từ email, không chỉ test form gọi endpoint. | `App.tsx` chỉ phân nhánh `/payment/result`; `AuthModal.tsx`; TC-AUTH02. |
| GAP-11 | P1 | Thiếu thao tác UI sửa/khôi phục phim, quản lý ghế, hủy suất, CRUD voucher, quản lý user/config/audit; toàn bộ Must tương ứng vẫn phải giữ trong coverage. | Danh mục F09–F16 ở mục 1.2; TC-M01…M06, TC-A02. |
| GAP-12 | P1 | Sweep chỉ chạy khi có người/API gọi; các job hết hạn vé/đóng suất và thông báo outbox chưa được nối lịch thực thi. | `backend/src/server.ts`, `modules/worker/worker.service.ts`, ops routes, `backend/package.json`; TC-O01. |
| GAP-13 | P1 | Refund.process chỉ ghi nhận hoàn tiền thủ công; outbox không đủ chứng minh khách nhận tiền/thông báo. Tự sinh externalReference cũng không phải chứng từ ngân hàng. | `refund.service.ts:162–219`; TC-C08, TC-S03, E2E-02/03. |
| GAP-14 | P1 / BLOCKED_SPEC | Dashboard luôn có tab CINEMA với MANAGER nhưng backend cấm; top-movies không nhận date filter; cần thống nhất báo cáo theo kỳ hay toàn thời gian. | `AdminReportDashboard.tsx:89,236`; `report.controller.ts:43–44`; TC-R01. |
| GAP-15 | P2 / BLOCKED_SPEC | Đặc tả combo 0–10, schema 1–20 mỗi item (bỏ bằng mảng rỗng); chốt giới hạn và thông báo người dùng. | `docs/02-luong-chuc-nang.md` F03.4; `order.schema.ts:6`. X-B09. |
| GAP-16 | P1 | Số dư điểm tăng/giảm nhưng chưa thấy EARN/REVERT ledger ở payment/counter/customer cancel; cancellation suất có một writer REVERT riêng. Chưa thấy writer PaymentLog, audit/email customer cancel và create/update phim/suất đầy đủ. Không lấy số dư đúng thay bằng chứng kiểm toán. | `order.service.ts`, `payment.service.ts`; `showtime.service.ts:343`; đối chiếu toàn `backend/src` với `loyaltyTransaction`, `paymentLog`, `auditLog`. C03/C08/S01/M06/A02. |
| GAP-17 | P1 / BLOCKED_SPEC | Stats check-in đếm tổng vé theo createdAt hôm nay nhưng USED theo checkedInAt hôm nay, ngày theo timezone process. Hai tập có thể lệch khi vé mua trước ngày/cho suất tương lai hoặc vé bị hủy. Chốt stats của ngày suất/ca soát rồi test cùng cohort. | `checkin.service.ts:218–258`; S02, X-S06. |
| GAP-18 | P1 | Backend cho ADMIN soát/bypass nhưng Header chỉ STAFF/MANAGER thấy nút. Bypass ghi USED và AuditLog không cùng transaction, có nguy cơ mất audit hoặc trả lỗi sau admission. | `Header.tsx:126,286`; `checkin.routes.ts:10`; `checkin.service.ts:150–163`. S02, X-S07/08. |
| GAP-19 | P1 | Voucher list UI đọc discountValue/discountType/remainingQuota/totalQuota nhưng API trả value/type/totalLimit/_count.redemptions; load lỗi bị chuyển thành danh sách rỗng. | `AdminManagementModal.tsx:189–199,2059`; `api.ts` listVouchers. M05, X-V05 dùng response thật. |
| GAP-20 | P1 / BLOCKED_SPEC | UI tạo suất gửi adMinutes=10, backend/đặc tả mặc định 15. Thời điểm kết thúc phải cộng cả phim và quảng cáo rồi mới cộng cleaning; không tính lịch chỉ bằng duration phim. | `AdminManagementModal.tsx:444`; `showtime.schema.ts`; `showtime.service.ts:192–204`. M03, X-R01. |
| GAP-21 | P1 / BLOCKED_SPEC | MANAGER ẩn phim có thể hủy mọi suất tương lai của phim, gồm rạp ngoài assignment. Chốt quyền catalog global và quyền tác động vé/rạp; tách hai quyền nếu cần. | `movie.service.ts:206–239`, `movie.routes.ts`; M01/M06/A01, X-R03. |

## 3. Chuẩn bị dữ liệu, môi trường và kết quả đối soát

### 3.1. Tài khoản và phiên

| Fixture | Mục đích |
|---|---|
| C1, C2 | Hai CUSTOMER độc lập, đủ tuổi, điểm khởi tạo 0; email/số điện thoại riêng, hai browser context không chia cookie. |
| C-underage, C-locked, C-pending | Dưới tuổi, LOCKED, PENDING_VERIFY; thêm hồ sơ chưa có ngày sinh để kiểm ageConfirmed. |
| S-A, S-B, S-none | STAFF gán rạp A, rạp B, không được gán; kiểm đường UI và API trực tiếp. |
| M-A, M-AB, M-none | MANAGER gán A, gán A+B, không gán; thay danh sách gán khi phiên đang tồn tại để kiểm quyền hiện tại. |
| ADM | ADMIN toàn hệ thống; dùng tài khoản fixture, không đưa mật khẩu/cookie/token vào kế hoạch và báo cáo. |

### 3.2. Danh mục và thời gian

- Rạp A/B khác nhau; giờ mở cửa cụ thể 08:00–23:00. Phòng R-A/R-B tồn tại đủ ghế cho kiểm core; **phòng R-new chưa có ghế** dành riêng TC-M02, không preseed ghế cho case tạo phòng.
- M-P, M-T18, M-C có thời lượng 120 phút; phim mới M-new tạo từ UI để kiểm đường mở bán. Release date trước ngày suất hợp lệ; thêm suất trước release date để kiểm chặn.
- Với phòng fixture: 8 STANDARD span=1, 2 VIP span=1, 1 COUPLE span=2, 1 BLOCKED không bán. Tổng capacity bán **12** đơn vị; một COUPLE tạo một ticket/slot nhưng occupancy tính 2 đơn vị. Chốt cách tính giới hạn 8 đối với COUPLE với chủ nghiệp vụ, không suy ra 8 người từ 8 slot.
- D là ngày tương lai theo UTC+7 đủ để đặt/hủy; không cố định ngày seed cũ. Chuẩn bị các bucket WEEKDAY/WEEKEND/HOLIDAY, MORNING/AFTERNOON/EVENING, TWO_D/THREE_D/IMAX và các version hiệu lực.
- Bộ biên có startTime `now + 15m ± 1ms`, `now + 2h ± 1ms`; check-in `start−30m`, `start+15m`, mỗi mốc ±1ms; expiresAt ±1ms. API dùng clock kiểm soát hoặc thời điểm DB chuẩn bị riêng; browser có một case giữ ghế 10 phút thật. Không sửa giờ hệ thống máy.
- Mỗi case độc lập dùng mã order/showtime/voucher riêng. E2E liên vai trò giữ nguyên ID suốt chuỗi để đối soát được toàn hành trình.

### 3.3. Bộ giá có đáp án độc lập

**Fixture tiền F-MONEY**, cấu hình rạp A / TWO_D / WEEKDAY / AFTERNOON: giá cơ bản 80.000đ, phụ thu STANDARD=0, VIP=20.000đ, COUPLE=80.000đ; combo 50.000đ. Voucher `UAT20` scope ORDER giảm 20%, trần 40.000đ, minOrder 100.000đ, còn hiệu lực, đủ quota.

| Phép tính | Kết quả phải có |
|---|---:|
| 1 STANDARD + 1 VIP | ticketSubtotal = 80.000 + 100.000 = **180.000đ** |
| Thêm 1 combo | comboSubtotal = **50.000đ**, subtotal = **230.000đ** |
| UAT20 | discount = min(floor(230.000 × 20%), 40.000) = **40.000đ** |
| Tiền thanh toán | total = **190.000đ**, request VNPay `vnp_Amount` = **19.000.000** |
| Điểm sau thanh toán | **19**, có đúng một EARN theo order |
| Combo net trong báo cáo với ORDER discount | phần giảm vé floor(40.000 × 180.000 / 230.000) = 31.304; phần giảm combo 8.696; comboRevenue = **41.304đ** |
| Hủy hoàn toàn theo fixture chính sách không phí | refund PENDING **190.000đ**, điểm trở lại **0**, redemption RELEASED; khi hoàn thực tế chỉ một REFUNDED **190.000đ** |

Thêm hai voucher cùng tỷ lệ/trần nhưng scope TICKETS và COMBOS: lần lượt discount **36.000đ / 10.000đ**, total **194.000đ / 220.000đ**, comboRevenue **50.000đ / 40.000đ**. Một case lẻ (ví dụ subtotal 100.003đ, tỷ lệ 15%) phải giảm **15.000đ**, không 15.000,45đ. Tính đáp án bằng dữ liệu fixture, không gọi lại cùng hàm pricing/voucher production để xác nhận chính nó.

### 3.4. Snapshot đối soát bắt buộc

Lưu trước/sau theo orderId, paymentId, showtimeId, seatId, ticketCode, refundId, userId, voucherId:

| Đối tượng | Kiểm tra |
|---|---|
| Order + OrderItem + OrderCombo | status/source/owner, thời hạn, settledPaymentId, snapshot phim/rạp/giờ/giá, subtotal/discount/total, pointsEarned, refundStatus. |
| ShowtimeSeat + PendingOrderGuard | HELD/SOLD đúng chủ, holdExpiresAt không tăng khi PATCH, nhả đúng ghế, guard đã dọn; BLOCKED luôn giữ BLOCKED. |
| Payment + PaymentLog | số attempt, amount/provider/method/status, paidAt, giao dịch cổng, kết quả IPN/return; không ghi dữ liệu ký/token vào báo cáo. |
| Ticket | một vé cho mỗi OrderItem được fulfill, mã duy nhất, trạng thái VALID/USED/CANCELLED/EXPIRED, người và giờ soát. |
| VoucherRedemption + LoyaltyTransaction | RESERVED/CONSUMED/RELEASED đúng; EARN/REVERT không trùng; điểm và quota không âm/không vượt giới hạn. |
| RefundRequest | gắn đúng **paymentId**, amount/method/reference/status/processedBy/processedAt; không dùng refund đơn thứ nhất để che khoản thu trùng thứ hai. |
| AuditLog + OutboxEvent + email | thao tác quan trọng có actor/entity/lý do; outbox PENDING không được coi là SENT; email nội dung đúng trạng thái và không có mã vé giả. |
| Reports + CSV | doanh thu đơn PAID, tiền đã thu SUCCESS, tiền đã hoàn REFUNDED là ba đại lượng riêng; kỳ tiền theo paidAt/processedAt, occupancy theo ngày suất. |

## 4. Kịch bản theo từng phân hệ

Mỗi bảng có các bước liên tiếp; sau bảng có điều kiện đóng luồng. **Không bước nào được đánh dấu đạt chỉ vì API trả 200.** Với UI chưa tồn tại: chạy API để đánh giá rule, ghi hành trình UI `BLOCKED_IMPLEMENTATION`.

### 4.1. Tài khoản và khách vãng lai

#### TC-AUTH01 — Đăng ký → xác minh → đăng nhập → hồ sơ → đăng xuất (P1, F01)

Tiền điều kiện: email/SĐT chưa tồn tại; chạy hai cấu hình REQUIRE_EMAIL_VERIFICATION=false/true riêng, có mailbox kiểm thử.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | GUEST mở đăng ký, nhập họ tên/email/SĐT/password hợp lệ. | Tạo đúng một CUSTOMER; email chuẩn hóa; password không trả ra UI/API. |
| 2 | Khi bật xác minh, thử đăng nhập/đặt vé trước kích hoạt. | Không cấp quyền đặt; trạng thái PENDING_VERIFY được giải thích rõ. Khi tắt, tài khoản ACTIVE dùng được. |
| 3 | Mở chính link xác minh từ mailbox; thử gửi lại và dùng link cũ. | Route/đúng modal hoạt động; token mới hợp lệ, token hết hạn/đã dùng/link cũ bị chặn theo policy; trạng thái ACTIVE đúng một lần. |
| 4 | Đăng nhập, mở hồ sơ, sửa tên/SĐT/ngày sinh rồi tải lại trang. | Dữ liệu lưu thực; ngày sinh không trôi ngày; SĐT trùng hoặc ngày tương lai bị chặn mà dữ liệu cũ giữ nguyên. |
| 5 | Đăng xuất rồi mở lại màn bảo vệ/gọi API bằng phiên đã thu hồi. | Cookie refresh bị xóa, không khôi phục phiên đã logout; UI không còn thông tin tài khoản cũ. |

Đóng luồng: tài khoản có trạng thái đúng, không tồn tại profile/phiên nửa chừng; customer đăng nhập lại đi được TC-C01. Link email không hoạt động là fail dù endpoint verify pass.

#### TC-AUTH02 — Quên mật khẩu / đổi mật khẩu / phục hồi phiên (P1, F01)

Tiền điều kiện: C1 có phiên trên hai thiết bị, biết password cũ, mailbox test.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | Yêu cầu quên mật khẩu bằng email thật và email không tồn tại. | Phản hồi không lộ tồn tại tài khoản; chỉ mailbox có tài khoản nhận đúng link. |
| 2 | Mở link `/reset-password?...` từ email trên cửa sổ mới. | Đến đúng bước nhập mật khẩu mới; không cần thao tác dev console/chép token vào form khác. |
| 3 | Đặt mật khẩu mới trong 15 phút; dùng lại link hoặc token hết hạn. | Chỉ lần hợp lệ thành công; cũ/hết hạn bị từ chối. |
| 4 | Đăng nhập bằng cũ/mới; thử refresh từ hai thiết bị cũ. | Cũ thất bại, mới thành công; refresh đã thu hồi thất bại, không tiếp tục thao tác bằng phiên bị hủy. |
| 5 | Đổi password từ hồ sơ với currentPassword sai rồi đúng. | Sai không đổi dữ liệu; đúng có quy trình phiên rõ, thử phiên còn sống và phiên đã thu hồi. |

Đóng luồng: người dùng có một cách đăng nhập hợp lệ sau reset/change; UI không mắc kẹt trong phiên cũ. Chạy X-A01…A05.

#### TC-AUTH03 — Google và chuyển phiên khi đang đặt (P1, F01/F03)

1. Đăng nhập Google email mới → backend xác thực token/audience, mở bước bổ sung SĐT hợp lệ → tạo đúng một customer và phiên.
2. Email đã tồn tại → liên kết đúng tài khoản, giữ order/điểm/role; không nhân đôi user. Token sai/hết hạn hoặc account LOCKED không được cấp phiên.
3. Đóng/hủy Google hoặc nhập SĐT trùng → có lỗi và cách thử lại, không tạo profile thiếu SĐT.
4. C1 đang có hold → logout/login C2 lúc request C1 chưa trả → không đưa đơn/QR/response cũ vào UI của C2; mọi API C2 đọc/sửa/pay/cancel đơn C1 bị chặn.
5. Token access hết hạn ở thao tác → refresh/retry tối đa một lần bằng cùng tài khoản, không tạo thêm đơn/giao dịch; kiểm cả history/checkin/report còn dùng fetch riêng.

Đóng luồng: phiên khôi phục đúng chủ, người dùng có thể tiếp tục đơn của mình; hold C1 vẫn theo deadline hoặc được hủy đúng policy.

#### TC-D01 — Tìm phim → đúng rạp/ngày/suất → sơ đồ ghế (P1, F02)

1. GUEST tìm tên phim, đổi tab đang/sắp chiếu, lọc rạp/ngày; kiểm loading/error/retry/empty, trang tiếp theo.
2. Chọn phim M-P, rạp A, ngày D, suất R-A lúc 14:00 → UI/API thống nhất movieId/cinemaId/roomId/showtimeId/startTime/format/language; không tự lấy suất đầu tiên.
3. Đổi phim/rạp/ngày khi request cũ đang chậm → xóa lựa chọn con và bỏ response cũ, không mở sơ đồ của lựa chọn trước.
4. Mở chi tiết/trailer, lọc thể loại/giá từ/số ghế nếu trong FR → thông tin đúng, trailer lỗi không khóa chọn suất; phim C/ẩn/ngừng chiếu không có đường đặt trái rule. UI đang thiếu các thao tác này phải ghi BLOCKED_IMPLEMENTATION tương ứng, không chỉ kiểm text trên card.
5. Click suất hết ghế, CANCELLED/CLOSED hoặc vượt cutoff → không tạo đơn; có lý do và lựa chọn suất khác.

Đóng luồng: đúng suất chuyển được sang TC-C01; dữ liệu rỗng không giả làm lỗi và lỗi server không giả làm hết suất.

### 4.2. Khách hàng: ghế, tiền, vé và hủy

#### TC-C01 — Giữ/sửa ghế trên một đơn (P0, F03)

Tiền điều kiện: C1/C2 hai phiên; fixture rạp A đủ ghế trống; chưa có pending cho C1/suất này.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | C1 chọn ghế STANDARD đầu tiên, với phim hạn tuổi đã xác nhận. | Server tạo một PENDING_PAYMENT; ghế HELD đúng owner; expiresAt≈thời điểm tạo+10 phút; UI chỉ đánh dấu sau xác nhận server. |
| 2 | C2 mở cùng suất, đợi một chu kỳ poll. | Ghế C1 hiển thị HELD, không lấy được; không lộ userId/orderId của C1. |
| 3 | C1 thêm VIP, bỏ STANDARD, thêm lại STANDARD. | PATCH cùng orderId; thêm/bỏ nguyên tử; deadline không tăng; snapshot của item giữ lại không đổi. |
| 4 | C1 reload/đóng mở lại khi còn hold. | Khôi phục pending đúng đơn/thời hạn theo contract; không tạo đơn thứ hai cho cùng suất. |
| 5 | C1 tiếp tục checkout. | Checkout nhận chính đơn đã giữ, seat labels/tổng tiền đúng, không tạo order mới. |

Đóng luồng: giữ/sửa thành công nối TC-C02; nhánh bỏ ghế cuối/đóng/hủy phải nối TC-C04 hoặc TC-C05, không để HELD/guard treo.

#### TC-C02 — Combo/voucher/tổng tiền/snapshot (P0, F03/F12/F13)

Tiền điều kiện: giữ 1 STANDARD+1 VIP; giá F-MONEY; pending chưa có payment PENDING.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | Chọn 1 combo rồi áp UAT20. | Subtotal 230.000, giảm 40.000, total 190.000; UI lấy response server, không tin số client gửi. |
| 2 | Bỏ/đổi voucher, đổi số combo rồi reload. | PATCH nguyên tử cùng đơn; quota voucher cũ RELEASED và mới RESERVED đúng; tổng được cập nhật/persist. |
| 3 | MANAGER đổi giá vé/combo/phụ thu hoặc ẩn combo trong khi C1 đang giữ. | Item giữ lại vẫn theo snapshot; item thêm dùng policy đã chốt; lịch sử không đổi ngược; thao tác sai rollback cả đơn. |
| 4 | Khởi tạo payment rồi thử sửa ghế/combo/voucher. | Payment PENDING khóa chỉnh order; số tiền payment vẫn khớp order, không dùng URL cũ cho tổng tiền mới. |
| 5 | Bỏ/đổi lựa chọn thất bại do quota/ghế vừa mất. | UI giữ phiên bản đã commit; không lưu một nửa đơn, không mất quota/ghế của chủ khác. |

Đóng luồng: ticketSubtotal/comboSubtotal/discount/total, voucher snapshot/redemption, price snapshot khớp F-MONEY trước TC-C03. Chạy thêm scope TICKETS/COMBOS và số lẻ.

#### TC-C03 — Thanh toán → nhận vé → soát → báo cáo (P0, F04/F05/F08/F14)

Tiền điều kiện: order 190.000đ từ TC-C02, còn thời hạn; sandbox staging hoặc callback local ký độc lập được gắn nhãn rõ.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | C1 bấm thanh toán; bấm đúp/retry cùng idempotency key. | Một logical payment attempt phù hợp; URL ký đúng amount=19.000.000; không tạo đơn khác. |
| 2 | Browser quay lại trước IPN hoặc đóng browser sau trả tiền. | Return không tự chốt PAID; trang kết quả đọc order chính chủ, hiển thị chờ/poll; đóng browser không cản IPN. |
| 3 | IPN hợp lệ thành công đến, sau đó gửi lặp. | Payment SUCCESS; order PAID; hai ghế SOLD; đúng hai ticket VALID; +19 điểm; voucher CONSUMED; callback lặp không tạo thêm. |
| 4 | Mở vé, history và mailbox, tải lại bằng C1. | Phim/rạp/phòng/ghế/giờ/tổng tiền snapshot đúng; đủ mã vé/QR từng ghế; không QR thay bằng mã đơn; TC-C07 không crash. |
| 5 | S-A dùng QR nguyên bản của từng vé trong cửa sổ giờ. | TC-S02: từng vé USED một lần; stats/history tăng đúng; order vẫn PAID và ghế SOLD. |
| 6 | M-A/ADM mở overview/breakdown/CSV trong kỳ phù hợp. | revenue=grossRevenue=190.000, refund=0, orders=1, tickets=2, comboRevenue=41.304 trong dataset cô lập. Occupancy theo ngày suất, không theo ngày trả tiền. |

Đóng luồng: có hai vé dùng được, 19 điểm, một khoản thu 190.000đ, không refund; report/CSV và chứng từ gateway khớp. **Email hoặc API payment đơn lẻ không đủ đóng luồng.**

#### TC-C04 — Thanh toán thất bại/mất mạng/chủ động hủy pending (P0, F03/F04)

1. Tạo hold → callback thất bại đúng chữ ký → payment FAILED, chưa có vé/điểm, order giữ pending khi còn hạn theo policy.
2. Retry trước expiresAt → giữ cùng order, attempt mới phân biệt; thành công đi TC-C03, thất bại không tạo duplicate thu tiền.
3. Ngắt mạng sau click thanh toán/POST trả chậm → refresh/retry bằng kiểm trạng thái server; không phát hành vé từ trạng thái UI giả.
4. C1 đóng checkout hoặc hủy pending → CANCELLED, ghế AVAILABLE, guard dọn, voucher RELEASED, không refund vì chưa thu tiền.
5. Cho IPN thành công tranh cùng cancel pendingOnly → chỉ một kết quả nhất quán: PAID và vé nếu IPN thắng; hoặc thu tiền chưa fulfill/refund nếu cancel thắng. Không hủy nhầm vé đã PAID chỉ vì đóng modal.

Đóng luồng: mỗi attempt SUCCESS phải có vé hợp lệ hoặc refund; attempt FAILED không có điểm/thu tiền; C2 có thể mua lại đúng ghế đã nhả.

#### TC-C05 — Hết hạn giữ ghế → người khác mua lại (P0, F03/F19)

1. C1 giữ ghế + reserve voucher, không thanh toán; kiểm countdown lấy expiresAt server.
2. Tại expiresAt−1ms vẫn chỉ sửa/thanh toán trong điều kiện cho phép; tại expiresAt và +1ms bị xử lý hết hạn, không gia hạn bằng PATCH/reload.
3. Chạy worker/đợi lịch job đúng môi trường → order EXPIRED; ghế HELD đúng owner về AVAILABLE; payment pending EXPIRED; guard dọn; redemption RELEASED.
4. C2 đặt rồi trả tiền chính ghế đó → SOLD thuộc C2, vé/điểm C2 đúng.
5. C1 mở đơn cũ và gửi thao tác cũ → thông báo hết hạn, không lấy lại ghế C2; có đường chọn đơn/suất khác.

Đóng luồng: không còn hold/guard/reservation treo. Job thực không chạy phải ghi BLOCKED_OPERATIONS dù gọi ops bằng tay đã đạt.

#### TC-C06 — Callback muộn/thu trùng → đối soát hoàn tiền (P0, F04/F06/F14)

Tiền điều kiện: độc lập ba biến thể: **đơn hết hạn, ghế trống**; **đơn hết hạn/hủy, ghế thuộc C2**; **đơn đã PAID, attempt khác cũng SUCCESS**.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | Ghi nhận gateway đã thu đúng số tiền, gửi IPN hợp lệ sau trạng thái ở trên. | Mọi khoản SUCCESS phải được ghi nhận; không bỏ qua khoản thu chỉ vì order hết hạn. |
| 2 | Đọc trạng thái order/ghế/vé/refund. | Theo code hiện tại: late pending không fulfill → PAID_UNFULFILLED + refund PENDING; không lấy ghế của người khác. Chính sách cấp lại ghế trống phải chốt GAP-06 trước khi nghiệm thu theo spec. |
| 3 | Đọc UI result/history/mailbox. | Thông báo đã thu tiền nhưng chưa cấp vé, hướng xử lý/refund rõ; không báo vé hợp lệ hoặc phát QR từ mã đơn. GAP-05 cần regression. |
| 4 | Gửi IPN lặp, một callback FAILED đến sau SUCCESS và callback attempt thứ hai. | Không downgrade SUCCESS; không nhân đôi refund của cùng payment; thu trùng khác payment có refund riêng, vé/điểm order gốc không tăng. |
| 5 | MANAGER xử lý từng refund đúng payment, đối chiếu chứng từ. | TC-S03; số tiền hoàn không vượt khoản thu; không báo toàn bộ đã hoàn khi còn refund pending khác. |

Đóng luồng: khoản thu chưa phục vụ được có chứng từ hoàn và trạng thái cuối đúng chính sách; tiền net=thu−hoàn, C2/vé gốc không bị ảnh hưởng. Trạng thái terminal PAID_UNFULFILLED sau hoàn cần được giải thích/chốt, không dùng chỉ refundStatus để che thiếu xử lý.

#### TC-C07 — Lịch sử → chi tiết vé → phục hồi hành động (P0, F06)

1. C1 tạo dataset có PENDING_PAYMENT, PAID, EXPIRED, CANCELLED/refund PENDING, CANCELLED/REFUNDED và PAID_UNFULFILLED; dùng **response API thật**, không orderFixture bổ sung snapshot.
2. Mở “Vé của tôi” → không exception/blank; tên phim/rạp/giờ/số tiền đúng; từng trạng thái có nhãn trung thực. Kiểm GAP-01.
3. Mở chi tiết PAID → đọc đủ mã vé/QR; vé USED/CANCELLED/EXPIRED không hiển thị như còn hợp lệ. Suất cũ đọc snapshot sau đổi danh mục.
4. Với pending còn hạn → có đường tiếp tục thanh toán đúng đơn hoặc hủy; với hết hạn → có đường đặt lại. Nếu UI chưa có, ghi BLOCKED_IMPLEMENTATION thay vì gọi API giúp khách.
5. Tạo hơn một trang đơn → người dùng truy cập được đơn cũ, không lặp/mất item; C2 không đọc được orderId C1; timezone máy khác vẫn giờ Việt Nam.

Đóng luồng: mọi trạng thái có hành động tiếp theo hợp lệ hoặc lý do kết thúc; khách nhìn thấy kết quả refund sau quản lý xử lý. Phân trang/tiếp tục trả tiền chưa có phải được giữ trong gap list.

#### TC-C08 — Hủy vé đã trả tiền → hoàn tiền → bán lại ghế (P0, F06/F13/F14)

Tiền điều kiện: C1 có order F-MONEY PAID, toàn bộ vé chưa USED, giờ chiếu còn >2h; chính sách fixture hoàn 100%/không phí.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | Mở history, chọn hủy, xem điều kiện/số tiền hoàn rồi xác nhận lý do. | Chủ đơn hiểu tác động; chưa xác nhận thì dữ liệu không đổi. Nếu chưa có preview chính sách, ghi thiếu bước. |
| 2 | Xác nhận một lần, đồng thời thử request thứ hai. | Order CANCELLED/refund PENDING; hai vé CANCELLED; ghế AVAILABLE; điểm về 0 với một REVERT; voucher RELEASED; refund đúng 190.000 một lần. |
| 3 | S-A soát QR cũ, C2 chọn chính ghế vừa nhả. | Vé cũ bị từ chối; C2 đặt/thanh toán thành công, không đổi trạng thái vé cũ. |
| 4 | M-A thấy refund, hoàn thủ công với chứng từ rồi xác nhận qua UI. | TC-S03: refund/order.refundStatus REFUNDED, chứng từ và actor lưu; UI C1 đọc được trạng thái mới. |
| 5 | Đối soát kỳ tiền và suất. | Đơn C1 không còn revenue PAID; gross vẫn chứa tiền đã thu, refund thực tăng 190.000; đơn C2 tính riêng; điểm/quota/occupancy không đếm vé C1. |

Đóng luồng: khách nhận hoàn theo chứng từ, vé cũ vô hiệu, ghế bán lại hợp lệ, tiền/điểm/voucher/report khớp. Chỉ tạo refund PENDING chưa đóng được phần hoàn tiền.

### 4.3. Nhân viên và vận hành rạp

#### TC-S01 — Bán quầy → nhận tiền → phát vé → soát/báo cáo (P0/P1, F07)

Tiền điều kiện: S-A, suất A còn bán, ghế AVAILABLE; chạy walk-in và member C1 theo SĐT; CASH/POS/BANK_TRANSFER thành ba biến thể riêng.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | Từ UI quầy chọn rạp/suất/ghế, nhập khách hoặc nhận diện member. | S-A chỉ thấy A; giá/tuổi/cutoff/1–8 ghế giống online; member giữ đúng userId. **Hiện thiếu UI quầy: ghi BLOCKED_IMPLEMENTATION.** |
| 2 | Chọn combo/voucher cho member: total 190.000; walk-in không voucher: total 230.000. | Quota/scope/giá snapshot đúng; walk-in không được hưởng lượt/điểm của một khách khác. Nếu cần walk-in dùng voucher, chốt policy riêng trước khi chạy. |
| 3 | Nhận CASH: member đưa 200.000, thừa 10.000; walk-in đưa 250.000, thừa 20.000. Với POS/chuyển khoản, xác thực chứng từ tương ứng. | Có bước xác nhận thực nhận; thiếu cashReceived/cashChange hoặc mặc định SUCCESS không chứng minh đúng nghiệp vụ thu ngân. |
| 4 | Phát/in vé, khách dùng mã/QR, đối chiếu ID giao dịch. | PAID/COUNTER, payment đúng method/provider, ghế SOLD, đủ ticket VALID; member cộng 19 điểm, walk-in không cộng vào staff. |
| 5 | Soát vé và đọc report kênh/quầy/rạp/kỳ. | Ticket USED, cashier/paidAt/amount khớp; ghế không bán lại; doanh thu không cộng hai lần. |

Đóng luồng: tiền thu có chứng cứ, vé dùng được, member history/điểm đúng, người thu ngân đối soát được. API test /counter chỉ chứng minh một phần; thu tiền/in/bàn giao combo chưa có phải báo rõ.

#### TC-S02 — Soát QR thật / mã vé / bypass (P0, F08)

Tiền điều kiện: ticket PAID thật, giờ trong `[start−30m, start+15m]`; một QR signed từ web và một từ email nếu email hỗ trợ.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | S-A copy nguyên QR có chữ thường/base64url vào input UI, submit. | Payload không bị đổi case; backend verify chữ ký; đúng phim/rạp/phòng/ghế. GAP-02 phải test từ UI tới server thật. |
| 2 | Dùng mã vé thuần trong cấu hình strict=false, rồi strict=true. | strict=false dùng được theo policy; strict=true từ chối unsigned rõ. Chốt luồng manual lookup hợp lệ khi strict bật, không tự hạ bảo mật. |
| 3 | Submit vé hợp lệ, sau đó quét lại và hai máy quét đồng thời. | VALID→USED duy nhất; duplicate hiển thị giờ/người soát trước, stats/history không tăng trùng. |
| 4 | S-B/sai suất/QR sửa một ký tự/QR vé hủy gửi cùng mã. | Từ chối đúng nguyên nhân; không có ticket/history thành công và không lộ dữ liệu vượt phạm vi. |
| 5 | S-A soát ngoài cửa sổ, sau đó M-A bypass với lý do đủ dài. | STAFF không bypass; MANAGER đúng rạp được ngoại lệ có audit; không bypass sai rạp/vé dùng/hủy/chữ ký giả. |
| 6 | Đọc stats/history, đổi ngày/rạp/quyền. | Tổng/USED/chưa soát phù hợp thời gian và rạp; check-in không làm tăng doanh thu hoặc điểm. |

Đóng luồng: khách có thể vào phòng đúng một lần bằng QR phát hành thật; camera/máy quét/print cần nghiệm thu thiết bị riêng. Không coi paste mã TK thành công là chứng minh QR signed hoạt động.

#### TC-S03 — Quản lý đối soát hoàn tiền thủ công (P0, F06/F14 + module refunds)

Tiền điều kiện: có refund C1 tại A, refund C2 tại B, và một order có hai refund theo hai payment SUCCESS.

1. M-A mở danh sách, lọc PENDING, đọc chi tiết đúng payment/order/khách/amount/reason/policy; không đọc/xử lý B.
2. Đối chiếu gateway/POS/tiền mặt và bằng chứng đã hoàn bên ngoài; nhập method, reference thực, note. Chưa chuyển tiền thì để PENDING; phần mềm không tự chuyển tiền.
3. Xác nhận → RefundRequest REFUNDED, processedBy/At, reference, AuditLog và outbox đúng. Không có chứng từ mà bấm được vẫn là thiếu kiểm soát cần chốt.
4. Retry/process đồng thời hai quản lý → một lần ghi hoàn, một audit/outbox logical; không lần chuyển tiền ngoài thứ hai.
5. Với hai refund cùng order: xử lý một cái → cái còn lại vẫn PENDING; order/UI không được báo tất cả khoản thu đã hoàn. Xử lý hết → tổng hoàn đúng; mail/outbox dispatch được kiểm riêng.
6. C1 reload history/result; report kỳ processedAt tăng refund thực, số dư thu−hoàn khớp; đổi timezone không đổi ngày ghi nhận nghiệp vụ.

Đóng luồng: mỗi refund có chứng từ và trạng thái cuối, tổng hoàn không vượt khoản thu, khách đọc được trạng thái thật; outbox chưa gửi không coi là thông báo đã đến.

### 4.4. Quản lý và quản trị danh mục

#### TC-M01 — Phim/TMDB → công bố → mở bán → ẩn/khôi phục (P0/P1, F09)

1. M-A/ADM tạo phim M-new từ form (hoặc tìm TMDB để autofill rồi lưu); validate tên, thời lượng, ageRating, release/end date, trailer/genre. Kiểm double-submit/retry theo hợp đồng tạo phim thực tế. Dedupe theo cùng TMDB ID là policy cần chốt vì source/đặc tả chưa cam kết lưu định danh TMDB.
2. Chỉnh thông tin/công bố NOW_SHOWING hoặc trạng thái bán đúng policy; không chỉnh DB thay thao tác UI. Kiểm GAP-03 và UI sửa/khôi phục còn thiếu.
3. Tạo suất hợp lệ rồi C1 tìm phim/ngày/rạp từ Discovery → có suất và mua được TC-C03. COMING_SOON hiển thị/cho bán trước theo policy cần xác định, không mặc định luôn cấm nếu spec yêu cầu khác.
4. Sau có pending+PAID, ẩn phim → TC-M06: không hard delete lịch sử, xử lý suất tương lai/đơn/ghế/refund/điểm/voucher.
5. Khôi phục nếu được hỗ trợ → phim có đường mở bán lại rõ; không tự hồi sinh vé/đơn đã hủy. API/UI thiếu thì ghi BLOCKED_IMPLEMENTATION.

Đóng luồng: quản lý thật có thể đưa phim mới đến khách mua, và ngừng bán mà bảo toàn lịch sử/hoàn tiền. TMDB 401/timeout/mất mạng không tạo phim nửa dữ liệu và không khóa CRUD thủ công.

#### TC-M02 — Tạo rạp/phòng/sơ đồ ghế → suất → đặt vé (P0/P1, F10)

1. ADM tạo rạp R-new; M-A thử tạo phòng ở A và B → chỉ A được phép. Tên/mã trùng, capacity/format/giờ không hợp lệ không tạo bản ghi lỗi.
2. Tạo phòng mới từ UI với capacity/rows → tải sơ đồ vật lý; phải có đúng số ghế/nhãn/vị trí/loại/span như thiết kế. Kiểm GAP-04, không seed thêm ghế để đánh dấu case đạt.
3. Chỉnh/sắp ghế, lối đi, VIP/COUPLE/BLOCKED nếu phạm vi yêu cầu; phòng có vé/hold phải được bảo vệ khỏi thay đổi phá snapshot.
4. Tạo suất của phòng mới → ShowtimeSeat đầy đủ, BLOCKED không bán; C1 chọn/giữ/thanh toán đúng ghế thật.
5. Soát vé phòng mới và report occupancy → ticket 1/slot, COUPLE capacity 2; room capacity khai báo không thay thế số ghế thật.

Đóng luồng: phòng mới bán được vé mà không can thiệp DB; nếu thiếu seat editor/API, FR-18 chưa được nghiệm thu đủ dù createRoom trả 201.

#### TC-M03 — Xếp suất → giá/ghế → sửa/xóa/hủy (P0/P1, F11)

Tiền điều kiện: M-P 120 phút, R-A ACTIVE mở 08:00–23:00, bảng giá đủ.

1. Tạo suất start=14:00, phim=120 phút, adMinutes=15, cleaning=15 → endTime=16:15, phòng rảnh sớm nhất 16:30; snapshot runtime/layout/seat type đầy đủ, khách thấy đúng suất. Giá resolve khi đọc map và snapshot khi tạo order, không mặc định cố định giá từ lúc tạo suất. Với UI hiện gửi adMinutes=10, endTime phải là 16:10; ghi GAP-20 về default, không lẫn sai công thức với bất đồng policy.
2. Trên fixture adMinutes=15, thử suất 16:29:59.999 → từ chối; 16:30:00 → chấp nhận theo rule. Kiểm cả buffer của suất trước/sau và hai request tạo cùng phòng đồng thời.
3. Thử phim C, trước release date, phòng MAINTENANCE/sai format, suất vượt giờ rạp hoặc rạp ngoài scope → không tạo suất/seat một phần. Chuỗi INACTIVE/UNKNOWN là input enum không hợp lệ, kiểm riêng validation.
4. Suất chưa vé: sửa/xóa đúng policy, lịch/seat map khách cập nhật; nếu API/UI chưa có, BLOCKED_IMPLEMENTATION.
5. Có hold/PAID: sửa giờ/phòng/phim/xóa cứng bị chặn; hủy có lý do đi TC-M06. Đồng thời đặt/IPN và hủy phải có trạng thái nhất quán.

Đóng luồng: lịch không xung đột, suất bán có giá và inventory, lịch thay đổi không làm khách giữ vé sai giờ/phòng; mọi đơn của suất hủy được xử lý.

#### TC-M04 — Giá/phụ thu/ngày lễ → snapshot đơn → báo cáo (P0, F12)

1. M-A thêm rule giá/phụ thu với effectiveFrom, ADM khai báo ngày lễ theo scope đã chốt; đọc lại bằng M-A/M-B để kiểm quyền.
2. Tạo suất ở từng dayType/timeSlot/format: chọn đúng rule hiệu lực mới nhất trước ngày suất, HOLIDAY ưu tiên đúng; sát 00:00 UTC+7 không nhầm thứ/ngày.
3. Tạo đơn F-MONEY online và counter member: map STANDARD=80.000/VIP=100.000; ticketSubtotal=180.000; thêm combo 50.000 và UAT20 giảm 40.000 → order/payment=190.000. Thiếu rule/surcharge phải lỗi nghiệp vụ, không tự gán giá default hoặc 0.
4. Đổi giá trong lúc hold/PAID → item snapshot giữ nguyên; item thêm/đơn mới theo hiệu lực đã chốt; không sửa lịch sử hoặc payment đang pending.
5. Đọc audit, vé/email/history/report/CSV → tên/giá snapshot nhất quán; manager không đọc bảng rạp B bằng bỏ filter cinemaId.

Đóng luồng: cấu hình từ UI thật có tác động đúng tới đơn mới, không hồi tố đơn đã giữ/bán, có bằng chứng đổi giá.

#### TC-M05 — Combo/voucher → checkout → quota → hủy (P0/P1, F13)

1. M-A tạo/sửa/ẩn combo và voucher trong phạm vi A; tạo voucher global hoặc gán B bằng M-A phải theo quyền đã chốt, kiểm cả detail/list.
2. C1 thấy combo/voucher áp dụng A; C2 chọn B không dùng được mã A; code không tồn tại/disabled/chưa hiệu lực/hết hạn/minOrder sai trả lỗi cụ thể.
3. Validate voucher chỉ preview, chưa chiếm quota; create/PATCH order áp mã commit thành công → RESERVED theo deadline; trả tiền → CONSUMED; bỏ/hủy/expire → RELEASED. Tranh lượt cuối với C1/C2 chỉ một đơn reserve thành công.
4. Sửa giá/điều kiện voucher khi đang RESERVED/CONSUMED → chặn thay đổi tài chính phá snapshot. Gia hạn/tạm dừng theo quyền được đặc tả cho phép; thay metadata khác cần đối chiếu contract, không ngụ ý luôn được sửa.
5. C1 hủy sau PAID → quota/điểm/report thực hiện TC-C08; combo đã mua vẫn giữ name/price snapshot khi danh mục đổi/ẩn.

Đóng luồng: ưu đãi tạo được bằng UI theo phạm vi, khách sử dụng được, không vượt quota và trả lại lượt đúng policy. CRUD voucher UI đang thiếu giữ trạng thái BLOCKED_IMPLEMENTATION.

#### TC-M06 — Hủy suất / ẩn phim hàng loạt → hoàn tiền tất cả (P0, F09/F11/F06)

Tiền điều kiện: suất tương lai của M-P có 1 pending, 2 PAID, 1 PAID_UNFULFILLED, voucher/điểm; có suất lịch sử và suất rạp B ngoài scope M-A.

| Bước | Thao tác | Kết quả cần kiểm |
|---|---|---|
| 1 | M-A hủy suất A với lý do; ADM ẩn phim để xử lý tất cả suất tương lai theo policy. | Thẩm quyền phạm vi rõ; M-A không ảnh hưởng B ngoài scope; lý do bắt buộc. UI thiếu nút hủy không được thay bằng POST rồi ghi UI đạt. |
| 2 | Đọc Discovery/seat-map/đơn pending. | Suất CANCELLED không còn đặt mới; pending hủy/nhả ghế/dọn guard/quota; không tạo refund khi chưa thu tiền. |
| 3 | Đọc đơn PAID/vé/điểm/voucher/refund. | Vé CANCELLED, đơn trạng thái đúng, hoàn 100% theo policy rạp hủy, REVERT một lần, quota đúng; ghế không còn bán ở suất hủy. |
| 4 | IPN đến sau hủy, hoặc nhiều request hủy đồng thời. | Khoản tiền thu muộn có refund riêng; không hồi sinh suất/vé; không trừ điểm/tạo refund trùng. |
| 5 | Thông báo khách, xử lý tất cả refund, đọc history/report. | Nội dung thông báo hủy đúng; từng payment thu tiền có chứng từ hoàn; outbox phải dispatch thật nếu dùng cho thông báo; dữ liệu lịch sử được giữ. |

Đóng luồng: không còn đơn/hold/vé sống không hợp lệ ở suất hủy; đủ refund cho từng khoản thu, suất lịch sử không bị tác động sai. Chốt quyền ẩn phim global của MANAGER nếu thao tác có thể lan sang nhiều rạp.

### 4.5. Báo cáo, phân quyền và hệ thống

#### TC-R01 — Báo cáo/CSV đối soát theo kỳ và rạp (P0/P1, F14)

Tiền điều kiện: dataset cô lập ở A/B có đơn paid, cancelled/refund pending, refunded, unfulfilled, failed, thu trùng; đặt các giao dịch ở hai bên 00:00 UTC+7.

1. M-A xem từ ngày D đến D+1 inclusive → đúng A; M-AB xem union A+B không nhân đôi; ADM so sánh rạp; M-none bị từ chối.
2. Đối chiếu `revenue = Σ total của order PAID có paidAt trong kỳ`; `grossRevenue = Σ SUCCESS.amount có paidAt trong kỳ`; `refundAmount = Σ REFUNDED.amount có processedAt trong kỳ`. PENDING refund không là hoàn thực; unfulfilled/thu trùng vẫn trong gross.
3. Tính tiền net ngoài báo cáo `grossRevenue−refundAmount`; với hoàn ngày khác không cưỡng ép doanh thu thuần của ngày bán bằng doanh thu đơn PAID hiện tại. Kiểm tiêu đề báo cáo diễn đạt đúng đại lượng.
4. So occupancy dùng showtime.startTime trong kỳ, capacity từ slot/span (COUPLE=2, BLOCKED=0); payment ngoài kỳ nhưng suất trong kỳ vẫn có capacity/sold. Không dùng ticketCount để thay soldCapacity.
5. Lọc phim/rạp/kênh nếu có; đổi kỳ → top phim và totals theo phạm vi được công bố. Top toàn thời gian hoặc thiếu filter phải ghi rõ và chốt GAP-14.
6. Export CSV đúng filter/type/role → file UTF-8 BOM, ngày/đơn vị/tiếng Việt rõ, tổng từng dòng đúng UI và DB; tên phim bắt đầu `=`, `+`, `-`, `@` không được tạo công thức khi mở spreadsheet.

Đóng luồng: giao dịch từ E2E tra được tới báo cáo, có đáp án tính độc lập. MANAGER bấm tab CINEMA hiện có không được nhận lỗi làm mất toàn dashboard; xử lý UX/quyền theo policy rồi mới nghiệm thu.

#### TC-A01 — Quyền vai trò/sở hữu/phạm vi hiện tại (P0, BR-15)

1. Kiểm menu GUEST/CUSTOMER/STAFF/MANAGER/ADMIN; UI ẩn/hiện phù hợp nhưng vẫn gọi trực tiếp từng API bằng vai trò bị cấm.
2. C2 GET/PATCH/pay/cancel order C1; S-B đọc/soát/hủy đơn A; M-A CRUD/refund/report/pricing/voucher-detail B → từ chối và dữ liệu không đổi.
3. M-A/S-A không truyền cinemaId hoặc truyền danh sách rỗng/giả → không mở toàn hệ thống. API public chỉ lộ danh mục công khai, không lộ redemption/customer/payment nhạy cảm.
4. ADM đổi assignment/role/status trong fixture kiểm bảo vệ token đang tồn tại → request kế tiếp dùng quyền DB hiện tại; account LOCKED/PENDING_VERIFY không thao tác bảo vệ dù JWT còn hạn.
5. Session logout/đổi user cùng request pending → response cũ không hiển thị lại dữ liệu của user trước; raw fetch history/checkin/report phải có đường refresh hoặc yêu cầu đăng nhập lại rõ.

Đóng luồng: quyền UI/API/DB cùng một actor và phạm vi; không có mutation ngoài quyền, không rò trường vượt scope. Nếu chưa có F15 thì việc đổi fixture chỉ chứng minh middleware, không chứng minh UI quản trị tài khoản.

#### TC-A02 — Quản lý user/config/audit (P1, F15/F16)

Hiện giữ `BLOCKED_IMPLEMENTATION` cho phần thiếu UI/API, không bỏ khỏi danh sách Must/Should.

1. ADM tìm user → gán STAFF/MANAGER/rạp, khóa/mở; MANAGER/CUSTOMER gọi cùng API bị chặn; chặn tự khóa admin cuối cùng theo chính sách cần chốt.
2. Tài khoản mới đăng nhập → chỉ thấy và dùng đúng phân hệ; khóa trong lúc đang hoạt động → access/refresh bị từ chối, lịch sử tài chính vẫn giữ nguyên.
3. ADM đổi hold minutes/max seats/cutoff/cancel lead/cleaning theo giới hạn cấu hình → đơn/suất mới dùng đúng giá trị, đơn đang giữ có snapshot/deadline không bị đổi ngược ngoài policy.
4. ADM tìm audit theo actor/entity/order/requestId → đổi quyền, khóa, đổi giá, hủy suất/vé, refund, bypass có old/new/reason/timestamp đúng; log không chứa token/password.
5. Thử config sai/trùng/deleted hoặc audit query không có quyền → lỗi phù hợp, không mở quyền/giá trị mặc định nguy hiểm.

Đóng luồng: admin cấu hình được từ sản phẩm và chứng minh tác động đến khách/nhân viên; một bảng Setting/AuditLog trong schema không đáp ứng luồng này.

#### TC-O01 — Job định kỳ / phục hồi / thông báo (P0/P1, F19/NFR-05)

1. Chuẩn bị >200 hold hết hạn, hold còn sống, ghế SOLD/BLOCKED, orphan HELD và voucher/payment pending; đợi lịch job chứ không chỉ gọi ops thủ công.
2. Mỗi lượt tối đa 200 order theo source; nhiều lượt dọn hết backlog, không starvation; hai worker chạy đồng thời không nhả SOLD/ghế chủ mới và không trùng chuyển trạng thái.
3. Cho IPN/cancel/PATCH tranh cùng sweep → transaction đọc lại trạng thái; PAID đã commit không bị EXPIRED, guard/quota/ghế nhất quán.
4. Backend/job restart hoặc DB mất kết nối rồi phục hồi → order vẫn đúng, sweep tiếp tục; /ready báo không sẵn sàng đúng; không giữ ghế vô hạn khi worker vắng.
5. Đến cutoff/giờ chiếu/cửa sổ soát → suất CLOSED và vé hết hạn theo đặc tả; kiểm trường hợp ticket còn VALID nhưng bị chặn vì giờ, không tự coi job expire vé đã tồn tại.
6. Tạo outbox REFUND_PROCESSED, giả SMTP lỗi rồi phục hồi → retry/dedupe trạng thái delivery thật; nếu không có dispatcher, BLOCKED_OPERATIONS, không ghi “khách đã nhận”.

Đóng luồng: chạy không phụ thuộc admin bấm nút, toàn bộ tài nguyên/thông báo tới trạng thái cuối trong SLA đã chốt. Đề xuất SLA kiểm thử: sweep được gọi mỗi phút, đơn hết hạn được dọn trong ≤2 phút khi không backlog; đây là tiêu chí đề xuất cần đối chiếu cấu hình triển khai, không phải năng lực đã có.

## 5. Ma trận ngoại lệ, biên và tranh chấp bắt buộc

Chạy cùng assertion DB mục 3.4; mọi request bị từ chối phải chứng minh **không mutation một phần**. Sai mã lỗi nhưng bảo toàn dữ liệu vẫn ghi bug hợp đồng/UX phù hợp mức độ.

| ID | P | Dữ liệu/thao tác | Kết quả mong đợi | Liên kết |
|---|---|---|---|---|
| X-A01 | P1 | Email/SĐT trùng, hoa/thường/space, password yếu, ngày sinh tương lai | Validation rõ; không user trùng/profile nửa chừng. | AUTH01 |
| X-A02 | P1 | LOCKED/PENDING_VERIFY đăng nhập/refresh/gọi endpoint bảo vệ | Từ chối; không bypass bằng token cũ. | AUTH01,A01 |
| X-A03 | P1 | Reset token sai/15m±1ms/đã dùng, resend verify rồi dùng token cũ | Một lần đúng; hết hạn/đã dùng từ chối; không đổi password/status sai. | AUTH02 |
| X-A04 | P1 | Google token audience sai, token hết hạn, SĐT trùng, đóng Google | Không cấp phiên/role trái quyền; có đường thử lại. | AUTH03 |
| X-A05 | P1 | Refresh đồng thời/replay; rate limit login/forgot/verify | Rotation an toàn, family replay thu hồi theo policy, Retry-After và UI rõ; chốt các threshold từ config/source trước chạy. | AUTH02,AUTH03 |
| X-B01 | P0 | 0/1/8/9 ghế; ID trùng/sai phòng/sai suất/BLOCKED | Chỉ 1–8 slot hợp lệ; rollback toàn bộ khi một slot sai. | C01 |
| X-B02 | P0 | Hai customer tranh một ghế, online tranh counter | Một order thắng; loser không có hold/item/payment thừa. | C01,S01 |
| X-B03 | P0 | Hai request cùng user/cùng suất, hai tab hoặc hai idempotency key | Một pending; có cách khôi phục/hủy đúng đơn. | C01 |
| X-B04 | P0 | T18 đủ/thiếu tuổi đúng sinh nhật, không birthDate, chưa ageConfirmed; phim C | Đúng policy tuổi; phim C không xếp/đặt; không bypass quầy default true. | C01,S01,M03 |
| X-B05 | P0 | Cutoff trước giờ chiếu 15m±1ms, hold trước cutoff rồi pay sau cutoff | Boundary theo thời gian server; policy payment cuối cửa sổ phải chốt, không làm UI/server khác nhau. | C01,C03 |
| X-B06 | P0 | Hold expiresAt±1ms; reload/PATCH đổi ghế cố kéo dài | Không gia hạn; expired không phát vé trái policy. | C01,C05 |
| X-B07 | P0 | PATCH ghế bị lấy/mã voucher vừa hết lượt/combo không hợp lệ | Toàn bộ giữ phiên bản trước; quota/ghế không đổi nửa chừng. | C02 |
| X-B08 | P0 | Đổi giá/ẩn combo khi hold; thiếu rule; holiday sát UTC+7 | Snapshot đúng, giá mới đúng hiệu lực, không fallback giá 0. | C02,M04 |
| X-B09 | P1 | Combo qty 0/1/10/11/20/21; duplicate combo | Theo giới hạn đã chốt GAP-15; bỏ bằng [] và total đúng. | C02,M05 |
| X-V01 | P0 | Voucher scope ORDER/TICKETS/COMBOS; min−1/min/min+1; số lẻ | Đúng base giảm/cap/floor; total nguyên không âm. | C02 |
| X-V02 | P0 | validFrom/validTo±1ms; per-user/total limit và tranh lượt cuối | Không vượt lượt; reservations hết hạn không ăn quota mãi. | C02,M05 |
| X-V03 | P1 | Voucher rạp B/global bằng MANAGER A, detail/admin/list/read | Đúng scope, không lộ redemption khách khác. | M05,A01 |
| X-V04 | P0 | Bỏ/đổi voucher, hủy/expire/pay đồng thời | Một redemption live; RELEASED/CONSUMED đúng kết quả commit. | C02,C05,C08 |
| X-V05 | P1 | Voucher list trả response thật, HTTP403/500 hoặc mất mạng | Value/type/quota đúng contract; lỗi được phân biệt empty, không undefined/số sai. | M05 |
| X-P01 | P0 | HMAC sai/missing/malformed, duplicate query field, amount lệch | Từ chối; không SUCCESS/vé/điểm; có PaymentLog phù hợp. | C03 |
| X-P02 | P0 | Chỉ return hoặc query giả status=SUCCESS/amount/orderId người khác | Không chốt PAID, không truy cập vé người khác. | C03,A01 |
| X-P03 | P0 | IPN lặp/đồng thời, FAILED sau SUCCESS, khác gateway txn | Không downgrade/nhân đôi; mỗi khoản thu riêng có cách đối soát. | C03,C06 |
| X-P04 | P0 | Mất response POST pay, retry cùng key/different payload | Không tạo duplicate logical attempt; key khác nội dung bị xử lý theo hợp đồng, số tiền đúng. | C04 |
| X-P05 | P0 | Late IPN ghế trống/ghế bị mua/đơn hủy, thu lần hai | Theo policy đã chốt; giữ owner mới; refund theo payment; không mail vé giả. | C06 |
| X-P06 | P0 | Mock payment trong production, guest hoặc sai owner | Không cho thực thi. | C03,A01 |
| X-P07 | P1 | Poll kết quả timeout 2 phút/IPN sau đó/network retry/back-forward | Không tự chuyển sang FAILED/PAID; kiểm tra lại đọc server; không timer/request phiên cũ. | C03,C07 |
| X-C01 | P0 | Hủy tại start−2h±1ms; đã USED ít nhất một vé | Chỉ hủy khi đủ điều kiện; không hủy một nửa đơn trái policy. | C08 |
| X-C02 | P0 | Hai cancel cùng lúc/cancel tranh IPN/checkin | Một quyết định nguyên tử; REVERT/refund/quota một lần. | C04,C08 |
| X-C03 | P0 | Hai refunds cùng order/process một cái/retry/concurrency | Số tiền theo payment; không báo hoàn tất khi còn khoản pending. | C06,S03 |
| X-C04 | P1 | Thiếu reference/note/method/sai rạp/đã REFUNDED | Đúng validation/quyền; không dùng reference tự sinh làm bằng chứng chuyển tiền. | S03 |
| X-S01 | P0 | Signed QR từ UI/web/mail, sửa chữ ký/key version/case | Chữ ký thật giữ nguyên; giả/sai version từ chối. | S02 |
| X-S02 | P0 | Quét cùng vé hai máy, quét lại, vé CANCELLED/EXPIRED | Một USED; không tăng stats/history thành công trùng. | S02 |
| X-S03 | P0 | Vé sai rạp/sai suất, STAFF/MANAGER không gán | Từ chối; không mở scope rỗng thành toàn bộ. | S02,A01 |
| X-S04 | P1 | start−30m±1ms, start+15m±1ms; bypass không lý do/STAFF | Biên đúng; chỉ ngoại lệ quản lý đúng scope có audit. | S02 |
| X-S05 | P1 | CASH chưa thu/thu thiếu; POS/BANK_TRANSFER chưa xác nhận | Không ghi nhận paid như đã có chứng từ nếu chưa thu; gap UI/schema được ghi rõ. | S01 |
| X-S06 | P1 | Vé mua hôm qua cho hôm nay, hôm nay cho tuần sau, vé hủy, 00:00 VN | Tổng/đã soát/chưa soát cùng tập ngày/rạp đã chốt; ngày đúng UTC+7. | S02 |
| X-S07 | P1 | ADMIN mở trạm từ desktop/mobile; history limit0/âm/NaN/quá lớn | Điểm vào phù hợp quyền backend; limit validate/clamp đúng hợp đồng, không500. | S02,A01 |
| X-S08 | P0 | Audit insert lỗi sau bypass, retry/mất response | Admission và audit phải nhất quán; không báo lỗi rồi vé USED thiếu audit; không soát lần hai. | S02 |
| X-R01 | P0 | Lịch trùng trực tiếp/bao phủ/nằm giữa; cleaning 15m±1ms | Không overlap, cả hai buffer; tạo đồng thời một lịch hợp lệ. | M03 |
| X-R02 | P1 | Phòng mới không ghế, BLOCKED/COUPLE/lối đi, inactive | Không mở bán phòng rỗng, layout/capacity/snapshot đúng. | M02 |
| X-R03 | P0 | Sửa/hủy/ẩn khi có hold/paid/IPN đang chạy | Không phá vé đã bán; mọi khoản thu có vé hoặc refund. | M01,M03,M06 |
| X-R04 | P1 | TMDB timeout/401/trailer lỗi; double-submit; autofill cùng ID | Không tạo nửa dữ liệu, retry theo contract, có fallback CRUD. Dedupe theo TMDB ID phải chốt policy trước, không gán oracle chưa có. | M01 |
| X-R05 | P0 | Pricing/voucher/admin detail bỏ cinemaId/giả cinemaId | Không lộ dữ liệu quản trị ngoài rạp. | A01 |
| X-R06 | P0 | API protected bằng sai role/sai owner/token expired | 401/403 hoặc lỗi nghiệp vụ phù hợp, không mutation. | A01 |
| X-R07 | P0 | STAFF/customer member hủy COUNTER không manager | Theo quyền đã chốt GAP-08, audit rõ; không tự coi source hiện tại đúng spec. | S01,C08 |
| X-T01 | P0 | Paid ngày trước, suất trong kỳ; refund ngày khác; unfulfilled/thu trùng | Revenue/gross/refund/capacity đúng ba mốc thời gian. | R01 |
| X-T02 | P1 | from>to, 366/367 ngày, 00:00 VN, timezone máy khác | Validation/kỳ inclusive đúng, không lệch ngày. | R01 |
| X-T03 | P1 | MANAGER tab CINEMA, top date filter, filter rạp/phim/export | Theo scope và kỳ công bố, không làm mất dashboard khác. | R01 |
| X-T04 | P1 | CSV tiếng Việt, tên phim chứa dấu phẩy/newline/=SUM(...) | CSV parse đúng, tổng khớp; không công thức ngoài ý muốn. | R01 |
| X-O01 | P0 | Worker scan cũ gặp PAID, ghế chủ mới, hai worker | Không EXPIRED PAID, không nhả SOLD/BLOCKED hoặc ghế người khác. | O01 |
| X-O02 | P1 | >200 expired, scheduler dừng/restart, outbox chưa consumer | Drain đúng; phát hiện backlog; không coi trigger tay/dòng outbox là vận hành hoàn chỉnh. | O01 |
| X-U01 | P1 | Mobile 360px/tablet/desktop, browser timezone khác | Hoàn tất đặt/pay/history/checkin/admin không khuất action/giá/giờ; không gọi API thủ công để vượt UI. | Tất cả |
| X-U02 | P2 | Keyboard/focus/Escape/network loading/error/empty | Thao tác được, không double submit, đóng modal không làm mất xử lý tài chính. | Tất cả |

## 6. Các vòng xuyên phân hệ phải chạy trên hệ thống thật

| Vòng | Chuỗi bước theo thứ tự | Điều kiện khép kín | Chặn đã biết |
|---|---|---|---|
| E2E-01 | AUTH01 → M01 tạo/công bố phim → M02 tạo phòng/ghế → M04 giá → M03 suất → M05 combo/voucher → D01 → C01 → C02 → C03 → C07 → S02 → R01 | Người dùng mua và vào phòng được từ danh mục mới do quản lý tạo; report và tiền/điểm/voucher khớp. | GAP-01/02/03/04; không thay bước quản trị thiếu bằng seed để báo full PASS. Có thể có E2E core riêng dùng fixture đã có, ghi phạm vi khác. |
| E2E-02 | C03 paid → C08 hủy → S03 hoàn thủ công → C07 đọc trạng thái → C2 mua lại ghế → S02 → R01 | Vé cũ không dùng, tiền hoàn có chứng từ, ghế bán lại đúng, quota/điểm/report không trùng. | GAP-01/13. |
| E2E-03 | C01 hold → C05 expire → C2 mua → C06 late IPN/thu trùng → S03 xử lý từng payment → R01 | Không chiếm ghế C2; không mail vé giả; mọi khoản thu được phục vụ hoặc hoàn. | GAP-05/06/12/13. |
| E2E-04 | C01 pending + C03 paid → M06 hủy suất/ẩn phim → C07 → S02 từ chối QR cũ → S03 hoàn tất → R01 | Mọi đơn/suất liên quan có kết thúc; lịch sử giữ; không rò phạm vi M-A sang B. | UI hủy/ẩn scope/dispatch còn cần kiểm. |
| E2E-05 | S01 walk-in/member, ba method → phát/in vé → S02 → C07 member → R01 → S03 khi hủy đúng quyền | Quy trình thu ngân thực nhận tiền, cấp vé, nhận diện member và đối soát ca/kênh. | GAP-07/08 và UI quầy/ca/bàn giao combo chưa có. |
| E2E-06 | AUTH02 link email → login → C01 → token hết hạn/network retry → C03 → logout/login C2 → C07 ownership | Reset/refresh/phục hồi thực tế không mất đơn/không lộ vé; email URL dùng được. | GAP-10 và raw fetch từng module. |
| E2E-07 | A02 gán/khóa/config → A01 token đang tồn tại → C01/M03 theo cấu hình mới → audit | Quản trị tác động được tới quyền và nghiệp vụ, có log đầy đủ. | F15/F16 chưa đầy đủ, BLOCKED_IMPLEMENTATION. |
| E2E-08 | O01 scheduler/DB outage/restart/SMTP outage → C05/C06/S03/R01 | Job và notification phục hồi, không mất tiền/tài nguyên; biết pending nào cần nhân sự xử lý. | GAP-12/13, nghiệm thu vận hành riêng. |

## 7. Ma trận truy vết yêu cầu

### 7.1. FR và use case

| Yêu cầu | Kịch bản nghiệm thu | Trạng thái khi chuẩn bị |
|---|---|---|
| FR-01, FR-02 / UC01 | AUTH01–03, X-A01–05, E2E-06 | Chờ chạy; link email/session phải kiểm thực. |
| FR-03, FR-04, FR-05 / UC02–03 | D01, M01, E2E-01 | Chờ chạy; đường công bố phim mới có gap. |
| FR-06, FR-07, FR-08 / UC04 | C01,C05, X-B01–08 | Chờ chạy API concurrency + browser hai phiên. |
| FR-09, FR-10 / UC04 | C02,M05, X-V01–04 | Chờ chạy, UI quản lý ưu đãi còn thiếu. |
| FR-11, FR-12 / UC05 | C03–06,S02, X-P01–07 | Chờ chạy; local callback và gateway ngoài tách bằng chứng. |
| FR-13, FR-14 / UC06–07 | C07,C08,S03, E2E-02/03 | Chờ chạy; history contract/hoàn thực cần ưu tiên. |
| FR-15 / UC10 | S01, X-S05,X-R07,E2E-05 | API có, UI quy trình quầy chưa hoàn chỉnh. |
| FR-16 / UC11 | S02, X-S01–04 | Chờ chạy; QR signed UI có gap, camera chưa có. |
| FR-17 / UC12 | M01,M06 | CRUD/công bố/khôi phục/genre UI chưa đủ. |
| FR-18 / UC13 | M02 | Tạo sơ đồ ghế/phòng mới chưa khép kín. |
| FR-19 / UC14 | M03,M06 | Chờ API; UI sửa/hủy chưa đủ. |
| FR-20 / UC15 | M04,C02 | Chờ chạy; scope đọc pricing cần kiểm. |
| FR-21 / UC16 | M05 | Chờ API; CRUD voucher UI chưa đủ. |
| FR-22 / UC17 | R01,E2E-01…05 | Chờ chạy, filter/top/counter/report scope cần chốt. |
| FR-23 / UC18 | A02,A01,E2E-07 | NOT_IMPLEMENTED đầy đủ; Must không được bỏ. |
| FR-24, FR-25 / UC19 | A02,M04,M06,S02,S03 | Config/audit UI thiếu; log ở từng module kiểm riêng. |
| FR-26 | C03,C08,S01,C06 | Chờ đối soát EARN/REVERT từng order. |
| FR-27 / UC08 | FUT-01: khách có history → gợi ý → đặt; ML lỗi có fallback | Could, NOT_IMPLEMENTED; chỉ chạy khi nhận phạm vi. |
| FR-28 / UC09 | FUT-02: vé USED → rating/comment → hiển thị/moderation; chưa USED bị chặn | Could, NOT_IMPLEMENTED; model Review không là bằng chứng chức năng. |

### 7.2. BR và NFR

| Yêu cầu | Bằng chứng đích |
|---|---|
| BR-01, BR-02, BR-03 | C01,C05,S01,X-B01–03/06,O01: độc quyền ghế/deadline/guard. |
| BR-04, BR-05, BR-16 | C02,M04,R01,F-MONEY,X-B08/X-V01: giá/hiệu lực/VND nguyên. |
| BR-06, BR-07 | M03,C01,S01,X-B04/05: tuổi/phim C/cutoff. |
| BR-08, BR-12 | C08,C06,S03,X-C01–03: điều kiện hủy/điểm/thu chưa fulfill. |
| BR-09 | C02,M05,X-V01–04: scope/min/quota/cap/1 voucher. |
| BR-10 | M03,X-R01: runtime/cleaning/tranh lịch. |
| BR-11 | C03,S02,X-S01–04: vé per slot/QR ký/one use. |
| BR-13, BR-14 | M01,M03,M06,E2E-04: không hard delete/hủy có vé/hoàn từng khoản thu. |
| BR-15 | A01,M02,M05,R01,S03,X-R05–07: role/owner/current cinema scope. |
| NFR-01 | X-B02/03,X-P03,X-C02,X-S02,X-R01,X-O01: tranh chấp MySQL thật, không sleep ngẫu nhiên để giả lập. |
| NFR-02 | D01/C01: danh mục <3s và update ghế 5–10s theo đặc tả trong điều kiện staging đã ghi; thêm đo p95/tải cao với mục tiêu được duyệt. |
| NFR-03, NFR-04 | AUTH02/03,A01,X-P01–06: password/token/RBAC/chữ ký/idempotency. |
| NFR-05 | C05/C06/O01: job thực và callback muộn không mất khoản thu. |
| NFR-06 | X-U01/02: thiết bị, responsive và thao tác người dùng. |
| NFR-07 | X-A/B input, hợp đồng API/UI thực trong C07/R01; build/lint; không lấy folder architecture làm PASS nghiệp vụ. |
| NFR-08 | A02,M04,M06,S02,S03: audit các thao tác quan trọng. |
| NFR-09 | D01,C07,M04,R01,X-T01/02: UTC lưu/UTC+7 UI,email,báo cáo. |

## 8. Test có sẵn và phần cần bổ sung

Tên file là nơi đối chiếu/rerun, **không khẳng định suite đã bao phủ đủ mọi bước trong kế hoạch**.

| Nhóm | Test/script hiện có | Bằng chứng còn phải bổ sung |
|---|---|---|
| Auth/profile | Backend `auth.test.ts`, `auth-profile.test.ts`, `auth-security*.test.ts`, `google-auth.test.ts`, `mail-service.test.ts`; frontend `auth-*.test.tsx`, `user-profile.test.tsx` | Email URL/SMTP/domain thật; Google thật; logout/switch/expired token ở history/checkin/report. |
| Discovery/hold | `movies-cinemas.test.ts`, `booking-hold.test.ts`, `core.integration.test.ts`; frontend `discovery`, `seat-selection`, `app-booking`, `checkout`, `api` | Hai phiên browser, 10 phút thật, fixture danh mục mới tạo UI, layout/COUPLE trên thiết bị. |
| Payment/vé/history | `booking-payment`, `payment-security`, `vnpay-adapter`, `idempotency-and-export`; frontend `payment-result`, `tickets` | VNPay sandbox ngoài; history DTO thật; QR web/email; late/duplicate email sai trạng thái; E2E-02/03. |
| Quầy/checkin/worker | `checkin-history-worker`, `checkin-advanced`, `core.integration`; frontend `checkin` | Signed QR đi qua input UI; camera/print; toàn quy trình quầy; scheduler/backlog/dispatcher. |
| Danh mục/suất/giá | `catalog-management`, `admin-lifecycle-pricing`, `showtimes`, `showtime-management`, `cinema-scope`; frontend `admin-management` | Tạo phim→mở bán; phòng mới→ghế→suất; UI sửa/hủy/khôi phục; manager global deactivation. |
| Combo/voucher | Backend `combos-vouchers-reports.test.ts`, `voucher-combo-management.test.ts`, `cinema-scope.test.ts`; frontend `checkout.test.tsx`, `admin-management.test.tsx` | CRUD UI, voucher DTO thật, scope detail/list không filter; giữ/tiêu/trả lượt trong browser và hủy hàng loạt. |
| Refund/report | `refund-management`, `report-scope`, `idempotency-and-export`; frontend `reports`, `admin-management` | Hai refunds cùng order; reference thực; UI/history refresh; top date filter, MANAGER tab CINEMA, CSV đối soát. |
| Vận hành | `operational-readiness`, `test-environment`, `e2e-diagnostics`; `.github/workflows/ci.yml` | Scheduler/DB outage/restart, SMTP retry, migration/backup/restore/rollback staging nếu nghiệm thu phát hành. |
| Browser core | `backend/scripts/stage1-browser-e2e.cjs`, lệnh `npm run test:e2e` | Script hiện có chỉ chặng 1, không thay E2E-01…08; callback ký local không thay gateway ngoài. |

Khi bổ sung test, ưu tiên assertion độc lập; test component dùng response thật đã ghi hoặc hợp đồng thật, không tạo fixture thêm trường UI cần mà API không có. Concurrency test dựng điểm giao nhau xác định với transaction DB thật; không chỉ tăng timeout khi có race.

## 9. Thứ tự thực hiện và đầu ra từng đợt

Có thể chia người đọc/test các nhóm độc lập, nhưng mỗi DB có một người giữ quyền chạy reset; vòng E2E liên vai trò dùng chung runId và chạy tuần tự.

| Đợt | Việc cần làm | Đầu ra / gate để qua đợt |
|---|---|---|
| T0 | Chốt scope Must/Should, GAP-06/08/14/15, dữ liệu/giá/timezone, method thu/hoàn, COUPLE, SLA job; chuẩn bị DB/mailbox/staging | Oracle phiên bản hóa, fixture và checklist quyền; các quyết định chưa chốt vẫn BLOCKED_SPEC. |
| T1 | Tái hiện GAP-01…05,09; AUTH/D01/C01/C03/C07/S02/M01/M02 | Phiếu bug với actual/expected/source/requestId. Không chờ chạy hết mới báo đứt đường cốt lõi. |
| T2 | API integration từng module + biên/tranh chấp mục 5, component contract | Báo cáo case/requirement; sửa lỗi theo scope công việc sau, retest case gốc và nhóm liên quan. |
| T3 | Browser thật hai customer + STAFF/MANAGER/ADMIN, E2E-01…07 | Trace/ảnh/DB snapshot/report, trạng thái từng bước; phần thiếu UI ghi blocked. |
| T4 | VNPay sandbox HTTPS/IPN, Google/SMTP/TMDB, camera/in vé, hoàn thủ công, scheduler E2E-08 | Chứng từ ngoài + dữ liệu server khớp; không dùng mock để đạt gate dịch vụ thật. |
| T5 | Rerun các luồng bị tác động sau sửa, gate build/lint/test/coverage/E2E, review report UAT | Bảng tổng hợp PASS/FAIL/BLOCKED/NOT_IMPLEMENTED, rủi ro còn lại và quyết định nghiệm thu theo scope. |

### 9.1. Các lệnh kiểm chứng khi bước sang thực thi

Chạy từ root repo theo thứ tự. Dependencies đã có thì chỉ `npm ci` khi cần môi trường tái lập; không cài lại liên tục. DB dành riêng test theo [TESTING.md](../../TESTING.md).

```powershell
# Chuẩn bị dependencies/client khi cần
npm ci
npm exec --workspace=backend -- prisma generate

# Gate kỹ thuật, không thay UAT
npm run build:backend
npm run build:frontend
npm run lint --workspace=frontend

# Runner này RESET database _test; không có browser/worker đang dùng DB đó
npm run test:coverage

# Sau khi DB chuẩn bị xong, browser chặng 1 chạy tuần tự, không reset đồng thời
npm run test:e2e
```

Ngưỡng coverage hiện cấu hình: backend lines≥90% / branches≥80%; frontend lines≥75% / branches≥70%. Đây là regression gate, không phải 100% nghiệp vụ. Khi cần Chromium mà chưa có, chuẩn bị trước theo `docs/stage1-e2e-notes.md`; không xem thiếu browser/network merchant là test PASS.

Chạy riêng file sau khi DB đã chuẩn bị, không reset giữa một chuỗi E2E:

```powershell
npm exec --workspace=backend -- vitest run tests/core.integration.test.ts
npm exec --workspace=backend -- vitest run tests/refund-management.test.ts
npm exec --workspace=frontend -- vitest run tests/tickets.test.tsx
npm exec --workspace=frontend -- vitest run tests/checkin.test.tsx
```

### 9.2. Quy tắc bằng chứng và mẫu ghi kết quả

Mỗi case/biến thể là một dòng kết quả; một case có bước FAIL/BLOCKED thì toàn luồng không PASS.

```text
Run ID / ngày giờ UTC+7 / commit hoặc snapshot workspace:
Case ID + biến thể / actor / rạp / thiết bị / môi trường:
Rule FR/BR/NFR / oracle version:
Tiền điều kiện và fixture ID:
Bước / input / expected / actual / PASS|FAIL|BLOCKED:
orderId / paymentId / showtimeId / ticketCode / refundId / requestId:
Bằng chứng: ảnh/trace, response đã che bí mật, DB trước-sau, CSV, chứng từ test:
Kết quả luồng: NOT_RUN|PASS|FAIL|BLOCKED_SPEC|BLOCKED_IMPLEMENTATION|BLOCKED_ENV:
Bug ID / mức độ / người phụ trách / bước retest:
Cleanup: còn hold/payment/refund/outbox pending nào, có hợp lệ theo case không:
```

Lưu artifact theo `artifacts/business-flow-uat/<runId>/<caseId>/`; lọc token/cookie/password/URL ký/QR của khách thật. Báo cáo tổng hợp phải có **tỷ lệ thực chạy**, **tỷ lệ PASS trong scope**, **coverage FR/BR**, và danh sách blocked/unimplemented; không cộng blocked vào passed.

## 10. Tiêu chí hoàn thành kiểm thử và nghiệm thu

- [ ] Tất cả FR Must có luồng người dùng thực thi được; phần thiếu F10/F15 hoặc đường mở bán không được miễn bằng test API thành phần.
- [ ] Tất cả P0 và P1 trong scope đã chạy, không còn FAIL/BLOCKED; quyết định thay đổi scope/chính sách được ghi rõ nếu có.
- [ ] Mỗi luồng chính mục 4 có bản ghi từng bước và chứng minh C1–C8 áp dụng; mỗi vòng mục 6 có cùng ID xuyên các vai trò.
- [ ] Mọi khoản payment SUCCESS có đơn/vé fulfill hợp lệ hoặc refund được theo dõi đến chứng từ hoàn; không còn khoản thu không được giải thích.
- [ ] Không có oversell, ticket/point/refund trùng, quota vượt giới hạn, quyền ngoài rạp hoặc state UI khác server.
- [ ] History, QR signed, tạo phim/phòng mới, cancel/refund/report được chạy qua UI thật với API thật, không dùng fixture che hợp đồng.
- [ ] Gate build/lint/test/coverage/browser được chạy mới; có log kết quả và giới hạn của gateway local so với sandbox ngoài.
- [ ] Nếu nghiệm thu vận hành/phát hành: SMTP/Google/VNPay/QR thiết bị/scheduler/recovery đạt; backup/restore/rollback có bằng chứng theo scope triển khai.
- [ ] Báo cáo cuối liệt kê case chưa chạy, chức năng chưa có, quyết định còn thiếu và người xác nhận nghiệp vụ; không tuyên bố “các luồng đã khép kín” khi còn những mục này.

**Kết quả của lượt lập kế hoạch:** kế hoạch sẵn để dùng cho kiểm thử và tái hiện các GAP. **Kết quả vận hành của các luồng vẫn là NOT_RUN** cho tới khi có bằng chứng thực thi mới.
