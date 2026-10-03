# 07. Kế hoạch dự án, phân công và nghiệm thu

> Căn cứ: [01. Yêu cầu](01-tong-quan-va-yeu-cau.md), [02. Luồng F01–F19](02-luong-chuc-nang.md), [03. Màn hình](03-mo-ta-man-hinh.md), [04. Dữ liệu](04-thiet-ke-csdl.md), [05. API](05-thiet-ke-api.md), [06. Kiến trúc](06-kien-truc-he-thong.md) và [08. Quy ước phát triển](08-quy-uoc-phat-trien.md).
> Đây là kế hoạch đề xuất cho nhóm **4 người**, chưa phải cam kết tiến độ hay phân công theo tên thật. `TV1`–`TV4` là chỗ giữ tên; nhóm điền tên, xác nhận năng lực và điều chỉnh tải trước khi bắt đầu. Công nghệ đã chốt trong tài liệu 01 được giữ nguyên; công cụ, cơ cấu nhóm và cách triển khai bổ sung cần được nhóm phê duyệt.

## 1. Mốc thời gian và nguyên tắc ưu tiên

`T0` là ngày nhóm thống nhất backlog, có môi trường dùng chung và bắt đầu Sprint 1. Kế hoạch có **6 sprint, mỗi sprint 2 tuần**, tổng 12 tuần tương đối tính từ `T0`; không gán ngày lịch hoặc hạn nộp khi chưa có thông tin chính thức. Cuối mỗi sprint có bản demo chạy được, bằng chứng kiểm thử và quyết định chuyển cổng.

Ưu tiên thực hiện **Must → Should → Could** theo tài liệu 01. Một chức năng có thể chứa nhiều mức ưu tiên: F03 giữ ghế là Must nhưng combo/voucher là Should; F05 tạo vé QR là Must nhưng email xác nhận là Should; F06 lịch sử vé là Must nhưng hủy vé là Should. Không đánh dấu toàn bộ luồng đã xong chỉ vì phần Must đã xong.

Đường phụ thuộc chính:

```text
Yêu cầu + hợp đồng API + schema
  → tài khoản/RBAC + gán rạp + dữ liệu rạp/phòng/phim/giá
  → tạo suất và showtime_seats + duyệt phim/suất
  → tạo đơn/giữ ghế + job hết hạn
  → VNPay IPN + vé QR + lịch sử vé + soát vé
  → cổng MVP Must
  → Should được chọn: hủy/hoàn, email, combo/voucher, quầy, báo cáo, điểm
  → Could khi còn thời gian: gợi ý ML, đánh giá
```

Các thao tác an toàn như tạo yêu cầu hoàn tiền cho khoản đã thu nhưng không thể cấp vé vẫn phải có trong MVP thanh toán, dù hoàn tiền tự động và giao diện hủy vé tự phục vụ chưa làm. Nhật ký tối thiểu cho thao tác nhạy cảm được ghi từ backend trước; màn hình cấu hình/nhật ký đầy đủ thuộc Should. Quên/đặt lại mật khẩu thuộc F01 Must nên phải có cách gửi liên kết qua môi trường mail thử nghiệm, độc lập với email vé Should. Xác minh email khi đăng ký mặc định **tắt** theo phạm vi triển khai đề xuất.

## 2. Vai trò đề xuất cho nhóm 4 người

| Thành viên | Tên thật | Vai trò chính | Trách nhiệm và người dự phòng |
|---|---|---|---|
| TV1 | Chưa có — nhóm điền | Trưởng nhóm / Backend core | Chốt backlog và hợp đồng; auth/RBAC, đặt vé, transaction, tích hợp. TV2 dự phòng backend; không tự review thay đổi mình viết. |
| TV2 | Chưa có — nhóm điền | Backend management / Payments | Phim/rạp/phòng/suất/giá; VNPay, vé, hoàn tiền, báo cáo. TV1 dự phòng. |
| TV3 | Chưa có — nhóm điền | Frontend | React TypeScript, Redux Toolkit/RTK Query, layout ba actor, ghế/checkout/QR, tích hợp API. TV4 dự phòng smoke test và sửa lỗi giao diện đơn giản. |
| TV4 | Chưa có — nhóm điền | QA / ML / DevOps | Kịch bản nghiệm thu, test đồng thời, CI/môi trường/worker, dữ liệu demo; ML chỉ khi qua cổng Must và Should đã chọn. TV1 dự phòng triển khai; TV2 hỗ trợ dữ liệu. |

Mỗi task có một chủ trì, người phối hợp và reviewer khác chủ trì. TV4 chịu trách nhiệm điều phối chất lượng nhưng **mọi thành viên kiểm thử phần mình viết**. Cân tải theo năng lực thực tế; vai trò không giới hạn quyền đóng góp.

## 3. RACI theo workstream

**R** (Responsible): trực tiếp thực hiện. **A** (Accountable): chịu trách nhiệm quyết định và nghiệm thu cuối của workstream. **C** (Consulted): được trao đổi trước quyết định. **I** (Informed): được cập nhật kết quả. `A/R` nghĩa là vừa thực hiện vừa chịu trách nhiệm. **Mỗi hàng chỉ có đúng một A**; reviewer của PR vẫn phải độc lập với tác giả. Nhóm cùng xem demo, còn A ghi nhận kết quả cổng và người phê duyệt nghiệp vụ/giảng viên nếu có.

| Workstream | TV1 | TV2 | TV3 | TV4 |
|---|---|---|---|---|
| Phạm vi, backlog, quyết định thay đổi, tài liệu tích hợp | A/R | C | C | R |
| Schema, migration, dữ liệu seed, invariant transaction | A/R | R | I | C |
| Auth, RBAC và phạm vi rạp | A/R | R | R | C |
| Quản lý phim/rạp/phòng/suất/giá | C | A/R | R | C |
| Đặt vé, giữ ghế và xử lý hết hạn | A/R | R | R | C |
| VNPay, cấp vé, QR, hoàn tiền và soát vé | R | A/R | R | C |
| Frontend ba layout và trải nghiệm responsive | C | C | A/R | R |
| Should: combo/voucher/quầy/báo cáo/điểm | C | A/R | R | C |
| Could: ML và đánh giá | C | R | R | A/R |
| Kiểm thử hệ thống, CI, triển khai, sao lưu/khôi phục | R | C | R | A/R |

Khi đổi A, cập nhật bảng này và changelog trước khi bàn giao task; không để hai người cùng A hoặc không có A.

## 4. Ma trận chủ trì luồng F01–F19

`Chủ trì` là đầu mối giao hàng của cả luồng, phối hợp với TV3 cho các màn hình liên quan. Reviewer là người review nghiệp vụ/kỹ thuật chính; khi reviewer tham gia viết cùng PR, chọn thành viên còn lại thay thế.

| Luồng | Phạm vi giao hàng | Chủ trì | Phối hợp | Reviewer chính |
|---|---|---|---|---|
| F01 | Auth, hồ sơ, refresh/logout, reset mật khẩu; xác minh email tùy chọn | TV1 | TV3, TV4 | TV2 |
| F02 | Phim, tìm kiếm, bộ lọc, suất công khai | TV3 | TV2 | TV1 |
| F03 | Đặt vé, giữ ghế, giá snapshot; combo/voucher tách Should | TV1 | TV2, TV3 | TV4 |
| F04 | VNPay sandbox, return/IPN, callback muộn/lặp, nhiều lần thanh toán | TV2 | TV1, TV3, TV4 | TV1 |
| F05 | Vé/QR Must; outbox email/điểm theo Should | TV2 | TV3, TV4 | TV1 |
| F06 | Lịch sử/chi tiết Must; hủy và hoàn tiền thủ công Should | TV1 | TV2, TV3 | TV4 |
| F07 | Bán quầy, ghi nhận thu tiền, in/tra cứu vé | TV2 | TV3, TV4 | TV1 |
| F08 | Soát QR/mã tay, chống quét lại, giới hạn rạp/giờ | TV2 | TV3, TV4 | TV1 |
| F09 | Phim/thể loại, upload, ẩn và audit | TV2 | TV3 | TV1 |
| F10 | Rạp/phòng/ghế, gán rạp, bảo vệ cấu trúc đã sử dụng | TV2 | TV3 | TV1 |
| F11 | Suất, kiểm tra trùng lịch, sinh ghế, bảo vệ suất có vé | TV2 | TV1, TV3 | TV4 |
| F12 | Ma trận giá, hiệu lực, phụ thu, ngày lễ | TV2 | TV3 | TV1 |
| F13 | Voucher/combo, giới hạn lượt dùng, snapshot | TV2 | TV1, TV3 | TV4 |
| F14 | Doanh thu, lấp đầy, bộ lọc, xuất và đối chiếu số liệu | TV2 | TV3, TV4 | TV1 |
| F15 | Nhân sự, gán nhiều rạp, quyền, khóa/thu hồi phiên | TV1 | TV2, TV3 | TV4 |
| F16 | Cấu hình và audit; backend tối thiểu trước UI Should | TV1 | TV2, TV3 | TV4 |
| F17 | ML nội bộ, đánh giá thuật toán, timeout/fallback | TV4 | TV1, TV3 | TV2 |
| F18 | Đánh giá sau vé USED, một người/phim, duyệt ẩn | TV3 | TV2, TV4 | TV1 |
| F19 | Cron hết hạn, worker/outbox, retry và vận hành | TV4 | TV1, TV2 | TV1 |

## 5. Lộ trình 6 sprint và cổng giao hàng

Không chia backend làm xong toàn bộ rồi mới giao frontend. Chốt API trước mỗi lát chức năng; frontend dựng trạng thái/loading với mẫu hợp đồng, sau đó tích hợp ngay trong sprint. Mọi phần chưa qua cổng được đưa lại backlog, không coi tài liệu hoặc màn hình mock là tính năng hoàn tất.

| Sprint / thời gian tương đối | Mục tiêu và công việc | Deliverable cuối sprint | Gate và A |
|---|---|---|---|
| S1 / tuần 1–2 từ T0 | Chốt phạm vi Must; API/schema; scaffold theo 08; DB MySQL 8, migration/seed; F01 và F15 nền; CI và ba layout | Backlog có FR/BR/NFR; schema tham chiếu; DB sạch tạo được; đăng ký/đăng nhập/refresh/logout; seed actor/rạp; môi trường local | **G1 nền tảng**: dựng môi trường theo README triển khai; Prisma validate; migration/seed lặp được theo hướng dẫn; smoke auth; RBAC và gán rạp có test từ chối. A: TV1. |
| S2 / tuần 3–4 | F09–F12 Must; F02; bảo vệ suất/phòng và đồng thời tạo suất; hoàn thiện F01 hồ sơ/reset | Admin quản lý dữ liệu cốt lõi; public phim/suất; sơ đồ ghế và bảng giá; lịch chiếu có dữ liệu demo | **G2 nguồn dữ liệu**: quản lý tạo được suất rồi khách thấy được; hai thao tác tạo suất trùng phòng bị chặn; phim C bị chặn; giá/UTC/gán rạp đúng; reset token hết hạn và một lần. A: TV2. |
| S3 / tuần 5–6 | F03 Must + F19 nhả ghế; pending guard, idempotency; frontend chọn ghế/checkout; polling 5 giây | Đơn giữ ghế 10 phút, tối đa 8 ghế, giá snapshot, phục hồi đơn dở; job và đồng hồ server | **G3 giữ ghế**: hai khách cùng ghế chỉ một thành công; nhiều ghế rollback toàn bộ; hai tab một khách không có hai đơn dở/cùng suất; retry cùng key không tạo đơn mới; hết hạn/hủy nhả ghế. A: TV1. |
| S4 / tuần 7–8 | F04 sandbox; F05 vé/QR; F06 lịch sử; F08 soát; tích hợp toàn tuyến Must; xử lý tiền đã thu nhưng không cấp được vé | Demo khách đặt → VNPay → vé QR → nhân viên soát; return/IPN; log và yêu cầu hoàn tiền an toàn | **G4 MVP Must**: tất cả Must trong 01 có bằng chứng chấp nhận; chữ ký/số tiền sai bị từ chối; IPN lặp/muộn và success lần thanh toán thứ hai không tạo thêm vé; QR giả/quét đồng thời bị chặn; frontend không tự chốt PAID. A giao hàng tích hợp: TV1, TV2 ký xác nhận F04/F05. |
| S5 / tuần 9–10 | Chọn Should theo capacity: hủy/hoàn tiền thủ công, email qua outbox, combo/voucher, quầy, báo cáo/điểm, UI cấu hình/audit | Backlog Should đã chọn có acceptance; demo những phần hoàn tất; số liệu đối chiếu và thử retry mail | **G5 mở rộng**: G4 vẫn xanh; hủy/hoàn/điểm/voucher nhất quán khi lặp; quầy dùng chung cơ chế ghế; báo cáo khớp đơn; email lỗi không rollback vé. Phần không đủ thời gian được ghi chưa triển khai. A: TV2. |
| S6 / tuần 11–12 | Sửa lỗi/UAT, bảo mật, responsive/hiệu năng, runbook/restore; F17/F18 chỉ khi đủ dữ liệu và không đe dọa nghiệm thu | Bản demo đóng gói; dữ liệu seed; API/schema/tài liệu cuối; báo cáo kiểm thử, hướng dẫn chạy và slide/báo cáo theo yêu cầu học phần | **G6 bàn giao**: không có lỗi chặn release; người khác dựng bản demo từ hướng dẫn; restore DB thử thành công; Could có fallback và ghi đúng phạm vi nếu giao; người phụ trách đồng ý bằng chứng. A: TV4, TV1 chốt release. |

G4 là điều kiện bắt đầu lập trình Should có ảnh hưởng luồng đặt vé; trong S1–S3 có thể thiết kế trước schema/hợp đồng cho mở rộng nhưng không lấy thời gian thực hiện khỏi Must. G5 chỉ yêu cầu **Should mà nhóm đã chọn và cam kết**, không tự coi toàn bộ Should là bắt buộc. Could cần G4, G5 được chấp nhận, không còn lỗi ưu tiên cao và còn capacity rõ ràng. Nếu chậm: giảm Could trước, sau đó giảm Should chưa cam kết; thay đổi Must phải qua kiểm soát thay đổi và được người phê duyệt phạm vi đồng ý.

## 6. Definition of Ready (DoR)

Một task được kéo vào sprint khi đáp ứng đủ:

- Có mã F/FR liên quan, mức Must/Should/Could và mô tả kết quả người dùng nhận được.
- Có acceptance cho luồng thành công và ít nhất các ngoại lệ nghiệp vụ liên quan; chỉ rõ BR/NFR, actor và phạm vi rạp/ownership.
- API request/response/error/status nằm trong [05](05-thiet-ke-api.md); thay đổi dữ liệu có schema/migration dự kiến. API mới hoặc thay đổi breaking phải được TV1 và người liên quan thống nhất trước.
- UI có route, quyền, dữ liệu và bốn trạng thái theo [03](03-mo-ta-man-hinh.md); nếu chưa có UI thì ghi rõ đây là task backend.
- Dependency đủ dùng: dữ liệu seed, endpoint đầu vào, sandbox/SMTP giả lập nếu cần. Có test strategy thực tế, không phụ thuộc thanh toán thật.
- Một chủ trì, reviewer khác tác giả, ước lượng trong khả năng sprint; task quá lớn phải chia thành lát giao hàng có thể demo.
- Không có câu hỏi nghiệp vụ chưa xử lý có thể làm thay đổi acceptance. Câu hỏi còn lại có owner và mốc giải quyết.

## 7. Definition of Done (DoD)

Task chỉ Done khi acceptance đã được chứng minh và reviewer chấp nhận:

- Mã nguồn đã merge theo quy ước [08](08-quy-uoc-phat-trien.md), build/typecheck/lint và kiểm thử phù hợp thay đổi đều đạt; PR có cách kiểm chứng, issue và ảnh/demo nếu có UI.
- Đầu vào backend được validate; auth/RBAC, ownership và giới hạn rạp được kiểm thử cả trường hợp từ chối. Không lộ password hash, token, secret hoặc dữ liệu cá nhân trong response/log.
- Thay đổi ghế/tiền/vé có test transaction, tranh chấp hoặc retry phù hợp; callback idempotent; không dựa vào frontend hay return URL để xác nhận tiền.
- Schema, migration/SQL constraints, seed, OpenAPI và tài liệu bị ảnh hưởng cập nhật cùng thay đổi; thử migration trên DB thử nghiệm. Không sửa migration đã áp dụng trên môi trường chung.
- Giao diện có tải/rỗng/lỗi/thành công, xử lý mất mạng/hết hạn/xung đột; hiển thị VND nguyên và UTC → giờ Việt Nam đúng.
- Worker/job có cách chạy, retry/idempotency và log chẩn đoán; email/ML lỗi không làm hỏng luồng Must. Sao lưu/rollback hoặc phương án sửa tiến được ghi cho thay đổi rủi ro.
- Không còn lỗi chặn acceptance. Hạn chế còn lại có issue, mức ưu tiên và owner; không ghi Done cho phần chỉ mock hoặc chưa tích hợp.
- Demo được trên môi trường tích hợp với dữ liệu xác định. TV4 lưu bằng chứng kiểm thử; A của workstream ghi nhận nghiệm thu.

DoD cho task không thay thế gate của sprint: ví dụ từng endpoint có thể Done nhưng MVP chỉ đạt G4 sau khi toàn tuyến hoạt động.

## 8. Đăng ký rủi ro

Xác suất `Thấp/Trung bình/Cao` là đánh giá ban đầu, cập nhật mỗi tuần. Tác động `Cao` nghĩa là mất toàn vẹn tiền/ghế/quyền hoặc chặn nghiệm thu; `Trung bình` nghĩa là chậm một phần chức năng. Owner chịu trách nhiệm theo dõi trigger và mở hành động, không tự giải quyết toàn bộ.

| ID | Rủi ro | Owner | Xác suất | Tác động | Trigger theo dõi | Giảm thiểu / phản ứng |
|---|---|---|---|---|---|---|
| R01 | Bán trùng ghế hoặc nhiều đơn dở/cùng khách/suất | TV1 | Trung bình | Cao | Test đồng thời tạo hai đơn thành công cho một ghế; pending guard thiếu; rollback chỉ một phần | Transaction + cập nhật có điều kiện + UNIQUE/pending guard; test MySQL thật. Chặn G3/G4 và sửa invariant trước mở rộng. |
| R02 | IPN lặp/muộn, số tiền sai hoặc hai lần thanh toán cùng success | TV2 | Cao | Cao | Vé trùng; amount lệch; success sau hết hạn; hai payment success | Xác minh chữ ký/amount, khóa thứ tự nhất quán, txnRef mỗi lần, idempotency; RefundRequest theo payment cho khoản thừa. Lưu đối chiếu và không tự hoàn tiền thật. |
| R03 | Sandbox/IPN không gọi được localhost | TV2 | Cao | Cao | Không có IPN dù return thành công; tunnel đổi hostname | Chuẩn bị tài khoản sandbox và HTTPS tunnel sớm; cập nhật URL cấu hình; test fixture ký hợp lệ nội bộ và một E2E sandbox. Không dùng return làm nguồn xác nhận thay thế. |
| R04 | Trùng lịch phòng do hai quản lý thao tác đồng thời | TV2 | Trung bình | Cao | Hai suất giao nhau được commit; test khoảng dọn phòng sai | Kiểm tra giao khoảng trong transaction với khóa phòng; test tranh chấp/timestamp. Chặn G2. |
| R05 | Rò quyền rạp hoặc xem đơn/QR người khác | TV1 | Trung bình | Cao | Test IDOR/RBAC truy cập chéo rạp/khách thành công | Guard quyền ở backend và truy vấn có scope `user_cinemas`/owner; test negative cho từng actor; review độc lập. |
| R06 | Schema/API/frontend không khớp, migration phá dữ liệu | TV1 | Trung bình | Cao | DTO khác OpenAPI; migration chung thất bại; dữ liệu biến mất | Chốt hợp đồng, review thay đổi schema/API cùng PR; DB thử và backup trước migration; migration tiến mới, không reset DB chung. |
| R07 | Email/worker lỗi, job nhả ghế không chạy | TV4 | Trung bình | Trung bình/Cao | Outbox tồn lâu; retry liên tục; job quá hai chu kỳ không có log | Một worker MVP, cron idempotent, DB outbox retry có giới hạn/backoff và cảnh báo; ghế hết hạn vẫn được xử lý khi truy vấn/tạo đơn. Runbook khởi động lại và test worker restart. |
| R08 | Thiếu dữ liệu ML hoặc ML vượt thời gian phản hồi | TV4 | Cao | Trung bình | Không có lịch sử USED; metric chưa định nghĩa; timeout > 2 giây | Chỉ mở Could sau cổng; seed tổng hợp được ghi rõ; thuật toán đơn giản, timeout/fallback phim phổ biến; bỏ ML khi ảnh hưởng Must. |
| R09 | TV1/TV2 quá tải hoặc thành viên vắng | TV1 | Trung bình | Cao | Task chặn > 2 ngày làm việc; WIP tăng; không ai review | Giới hạn một task chính/người, pair và bàn giao sớm; chuyển task độc lập; giảm Could/Should qua backlog; không tự hạ tiêu chí Must. |
| R10 | Mở rộng phạm vi làm trễ MVP | TV1 | Cao | Cao | Should/Could được kéo trước G4; acceptance đổi giữa sprint | Change request có ảnh hưởng/phụ thuộc; đánh đổi công việc; A xác nhận và cập nhật kế hoạch. Giữ buffer S6 cho nghiệm thu. |
| R11 | Secret vào Git hoặc log; token frontend bị lưu bền | TV4 | Trung bình | Cao | Secret scan/PR thấy `.env`, JWT/VNPay/SMTP; localStorage có token | `.gitignore`, `.env.example` placeholder, scan CI; refresh HttpOnly cookie/access memory; thu hồi/rotate ngay khi lộ và báo owner. |
| R12 | Demo lỗi môi trường, thời gian/giá sai hoặc QR camera không hoạt động | TV3 | Trung bình | Cao | Dựng mới thất bại; lệch UTC+7; camera bị từ chối; màn mobile mất hành động | Seed tương đối thời điểm chạy; thử dựng trên máy khác; test biên ngày và VND; HTTPS/camera, mã tay dự phòng; giữ bản release và runbook đã thử. |

TV4 tổng hợp risk register trong buổi tuần; owner cập nhật xác suất, tác động, hành động, người hỗ trợ và thời điểm kiểm tra tiếp. Trigger xảy ra thì mở issue gắn risk ID trong cùng ngày làm việc; rủi ro toàn vẹn tiền/ghế/quyền chặn release.

## 9. Họp, tiến độ và lưu quyết định

| Nhịp | Thời lượng đề xuất | Nội dung / đầu ra | Điều phối |
|---|---|---|---|
| Mỗi ngày làm việc | 10–15 phút hoặc cập nhật async | Đã làm, sẽ làm, blocker và người cần hỗ trợ; không cần báo cáo giờ làm chi tiết | TV1 |
| Planning đầu sprint | 60–90 phút | Chọn task DoR theo dependency/capacity; owner/reviewer; mục tiêu và gate sprint | TV1 |
| Refinement + risk review mỗi tuần | 30–45 phút | Câu hỏi API/schema/nghiệp vụ, rủi ro, task quá lớn, thay đổi phạm vi | TV1, TV4 |
| Review/demo cuối sprint | 45–60 phút | Demo trên môi trường tích hợp; acceptance/evidence; A ghi pass/fail gate và thiếu sót | A theo sprint |
| Retrospective cuối sprint | 20–30 phút | Chọn tối đa 1–2 cải tiến có owner cho sprint sau | TV4 |

Board đề xuất: `Backlog → Ready → In progress → Review → Test → Done`, thêm nhãn `Blocked` kèm nguyên nhân và owner. Mỗi người tối đa một task chính đang làm; task phụ không được che dependency chặn luồng Must. Blocker quá một ngày làm việc được TV1 phân công hỗ trợ; vượt hai ngày thì đánh giá lại kế hoạch.

Mỗi issue ghi F/FR, acceptance, priority, dependency, chủ trì/reviewer và bằng chứng khi đóng. PR liên kết issue, các commit theo [08](08-quy-uoc-phat-trien.md). Nhóm tạo `CHANGELOG.md` khi có mã nguồn/release; hiện đây là **đầu ra cần tạo**, không phải file đã có. Changelog gồm phiên bản/mốc tương đối, Added/Changed/Fixed, migration/config mới và hạn chế. Quyết định kiến trúc ghi ADR với mã `ADR-xxx`, bối cảnh, lựa chọn, lý do, hệ quả, owner và trạng thái `proposed/accepted/superseded` trong `docs/decisions/` khi thư mục được tạo.

## 10. Kiểm soát thay đổi và lỗi

1. Người đề xuất mở `CR-xxx` (issue): mô tả vấn đề/kết quả, F/FR/BR/API/schema/UI bị ảnh hưởng, mức ưu tiên, effort, rủi ro, dependency và bằng chứng cần bổ sung.
2. Chủ trì workstream cùng TV3/TV4 đánh giá ảnh hưởng. TV1 kiểm tra thay đổi có phá hợp đồng, mất thời gian buffer hoặc ảnh hưởng cổng Must không.
3. A duy nhất của workstream quyết định kỹ thuật trong phạm vi được giao; **TV1 là A của thay đổi phạm vi và lịch**. Thay đổi yêu cầu đã chốt cần người phê duyệt nghiệp vụ/giảng viên nếu có. Chưa có người phê duyệt thật thì ghi `pending`, không tự ghi đã duyệt.
4. Nếu nhận thay đổi, xác định task thay thế/giảm tải và sprint đích; cập nhật yêu cầu/luồng/schema/OpenAPI/màn hình/kế hoạch liên quan trong cùng PR. Nếu hoãn/từ chối, ghi lý do và điều kiện xem lại.
5. Không thêm scope giữa sprint trừ lỗi chặn hoặc rủi ro tiền/ghế/quyền; khi thêm phải tái lập mục tiêu và acceptance của sprint. Một người không tự đổi API/BR bằng commit riêng mà thiếu trao đổi người dùng hợp đồng.

Mức lỗi: `P0` mất dữ liệu/secret/thu tiền sai hoặc bán trùng ghế; dừng release và ưu tiên khắc phục ngay. `P1` chặn Must hoặc vượt quyền; sửa trước cổng. `P2` chức năng có cách làm thay thế; lên lịch sprint gần nhất theo ảnh hưởng. `P3` cải thiện hiển thị/nội dung; xếp backlog. Mọi lỗi có cách tái hiện, expected/actual, môi trường, owner, bằng chứng sửa và reviewer; không gửi token/secret thật trong issue.

## 11. Hồ sơ bàn giao tối thiểu

- Mã nguồn theo tag/commit release và lockfile, schema/migration/seed; danh sách Must/Should/Could thực tế đã giao.
- Hướng dẫn dựng mới, `.env.example` placeholder, cách chạy API/frontend/worker và VNPay sandbox/tunnel; tuyệt đối không kèm secret thật.
- OpenAPI và tài liệu 01–08 nhất quán; báo cáo test gate, lỗi còn mở/rủi ro và người nhận bàn giao.
- Dữ liệu demo cho CUSTOMER/STAFF/MANAGER/ADMIN và nhiều rạp; tạo bí mật/tài khoản thử nghiệm tại môi trường demo, không hardcode mật khẩu dùng thật trong tài liệu.
- Runbook DB backup/restore, migration, job/outbox, tra cứu callback/hoàn tiền thủ công, khôi phục phiên và fallback ML nếu có.
- Kịch bản demo đặt vé thành công, ghế tranh chấp, IPN lặp/muộn, quét vé lại và truy cập sai quyền; báo cáo/slide theo yêu cầu học phần khi được cung cấp.
