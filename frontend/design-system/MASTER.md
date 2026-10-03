# CineX Design System — MASTER.md

> **Nguồn tri thức cốt lõi:** Kết hợp triết lý từ **Taste Skill** (Leonxlnx), **UI UX Pro Max** (NextLevelBuilder) và **Frontend Skill** (OpenAI).  
> **Dự án:** Hệ thống đặt vé xem phim online CineX (Đồ án 4).  
> **Trạng thái:** Active / Enforced.

---

## 1. Triết lý thiết kế (Design Theses)

### 1.1 Visual Thesis
> *"Phòng chiếu trước giờ đèn tắt."*
- **Không gian:** Nền đen than ấm (`#0B0A0C`), bề mặt tối giản tinh tế (`#151318`).
- **Nguồn sáng:** Ánh sáng chính rọi từ màn ảnh và đèn chiếu hổ phách ấm (`#FFB23E`).
- **Dấu ấn thương hiệu:** Motif tấm vé xem phim với đường cắt răng cưa (ticket notch cutout).
- **Anti-patterns nghiêm ngặt:** Tuyệt đối không dùng gradient tím-hồng kiểu AI ("AI purple/pink gradients"), không dùng màu neon chói lóa, không dùng "pill soup" dày đặc, không dùng card trắng sáng.

### 1.2 Interaction Thesis
- **Mở màn điện ảnh:** Letterbox mở ra như rèm nhung rạp chiếu lúc vào trang.
- **Chuyển phim mượt mà:** Hiệu ứng lan tỏa (clip-path circle expansion) từ poster được chọn, nền chuyển đổi êm ái.
- **Cuộn trang có chiều sâu:** Parallax nhẹ đưa hero lùi sâu, danh sách phim trồi lên như tia sáng máy chiếu quét qua.
- **Micro-interactions:** Spotlight dịu nhẹ bám theo chuột (pointer: fine), poster trong rail có hiệu ứng 3D tilt tinh tế, nút bấm tem vé phản hồi nam châm (magnetic feel).

---

## 2. Taste Dials Configuration

| Khu vực | DESIGN_VARIANCE (1–10) | MOTION_INTENSITY (1–10) | VISUAL_DENSITY (1–10) | Ghi chú |
|---|:---:|:---:|:---:|---|
| **Hero Section** | **7** | **8** | **3** | Rộng mở, đậm tính điện ảnh, giàu cảm xúc |
| **Danh sách phim** | **5** | **5** | **5** | Cân bằng giữa thưởng thức thị giác và chọn lọc |
| **Chọn rạp / Suất chiếu** | **3** | **3** | **7** | Mật độ thông tin cao, rõ ràng, tốc độ chuyển đổi nhanh |
| **Sơ đồ chọn ghế** | **2** | **2** | **8** | Độ chính xác tuyệt đối, tương tác nhanh, không xao nhãng |

---

## 3. Design Tokens (Hệ thống biến chuẩn)

### 3.1 Bảng màu (Color Palette)
- **Deep Background:** `#0B0A0C` (Đen than ấm, chống mỏi mắt)
- **Surface:** `#151318` (Bề mặt thẻ, container, dock)
- **Surface Hover / Active:** `#221F28` / `#2A2631`
- **Surface Border:** `#2A2631` (Đường viền mảnh, độ tương phản vừa vặn)
- **Accent (Duy nhất):** `#FFB23E` (Vàng hổ phách ánh đèn chiếu)
- **Accent Hover:** `#FFA21A`
- **Accent Text On Dark:** `#0B0A0C` (Chữ trên nền nút accent luôn là màu nền than tối để đảm bảo độ tương phản > 7:1)
- **Text Primary:** `#F3EEE6` (Trắng ngà ấm, không dùng #FFFFFF chói gắt)
- **Text Secondary:** `#A39E96` (Xám ghi ấm)
- **Text Muted:** `#6B665F` (Ghi tối dùng cho label phụ)

### 3.2 Typography
- **Display Font (Tên phim / Headline lớn):** `Barlow Condensed` (600, 700, 800, 900) — In hoa, cô đọng, khỏe khoắn chuẩn poster phim.
- **Body & UI Font:** `Be Vietnam Pro` (400, 500, 600, 700) — Tối ưu tuyệt đối cho tiếng Việt, dấu thanh cân đối, dễ đọc ở mọi kích cỡ.

---

## 4. Tiêu chuẩn Accessibility & UX (UI UX Pro Max)

- **Target Size (CRITICAL):** Mọi nút bấm, link, tab, poster click tối thiểu đạt **44 × 44px**.
- **Touch Spacing:** Khoảng cách tối thiểu giữa các phần tử bấm được là **8px**.
- **Color Contrast:** Mọi văn bản chính đạt độ tương phản tối thiểu **4.5:1** so với nền (WCAG AA).
- **Reduced Motion:** Khi người dùng bật `prefers-reduced-motion: reduce`, toàn bộ timeline phức tạp, zoom, parallax và tilt đều tự động chuyển sang crossfade nhẹ nhàng hoặc tắt.
- **Không dùng emoji làm biểu tượng:** Luôn dùng SVG chuẩn (Lucide Icons).
- **Semantic HTML & Live Regions:** Có `aria-live="polite"` khi slide phim chuyển động, kèm nút điều khiển Pause/Play rõ ràng.

---

## 5. Quy chuẩn cấu trúc trang chủ (Home Page Content Plan)

1. **Hero Section (Full-bleed):** Backdrop phim ấn tượng, meta không dùng pill, headline 2 dòng, nút tem vé, poster rail 5 phim kèm tiến trình 7s, booking dock dính liền chân hero.
2. **Now Showing & Coming Soon (Phim đang chiếu / sắp chiếu):** Lưới poster tỉ lệ 2:3 chuẩn rạp, hover hiện nút đặt vé nhanh.
3. **Showtimes Near You (Suất chiếu gần bạn):** Lọc theo cụm rạp, suất 2D/3D/IMAX rõ ràng, mật độ thông tin cao.
4. **Combos & Promotions (Ưu đãi bắp nước & sự kiện):** Banner hình ảnh kích thước lớn, trực quan.
5. **Cinema Experience (Đẳng cấp phòng chiếu):** Giới thiệu công nghệ IMAX Laser, ScreenX, Gold Class.
6. **Final CTA & Footer:** Đăng ký thành viên CineX Rewards và tải ứng dụng.
