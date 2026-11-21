---
description: Always-on AKit routing, mandatory GitHub OSS prior-art gate, Karpathy 4 laws, and Superpowers TDD workflow
trigger: always_on
---
<!-- AKIT:START -->
# AKit Engineering Rules (Antigravity, Superpowers & Karpathy Deep Edition)

## 1. Proactive Skill Routing & Auto Slash-Workflow Orchestration (`akit-router`)
- Start every nontrivial request by reading `.agents/skills/akit-router/SKILL.md`: evaluate all installed skills, propose the optimal 2–4 skill strategy, and automatically execute the native tool workflow matching Antigravity slash commands (`/grill-me` -> `ask_question`, `/plan` -> `implementation_plan.md` artifact, `/boost` -> `akit-debate`, `/teamwork` -> `invoke_subagent`, `/goal` -> SDD ledger, `/browser` -> `akit-browser-qa`).

## 2. Mandatory Rule: Không viết từ con số 0 (`akit-prior-art`)
- **QUY TẮC BẮT BUỘC:** *"Đối với những chức năng chưa quen thuộc, đừng viết từ con số 0, hãy tìm kiếm các dự án mã nguồn mở trên GitHub để so sánh ý tưởng trước khi bắt tay vào làm."*
- Always run `.agents/skills/akit-prior-art/SKILL.md` before designing or coding unfamiliar capabilities: compare 2–3 mature GitHub OSS repositories, inspect source + tests, check licenses, and decide **Adopt / Adapt / Build**.

## 3. Andrej Karpathy's 4 Laws Against LLM Coding Slop (`multica-ai/andrej-karpathy-skills`)
1. **Think Before Coding** *(Don't assume. Don't hide confusion. Surface tradeoffs)*: State assumptions explicitly and ask when multiple interpretations exist.
2. **Simplicity First** *(Minimum code that solves the problem. Nothing speculative)*: No single-use abstractions, unrequested flexibility, or speculative features.
3. **Surgical Changes** *(Touch only what you must. Clean up only your own mess)*: Every changed line must trace directly to the user's request; never reformat or refactor adjacent unrelated code.
4. **Goal-Driven Execution** *(Define success criteria. Loop until verified)*: Turn imperative tasks into `[Step] -> verify: [test command]` loops (`akit-test` & `akit-eval --mode karpathy`).

## 4. Deep `obra/superpowers` Workflow
- Enforce `akit-requirements` -> `akit-plan` (with `Consumes`/`Produces` interfaces & Pre-flight Conflict Scan) -> `akit-implement` (strict `RED -> GREEN -> REFACTOR` TDD + SDD Ledger `.superpowers/sdd/<plan>/progress.md` + 5-Round Fix Loop Breaker) -> `akit-simplify` -> `akit-review` (Two-Stage Review, zero performative agreement) -> `akit-git` (Worktree isolation & 3-option branch completion menu).

## 5. Six (6) Hard Engineering & Production Safety Gates (Bắt buộc)
1. **Strict Type Safety:** Cấm tuyệt đối `any`, `as any`, `<any>`, `@ts-ignore`, `@ts-expect-error` không có ngoại lệ được phê duyệt (`// APPROVED-ANY: <lý do & người duyệt>`); bắt buộc bật TypeScript `"strict": true` và ESLint (`@typescript-eslint/no-explicit-any`).
2. **Multi-tenant Security:** Mọi API đọc/sửa/xóa (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`) dữ liệu cá nhân phải lọc theo `userId`/`tenantId` từ phiên xác thực và **bắt buộc có bài test truy cập chéo tài khoản** (User A truy cập/sửa/xóa tài nguyên của User B phải trả về `403`/`404` và không làm biến đổi dữ liệu của User B).
3. **Business Invariants:** Mọi thao tác Tạo/Sửa/Xóa phải kiểm tra quan hệ dữ liệu (thực thể liên kết tồn tại, đang hoạt động và thuộc cùng chủ sở hữu), trạng thái hợp lệ (State Machine) và ràng buộc nghiệp vụ/kế toán (cập nhật đồng bộ số dư/tổng hợp).
4. **Safe Database Operations:** Kiểm tra đầy đủ 4 yếu tố `foreign key` (kèm index), `cascade` (`ON DELETE RESTRICT / SET NULL / CASCADE` rõ ràng), `transaction` (`$transaction` / `BEGIN...COMMIT` nguyên tử cho thao tác ghi đa bảng), và `concurrency` (atomic conditional update / `SELECT ... FOR UPDATE` / optimistic locking `version`) trước mọi thao tác ghi nhạy cảm.
5. **Independent Review:** Agent viết code **không tự coi việc tự review là đủ**; bắt buộc dùng reviewer độc lập (`invoke_subagent` với `akit-critic` và/hoặc `akit-security` trên gói diff `BASE_SHA..HEAD_SHA`) cho mọi thay đổi quan trọng.
6. **Evidence-based Completion & 100% Test Pass Gate:**
   - Không được báo hoàn thành khi chưa có kết quả thực tế của cả 4 cổng: `typecheck`, `lint`, `test` (**bắt buộc 100% test case đều pass**, `0 failed`, cấm `.skip` để lách test) và `review` (`akit-eval --mode gates`).
   - Trường hợp cổng nào không chạy được do môi trường, bắt buộc báo rõ là **`CHƯA XÁC MINH (UNVERIFIED)`** kèm nguyên nhân cụ thể.
   - **Bắt buộc ở cuối mỗi lượt báo cáo hoàn thành:** Xuất bảng **Báo cáo Xác minh & Cổng Kỹ thuật (Final Verification & Engineering Gates Report)** tổng hợp kết quả thực tế của `Typecheck`, `Lint`, `Test Suite (100% Pass)`, `Multi-tenant & Invariants`, `DB Safety`, `Independent Review`, và `Git Flow Status`.

## 6. Quy tắc Git Flow Chuyên nghiệp & Chủ động Khuyến nghị (`akit-git`)
- Khi bắt đầu tính năng mới, sửa lỗi hoặc làm việc trên repository, Agent **chủ động recommend và hỏi người dùng** (qua `ask_question` hoặc gợi ý ngắn gọn) xem có muốn áp dụng **Git Flow chuyên nghiệp** không (`main`, `develop`, `feature/<slug>`, `bugfix/<slug>`, `release/vX.Y.Z`, `hotfix/<slug>`, chuẩn **Conventional Commits** `feat(scope):` / `fix(scope):` / `test(scope):`, và cô lập nhánh bằng `.worktrees/`).
<!-- AKIT:END -->
