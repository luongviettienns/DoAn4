# Kiểm thử trình duyệt Chặng 1

Ngày kiểm chứng: 04/10/2026 (giờ Việt Nam).

`backend/scripts/stage1-browser-e2e.cjs` chạy Chromium, React/Vite, Express và MySQL thật. Script không mock fetch, không reset database và chỉ khởi động backend sau khi `configureTestEnvironment()` xác nhận database riêng có hậu tố `_test`. Không chạy song song với runner reset database.

## Cách chạy

Chuẩn bị database test đã seed bằng runner có guard của dự án:

```powershell
npm ci
npm exec -- playwright install chromium
npm run test:coverage
npm run test:e2e
```

Playwright được pin trong root `devDependencies` và lockfile; browser cài bởi cùng phiên bản Playwright. Trên Linux, dùng `npm exec -- playwright install --with-deps chromium` để cài thêm thư viện hệ thống. Cách cài này theo [hướng dẫn CI của Playwright](https://playwright.dev/docs/ci). Script mặc định dùng dependency của dự án; vẫn hỗ trợ package/executable khác khi chẩn đoán máy phát triển:

```powershell
$env:PLAYWRIGHT_MODULE_PATH = 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'
npm run test:e2e
```

`STAGE1_E2E_API_PORT` và `STAGE1_E2E_FRONTEND_PORT` mặc định là 3101/5176. Script từ chối dùng cổng đang có dịch vụ khác. `STAGE1_E2E_ARTIFACT_DIR` cho phép chọn thư mục lưu `report.json`, ảnh `payment-result.png` khi thành công và `failure.png` khi thất bại; mặc định nằm trong thư mục tạm `cinex-stage1-e2e` của hệ điều hành. Script đóng browser và các tiến trình dịch vụ của chính nó trong `finally`.

## CI

`.github/workflows/ci.yml` chạy build/lint và toàn bộ coverage trước, rồi cài Chromium với thư viện Linux và chạy `npm run test:e2e` tuần tự trên MySQL riêng. E2E thất bại làm job thất bại. Artifact `stage1-browser-e2e` lưu báo cáo/ảnh ở `artifacts/stage1-e2e/` trong 14 ngày; coverage được xuất riêng, kể cả khi bước sau lỗi. `artifacts/` được bỏ qua trong Git. Workflow cần được push và xác minh run trên GitHub; chạy local không xác nhận kết quả Ubuntu/GitHub.

Khi lỗi, `report.json` ghi phase và tham chiếu `service-diagnostics.json`: trạng thái/ready/exit code của từng server và nhóm lỗi khởi động được nhận diện. Không xuất raw server logs; thông báo lỗi được giới hạn và che URL, secret/token/cookie. Chỉ có ảnh `failure.png` nếu trang browser đã mở. Đã kiểm tra local nhánh browser executable không tồn tại: FAIL đúng, cả hai server được đóng. Lượt đầy đủ sau đó dùng dependency/browser mặc định đã PASS, lưu bằng chứng tại `artifacts/stage1-e2e/`.

## Phạm vi xác nhận

- Chọn phim qua tìm kiếm thật, chọn rạp, ngày Việt Nam và đúng suất chiếu; API sơ đồ ghế phải trả đúng ID đã chọn.
- Chọn ghế tạo ngay đơn `PENDING_PAYMENT` và hold thật. Người dùng thứ hai thấy ghế bị khóa sau polling; inventory công khai/khác tài khoản không tiết lộ ID chủ đơn.
- Thêm/bớt ghế cập nhật cùng một đơn, không gia hạn `expiresAt`, ghế bỏ chọn trở lại `AVAILABLE`.
- Checkout dùng đơn đã giữ, khởi tạo `Payment` VNPay qua API thật, không tạo thêm đơn.
- Browser mở callback return có chữ ký thành công hợp lệ: backend chuyển hướng về trang kết quả đúng đơn; callback return không tự chuyển trạng thái sang `PAID` trước IPN.
- Trang kết quả bỏ qua query `status=FAILED`, `status=PAID`, mã vé giả và số tiền giả; chưa có IPN thì không hiển thị QR.
- IPN tự ký độc lập bằng secret riêng của lần chạy chuyển đơn từ `PENDING_PAYMENT` sang `PAID`; polling trình duyệt tự hiển thị mã vé do server phát hành và QR tương ứng.
- Gửi lại cùng IPN nhận phản hồi đã xác nhận; mã/số vé không đổi. Không có lỗi runtime trình duyệt hoặc lỗi API ngoài dự kiến.

VNPay URL trong lần kiểm thử trỏ về endpoint `/health` cục bộ để browser không kết nối gateway bên ngoài. Chữ ký, bản ghi Payment và xử lý IPN vẫn chạy qua service thật; đây là kiểm chứng luồng tích hợp của ứng dụng. Cần kiểm chứng riêng tài khoản merchant sandbox, callback/IPN qua HTTPS và đối soát của nhà cung cấp trước triển khai chính thức.

Script đăng ký hai tài khoản duy nhất và để lại đơn/vé kiểm thử trong database `_test`; lần chạy runner chuẩn tiếp theo sẽ chuẩn bị lại database này. Không có thao tác reset hoặc ghi vào database phát triển.
