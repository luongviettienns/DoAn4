# 03 — Kiến Trúc Trải Nghiệm & Quản Lý Trạng Thái (Phase 4 Experience Architecture)

---

## 1. Bảng Phân Cảnh Trang Chủ (5-Scene Narrative Architecture)

Mỗi phân cảnh trên trang chủ CineX đóng một vai trò rõ ràng trong hành trình từ **Cảm xúc điện ảnh → Khám phá phim → Chọn suất đặt vé → Tin tưởng dịch vụ → Chuyển đổi thành viên**:

| Phân cảnh | Mục tiêu người dùng (User Goal) | Hành động chính (Primary Action) | Nguồn dữ liệu (Single Source of Truth) | Thành phần / Anchor ID |
|---|---|---|---|---|
| **Cảnh 1: Tiêu Điểm Đêm Công Chiếu (Signature Hero Stage)** | Cảm nhận không khí điện ảnh của bộ phim tâm điểm, xem thông tin cốt lõi, mở Trailer hoặc chuyển ngay sang đặt vé. | • `Chọn suất chiếu ngay` (cuộn mượt xuống `#booking-dock` & chọn phim)<br>• `Xem Trailer` (mở hộp thoại Trailer Facade nếu có `trailerUrl`)<br>• Duyệt qua các phim tiêu điểm (Carousel chuẩn WAI-ARIA có nút Tạm dừng/Phát). | `GET /api/v1/movies` (`movies` đang hiển thị hoặc bộ đệm phiên `sessionStorage` phi cá nhân) | `Discovery.tsx` (`#hero-spotlight`) |
| **Cảnh 2: Danh Mục Phim & Bàn Đặt Vé Tức Thì (Movie Gallery & Ticket-Stub Booking Dock)** | Tìm kiếm phim theo tên, lọc `Đang chiếu` / `Sắp chiếu`, xem chi tiết phim và chọn Rạp → Ngày (7 ngày giờ VN) → Suất chiếu chỉ trong vài giây. | • Tìm kiếm (`role="search"`) & lọc trạng thái<br>• Nhấp `Chọn phim ${movie.title}`<br>• Chọn `Rạp chiếu` (`#discovery-cinema`) → `Ngày chiếu` → Nhấp suất chiếu để mở `SeatMapModal`. | `GET /api/v1/movies`<br>`GET /api/v1/cinemas`<br>`GET /api/v1/showtimes` | `Discovery.tsx` (`#movies`, `#discovery-search`, `#booking-dock`) |
| **Cảnh 3: Sân Khấu Kiến Trúc Phòng Chiếu & Hạng Ghế (Interactive Auditorium & Seat-Tier Stage)** | Hiểu rõ sự khác biệt giữa định dạng phòng chiếu (`IMAX`, `2D/3D`) và 3 hạng ghế thực tế trước khi chọn chỗ ngồi. | • Chuyển đổi tương tác giữa 3 hạng ghế thật (`Ghế Thường Standard +0 ₫`, `Ghế VIP Trung tâm +20.000 ₫`, `Ghế Đôi Sweetbox Hàng F +40.000 ₫`) trên sơ đồ mặt cắt SVG để xem tầm nhìn màn bạc và phụ thu thật. | Dữ liệu cấu trúc phòng & quy tắc phụ thu ghế từ `backend/prisma/seed.ts:144-248` (`RoomFormat`, `SeatSurchargeRule`) | `CinemaExperienceSection.tsx` (`#experience`) |
| **Cảnh 4: Ưu Đãi Thực Tế, Combo Bắp Nước & Đặc Quyền Thành Viên (Verified Concessions, Vouchers & Loyalty)** | Nắm rõ các Combo bắp nước, mã giảm giá đang áp dụng và cơ chế tích điểm/hoàn vé minh bạch của CineX. | • Sao chép nhanh mã ưu đãi thật (`CINEX20`, `GIAM30K`) để dùng ở bước Thanh toán<br>• Xem 3 gói Combo thật (`69.000 ₫`, `109.000 ₫`, `189.000 ₫`)<br>• Nhấp `Đặt vé & chọn Combo` (cuộn tới `#booking-dock`) hoặc `Đăng nhập tích điểm` / `Xem vé & điểm thưởng` (gọi modal thật). | `backend/prisma/seed.ts:388-464` & quy tắc nghiệp vụ `KICH_BAN_VA_LUONG_CHUC_NANG_HE_THONG.md` (`F11`, `F13`, `F14`, `F16`) | `PromoSection.tsx` (`#promotions`, `#combos`) |
| **Cảnh 5: Lời Mời Khép Cảnh & Chân Trang Minh Bạch (Closing Curtain & Policy Footer)** | Bắt đầu lại hành trình đặt vé từ cuối trang hoặc tra cứu nhanh quy định phân loại độ tuổi (`P`, `K`, `T13`, `T16`, `T18`), chính sách giữ ghế 10 phút và hoàn vé trước ≥ 2 giờ. | • Nhấp `Chọn phim & giữ ghế ngay` (`#movies`)<br>• Tra cứu bảng Quy định & Chính sách tương tác ngay tại chân trang (không còn liên kết `#` chết). | Quy chuẩn phân loại độ tuổi (`AgeRating` enum) & Chính sách hệ thống (`F11`, `F16`) | `Footer.tsx` (`#policies`, `<footer role="contentinfo">`) |

---

## 2. Máy Trạng Thái Đặt Vé & Bảo Toàn Hợp Đồng Kiểm Thử (Booking State Machine)

Để vừa nâng cấp trải nghiệm vừa giữ **100% tương thích ngược** với `discovery.test.tsx`, `app-booking.test.tsx`, `role-navigation.test.tsx` và `stage1-browser-e2e.cjs`:

1. **Trạng thái Danh mục phim (`Catalogue State`):**
   - Bộ lọc: `statusFilter` (`'NOW_SHOWING' | 'COMING_SOON'`), `searchInput`, `submittedQuery`, `page` (`1..totalPages`).
   - Khi chuyển trang hoặc đổi bộ lọc: sử dụng `AbortController` để hủy ngay request `/movies` cũ nếu chưa hoàn tất, ngăn chặn kết quả cũ ghi đè kết quả mới.
   - Khi tải thành công danh sách phim lần đầu trên trang chủ: lưu bản chụp nhẹ (chỉ gồm danh sách phim công khai, tuyệt đối không chứa thông tin cá nhân) vào `sessionStorage` (`cinex_public_movies_swr_v1`) để Hero có thể hiển thị tức thì ở lần điều hướng tiếp theo trong phiên, nhưng **chỉ đọc khi đang tải và không bao giờ che giấu lỗi mạng (`catalogueError`)**.

2. **Trạng thái Tiêu điểm Hero (`Hero Spotlight Index`):**
   - Quản lý `heroIndex` trỏ vào danh sách phim hiện tại (hoặc đồng bộ với phim vừa được người dùng chọn).
   - Cung cấp điều khiển `Trước`, `Tiếp theo`, các chấm chọn nhanh và nút `Tạm dừng tự chuyển` / `Tiếp tục tự chuyển` chuẩn WAI-ARIA Carousel.
   - Khi người dùng nhấp `Chọn suất chiếu ngay` trên Hero của một bộ phim: tự động gán `selectedMovieId = heroMovie.id` và cuộn tới `#booking-dock`.

3. **Trạng thái Lịch chiếu (`Schedule State`):**
   - `selectedMovie`: suy xuất từ `movies.find(m => m.id === selectedMovieId) ?? movies[0]`.
   - Khi `selectedMovie.status === 'COMING_SOON'`:
     - Hiển thị thông báo chuẩn: `"Phim sắp chiếu. Lịch chiếu sẽ được cập nhật khi rạp mở bán."`
     - Không hiển thị `<select id="discovery-cinema">` và không gọi API `/showtimes`.
   - Khi `selectedMovie.status === 'NOW_SHOWING'`:
     - Hiển thị `<select id="discovery-cinema">` gắn với `<label htmlFor="discovery-cinema">Rạp chiếu</label>` (giá trị khởi tạo `""` — `"Chọn rạp chiếu"`, tự động reset về `""` khi đổi sang phim khác).
     - Hiển thị nhóm 7 nút ngày chiếu (`role="group" aria-label="Ngày chiếu"`) tính theo múi giờ Việt Nam (`UTC+7`).
     - Khi `cinemaId === ''`: hiển thị `"Chọn rạp để xem suất chiếu."`.
     - Khi `cinemaId !== ''`: gọi `GET /api/v1/showtimes?movieId=...&cinemaId=...&date=...` (có `AbortController` chống race condition khi bấm đổi ngày liên tục) và hiển thị các thẻ cuống vé suất chiếu trong `<section aria-label="Suất chiếu">`.

---

## 3. Cấu Trúc Tệp Mô-đun Hóa (File Structure)

| Tệp | Trách nhiệm |
|---|---|
| `frontend/src/index.css` | Hệ thống token màu sắc/chữ chuẩn Tailwind v4, lớp tiện ích `.tabular-nums`, `.ticket-stub`, `.projector-beam`, kiểu dáng `focus-visible` và quy tắc `@media (prefers-reduced-motion: reduce)`. |
| `frontend/src/hooks/useReducedMotion.ts` | Hook lắng nghe `(prefers-reduced-motion: reduce)` thời gian thực để vô hiệu hóa tự động chuyển slide, hiệu ứng nghiêng 3D và chuyển động phức hợp. |
| `frontend/src/utils/trailer.ts` | Hàm kiểm tra tính hợp lệ và trích xuất mã nhúng YouTube (`youtube-nocookie.com`) an toàn từ `movie.trailerUrl`. |
| `frontend/src/components/TrailerModal.tsx` | Hộp thoại Trailer Facade hỗ trợ đóng bằng `Escape`, khóa cuộn trang và trả lại tiêu điểm (`useModalA11y`). |
| `frontend/src/components/Discovery.tsx` | Phân cảnh 1 (Signature Hero Carousel + Trailer Trigger) và Phân cảnh 2 (Movie Gallery có hiệu ứng nghiêng tinh tế + Ticket-Stub Booking Dock). |
| `frontend/src/components/CinemaExperienceSection.tsx` | Phân cảnh 3: Sân khấu Kiến trúc Phòng chiếu & Khám phá 3 Hạng ghế tương tác bằng SVG nguyên bản (không dùng ảnh Unsplash ngoài). |
| `frontend/src/components/PromoSection.tsx` | Phân cảnh 4: Khu vực Combo Bắp Nước thật (`#combos`), Mã Voucher thật (`#promotions`) có nút sao chép mã và kết nối trực tiếp vào luồng Đặt vé / Đăng nhập / Vé của tôi. |
| `frontend/src/components/Footer.tsx` | Phân cảnh 5: Lời mời đặt vé cuối trang, điều hướng phân cảnh có nhãn `aria-label` và Bảng tra cứu Chính sách & Độ tuổi tương tác (`#policies`). |
| `frontend/src/components/Header.tsx` | Thanh điều hướng cố định có Skip-link, đồng bộ liên kết neo thật (`#movies`, `#discovery-search`, `#experience`, `#promotions`, `#combos`), bảo toàn nút phân quyền và nâng cấp ngăn kéo di động với `useModalA11y`. |
| `frontend/src/App.tsx` | Kết nối callback giữa `PromoSection` với `AuthModal` / `MyTicketsModal` và tách tải lười (`React.lazy`) các màn hình Quản trị/Nhân viên để tối ưu dung lượng tải trang chủ. |

---

## 4. Trạng Thái Cổng Kiểm Soát (`[GATE 4]`)

- [x] Mọi phân cảnh đều gắn với dữ liệu thật hoặc quy tắc nghiệp vụ thật trong kho mã.
- [x] Máy trạng thái đặt vé bảo toàn 100% các selector và hành vi trong bộ kiểm thử hiện có.
- **Kết luận Gate 4:** **ĐẠT (PASSED)**.
