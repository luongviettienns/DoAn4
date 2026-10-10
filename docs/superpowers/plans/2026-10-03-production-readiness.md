# Production readiness và kiểm thử core

**Mục tiêu:** Đánh giá dự án theo F01–F19, bổ sung kiểm thử core có thể chạy lại và sửa lỗi nghiêm trọng được kiểm thử tái hiện.

**Kiến trúc:** Giữ Express/Prisma/MySQL và React/Vite hiện có. Kiểm thử API dùng MySQL riêng có hậu tố `_test`, kiểm thử giao diện dùng DOM cùng phản hồi HTTP kiểm soát được. Không thay thế hoặc xóa các thay đổi đang có.

**Đặc tả:** `docs/01-tong-quan-va-yeu-cau.md`, `docs/02-luong-chuc-nang.md`.

- [x] Đối chiếu backend/frontend với đặc tả và ghi các khoảng trống phát hành có file/dòng và mức ưu tiên.
- [x] Thiết lập DB kiểm thử riêng, áp dụng schema/CHECK và seed, chạy tuần tự các suite cũ; thêm báo cáo coverage.
- [x] Viết và chạy test tái hiện: chiếm cùng ghế, callback lặp/đến muộn, đơn hết hạn/hủy, soát vé đồng thời, phạm vi nhân viên, tuổi và thời hạn đặt vé.
- [x] Sửa tối thiểu lỗi core được tái hiện; kiểm thử lại toàn bộ backend.
- [x] Bổ sung test API client, phiên đăng nhập, chọn ghế, checkout, trạng thái QR/vé; sửa lỗi core đã tái hiện.
- [x] Bổ sung các nhánh API đã triển khai còn thiếu: voucher/combo, lịch chiếu/giá hiệu lực, số liệu và quyền báo cáo theo rạp; sửa lỗi được tái hiện.
- [x] Chạy build, lint, kiểm thử và coverage; lập ma trận chức năng–bằng chứng–phần chưa kiểm chứng và danh sách việc trước phát hành.

**Kết quả 04/10/2026:** 370 backend + 66 frontend = 436 test đạt; coverage backend 94.12% lines/81.31% branches, frontend 76.13%/71.17%. Build đạt, lint 0 lỗi/13 cảnh báo. Gate coverage đã chạy qua. Báo cáo phát hành vẫn kết luận chưa production-ready; các chức năng chưa triển khai và E2E/ops còn thiếu được ghi rõ trong `docs/PRODUCTION_READINESS.md`.

**Rủi ro ưu tiên kiểm thử:** hai người cùng ghế; IPN trùng/đến muộn; soát vé đồng thời; nhân viên không được gán rạp; người dùng dưới tuổi hoặc đặt sát giờ. Các luồng chưa triển khai phải báo là thiếu, không đánh dấu phủ kín chỉ vì test hiện có qua.
