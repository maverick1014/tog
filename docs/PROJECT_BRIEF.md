# TOG · Church Management System — Master Brief

> **单一交接文档 / Single hand-off document.**
> Give this file to **Claude (design)** to produce the visual design, then give the
> design + this file to **Claude Code** to build it. Everything needed is here.
>
> Project repo: `maverick1014/tog` · Working branch: `claude/church-management-system-872rok`
> Reference prototype (already built): `docs/prototype.html`
> Full Chinese spec: `docs/需求规格说明书.md`

---

## 0. How to use this document

**Phase 1 — Design (Claude / "Claude Design"):**
Use §2 (Brand), §3 (Identity model), §5 (Modules), §7 (Screens) and §9 (Personas) to
design every screen. Deliver high-fidelity, **all-Chinese** mockups (light + dark,
mobile-first). A working reference prototype already exists at `docs/prototype.html` —
match or improve on its structure and brand. Do **not** change the data model or the
identity rules in §3; design *around* them.

**Phase 2 — Build (Claude Code):**
Implement the approved design against the architecture in §4, the data model in §6, and
the API in §8. The database schema in `supabase/migrations/0001_init.sql` is the source of
truth. UI copy is **Simplified Chinese**.

---

## 1. Project overview

A web app to manage a church's **people, gatherings, giving, training, and discipleship**,
with a distinctive **40-day one-on-one discipleship (四十天一对一守望)** program.

- **Church:** Tabernacle of Grace (中文名用「恩典会幕」). Tagline: *Discipling the Church to Disciple the World*（门训教会，广传世界）.
- **Users:** pastor (牧师), group leaders (小组长), assistant/intern leaders, admins/co-workers.
- **UI language:** **Simplified Chinese, everywhere.**
- **Auth:** **None yet** (open app). Design/build must leave room to add Supabase Auth + role-based permissions later.

### Core goals
1. One system for **人 / 聚会 / 奉献 / 培训 / 门训**.
2. Every member's **rank/身份** comes from a single place (the group setup page) — no double maintenance.
3. Every member has a **personal training record** (what they attended + progress).
4. Trainings are **fully customizable** (multiple sessions, a trainer, opt-in enrollment, admin-checked attendance, printable/checkable namelist).
5. **40-day discipleship** is a **cascade** the pastor can monitor in real time, and the mentor fills a **daily form via a private link** (no login).

---

## 2. Brand & visual identity

Derived from the church logo (a charcoal **globe** wrapped by a **crimson cross-arrow**, red "GRACE" wordmark).

### Palette (crimson + charcoal on warm white)
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| brand (crimson) | `#a51f24` | `#d94a4f` | primary actions, active nav, key data |
| brand-2 | `#7f171b` | `#c23c41` | gradients, hover |
| brand-soft | `#f6e3e3` | `#3a2422` | brand-tinted badges |
| accent (charcoal) | `#33302f` | `#cbc6c3` | secondary emphasis, data endpoints |
| rail (sidebar) | `#201d1b` | `#100e0d` | sidebar = the "globe" charcoal |
| paper | `#f6f3f2` | `#141211` | app background |
| surface | `#ffffff` | `#1c1917` | cards |
| border | `#e7e1df` | `#322d2b` | hairlines |
| ink | `#232120` | `#ece7e5` | text |
| muted | `#6f6a68` | `#a29b97` | secondary text |
| semantic good | `#2f8f5b` | `#4bab74` | present/approved/completed |
| semantic warn | `#c9871f` | `#d8a441` | pending/excused/needs-follow-up |
| semantic crit | `#d9482f` | `#e86b52` | absent/dropped (kept distinct from brand crimson) |

- **Brand mark:** a small globe (circle + meridians) with a subtle cross, crimson on white — echoes the logo.
- Semantic colors are **separate** from the brand crimson so "absent/danger" never reads as "brand".

### Typography (system CJK, no webfonts)
The Artifact/CSP blocks font CDNs and CJK webfonts are too large to inline, so use **system CJK fonts**:
- **Headings (display):** Chinese **serif** stack — `"Songti SC","STSong","Noto Serif CJK SC","SimSun",serif` (reverent, scripture-book feel).
- **Body / UI:** Chinese **sans** — `"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif`.
- Use `font-variant-numeric: tabular-nums` for figures.

### Rules
- **Light + dark themes**, both first-class (token-driven; a theme toggle stamps `data-theme`).
- **Mobile-first / fully responsive.** Sidebar collapses into a slide-in drawer (☰) on ≤820px; grids stack; wide tables scroll inside their own container.
- Classic admin shell: charcoal left nav, top bar (title + actions), summary-before-detail content.

---

## 3. Identity / role model (CRITICAL — do not change)

There are **two layers** of identity:

### 3.1 Church-level role (stored on the member)
- `pastor` (牧师) — church leadership; not tied to a group.
- `member` (一般成员) — everyone else; their real rank is derived from their group position.

### 3.2 In-group position (assigned per member in the **group setup page**)
The six ranks below are **NOT** free-standing member attributes. They are assigned to each
member **inside a group**, and that is the single source of truth:

`leader` 小组长 · `assistant_leader` 副组长 · `intern_leader` 实习组长 · `core_member` 核心成员 · `regular_member` 普通成员 · `new_member` 新成员

**Rules (enforce in UI + data):**
1. **Single source:** a member has at most one group and one in-group position. The role shown anywhere = `牧师` if pastor, else the group position, else `未分组`.
2. **One leader per position per group:** each group has at most one 小组长, one 副组长, one 实习组长. Assigning a new one auto-demotes the previous holder to 核心成员.
3. **Must be core first:** only a `核心成员` can be promoted to 小组长/副组长/实习组长. In the UI, leadership options are disabled until the person is 核心成员.
4. **Leadership team is derived** (never stored on the group) — computed from members' `group_position`.

> The member directory's "身份" column is **read-only / derived**. All rank editing happens in the group page.

---

## 4. Tech stack & architecture

| Layer | Tech |
| --- | --- |
| Web frontend | **Next.js** (App Router, React 19), all-Chinese UI |
| Backend API | **NestJS** (REST, prefix `/api`) |
| Database | **Supabase / PostgreSQL** — schema is the source of truth, managed via SQL migrations |
| Repo | **Monorepo** (npm workspaces): `apps/web`, `apps/api`, `packages/shared`, `supabase/` |

- Data access: NestJS uses `@supabase/supabase-js` (service-role, server-side). No end-user auth yet.
- Shared TypeScript types/enums in `packages/shared` keep frontend + backend in sync.
- Currency default (mock): **RM (MYR)** — confirm in §10.

### Repo layout
```
tog/
├── apps/web/        # Next.js (Chinese UI)
├── apps/api/        # NestJS API
├── packages/shared/ # shared types & enums
├── supabase/        # migrations/0001_init.sql (source of truth) + seed.sql
└── docs/            # this brief, the Chinese spec, prototype.html
```

---

## 5. Modules & features

### 5.1 Members directory (成员目录)
- Fields: 姓名(中/英)、邮箱、电话、性别、出生日期、**church_role**(牧师/一般成员)、状态(在册/慕道/停止聚会)、所属小组、加入日期、备注.
- List with **filter by 身份 (derived)** and **by 小组**, search by name.
- Create / edit / delete.
- **Member detail** = profile + **personal training record** (5.5) + discipleship pairs they're in.
- The 身份 shown is **derived** (see §3); it is not edited here.

### 5.2 Groups (小组管理) — the identity-allocation hub
- List groups (name, blurb, member count); **create / delete** groups.
- **Allocate members** into / out of a group.
- **Per-member position dropdown** (the six positions in §3.2) with rules 2 & 3 enforced.
- A derived **带领团队 (leadership team)** summary showing who is 小组长/副组长/实习组长.

### 5.3 Events & attendance (聚会与出席)
- Event types: 主日崇拜 / 聚会 / 祷告会 / 团契 / 其他; fields: 标题、说明、地点、开始/结束时间.
- List (upcoming vs past); create/edit/delete.
- **Attendance check-in**: per member mark 出席 / 请假 / 缺席; bulk save; simple counts.

### 5.4 Donations (奉献管理)
- Fields: 奉献人(可匿名)、金额、币种、类别(十一/主日/建堂/宣教/感恩…)、方式(现金/转账/刷卡/线上)、日期、备注.
- List with filter by member/fund; create/edit/delete.
- **Summary** by fund + total.

### 5.5 Trainings (培训课程) + personal record
- **Catalog:** name, 说明, 类别, **trainer**(讲师), **total_sessions**, **is_enrollable**, start/end dates.
- **Sessions:** a training can have **multiple sessions** (number, title, time, location, notes).
- **Enrollment:** member enrolls → `pending`; **admin approves** and tracks status (待审核/已通过/进行中/已完成/已退出) + progress 0–100.
- **Attendance / namelist:** admin marks attended per session; system **generates a checking namelist** (members × sessions grid with ✓).
- **Personal training record:** on each member's detail page — every training they enrolled in + status + progress.

### 5.6 40-day one-on-one discipleship (四十天一对一守望) — flagship
- **Program:** e.g. "四十天一对一守望", total_days = 40.
- **Cascade:** pastor mentors a group leader → that leader mentors the assistant → each trained person mentors the next, until everyone has done it. Lineage tracked by `parent_pair_id`.
- **Pair:** `mentor → trainee` (one-to-one). A mentor may have multiple trainees (multiple pairs). One position per pair.
- **Pastor overview:** all pairs with % complete (days done / 40), status; real-time (DB view `discipleship_pair_summary`).
- **Cascade view:** a visual chain (第1棒 → 第2棒 → …) with each person's progress.
- **Daily form (standalone, private link — IMPORTANT):**
  - Each pair has an unguessable `form_token`. The mentor opens a **dedicated, mobile-first form page** at `/d/<token>` — **no login**.
  - The pastor-overview and the pair page provide **复制链接 / 打开表单** for each pair.
  - Form shows: pair info (带领者 ➜ 被带领者), progress bar, 40-day mini grid, and today's entry: **第几天 / 是否完成 / 反馈备注 / 提交**; then a thank-you state.
  - One `(pair, day_number)` is unique; re-submitting updates (idempotent).

---

## 6. Data model (PostgreSQL — source of truth)

Enums: `church_role(pastor,member)`, `group_position(leader,assistant_leader,intern_leader,core_member,regular_member,new_member)`, `member_status(active,inactive)`, `gender_type`, `event_type`, `attendance_status(present,absent,excused)`, `donation_method`, `enrollment_status(pending,approved,in_progress,completed,dropped)`, `pair_status(active,completed,paused)`.

Tables:
- `groups(id, name, description, created_at)` — **no leader columns** (derived).
- `households(id, name, address, phone, created_at)` — optional family grouping.
- `members(id, full_name, chinese_name, email, phone, gender, date_of_birth, church_role, status, group_id→groups, group_position, household_id→households, joined_at, notes, timestamps)`
  - `check (group_position is null or group_id is not null)`
  - **partial unique indexes**: one `leader` / one `assistant_leader` / one `intern_leader` per `group_id`.
- `events(id, title, description, event_type, location, starts_at, ends_at, created_at)`
- `event_attendance(id, event_id, member_id, status, checked_in_at, notes, unique(event_id,member_id))`
- `donations(id, member_id?, amount, currency, fund, method, donated_at, notes, created_at)`
- `trainings(id, name, description, category, trainer_id→members, total_sessions, is_enrollable, starts_on, ends_on, created_at)`
- `training_sessions(id, training_id, session_number, title, scheduled_at, location, notes, unique(training_id,session_number))`
- `training_enrollments(id, training_id, member_id, status, progress, enrolled_at, completed_at, notes, unique(training_id,member_id))`
- `training_attendance(id, session_id, member_id, attended, checked_at, notes, unique(session_id,member_id))`
- `discipleship_programs(id, name, description, total_days=40, created_at)`
- `discipleship_pairs(id, program_id, mentor_id→members, trainee_id→members, parent_pair_id?, status, start_date, form_token uuid unique, created_at, unique(program_id,trainee_id), check mentor≠trainee)`
- `discipleship_progress(id, pair_id, day_number, entry_date, completed, notes, timestamps, unique(pair_id,day_number))`
- View `discipleship_pair_summary` — per-pair days_completed + percent_complete for the pastor overview.

---

## 7. Screens (all Chinese)

| Route | Screen | Must show / do |
| --- | --- | --- |
| `/` | 仪表盘 Dashboard | KPIs (成员总数/在册/即将聚会/本月奉献/门训进行中), 身份分布图, 奉献趋势, upcoming events, discipleship progress |
| `/members` | 成员目录 | filter chips by 身份(derived) + 小组, search, table, create |
| `/members/[id]` | 成员详情 | profile + **个人培训档案** + 门训对子 |
| `/groups` | 小组管理 | group tabs, create/delete, member allocation, per-member 身份 dropdown (rules), derived 带领团队 |
| `/events` | 聚会与出席 | event cards + **点名** (出席/请假/缺席) |
| `/donations` | 奉献管理 | fund summary tiles + records table + create |
| `/trainings` | 培训课程 | catalog cards + create |
| `/trainings/[id]` | 培训详情 | sessions, enrollment approval, **核对名单** grid, per-session attendance |
| `/discipleship` | 四十天守望 | cascade chain, **牧者总览** (per-pair progress + 复制链接/打开表单), a pair's 40-day grid |
| `/discipleship/pairs/[id]` | 对子进度 | 40-day grid + cascade lineage (pastor view) |
| `/d/[token]` | 每日填写页（独立） | **standalone, mobile-first, no login** mentor daily form |

---

## 8. API (REST, prefix `/api`)

| Area | Endpoints |
| --- | --- |
| Members | `GET/POST /members`, `GET/PATCH/DELETE /members/:id`, `GET /members/:id/trainings` (filters: `church_role`, `group_position`, `group_id`, `q`) |
| Groups | `GET/POST /groups`, `GET/PATCH/DELETE /groups/:id` (member positions live on `members`) |
| Households | `GET/POST /households`, `GET/PATCH/DELETE /households/:id` |
| Events | `GET/POST /events`, `GET/PATCH/DELETE /events/:id`, `POST /events/:id/attendance` |
| Donations | `GET/POST /donations`, `GET /donations/summary`, `PATCH/DELETE /donations/:id` |
| Trainings | `GET/POST /trainings`, `GET/PATCH/DELETE /trainings/:id`, `GET /trainings/:id/namelist` |
| Sessions | `POST /trainings/:id/sessions`, `PATCH/DELETE /trainings/sessions/:sessionId`, `POST /trainings/sessions/:sessionId/attendance` |
| Enrollment | `POST /trainings/:id/enroll`, `PATCH/DELETE /trainings/enrollments/:enrollmentId` |
| Discipleship | `GET/POST /discipleship/programs`, `GET /discipleship/programs/:id/overview`, `GET/POST /discipleship/pairs`, `GET/PATCH/DELETE /discipleship/pairs/:id`, `POST /discipleship/pairs/:id/progress` |
| **Private form** | `GET /discipleship/form/:token`, `POST /discipleship/form/:token/progress` (no login) |

---

## 9. Personas / seed data (for realistic mockups)

Church: 恩典会幕. Pastor: **陈约翰 (牧师)**.
Groups: **恩典小组** (周六 15:00), **青年小组** (周五 20:00), **迦南小组** (周日 14:00).

| Name | Group | In-group position |
| --- | --- | --- |
| 陈约翰 | — | 牧师 (church-level) |
| 林玛丽 | 恩典小组 | 小组长 |
| 黄彼得 | 恩典小组 | 副组长 |
| 陈路得 | 恩典小组 | 核心成员 |
| 吴恩慈 | 青年小组 | 实习组长 |
| 王但以理 | 青年小组 | 核心成员 |
| 李撒母耳 | 青年小组 | 新成员 |
| 刘信实 | 迦南小组 | 小组长 |
| 张恩典 | 迦南小组 | 普通成员 |
| 郑喜乐 | 迦南小组 | 新成员 (慕道) |

Discipleship cascade (program 四十天一对一守望): 陈约翰→林玛丽 (31/40) → 林玛丽→黄彼得 (22/40) → 黄彼得→吴恩慈 (12/40) → 吴恩慈→王但以理 (5/40) → 王但以理→陈路得 (0/40).
Sample training: **门徒训练 101** (讲师 陈约翰, 3 场次: 得救确据 / 祷告 / 读经), enrollments with mixed statuses.
Donations: 十一奉献/主日奉献/建堂/宣教, methods 现金/转账/线上; monthly total ~ RM 8,650.

---

## 10. Open questions & current defaults

| # | Question | Current default (change if needed) |
| --- | --- | --- |
| 1 | Currency | **RM (MYR)** |
| 2 | Households module needed? | Modeled but optional; can hide in v1 |
| 3 | Training categories preset | 门徒 / 栽培 / 事奉 (free text otherwise) |
| 4 | Donation fund presets | 十一奉献 / 主日奉献 / 建堂 / 宣教 / 感恩 |
| 5 | Mentor can have multiple trainees? | **Yes** (multiple pairs) |
| 6 | Auth now? | **No** — add Supabase Auth + role permissions later |
| 7 | Traditional Chinese / English toggle? | Simplified Chinese only for v1 |
| 8 | Discipleship link: expiry / reset? | Long-lived; token resettable — **confirm** |
| 9 | Daily form: view/back-fill past days? | Prototype allows "再填一天"; confirm history/back-fill |

---

## 11. What already exists (starting point)

- `docs/prototype.html` — self-contained, clickable, **all-Chinese**, brand-correct, mobile-responsive prototype covering all screens above (incl. group allocation, namelist, cascade, 40-day grid, and the standalone `#/form/<pair>` daily form). **Use as the design reference.**
- `docs/需求规格说明书.md` — full Chinese requirements spec.
- `supabase/migrations/0001_init.sql` + `supabase/seed.sql` — schema (source of truth) + demo data.
- `apps/api` (NestJS) + `apps/web` (Next.js foundation) + `packages/shared` — scaffold consistent with the model above. Web UI still needs full build-out and Chinese localization.

---

## 12. Deliverables

**Design phase (Claude):** high-fidelity, all-Chinese mockups for every screen in §7, light + dark, mobile + desktop, using §2 brand and §3 rules. Keep the model in §3/§6 intact.

**Build phase (Claude Code):** implement the approved design in `apps/web` (Next.js, Chinese UI) against `apps/api` (NestJS) and the Supabase schema; wire the private discipleship form (`/d/[token]`); keep `packages/shared` types in sync; ensure responsive + dark mode. No auth in v1.
