# Tài liệu Đồ án 4 - Hệ thống đặt vé xem phim online

## Danh sách tài liệu

| File | Nội dung | Dùng cho |
|---|---|---|
| [01-tong-quan-va-yeu-cau.md](01-tong-quan-va-yeu-cau.md) | Mục tiêu, actor, phạm vi MoSCoW, yêu cầu chức năng (FR), quy tắc nghiệp vụ (BR), yêu cầu phi chức năng (NFR), danh sách use case, sơ đồ use case | Báo cáo, phân tích yêu cầu |
| [02-luong-chuc-nang.md](02-luong-chuc-nang.md) | 19 luồng chức năng (F01-F19) chi tiết: luồng chính, ngoại lệ, quy tắc bắt buộc, checklist; máy trạng thái; thực thể dữ liệu; ma trận phân quyền; mã lỗi | Thiết kế backend, CSDL, API |
| [03-mo-ta-man-hinh.md](03-mo-ta-man-hinh.md) | Route, bố cục và hành vi từng màn hình theo 4 phân hệ (khách hàng, nhân viên, quản lý, admin); thành phần dùng chung; gợi ý Redux/thư mục | Thiết kế frontend |
| [04-thiet-ke-csdl.md](04-thiet-ke-csdl.md) | ERD, từ điển bảng/cột, kiểu dữ liệu, khóa/index/ràng buộc, transaction chống trùng ghế, seed và Prisma schema | Thiết kế CSDL và triển khai backend |
| [05-thiet-ke-api.md](05-thiet-ke-api.md) | Endpoint theo module, request/response mẫu, quyền và phạm vi dữ liệu, lỗi, idempotency; hợp đồng OpenAPI | Frontend và backend làm song song |
| [06-kien-truc-he-thong.md](06-kien-truc-he-thong.md) | Kiến trúc React–Node–MySQL–ML–thanh toán, phân lớp/module, job nền, sơ đồ lớp và tuần tự | Tổ chức mã nguồn và báo cáo kiến trúc |
| [07-ke-hoach-du-an.md](07-ke-hoach-du-an.md) | RACI, phân công module, sprint/mốc bàn giao, phụ thuộc, rủi ro và tiêu chí hoàn thành | Phân công và theo dõi tiến độ nhóm |
| [08-quy-uoc-phat-trien.md](08-quy-uoc-phat-trien.md) | Git/commit/review, đặt tên, cấu trúc thư mục, biến môi trường và hướng dẫn dựng/chạy dự án | Onboarding và phát triển đồng nhất |

## Tệp thiết kế đi kèm

- [openapi.json](openapi.json): hợp đồng OpenAPI 3.0.3, dùng để import vào Swagger UI/Editor và tạo mock/client.
- [prisma/schema.prisma](prisma/schema.prisma): schema tham chiếu MySQL với Prisma 6.19.0; hướng dẫn migration và seed ở tài liệu `04`.
- [prisma/constraints.sql](prisma/constraints.sql): các CHECK bổ sung để đưa vào migration MySQL trước khi áp dụng.

Hiện thư mục chứa tài liệu thiết kế, chưa có frontend/backend chạy được. Các lựa chọn triển khai bổ sung và tên thành viên trong kế hoạch là đề xuất hoặc chỗ điền, được ghi rõ trong từng tài liệu.

## Thứ tự đọc đề xuất

1. `01` để thống nhất phạm vi và quy tắc nghiệp vụ cả nhóm.
2. `02` để chia việc backend (theo mã F01-F19) và thiết kế CSDL/API.
3. `03` để chia việc frontend theo phân hệ và dựng wireframe/Figma.
4. `04` và `05` để chốt dữ liệu/hợp đồng API trước khi frontend và backend triển khai song song.
5. `06` để thống nhất ranh giới module, transaction và cách chạy job.
6. `07` để gán người phụ trách/mốc tiến độ; `08` để dựng môi trường và thực hiện quy trình Git/review.

## Quy ước tham chiếu chéo

- `FR-xx`: yêu cầu chức năng; `BR-xx`: quy tắc nghiệp vụ; `NFR-xx`: yêu cầu phi chức năng (tài liệu 01).
- `Fxx`: luồng chức năng (tài liệu 02); `UCxx`: use case (tài liệu 01).
- Các giá trị mặc định (10 phút giữ ghế, 8 ghế/đơn, 2 giờ hủy vé...) đều cấu hình được, xem mục F16 trong tài liệu 02.
- `04` cụ thể hóa mô hình dữ liệu sơ bộ ở phụ lục B của `02`; `05` và `openapi.json` cụ thể hóa hợp đồng endpoint. Khi đổi thiết kế, cập nhật đồng thời tài liệu liên quan và kiểm tra tham chiếu.

## Các điểm cần nhóm xác nhận trước khi code

Thiết kế `04`–`08` dùng baseline đề xuất: VNPay sandbox, polling 5 giây, chưa bật xác minh email, ưu tiên Must trước Should/Could. Các ô dưới đây vẫn để nhóm xác nhận, không có nghĩa các chức năng đã triển khai.

- [ ] Có làm xác minh email khi đăng ký không (F01.1).
- [ ] Chọn cổng thanh toán: VNPay hay MoMo (F04).
- [ ] Cập nhật ghế bằng polling hay WebSocket (F03.2).
- [ ] Mức độ làm các chức năng Should/Could (xem bảng MoSCoW ở tài liệu 01).
- [ ] Có làm tạo suất chiếu hàng loạt và kéo thả trên lịch không (F11, mục 4.5 tài liệu 03).
- [ ] Điền tên thật cho các vai trò TV1–TV4 và ngày bắt đầu T0 trong tài liệu `07`.
- [ ] Khóa phiên bản công cụ và thống nhất script workspace theo tài liệu `08`.
