---
name: "CineX — Premiere × Editorial Nocturne"
domain: "cinema_booking_and_exhibition_platform"
aesthetic_persona: "Premiere × Editorial (Dark Auditorium Obsidian, Projector Crimson & Warm Gold Leaf)"
theme_polarity: "intentional_dark_mode"
colors:
  background_primary: "#09090B"
  background_secondary: "#121216"
  surface_elevated: "#18181F"
  surface_glass: "rgba(24, 24, 31, 0.78)"
  text_primary: "#FAFAFA"
  text_secondary: "#B4B4BE"
  text_muted: "#8E8E9A"
  accent_primary: "#E11D48"
  accent_primary_hover: "#F43F5E"
  accent_secondary: "#F59E0B"
  accent_gold_soft: "#FBBF24"
  semantic_success: "#10B981"
  semantic_warning: "#F59E0B"
  semantic_error: "#EF4444"
  border_subtle: "rgba(255, 255, 255, 0.08)"
  border_spotlight: "rgba(225, 29, 72, 0.45)"
typography:
  font_display: "'Barlow Condensed', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  font_sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  font_mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
  hero_size: "clamp(2.25rem, 4.5vw + 1rem, 4.25rem)"
  section_title_size: "clamp(1.75rem, 2.6vw + 0.75rem, 2.75rem)"
  body_size: "1rem"
  vietnamese_display_line_height: 1.12
  numeric_discipline: "tabular-nums"
layout:
  max_width: "1280px"
  grid_columns: 12
  section_padding_y: "clamp(3.5rem, 6vw, 6rem)"
  border_radius_card: "16px"
  border_radius_ticket: "14px"
  touch_target_min: "44px"
motion:
  engine: "CSS + Motion (Framer Motion v12) — single owner per element"
  easing_enter: "cubic-bezier(0.22, 1, 0.36, 1)"
  easing_exit: "cubic-bezier(0.4, 0, 1, 1)"
  duration_micro: "160ms"
  duration_transition: "320ms"
  duration_scene: "520ms"
  reduced_motion_policy: "strict_opacity_only_zero_auto_advance"
---

# CineX Design System — Premiere × Editorial Nocturne

## 1. Triết Lý Thị Giác (Visual Direction & Domain Exemplars)

CineX được định hình bởi khoảnh khắc **"Khi ánh đèn kháng phòng vừa tắt và chùm sáng máy chiếu đầu tiên rọi lên màn bạc"**. Thay vì đi theo lối mòn giao diện rạp chiếu thương mại rối mắt hoặc trang đích AI chung chung (gradient tím-xanh, thẻ kính mờ vô hồn), CineX kết hợp hai nguồn cảm hứng:
1. **Premiere (Đêm Công Chiếu IMAX / Dolby):** Nền đen kháng phòng sâu (`#09090B`), chùm tia sáng máy chiếu (`Projector Cone`) phản chiếu sắc màu chủ đạo từ poster phim đang tiêu điểm, cùng sắc đỏ nhung ghế rạp (`#E11D48`) và ánh vàng kim loại của cuộn phim/vé danh dự (`#F59E0B`).
2. **Editorial (Tạp Chí Điện Ảnh A24 / Criterion / MUBI):** Bố cục bất đối xứng có chủ đích, khoảng nghỉ thị giác rộng rãi, hệ thống chữ hỗ trợ trọn vẹn dấu tiếng Việt, và cấu trúc **Cuống Vé Đục Lỗ (Perforated Ticket Stub)** xuyên suốt từ khu vực Chọn Suất Chiếu đến Sân Khấu Kiến Trúc Phòng Chiếu.

---

## 2. Bảng Màu & Độ Tương Phản Đã Kiểm Chứng (Color Palette & WCAG AA Contrast)

| Token | Mã màu | Vai trò ngữ nghĩa | Độ tương phản trên `#09090B` / `#121216` |
|---|---|---|---|
| `--color-bg-primary` | `#09090B` | Nền kháng phòng chính (Obsidian Auditorium) | — |
| `--color-bg-secondary` | `#121216` | Bề mặt thẻ phim, thanh Dock đặt vé, hộp thoại | — |
| `--color-surface-elevated` | `#18181F` | Bề mặt thẻ khi hover / актив, tab đang chọn | — |
| `--color-text-primary` | `#FAFAFA` | Tiêu đề phim, giờ suất chiếu, văn bản chính | **19.3 : 1** (Đạt AAA) |
| `--color-text-secondary` | `#B4B4BE` | Mô tả phim, địa chỉ rạp, thông tin phụ | **9.8 : 1** (Đạt AAA) |
| `--color-text-muted` | `#8E8E9A` | Nhãn metadata, chú thích, trạng thái trống | **6.1 : 1** (Đạt AA — thay thế `zinc-500` cũ chỉ đạt 4.1:1) |
| `--color-accent-cta` | `#E11D48` | Nút hành động chính (Đặt vé, Chọn suất chiếu) | **4.8 : 1** với chữ trắng `#FFFFFF` in đậm (Đạt AA) |
| `--color-accent-gold` | `#F59E0B` / `#FBBF24` | Nhãn IMAX, định dạng 3D, điểm thưởng, viền vé VIP | **10.9 : 1** trên nền `#09090B` (Đạt AAA) |

---

## 3. Quy Tắc Chữ Tiếng Việt & Kỷ Luật Số Học (Vietnamese Typography & Numerals)

1. **Bảo toàn dấu tiếng Việt (`Vietnamese Diacritics Safety`):**
   - Với `Barlow Condensed` (tiêu đề Hero và Section): **Cấm dùng `line-height < 1.1` kết hợp `uppercase`** vì sẽ cắt mất dấu chồng (`Ấ`, `Ể`, `Ỗ`, `Ự`). Bắt buộc sử dụng `line-height: 1.12` trở lên và `padding-top: 0.08em` khi đặt trong khung có `overflow: hidden`.
   - Với thể loại phim, tên rạp và nhãn nút bấm tiếng Việt: ưu tiên `Plus Jakarta Sans` (`font-sans`) ở kiểu chữ viết hoa chữ cái đầu (Sentence/Title Case) thay vì ép toàn bộ chữ in hoa nén chặt.
2. **Kỷ luật chữ số (`font-variant-numeric: tabular-nums`):**
   - Bắt buộc áp dụng lớp `.tabular-nums` cho mọi khung giờ chiếu (`18:30`, `20:45`), thời lượng (`166 phút`), ngày tháng (`09/11`), giá tiền (`69.000 ₫`, `130.000 ₫`) và bộ đếm bước đặt vé để các con số luôn thẳng hàng tuyệt đối.

---

## 4. Ngôn Ngữ Hình Học Đặc Trưng: Cuống Vé & Ánh Sáng Máy Chiếu

1. **Projector Beam Ambient Glow:** Phía sau Hero là luồng sáng hình nón nhẹ (`conic-gradient` + `radial-gradient` thuần CSS, chỉ biến đổi `opacity`) lấy cảm hứng từ máy chiếu phim, tự động đổi sắc độ ấm/lạnh theo phim tiêu điểm đang chọn.
2. **Perforated Ticket Stub (`ticket-stub-card`):** Các thẻ Suất chiếu, thẻ Combo/Voucher thật và bảng Chọn Hạng Ghế sử dụng đường cắt bán nguyệt hai bên mép và đường kẻ đứt nét mô phỏng rãnh xé vé điện ảnh truyền thống kết hợp độ chính xác kỹ thuật số.
3. **Interactive Auditorium Sightline Stage:** Thay cho ảnh stock ngoại lai, khu vực Trải nghiệm Phòng chiếu sử dụng sơ đồ mặt cắt kiến trúc SVG tương tác cho phép khách thử chuyển đổi giữa 3 hạng ghế thật trong cơ sở dữ liệu (`Ghế Thường Standard`, `Ghế VIP Trung tâm +20.000 ₫`, `Ghế Đôi Sweetbox Hàng F +40.000 ₫`) và quan sát góc nhìn màn hình IMAX / 2D-3D tương ứng.
