# 04 — Đặc Tả Chuyển Động & Quyền Sở Hữu Hoạt Ảnh (Phase 8 Motion Specification)

---

## 1. Triết Lý & Ngân Sách Chuyển Động (Motion Philosophy & Budget)

1. **Nguyên tắc Đơn Chủ Sở Hữu (`Single-Owner Rule`):**
   - Mỗi phần tử DOM chỉ được điều khiển chuyển động bởi **một cơ chế duy nhất** tại một thời điểm: hoặc CSS transition/animation, hoặc thư viện `motion` (`Framer Motion`). Tuyệt đối không kết hợp `transition-transform` của Tailwind cùng lúc với `motion.div` điều khiển `transform` trên cùng một nút DOM.
2. **Chỉ Biến Đổi Thuộc Tính Ghép Lớp (`Compositor-Only Properties`):**
   - Mọi hoạt ảnh liên tục hoặc theo thao tác chỉ được phép thay đổi `transform` (`translate3d`, `scale`, `rotateX`, `rotateY`) và `opacity`. Không biến đổi `top`, `left`, `width`, `height` hay `box-shadow` theo từng khung hình.
3. **Ngân Sách Hoạt Ảnh Đồng Thời (`Concurrent Animation Budget`):**
   - Tối đa **2 hoạt ảnh nền/chuyển cảnh** diễn ra đồng thời trong một khung nhìn.
   - Không sử dụng `backdrop-filter: blur()` trên các phần tử đang di chuyển liên tục; chỉ áp dụng `backdrop-blur` trên thanh `Header` cố định và lớp phủ hộp thoại tĩnh.

---

## 2. Bảng Phân Quyền Hoạt Ảnh & Biến Thể Giảm Chuyển Động (Animation Ownership Table)

| Thành phần / Hiệu ứng | Nguồn kỹ năng áp dụng | Chủ sở hữu kỹ thuật (Owner) | Thuộc tính biến đổi | Thời lượng & Đường cong (Easing) | Hành vi khi `prefers-reduced-motion: reduce` hoặc Thiết bị cảm ứng |
|---|---|---|---|---|---|
| **1. Luồng sáng máy chiếu Hero (`Projector Beam Glow`)** | `akit-design` + `stageshow` | **CSS thuần** (`.projector-beam`) | `opacity` | `600ms cubic-bezier(0.22, 1, 0.36, 1)` khi đổi phim tiêu điểm | Giữ nguyên ánh sáng tĩnh (`opacity: 0.75`), tắt hoàn toàn hiệu ứng nhấp nháy/chuyển màu. |
| **2. Chuyển đổi Phim Tiêu Điểm trên Hero (`Hero Slide Transition`)** | `motion-primitives` | **`motion` (`AnimatePresence` / `motion.div`)** | `opacity`, `transform: translateY(10px -> 0)` | `360ms cubic-bezier(0.22, 1, 0.36, 1)` | Chỉ chuyển `opacity` tức thì (`120ms`), **tắt tự động chuyển slide (`auto-advance = false`)**. |
| **3. Hiệu ứng Nghiêng 3D Thẻ Phim (`3D Poster Tilt & Glare`)** | `react-bits` (`TiltedCard`) | **Inline CSS Variables** (`--rx`, `--ry`, `--gx`, `--gy`) cập nhật qua `onPointerMove` | `transform: perspective(900px) rotateX(...) rotateY(...)` | Phản hồi trực tiếp trên `pointer: fine`, trả về `0deg` trong `240ms` khi `onPointerLeave` | **Vô hiệu hóa hoàn toàn** (`rotateX(0) rotateY(0)`) trên màn hình cảm ứng (`pointer: coarse`) và khi bật `prefers-reduced-motion: reduce`. |
| **4. Ánh sáng Viền Thẻ theo Con Trỏ (`Radial Card Spotlight`)** | `motion-primitives` (`Spotlight`) | **CSS Radial Gradient** qua biến `--spot-x`, `--spot-y` | `opacity` của lớp phủ viền sáng | `200ms ease-out` | Hiển thị viền nhấn tĩnh khi `:hover` hoặc `:focus-visible`, không chạy theo chuột. |
| **5. Chuyển đổi Hạng Ghế trên Sơ đồ Mặt cắt Phòng chiếu (`Auditorium Sightline Stage`)** | `stageshow` + `magic-ui` | **CSS SVG Transition** | `opacity`, `transform: scale(...)` trên vùng ghế & chùm tia nhìn | `280ms cubic-bezier(0.22, 1, 0.36, 1)` | Đổi trạng thái nổi bật tức thì không thu phóng. |
| **6. Cuống Vé Suất Chiếu khi Chọn (`Showtime Ticket Stub Hover/Press`)** | `motion-primitives` (`BorderTrail` / `AnimatedBackground`) | **CSS Transition** (`.ticket-stub-btn`) | `transform: translateY(-2px)`, `border-color`, `background-color` | `160ms cubic-bezier(0.22, 1, 0.36, 1)` | Chỉ đổi màu nền và viền rõ nét, không dịch chuyển vị trí (`translateY(0)`). |
| **7. Hộp thoại Xem Trailer (`Trailer Facade Modal`)** | `akit-react` (`useModalA11y`) | **CSS Transition** | `opacity` | `200ms ease-out` | Hiển thị/ẩn tức thì. |

---

## 3. Quy Tắc Tạm Dừng Tự Động Chuyển Cảnh (Carousel Pause Contract)

Carousel tiêu điểm trên Hero tuân thủ nghiêm ngặt chuẩn **WAI-ARIA Authoring Practices Guide (APG)**:
1. Mặc định chu kỳ chuyển phim là `7000ms` (đủ lâu để đọc tiêu đề và tóm tắt tiếng Việt).
2. Tự động **tạm dừng ngay lập tức** khi:
   - Con trỏ chuột đang di vào vùng Hero (`onMouseEnter`),
   - Bất kỳ phần tử con nào trong Hero đang nhận tiêu điểm bàn phím (`onFocusCapture`),
   - Hộp thoại Trailer đang mở (`trailerMovie !== null`),
   - Người dùng đã nhấn nút **`Tạm dừng tự chuyển`**,
   - Hệ điều hành hoặc trình duyệt bật `prefers-reduced-motion: reduce`.
