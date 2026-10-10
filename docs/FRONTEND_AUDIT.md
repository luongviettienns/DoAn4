# Code Review

Ngày rà soát: 03/10/2026. Phạm vi: `frontend/src`, đối chiếu yêu cầu Must/Should trong `01-tong-quan-va-yeu-cau.md`, luồng `02-luong-chuc-nang.md`, màn hình `03-mo-ta-man-hinh.md` và hợp đồng `05-thiet-ke-api.md`.

**Kết luận: frontend hiện là bản demo có một số luồng tương tác; chưa đủ điều kiện bàn giao sản phẩm theo phạm vi Must đã ghi trong tài liệu.** Build thành công và kiểm thử đạt không đồng nghĩa các màn hình/chức năng chưa triển khai đã hoàn tất.

Found 7 urgent issues that need to be fixed:

## 1. [P1] Danh mục phim và lựa chọn suất chiếu chưa nối với dữ liệu thật

FilePath: `frontend/src/components/Hero.tsx` line 3; `frontend/src/components/Hero.tsx` line 233; `frontend/src/components/NowShowingSection.tsx` line 51; `frontend/src/App.tsx` line 52.

Hero và danh sách phim dùng `FEATURED_MOVIES` từ `mockMovies.ts`. Rạp/ngày/giờ trong thanh đặt nhanh là option cố định. Gửi form gọi `onOpenSeatMap()` không truyền suất đã chọn; App mở suất đầu tiên từ API. Do đó phim/rạp/giờ khách nhìn thấy có thể khác đơn thực tế. Tab Sắp chiếu chỉ đổi giao diện nút; vẫn render cùng danh sách. Nút Đặt vé nhanh trên thẻ phim chưa có handler. FR-03 đến FR-05 chưa hoàn tất.

### Suggested fix

Nạp `/movies`, `/cinemas`, `/showtimes` theo bộ lọc; giữ `showtimeId` thật và truyền chính xác qua luồng đặt vé. Bổ sung chi tiết phim, tìm kiếm, lọc và trạng thái không có suất. Kiểm thử từ lựa chọn phim/rạp/ngày tới snapshot đơn đúng dữ liệu đã chọn.

---

## 2. [P1] Chưa có luồng nhận kết quả VNPay

FilePath: `frontend/src/App.tsx` line 17; `frontend/src/components/CheckoutModal.tsx` line 265.

Checkout chuyển trình duyệt tới `paymentUrl`, nhưng App không đọc đường dẫn `/payment/result`, `orderId`, trạng thái trở về hoặc tải/poll đơn. Khi quay lại, SPA hiển thị trang chủ và mất trạng thái đặt vé. Chưa có giao diện đang xác nhận, thất bại/hủy, PAID_UNFULFILLED hoặc hướng dẫn hoàn tiền. Chưa thực hiện FR-11 đầy đủ.

### Suggested fix

Triển khai trang kết quả có URL cố định; xác thực người dùng rồi GET trạng thái đơn từ backend, polling có giới hạn khi chờ IPN. Hiển thị vé chỉ khi backend xác nhận PAID; xử lý PAID_UNFULFILLED và lỗi thanh toán riêng. Chạy E2E với return/IPN thật hoặc sandbox trước khi bàn giao.

---

## 3. [P1] Sơ đồ ghế chưa cập nhật realtime và giữ ghế quá muộn

FilePath: `frontend/src/components/SeatMapModal.tsx` line 65; `frontend/src/components/SeatMapModal.tsx` line 117; `frontend/src/components/CheckoutModal.tsx` line 220.

Sơ đồ chỉ fetch một lần khi đổi `showtimeId`, không polling 5–10 giây, không bỏ chọn ghế vừa bị người khác lấy. Ghế vẫn chỉ là lựa chọn cục bộ khi mở checkout; đơn/hold chỉ được tạo khi nhấn Thanh toán ngay. Tọa độ `x/y/columnSpan` chưa được dùng đầy đủ để dựng lối đi/sơ đồ theo phòng. Chưa đạt FR-06 và phần UX của FR-08.

### Suggested fix

Tạo hoặc phục hồi đơn pending khi bấm Tiếp tục; dùng `expiresAt` và số tiền của đơn từ server cho toàn checkout. Poll sơ đồ và xử lý ghế không còn; dựng bản đồ theo tọa độ/lối đi. Thử cạnh tranh giữ cùng ghế bằng hai phiên trình duyệt.

---

## 4. [P1] Tài khoản chưa đủ các chức năng Must và hợp đồng phiên

FilePath: `frontend/src/components/AuthModal.tsx` line 5; `frontend/src/context/AuthContext.tsx` line 19; `frontend/src/services/api.ts` line 105; `frontend/src/components/MyTicketsDrawer.tsx` line 28.

Chỉ có đăng nhập/đăng ký/đăng xuất; chưa có quên/đặt lại mật khẩu, hồ sơ và đổi mật khẩu. Refresh vừa bổ sung chỉ khôi phục phiên lúc mount; các request bảo vệ dùng `fetch` trực tiếp chưa tự refresh/retry khi access token hết hạn trong phiên. Single-flight chỉ trong một tab; chưa phối hợp nhiều tab. Access token vẫn lưu localStorage; chưa bootstrap/gửi CSRF theo hợp đồng API. FR-01, FR-02 và hợp đồng auth chưa hoàn tất.

### Suggested fix

Hoàn thiện các màn hình tài khoản và route guard. Dùng một API client cho mọi request bảo vệ, retry tối đa một lần sau refresh, phối hợp rotation giữa tab, giữ access token trong bộ nhớ và nối CSRF với backend. Kiểm thử cookie/CORS/CSRF trên domain triển khai thực tế.

---

## 5. [P1] Thiếu các màn hình quản trị bắt buộc

FilePath: `frontend/src/App.tsx` line 142.

Khu vực quản lý mới có modal báo cáo. Không có giao diện CRUD phim/thể loại, rạp/phòng/sơ đồ ghế, suất chiếu, bảng giá hoặc quản lý người dùng/phân quyền. Đây là FR-17 đến FR-20 và FR-23 được ghi Must. Không thể đánh dấu hoàn thành chỉ vì backend có endpoint.

### Suggested fix

Hoàn thiện từng màn hình quản trị theo đặc tả, có bộ lọc/phân trang, validate, kiểm quyền/rạp, xác nhận thao tác và trạng thái tải/lỗi/rỗng. Kiểm thử đầy đủ thao tác thêm/sửa/xóa và các ràng buộc có đơn/vé liên quan.

---

## 7. [P1] Chưa phục hồi đơn đang dở và chưa có luồng hủy/hoàn trong lịch sử

FilePath: `frontend/src/components/MyTicketsDrawer.tsx` line 28; `frontend/src/components/MyTicketsDrawer.tsx` line 169; `frontend/src/components/CheckoutModal.tsx` line 59.

Lịch sử chỉ mở QR cho đơn PAID; chưa cho tiếp tục/hủy pending, xem toàn bộ trạng thái/chi tiết đơn, preview chính sách hủy vé hoặc tình trạng hoàn. Checkout nhớ đơn vừa tạo trong state của modal để retry, nhưng reload/unmount mất state và không GET `/orders/pending` để khôi phục. FR-13 còn thiếu; FR-14 chưa có giao diện.

### Suggested fix

Dùng URL/orderId để đơn có thể mở lại, đồng bộ pending từ backend, phân trang lịch sử và trình bày đủ trạng thái. Hủy paid cần preview chính sách + xác nhận riêng; đóng checkout chỉ hủy pending qua điều kiện backend `pendingOnly` để tránh hủy vé vừa được thanh toán cạnh tranh.

---

## 8. [P1] QR chưa dùng payload có chữ ký theo hợp đồng

FilePath: `frontend/src/components/TicketModal.tsx` line 153; `frontend/src/components/StaffCheckinModal.tsx` line 73.

QR hiện chứa `ticketCode` thô; API detail chưa cấp `qrPayload` có chữ ký cho frontend. Soát vé chỉ nhập mã; chưa có camera QR, lọc suất hoặc cảnh báo mất mạng như đặc tả. Việc đã bỏ QR tự bịa cho vé chưa phát hành không giải quyết hợp đồng chữ ký và luồng quét thật.

### Suggested fix

Backend cấp payload ký và xác minh ở checkin; frontend encode đúng payload đó. Bổ sung quét camera/nhập mã tay và quyền/rạp theo hợp đồng, kiểm QR bị sửa, vé dùng/hủy/sai suất và quét đồng thời. Kiểm in QR và camera bằng thiết bị thực tế.

---

Found 2 suggestions for improvement:

## 1. [P2] Điều hướng và khả năng dùng modal bằng bàn phím còn thiếu

FilePath: `frontend/src/components/Header.tsx` line 57; `frontend/src/components/AuthModal.tsx` line 43; `frontend/src/components/CheckoutModal.tsx` line 278.

Các anchor `#cinemas`, `#combos`, chính sách footer chưa có nội dung đích. Nút tìm kiếm/chọn thành phố chưa có handler. Modal chưa có `role=dialog`, `aria-modal`, quản lý focus/trả focus hoặc Escape; nhiều label chưa gắn input và nút cộng/trừ combo thiếu tên truy cập. Mobile menu chưa cung cấp đủ lối vào chức năng tài khoản/nhân viên.

### Suggested fix

Nối menu tới nội dung/route đã triển khai; dùng dialog có focus trap và tên truy cập, gắn label với input, đặt aria-label cho nút biểu tượng. Kiểm bằng bàn phím và màn hình mobile trước khi nghiệm thu.

---

## 2. [P2] Múi giờ hiển thị và địa chỉ API cần kiểm chứng khi triển khai

FilePath: `frontend/src/components/TicketModal.tsx` line 49; `frontend/src/components/MyTicketsDrawer.tsx` line 106; `frontend/src/services/api.ts` line 1.

Định dạng `vi-VN` không tự ép múi giờ Việt Nam: `toLocaleTimeString` đang dùng timezone máy khách. API mặc định là localhost; build thiếu biến cấu hình sẽ gọi máy khách thay vì server triển khai. Chưa có E2E trên HTTPS/domain thật để chứng minh cấu hình cookie và gateway.

### Suggested fix

Chỉ định `timeZone: 'Asia/Ho_Chi_Minh'` trong formatter dùng chung, thử trình duyệt ở timezone khác. Cấu hình API cùng origin hoặc URL triển khai trong CI; smoke test domain production có HTTPS/cookie/return URL.

---

## Các lỗi đã sửa và được tái hiện bằng regression test

- **Đã sửa mục 6 [P1], lựa chọn thanh toán production:** checkout mặc định `VNPAY`; chỉ hiển thị/thực thi `INSTANT_MOCK` khi `DEV`, không phải `PROD` và `VITE_ENABLE_MOCK_PAYMENT=true`. `.env.example` mặc định false. Ba kiểm thử đã đỏ trước khi sửa và nay xác nhận nhánh VNPay mặc định, mock bị ẩn trong production kể cả cờ true, và dev không bật cờ thì không có mock. Đây là bằng chứng chọn đúng nhánh frontend; không chứng minh gateway thật/return/IPN đã hoàn tất.
- API trả HTML/HTTP lỗi cho thông báo nghiệp vụ phù hợp; logout HTTP thất bại không báo thành công.
- Khôi phục phiên cookie/expired access lúc tải app, refresh single-flight trong tab, giữ token khi mất mạng và bỏ phản hồi account cũ sau logout.
- Ghế BLOCKED bị vô hiệu hóa; giữ giới hạn 8 ghế, tổng theo giá backend và chọn/bỏ chọn.
- Hook checkout không còn phụ thuộc `isOpen`; xác nhận độ tuổi mặc định chưa chọn.
- Đồng hồ hold chỉ xuất hiện sau khi tạo đơn và tính từ `expiresAt`; tổng đã có đơn lấy từ backend; retry thanh toán sử dụng lại đơn.
- Đóng checkout kiểm lại trạng thái server và gửi hủy chỉ-pending; lỗi hủy giữ modal mở. Phản hồi thanh toán chưa đủ để tự hiển thị vé khi detail chưa xác nhận PAID.
- Bỏ QR/mã vé tự bịa; USED/CANCELLED không còn được gắn nhãn sẵn sàng soát.
- Lỗi HTTP lịch sử/báo cáo không còn bị đổi thành trạng thái không có dữ liệu; ADMIN không hiện nút soát vé theo hợp đồng đã viết.

## Bằng chứng kiểm thử và giới hạn

`npm run test:coverage --workspace=frontend`: **66/66 tests, 9 files đạt** với Vitest/jsdom/Testing Library. Test chạy API client, AuthProvider và component thật; chỉ thay network bằng response fixture. Không thay production component thành mock. Fixtures dùng seat/order/snapshot/ticket/checkin/report cụ thể, kỳ vọng tính bằng dữ liệu literal. Các regression phía trên đã được chạy đỏ trước khi sửa. Có thêm 10 test form AuthModal: chuyển tab, đăng nhập/đăng ký thành công cập nhật user/token và đóng modal, email/SĐT không hợp lệ, lỗi server, retry, trạng thái đang xử lý và đăng xuất trước phản hồi login muộn. Coverage đo toàn bộ `src`, loại trừ `main.tsx`, assets và file khai báo type; không đặt ngưỡng để che phần UI chưa kiểm thử.

| Phạm vi | Lines | Branches |
|---|---:|---:|
| Toàn frontend | 76.13% | 71.17% |
| API client | 100.00% | 72.22% |
| AuthContext | 100.00% | 86.36% |
| AuthModal | 96.77% | 92.30% |
| Checkout | 85.10% | 71.68% |
| SeatMap | 88.05% | 81.96% |
| MyTickets | 96.55% | 86.84% |
| TicketModal | 90.90% | 100.00% |
| StaffCheckin | 97.67% | 69.23% |
| Reports | 93.02% | 69.84% |

Những test này chưa chứng minh: E2E browser với backend thật, VNPay return/IPN thật, camera/QR/print bằng thiết bị, cookie/CORS/CSRF nhiều domain, multi-tab và race DB. Không thực hiện thanh toán hoặc thay đổi DB trong bộ test frontend. App, AuthModal, Hero và danh mục mẫu chưa có kiểm thử end-to-end; toàn bộ chức năng chưa triển khai ở phần trên vẫn phải hoàn thiện trước nghiệm thu sản phẩm.

Chạy lại: `npm test --workspace=frontend`, `npm run test:coverage --workspace=frontend`, `npm run build --workspace=frontend`, `npm run lint --workspace=frontend`. Coverage HTML nằm tại `frontend/coverage/index.html`.

Lần xác minh cuối của frontend: test thường và coverage đều đạt 66/66; build `tsc -b && vite build` exit 0; lint exit 0, **0 lỗi và 13 cảnh báo** (React effects, purity, Fast Refresh). `git diff --check -- frontend` exit 0. Các cảnh báo hiện còn phải xử lý nếu chính sách bàn giao yêu cầu không có warning. Source đã được kiểm thêm theo failure modes/cleanup: interval có cleanup; refresh promise được nhả khi lỗi; logout chặn phản hồi phiên cũ; đóng checkout không được phép hủy paid sau race nhờ backend kiểm `pendingOnly`. Gate giữ baseline thêm ngày 04/10: lines ≥75%, branches ≥70%, chưa thay thế nghiệm thu đầy đủ sản phẩm.
