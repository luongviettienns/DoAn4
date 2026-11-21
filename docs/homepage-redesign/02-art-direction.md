# 02 — Định Hướng Nghệ Thuật & Ma Trận Năng Lực Kỹ Năng (Phase 2 & 3 Art Direction)

---

## 1. Ma Trận Năng Lực Kỹ Năng & Thư Viện (Capability Matrix — `[EVIDENCE]`)

Toàn bộ 21 kỹ năng dưới đây đã được mở và đọc trực tiếp tệp `SKILL.md` (cùng các tài liệu tham chiếu) trong phiên làm việc này trước khi thiết kế:

| Nhóm | Kỹ năng (`SKILL.md` đã đọc) | Ứng dụng cụ thể trên Trang chủ CineX |
|---|---|---|
| **Kiến trúc & Thiết kế hệ thống** | `akit-router`, `akit-design`, `frontend-design` | Xây dựng hệ thống token kép `DESIGN.md`, kiểm soát tỷ lệ tương phản WCAG AA, chống rập khuôn AI (Anti-Slop), đảm bảo dấu tiếng Việt trên font `Barlow Condensed` + `Plus Jakarta Sans`. |
| **3 Kỹ năng UI & Motion chuyên sâu (Yêu cầu cốt lõi)** | `magic-ui`, `motion-primitives`, `react-bits` | • **`magic-ui`**: Bento Grid bất đối xứng cho khu vực Công nghệ phòng chiếu & Ưu đãi thật; hiệu ứng viền sáng tinh tế trên vé.<br>• **`motion-primitives`**: `Spotlight` theo con trỏ chuột (fine-pointer), `AnimatedBackground` trượt mượt giữa các tab lọc phim và ngày chiếu, `BorderTrail` trên cuống vé đang chọn.<br>• **`react-bits`**: `TiltedCard` nghiêng 3D nhẹ theo chuột trên thẻ poster phim (tự động tắt trên cảm ứng & `prefers-reduced-motion`). |
| **Dựng cảnh sản phẩm (Faux/Interactive Stage)** | `stageshow` | Thiết kế **Sân Khấu Kiến Trúc Phòng Chiếu Tương Tác (Interactive Auditorium Sightline & Seat-Tier Explorer)** bằng đồ họa vector SVG/CSS nguyên bản thay thế hoàn toàn ảnh stock Unsplash. |
| **Kỹ thuật React 19 & Tailwind v4** | `akit-react`, `vercel-react-best-practices`, `vercel-composition-patterns`, `tailwind-4-docs`, `frontend-code-review` | Quản lý trạng thái qua URL/state đồng bộ, hủy request cũ bằng `AbortController`, tách tải lười (`React.lazy`) các dashboard quản trị khỏi bundle khách hàng, cấu hình `@theme` chuẩn Tailwind v4. |
| **Hiệu năng, Kiểm thử & Đánh giá** | `akit-performance`, `akit-browser-qa`, `playwright-cli`, `e2e-testing`, `akit-test`, `akit-review`, `akit-eval`, `verification-before-completion`, `akit-git` | Kiểm thử đơn vị Vitest + kiểm thử trực quan trên trình duyệt thật Playwright Chromium qua 6 độ phân giải và chế độ giảm chuyển động (`reducedMotion: 'reduce'`). |

### Đánh giá Thư viện Hiện Có trong `frontend/package.json`
- Đã cài sẵn: `react ^19.2.8`, `react-dom ^19.2.8`, `motion ^12.38.0`, `lucide-react ^1.16.0`, `tailwindcss ^4.2.2`.
- **Quyết định phụ thuộc (Dependency Gate):** **Không cài đặt thêm bất kỳ gói npm runtime mới nào (`0 KB` overhead).** Các mẫu tương tác từ `magic-ui`, `motion-primitives` và `react-bits` được hiện thực hóa trực tiếp trên nền `motion` + CSS/SVG nguyên bản đã có sẵn trong dự án.

---

## 2. Đánh Giá 3 Phương Án Định Hướng Nghệ Thuật (Directions A / B / C)

| Tiêu chí (Thang điểm 1–5) | **Hướng A: Premiere Nocturne** *(Đêm công chiếu IMAX, ánh sáng máy chiếu đỏ-vàng kim, kịch tính)* | **Hướng B: Editorial Film House** *(Tạp chí điện ảnh A24/MUBI, bố cục biên tập, cuống vé đục lỗ, chữ tinh tế)* | **Hướng C: Neon Cyber Multiplex** *(Tương lai viễn tưởng, ánh đèn neon xanh-tím, hiệu ứng hạt dày đặc)* | **Hướng Kết Hợp Độc Bản: Premiere × Editorial** *(Chấm điểm tổng hợp)* |
|---|:---:|:---:|:---:|:---:|
| **1. Sự khác biệt & Cá tính thương hiệu** | 4.5 | 4.5 | 2.5 *(dễ giống AI landing page)* | **5.0** |
| **2. Tốc độ khám phá & Đặt vé (Conversion)** | 4.0 | 5.0 | 3.0 | **5.0** |
| **3. Khả năng đọc dấu Tiếng Việt** | 4.0 | 5.0 | 3.5 | **5.0** |
| **4. Tính khả thi với dữ liệu API thật** | 4.5 | 5.0 | 3.0 | **5.0** |
| **5. Hiệu năng & Chi phí bảo trì** | 4.5 | 5.0 | 2.5 | **4.8** |
| **Tổng điểm (`/ 25`)** | **21.5 / 25** | **24.5 / 25** | **14.5 / 25** | **24.8 / 25 (CHỌN)** |

### Lý do chọn hướng kết hợp **Premiere × Editorial Nocturne**
- Giữ trọn bầu không khí hồi hộp khi đèn rạp vừa tắt của **Hướng A (Premiere)** thông qua luồng sáng máy chiếu (`Projector Beam`) và bảng màu `#09090B` / `#E11D48` / `#F59E0B`.
- Kết hợp kỷ luật biên tập và ngôn ngữ hình học **Cuống Vé Đục Lỗ (`Perforated Ticket Stub`)** của **Hướng B (Editorial)** để biến thanh **Booking Dock** và **Lịch Suất Chiếu** thành tâm điểm chuyển đổi rõ ràng, sang trọng và dễ thao tác chỉ trong vài giây.

---

## 3. Hệ Thống Token Thiết Kế & Bảng Tương Phản (Contrast Verification)

- **Nền chính (`--color-bg-primary`):** `#09090B`
- **Nền thẻ & khu vực đặt vé (`--color-bg-secondary`):** `#121216`
- **Nền thẻ nổi bật (`--color-surface-elevated`):** `#18181F`
- **Chữ chính (`--color-text-primary`):** `#FAFAFA` → Tương phản **19.3:1** trên `#09090B` (WCAG AAA).
- **Chữ phụ (`--color-text-secondary`):** `#B4B4BE` → Tương phản **9.8:1** trên `#09090B` (WCAG AAA).
- **Chữ chú thích (`--color-text-muted`):** `#8E8E9A` → Tương phản **6.1:1** trên `#09090B` và **5.3:1** trên `#121216` (Đạt chuẩn WCAG AA cho mọi kích thước chữ, khắc phục triệt để các nhãn mờ `zinc-500` cũ).
- **Màu nhấn hành động (`--color-accent-cta`):** `#E11D48` (chữ trắng `#FFFFFF` đậm: **4.8:1** — Đạt AA).
- **Màu nhấn vàng kim (`--color-accent-gold`):** `#F59E0B` / `#FBBF24` trên nền tối (**10.9:1** — Đạt AAA).

---

## 4. Quy Tắc Chữ Tiếng Việt & Số Học (`§9.2`)

1. **Tiêu đề Hero (`<h1>`) và Tiêu đề Phân cảnh (`<h2>`):**
   - Sử dụng `font-display` (`Barlow Condensed`), `font-weight: 700–800`, `line-height: 1.12` (tuyệt đối không thấp hơn `1.10`), `letter-spacing: 0.01em`, kèm khoảng đệm đỉnh an toàn để dấu `Ấ`, `Ể`, `Ỗ`, `Ự` không bao giờ bị cắt.
2. **Thân bài, Nhãn điều khiển & Thể loại phim:**
   - Sử dụng `font-sans` (`Plus Jakarta Sans`), `line-height: 1.55`.
3. **Chữ số đồng폭 (`tabular-nums`):**
   - Áp dụng trên toàn bộ giờ suất chiếu (`18:30`), thời lượng (`166 phút`), ngày (`09/11`), giá ghế/combo (`+20.000 ₫`, `69.000 ₫`) và chỉ số bước.

---

## 5. Trạng Thái Cổng Kiểm Soát (`[GATE 2 & GATE 3]`)

- [x] Ma trận kỹ năng đã được xác thực thực tế từ các tệp `SKILL.md`.
- [x] 3 định hướng nghệ thuật đã được chấm điểm khách quan và chọn **Premiere × Editorial Nocturne**.
- [x] Hệ thống token và quy tắc chữ tiếng Việt đã được định nghĩa đầy đủ trong `DESIGN.md`.
- **Kết luận Gate 2 & Gate 3:** **ĐẠT (PASSED)**.
