# Chặng 1 — Luồng khách hàng và thanh toán

Ngày thực hiện: 04/10/2026. Phạm vi: Discovery → chọn suất cụ thể → giữ ghế → checkout trên cùng đơn → kết quả thanh toán dựa trên server.

## Hành vi đã triển khai

1. Discovery lấy phim, rạp và suất từ API. Có tìm kiếm, phân trang, phim đang/sắp chiếu, chọn rạp và 7 ngày theo giờ Việt Nam. Chọn phim/rạp/ngày mới xóa dữ liệu con; request cũ bị hủy và không ghi đè lựa chọn hiện tại. Có loading, lỗi, thử lại và dữ liệu rỗng. Không tự chọn suất đầu tiên.
2. Sơ đồ ghế poll tuần tự mỗi 5 giây. Sau đăng nhập và xác nhận tuổi với phim hạn tuổi, chọn ghế đầu tạo đơn giữ chỗ ngay; thêm/bỏ ghế sửa cùng đơn. Chỉ hiển thị lựa chọn được server xác nhận. Bỏ ghế cuối hoặc đóng modal hủy với `pendingOnly`; hủy thất bại giữ thông tin để thử lại. Có khôi phục đơn pending và deadline server. Poll cũ không ghi đè mutation mới; đổi phiên không đưa dữ liệu cũ trở lại.
3. Checkout nhận đơn đã giữ, không tạo đơn thứ hai. Combo/voucher cập nhật đơn qua PATCH; số tiền và thời hạn lấy từ response server. Retry thanh toán dùng cùng orderId, kiểm tra trạng thái khi mất phản hồi; không sửa lựa chọn khi giao dịch đang PENDING. Mã đơn được lưu trước redirect.
4. `/payment/result` chỉ dùng UUID orderId để tra cứu đơn của tài khoản đã đặt. Query status, số tiền và mã cổng thanh toán không xác định thành công. Poll mỗi 5 giây, tối đa 2 phút, có kiểm tra lại. Chỉ hiện vé khi server xác nhận PAID và đã cấp đủ mã vé. Hết hạn, hủy và PAID_UNFULFILLED có thông báo riêng. Chờ khôi phục đăng nhập, abort khi đổi trang/đơn/tài khoản; vé và lịch chiếu hiển thị giờ Việt Nam.

## API thực tế trong chặng này

`PATCH /api/v1/orders/:id` cần Bearer token của chính chủ đơn; chỉ sửa PENDING_PAYMENT còn hạn và chưa có payment PENDING.

```json
{
  "seatIds": ["UUID ghế vật lý"],
  "ageConfirmed": true,
  "combos": [{ "comboId": "UUID", "quantity": 1 }],
  "voucherCode": "CINEX20"
}
```

Mọi trường đều tùy chọn; bỏ trường giữ nguyên giá trị. `seatIds` có 1–8 UUID không trùng, không dùng ID slot. `combos: []` bỏ combo, `voucherCode: null` bỏ voucher. Response giống GET/Create Order đang triển khai. Ghế/combo giữ lại dùng giá snapshot; ghế thêm lấy giá cấu hình hiện tại. Deadline tuyệt đối không gia hạn. Lỗi: 403 không đúng chủ, 409 trạng thái không hợp lệ/thanh toán đang chờ/ghế bị chiếm, 410 hết hạn, 400 input không hợp lệ. Khóa order dùng chung với khởi tạo VNPay; claims/releases và voucher quota nguyên tử trong MySQL.

`GET /api/v1/showtimes/:id/seats` vẫn public, hỗ trợ Bearer token tùy chọn. Mỗi ghế bổ sung `heldByCurrentUser: boolean`; không trả ID của người/đơn khác. Hold hết hạn có trạng thái hiệu lực AVAILABLE; ghế BLOCKED không mở bán. Khôi phục bằng GET `/orders/pending?showtimeId=...`, sau đó đọc trạng thái hiện tại bằng GET `/orders/:id`.

OpenAPI hiện đánh dấu 14 operation chặng 1 đã đối chiếu mã nguồn bằng `x-implementation-status=implemented` và dùng 35 schema `Stage1*`. Các operation `design` và schema cũ vẫn giữ thiết kế rộng hơn, không chứng minh mọi API dự kiến đã hoàn thành. Xem mục 0 trong [hợp đồng API](05-thiet-ke-api.md) và [openapi.json](openapi.json).

## Kiểm chứng và giới hạn

Gate mới nhất ngày 04/10/2026 sau khi bổ sung CI: **410/410 backend + 140/140 frontend = 550/550 kiểm thử đạt**. So với 537 test lúc hoàn thành luồng chặng 1, thêm 13 regression cho guard DB máy CI sạch và chẩn đoán E2E an toàn. Coverage backend **94,33% dòng / 82,35% nhánh**; frontend **89,31% dòng / 80,73% nhánh**. Cả hai vượt gate hiện có, không giảm ngưỡng hoặc loại module chưa test. Build backend/frontend đạt; lint frontend không lỗi, còn 12 cảnh báo React cần dọn tiếp.

Bộ test gồm API Express/MySQL thật với UUID riêng, component React/AuthProvider/API thật với network fixtures, và script Chromium dùng backend/MySQL test thật. Database test có hậu tố `_test`; runner từ chối tên database nguồn. Không sửa/reset database phát triển để chạy chặng này. Coverage không phải 100% nhánh, cũng không chứng minh mọi chức năng dự kiến hoặc tải cao đã được nghiệm thu.

Kiểm chứng callback local ký độc lập chứng minh luồng giữ ghế/đơn/payment/IPN/return/polling/cấp vé. Giao dịch trên cổng VNPay sandbox bên ngoài với thông tin merchant và return/IPN URL công khai vẫn phải nghiệm thu trên staging trước phát hành. Worker định kỳ, HTTPS/secrets, đối soát/hoàn tiền thực và các chức năng còn thiếu khác nằm trong PRODUCTION_READINESS.md. Chặng 1 không triển khai production.
