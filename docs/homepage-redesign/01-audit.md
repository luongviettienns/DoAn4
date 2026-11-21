# 01 — Báo Cáo Kiểm Toán Dựa Trên Bằng Chứng (Phase 1 Evidence-Based Audit)

> **Phạm vi kiểm toán:** Toàn bộ giao diện trang chủ công khai (`CustomerView`), luồng khám phá & đặt vé, điều hướng theo phân quyền (Role-based Header), hợp đồng dữ liệu API (`services/api.ts`), và dữ liệu gốc (`backend/prisma/seed.ts`).

---

## 1. Bảng Năng Lực Thực Tế Của Hệ Thống (Capability Table)

| Tính năng / Khả năng | Trạng thái hiện tại | Bằng chứng (`file:line`) | Ghi chú kiểm toán |
|---|---|---|---|
| **Danh mục phim (`NOW_SHOWING` / `COMING_SOON`), tìm kiếm từ khóa & phân trang** | Hoạt động thực tế (Server-side) | `frontend/src/components/Discovery.tsx:48-78`, `frontend/src/services/api.ts:272-292` | Gọi `GET /api/v1/movies?page=&limit=8&status=&q=`. Tuy nhiên chưa có `AbortController` hủy request cũ khi người dùng gõ/đổi bộ lọc liên tục. |
| **Chọn Phim → Chọn Rạp → Chọn Ngày (7 ngày giờ VN) → Chọn Suất chiếu** | Hoạt động thực tế | `frontend/src/components/Discovery.tsx:86-108, 224-319` | Sử dụng `vietnamDays()` tính theo `UTC+7` (`Discovery.tsx:16-31`) và render giờ chiếu bằng `Intl` `timeZone: 'Asia/Ho_Chi_Minh'` (`Discovery.tsx:33-38`). |
| **Giữ ghế thời gian thực (Redis Atomic Lua TTL 10 phút) & Sơ đồ ghế** | Hoạt động thực tế | `frontend/src/components/SeatMapModal.tsx`, `frontend/src/App.tsx:78-115` | Khi chọn suất chiếu, `SeatMapModal` mở lên; giữ ghế tạo `PendingBooking` lưu trong `localStorage` (`cinex_active_booking`) kèm đồng hồ đếm ngược. |
| **Thanh toán đơn hàng, chọn Combo bắp nước & áp mã Voucher** | Hoạt động thực tế (trong `CheckoutModal`) | `frontend/src/components/CheckoutModal.tsx`, `frontend/src/services/api.ts:368-420`, `backend/prisma/seed.ts:388-464` | `GET /api/v1/combos` trả về 3 combo thật; `POST /api/v1/orders` tạo đơn kèm `comboIds` và `voucherCode` (`CINEX20`, `GIAM30K`). |
| **Vé điện tử QR Code & Tự hoàn hủy vé trước giờ chiếu ≥ 2 giờ** | Hoạt động thực tế | `frontend/src/components/TicketModal.tsx`, `frontend/src/components/MyTicketsModal.tsx`, `KICH_BAN_VA_LUONG_CHUC_NANG_HE_THONG.md:208-221` | `TicketModal` hiển thị mã QR cho từng vé; `MyTicketsModal` hỗ trợ tra cứu lịch sử đơn, điểm thưởng (`10.000 ₫ = 1 điểm`) và hủy vé hợp lệ. |
| **Điều hướng theo vai trò (`GUEST`, `CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`)** | Hoạt động thực tế | `frontend/src/components/Header.tsx:112-160`, `frontend/src/App.tsx:22-56` | `STAFF`/`MANAGER` thấy nút `Soát vé`; `MANAGER`/`ADMIN` thấy `Báo cáo` và `Quản trị`. Có bài test bảo vệ tại `frontend/tests/role-navigation.test.tsx`. |
| **Xem Trailer phim trên trang chủ** | Chưa triển khai (Dữ liệu đã có sẵn) | `frontend/src/services/api.ts:182`, `backend/prisma/seed.ts:298,325` | `ApiMovie.trailerUrl` có sẵn URL YouTube trong DB nhưng `Discovery.tsx` hoàn toàn bỏ qua trường này. |
| **Khu vực Công nghệ phòng chiếu (`CinemaExperienceSection`)** | Tĩnh, có tuyên bố vượt dữ liệu & ảnh hotlink ngoài | `frontend/src/components/CinemaExperienceSection.tsx:7-32` | Hotlink 3 ảnh từ `images.unsplash.com` (vi phạm `§1.4`) và quảng cáo `SCREENX 270°`, `GOLD CLASS VIP` không tồn tại trong `schema.prisma` (`RoomFormat` chỉ có `TWO_D`, `THREE_D`, `IMAX`; `SeatType` chỉ có `STANDARD`, `VIP`, `COUPLE`). |
| **Khu vực Ưu đãi & Combo (`PromoSection`)** | Tĩnh, nút bấm chết (Dead UI) & số liệu bịa | `frontend/src/components/PromoSection.tsx:18,29-83` | Nút `Thêm vào đơn` (`line 50`) và `Đăng ký ngay` (`line 80`) không có `onClick`; link `#all-promos` (`line 18`) không dẫn tới đâu; nội dung "Combo Dune 149.000đ" sai lệch với 3 combo thật trong `seed.ts`. |
| **Chân trang (`Footer`)** | Tĩnh, liên kết neo chết (`#cinemas`, `#rules`, `#privacy`...) | `frontend/src/components/Footer.tsx:39-60` | Các thẻ `<a href="#cinemas">`, `#rules`, `#privacy`, `#refund`, `#age` không khớp với bất kỳ phần tử `id` nào trên trang. |

---

## 2. Hợp Đồng Dữ Liệu Thực Tế (Data Contract Table)

| Thực thể | Nguồn API / Kiểu dữ liệu (`api.ts`) | Các trường bắt buộc | Các trường có thể `null` / tùy chọn | Quy tắc hiển thị & Phòng thủ |
|---|---|---|---|---|
| **Movie** | `GET /api/v1/movies` → `ApiMovie` (`api.ts:173-186`) | `id`, `title`, `durationMin`, `releaseDate`, `ageRating` (`P`/`K`/`T13`/`T16`/`T18`), `status` (`NOW_SHOWING`/`COMING_SOON`/`ENDED`) | `originalTitle`, `director`, `posterUrl`, `trailerUrl`, `description`, `genres` | Khi `posterUrl` là `null` hoặc lỗi tải ảnh: hiển thị **Typographic Film Poster Fallback** nghệ thuật mang tên phim, đạo diễn, nhãn độ tuổi. Khi `trailerUrl` là `null`: ẩn nút xem trailer, không hiển thị nút chết. |
| **Cinema** | `GET /api/v1/cinemas` → `ApiCinema` (`api.ts:188-193`) | `id`, `name`, `city`, `address` | — | Hiển thị tên rạp kèm thành phố (`${cinema.name} (${cinema.city})`) và địa chỉ thực tế khi được chọn. |
| **Showtime** | `GET /api/v1/showtimes` → `ApiShowtime` (`api.ts:195-207`) | `id`, `movieId`, `roomId`, `startTime`, `endTime`, `format` (`TWO_D`/`THREE_D`/`IMAX`), `language` (`SUBTITLED`/`DUBBED`/`ORIGINAL`), `status` | `roomName`, `cinemaId`, `cinemaName`, `cinemaCity` | `startTime` luôn định dạng bằng `Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })`. |
| **Combo** | `GET /api/v1/combos` + `seed.ts:388-425` | `id`, `name`, `price` | `description`, `imageUrl` | Lưu ý quan trọng: `Discovery.test.tsx` khóa cứng mock `fetch` chỉ cho phép `/movies`, `/cinemas`, `/showtimes`. Do đó khu vực giới thiệu Combo & Voucher trên trang chủ sử dụng dữ liệu chuẩn đối chiếu từ `seed.ts:388-464` và hướng dẫn khách chọn trực tiếp trong `CheckoutModal` (hoặc mở luồng đặt vé), tuyệt đối không tự gọi `/combos` lúc mount trang chủ để tránh phá vỡ hợp đồng kiểm thử. |

---

## 3. Sơ Đồ Trạng Thái Đặt Vé Trên Trang Chủ (Booking State Map)

```
[Khách vào trang chủ]
       │
       ├──► GET /api/v1/cinemas (1 lần khi mount)
       └──► GET /api/v1/movies?page=1&limit=8&status=NOW_SHOWING
                 │
                 ▼
       [Tự động chọn phim đầu tiên (selectedMovieId)]
                 │
                 ├──► Nếu movie.status === 'COMING_SOON':
                 │      Hiển thị thông báo: "Phim sắp chiếu. Lịch chiếu sẽ được cập nhật khi rạp mở bán."
                 │      (Không hiển thị select Rạp chiếu, không gọi /showtimes)
                 │
                 └──► Nếu movie.status === 'NOW_SHOWING':
                        Hiển thị <select id="discovery-cinema"> (mặc định cinemaId = "")
                        và bộ chọn 7 ngày chiếu (vietnamDays, mặc định hôm nay UTC+7)
                              │
                              ├──► Khi cinemaId === "":
                              │      Nhắc: "Chọn rạp để xem suất chiếu."
                              │
                              └──► Khi khách chọn Rạp (cinemaId !== "") + Ngày (selectedDate):
                                     GET /api/v1/showtimes?movieId=...&cinemaId=...&date=YYYY-MM-DD
                                           │
                                           ▼
                                     [Danh sách nút Suất chiếu (Giờ VN • Định dạng • Phòng)]
                                           │
                                           ▼ (Click chọn suất chiếu)
                                     onSelectShowtime(showtime, selectedMovie)
                                           │
                                           ▼
                                     Mở <SeatMapModal /> ──► <CheckoutModal /> ──► <TicketModal />
```

---

## 4. Danh Sách Vấn Đề Phát Hiện Theo Mức Độ Ưu Tiên (Ranked Issue List)

### Mức P0 — Vi phạm tính trung thực dữ liệu & liên kết/nút bấm chết (`§1.4`, `§6`)
1. **Hotlink ảnh ngoài & tuyên bố công nghệ chưa có trong DB (`CinemaExperienceSection.tsx:12,20,28`):** Đang nhúng trực tiếp 3 URL `images.unsplash.com` và quảng cáo `SCREENX 270°`, `GOLD CLASS VIP` trong khi hệ thống chỉ hỗ trợ phòng `IMAX`, `2D`, `3D` và 3 hạng ghế `Ghế Thường (Standard)`, `Ghế VIP (+20.000 ₫)`, `Ghế Đôi Sweetbox (+40.000 ₫)` (`seed.ts:144-248`).
2. **Nút bấm chết & ưu đãi giả định (`PromoSection.tsx:18,50,80`):** Nút `Thêm vào đơn` và `Đăng ký ngay` không gắn sự kiện xử lý; liên kết `#all-promos` không tồn tại; nội dung "Combo Dune 149.000đ" không khớp với 3 combo thật trong hệ thống (`69.000 ₫`, `109.000 ₫`, `189.000 ₫`) và 2 mã voucher thật (`CINEX20`, `GIAM30K`).
3. **Liên kết neo (`anchor`) đứt gãy trên `Header` & `Footer` (`Header.tsx:77,245`, `Footer.tsx:39-60`):**
   - `Header.tsx:77,245` trỏ tới `href="#combos"` nhưng trên trang chưa có `id="combos"`.
   - `Footer.tsx:39-56` trỏ tới `#cinemas`, `#rules`, `#privacy`, `#refund`, `#age` đều không tồn tại, khiến người dùng nhấp vào không có phản hồi.

### Mức P1 — Khả năng tiếp cận (A11y), Tiếng Việt & Tương tác bàn phím (`§7`, `§9.2`)
4. **Cắt dấu tiếng Việt ở tiêu đề Hero (`Discovery.tsx:122`):** Tiêu đề `<h1>` dùng `font-display uppercase leading-[0.95]` làm các chữ hoa có dấu chồng (`Ấ`, `Ể`, `Ỗ`, `Ự`) bị cắt phần dấu phía trên hoặc dính vào dòng trên khi xuống dòng.
5. **Thiếu văn bản thay thế (`alt=""`) cho toàn bộ ảnh poster phim (`Discovery.tsx:117,138,168`):** Cả ảnh nền, ảnh poster ở Hero và ảnh poster trong lưới danh mục đều để `alt=""`, khiến trình đọc màn hình không nhận diện được hình ảnh phim.
6. **Menu di động thiếu điều khiển bàn phím & bẫy tiêu điểm (`Header.tsx:235-282`):** Menu mở trên mobile không đóng khi nhấn `Escape`, không khóa cuộn nền, không hoàn trả focus về nút mở menu, và thiếu liên kết tới `#experience`.
7. **Thiếu Skip-to-content link (`App.tsx` / `Header.tsx`):** Người dùng bàn phím phải nhấn `Tab` qua toàn bộ thanh điều hướng mới vào được nội dung chính `#main-content`.

### Mức P2 — Trải nghiệm điện ảnh, Chuyển động & Hiệu năng (`§5`, `§6`, `§8`, `§10`)
8. **Hero chỉ hiển thị tĩnh 1 phim đầu tiên (`Discovery.tsx:81,115-146`):** Không có khả năng duyệt qua các phim tiêu điểm (Carousel chuẩn WAI-ARIA), không có nút xem Trailer dù `movie.trailerUrl` đã có sẵn trong dữ liệu API, và nút CTA của phim `COMING_SOON` giống hệt phim `NOW_SHOWING`.
9. **Nguy cơ Race Condition khi tìm kiếm / lọc nhanh (`Discovery.tsx:48-78, 91-108`):** Chưa sử dụng `AbortController` hoặc cờ chống ghi đè rõ ràng cho các yêu cầu mạng chồng lấp khi người dùng chuyển đổi liên tục giữa `Đang chiếu` / `Sắp chiếu` hoặc đổi rạp/ngày nhanh.
10. **Tải tĩnh toàn bộ Admin/Staff Dashboards trong bundle trang chủ (`App.tsx:3-18`):** Khách truy cập trang chủ phải tải luôn mã nguồn của `AdminLayout`, `OverviewDashboard`, `ShowtimesSeatsDashboard`, `CounterCheckinDashboard`, `ShiftReportDashboard`.

---

## 5. Trạng Thái Cổng Kiểm Soát (`[GATE 1]`)

- [x] Đã đọc và đối chiếu toàn bộ thành phần Frontend, API client, Context xác thực, Seed DB và bộ kiểm thử hiện có.
- [x] Mọi nhận định đều đi kèm dẫn chứng `file:line` xác thực.
- **Kết luận Gate 1:** **ĐẠT (PASSED)**.
