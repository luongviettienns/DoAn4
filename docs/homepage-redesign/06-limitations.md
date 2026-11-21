# 06 — Giới Hạn Hệ Thống & Giải Pháp Thay Thế Trung Thực (Limitations & Honest Alternatives)

> Ghi nhận các giới hạn từ phía Backend / Cơ sở dữ liệu hiện tại theo mục `§1.4` và giải pháp trung thực đã triển khai trên trang chủ (tuyệt đối không dùng mockup chết hoặc bịa đặt số liệu).

---

## 1. Các Giới Hạn Backend / Dữ Liệu & Giải Pháp Đã Áp Dụng

| Hạng mục mong muốn | Trạng thái Backend / DB hiện tại | Giải pháp trung thực đã triển khai trên Trang chủ |
|---|---|---|
| **1. Công nghệ phòng chiếu `ScreenX 270°` & `Gold Class VIP`** | Trong `backend/prisma/schema.prisma`, enum `RoomFormat` chỉ hỗ trợ `TWO_D`, `THREE_D`, `IMAX`; enum `SeatType` chỉ hỗ trợ `STANDARD`, `VIP`, `COUPLE`. Không có dữ liệu `ScreenX` hay `Gold Class`. | Đã gỡ bỏ hoàn toàn các tuyên bố `ScreenX 270°`, `Gold Class VIP` và 3 ảnh stock Unsplash ngoài. Thay bằng **Sân khấu Kiến trúc Phòng chiếu & Khám phá 3 Hạng ghế tương tác** (`Standard +0 ₫`, `VIP Trung tâm +20.000 ₫`, `Ghế Đôi Sweetbox +40.000 ₫`) cùng 3 định dạng phòng thật (`IMAX`, `3D`, `2D`). |
| **2. Đặt mua lẻ Combo bắp nước độc lập ngoài luồng vé** | API `POST /api/v1/orders` và `PATCH /api/v1/orders/:id` yêu cầu đơn hàng gắn với `showtimeId` và ít nhất 1 ghế đang giữ (`seatIds`); hệ thống không bán lẻ bắp nước tách rời vé xem phim. | Đã xóa nút chết `Thêm vào đơn` trên trang chủ. Thay bằng khu vực **Thực đơn Combo Bắp nước chính thức (`#combos`)** hiển thị đúng 3 gói Combo thật từ `seed.ts` (`69.000 ₫`, `109.000 ₫`, `189.000 ₫`) kèm liên kết dẫn thẳng tới `#booking-dock` và giải thích rõ khách hàng chọn Combo ở bước Thanh toán sau khi giữ ghế. |
| **3. API danh sách Mã giảm giá công khai (`GET /api/v1/vouchers/public`)** | Backend kiểm tra mã giảm giá khi khách nhập vào đơn hàng (`PATCH /api/v1/orders/:id` với `voucherCode`), chưa có endpoint công khai liệt kê danh sách voucher trên trang chủ; đồng thời `discovery.test.tsx` khóa cứng mock `fetch` khi trang chủ khởi chạy. | Hiển thị chính xác 2 mã voucher đang hoạt động trong `backend/prisma/seed.ts:429-464` (`CINEX20` — giảm 20% tối đa 40K cho đơn từ 100K; `GIAM30K` — giảm 30K cho đơn từ 120K) kèm nút **Sao chép mã** một chạm để khách dán trực tiếp vào ô Voucher trong `CheckoutModal`. |
| **4. Đánh giá sao của khán giả (User Ratings / Reviews) & Ứng dụng di động (iOS/Android App)** | Không có bảng `Review` / `Rating` trong cơ sở dữ liệu và dự án không có ứng dụng di động riêng. | Tuân thủ nghiêm ngặt `§1.4`: không hiển thị điểm số giả (`9.4/10`), không hiển thị lời chứng thực giả và không hiển thị nút tải App Store / Google Play giả. |

---

## 2. Hướng Phát Triển Tiếp Theo (Recommended Follow-ups)

1. **Bổ sung trường `backdropUrl` độ phân giải cao trong `seed.ts`:** Hiện tại `ApiMovie` đã hỗ trợ `bannerUrl?: string`, nếu bổ sung ảnh橫 (16:9) riêng biệt với `posterUrl` (2:3) trong dữ liệu seed thì khu vực Hero sẽ còn sắc nét hơn nữa.
2. **Endpoint `GET /api/v1/promotions/public`:** Có thể mở thêm một endpoint đọc danh sách Voucher có `status = 'ACTIVE'` và `validTo > now()` để đồng bộ động nếu Quản trị viên tạo thêm mã mới trong bảng điều khiển Admin.
