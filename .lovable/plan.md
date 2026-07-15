# Course Platform Build Plan

Udemy-inspired course marketplace with role-based access, seeded catalog, and placeholder purchase/video flows.

## Design

- **Style**: Clean SaaS, Udemy-ish. Primary purple `#A435F0`, near-black `#1C1D1F`, off-white `#F7F9FA`.
- **Type**: Distinctive display + readable body (not Inter). Card-based course grid, thumbnails, price, instructor, rating placeholder.
- **Chrome**: Sticky top navbar with role-aware links; simple footer.

## Backend (Lovable Cloud / Supabase)

Enable Cloud, then create migration with tables + RLS + grants:

- `profiles` (id → auth.users, email, name, created_at)
- `user_roles` (id, user_id, role: enum `student|instructor|admin`) — separate table, `has_role()` security-definer function
- `courses` (id, instructor_id, title, description, price numeric, category text, status: enum `draft|published`, thumbnail_url, created_at)
- `lessons` (id, course_id, title, order_index int, video_url, is_preview bool)
- `enrollments` (id, user_id, course_id, purchased_at) — unique(user_id, course_id)
- `lesson_progress` (id, user_id, lesson_id, completed bool, completed_at) — unique(user_id, lesson_id)

**RLS highlights**

- `courses`: anon+auth SELECT where `status='published'`; instructor SELECT/INSERT/UPDATE/DELETE own; admin all.
- `lessons`: SELECT for enrolled users OR `is_preview=true` OR course owner; instructor manages own.
- `enrollments`: user SELECT/INSERT own.
- `lesson_progress`: user SELECT/INSERT/UPDATE own.
- `user_roles`: user SELECT own; only admin writes.

**Seed (same migration)**: 4 published courses across categories (Web Dev, Design, Data, Business), each with 3–5 lessons, using a seeded instructor uuid. A signup trigger auto-creates `profiles` + assigns chosen role to `user_roles`.

## Auth

- Email/password signup with role radio (student/instructor). Google sign-in via `lovable.auth.signInWithOAuth` (defaults to student role).
- `_authenticated/` layout gate (integration-managed).
- Nested `_authenticated/instructor/` gate checks `has_role('instructor')` via server fn; students redirected.

## Routes

Public:

- `/` — landing (hero, 4 featured courses, CTA)
- `/catalog` — grid + search + category filter (URL search params, published only)
- `/course/$courseId` — detail: title, desc, price, instructor name, curriculum list (preview lessons unlocked), Buy Now button
- `/auth` — sign in / sign up tabs

Authenticated (`_authenticated/`):

- `/my-courses` — student enrollments with % progress, empty state
- `/learn/$courseId/$lessonId` — placeholder video player + Mark complete (auto-fires at 95% simulated progress via a progress bar timer since no real video yet)

Instructor (`_authenticated/instructor/`):

- `/instructor` — dashboard: courses list, enrollment counts, mock earnings (enrollments × price), empty state
- `/instructor/courses/new` — create form
- `/instructor/courses/$courseId` — edit course + manage lessons (add, reorder via up/down buttons, delete, toggle preview)

## Purchase & Progress

- **Buy Now**: instant free enroll — inserts `enrollments` row, redirects to `/learn/$courseId/$firstLessonId`.
- **Progress**: placeholder video area shows a simulated playback bar; when it reaches 95%, auto-calls server fn to mark `lesson_progress.completed=true`. Manual "Mark complete" button also available.

## Server functions (`src/lib/*.functions.ts`)

- `listPublishedCourses`, `getCourseDetail` (public, publishable-key client)
- `enrollInCourse`, `getMyEnrollments`, `getLessonWithAccess`, `markLessonComplete` (`requireSupabaseAuth`)
- `instructor.listMyCourses`, `createCourse`, `updateCourse`, `listLessons`, `upsertLesson`, `reorderLessons`, `deleteLesson` (auth + role check via `has_role`)

## Tech notes

- TanStack Query default (`ensureQueryData` + `useSuspenseQuery`).
- Role-aware navbar reads session + role via a lightweight `useAuth` hook subscribing to `onAuthStateChange` once in `__root.tsx`.
- Head metadata per route; og:image on landing + course detail (course thumbnail).
- shadcn components with a purple theme in `src/styles.css`; no hardcoded colors.
- Generated thumbnail images for the 4 seed courses saved under `src/assets/`.

## Out of scope (placeholders only)

- Real payments (Stripe) — Buy Now is free enroll.
- Real video hosting — `<video>` element with a dummy poster + fake progress simulation.
- Ratings/reviews, coupons, certificates.
- Do NOT use Lovable Cloud for the backend. I have my own Supabase 
- project connected — use that for database, auth, and storage.