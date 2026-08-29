# Changes — Demo → Production

This document lists every file that was created, rewritten, or modified while converting the
project from a demo to a production-ready application, and explains why each change was made.

---

## Backend

### New files

| File | Purpose |
| ---- | ------- |
| `backend/src/models/PendingRegistration.model.ts` | Holds client registration data (name/email/phone/hashed password/license type) with a 24-hour TTL. The real `User` document is only created after OTP verification. Enforces requirement #3. |
| `backend/.env` | Local `.env` with `OTP_MOCK_MODE=true` for first-run convenience (git-ignored). |

### Rewritten files

| File | Why it was changed |
| ---- | ------------------ |
| `backend/src/controllers/auth.controller.ts` | Registration flow rewritten to store client data in `PendingRegistration` and only create the `User` after OTP verification. Login rewritten as a two-step flow: `POST /auth/login` validates credentials and issues an OTP; `POST /auth/otp/verify` (purpose=login) issues JWT access + refresh tokens. Admin login also goes through OTP. Staff login is blocked when `staffStatus !== "Approved"/"Active"`. Deactivated clients cannot log in. Cleaner conflict messages for duplicate email vs. duplicate phone. |
| `backend/src/services/otp.service.ts` | On successful verification the OTP is deleted (not just marked "consumed"). All stale unconsumed OTPs of the same `(phone, purpose)` are wiped when a new one is generated, preventing reuse. Same cooldown and attempt limits kept. |
| `backend/src/services/sms.service.ts` | If `OTP_MOCK_MODE=false` and Twilio env vars are missing, throw `500 SMS provider not configured` instead of silently falling back to mock. Twilio errors surface with a clear message. |
| `backend/src/config/env.ts` | `OTP_MOCK_MODE` default flipped from `true` to `false` so production behaviour is real Twilio by default. Local dev overrides via `.env` (`OTP_MOCK_MODE=true`). |
| `backend/src/routes/notification.routes.ts` | Reordered: `/read-all` is declared before `/:businessId/read`, otherwise Express matched `"read-all"` as a `businessId` and broke the "mark all as read" action. |
| `backend/.env.example` | Updated to reflect the new production defaults (mock-off) and to document that Twilio credentials are required when `OTP_MOCK_MODE=false`. |

### Unchanged (but reviewed for correctness)

Every remaining backend file was reviewed and left as-is because it already handled its concern correctly:

- `app.ts`, `server.ts` — CORS + Helmet + rate limiting were already sane.
- `middlewares/auth.middleware.ts` — JWT check + `authorize` guard already role-scoped.
- `controllers/{application,payment,document,chat,notification,report,user}.controller.ts` — RBAC scopes and MongoDB queries already correct.
- All Mongoose models — Application, Payment, Document, Notification, Chat, User, Otp, Activity.
- `jobs/bootstrapAdmin.ts` — still creates the admin from env.
- `jobs/seed.ts` — still seeds demo data (only used if the developer runs `npm run seed`).

---

## Frontend

### Removed files

| File | Reason |
| ---- | ------ |
| `frontend/services/dummy-data.ts` | Replaced by real API services. No page imports this any more. |

### New files

| File | Purpose |
| ---- | ------- |
| `frontend/services/api.ts` | Central API client. Attaches Bearer access token; on 401 does a single-flight refresh and retries; on refresh failure clears tokens and redirects to `/login` (auto logout). Exposes `api.get / post / patch / put / delete` plus a `fetchBlob` helper for document downloads. |
| `frontend/services/auth.service.ts` | `registerClient`, `registerStaff`, `login`, `sendOtp`, `verifyOtp`, `fetchMe`, `logout`, `forgotPassword`, `resetPassword`. |
| `frontend/services/user.service.ts` | `fetchAdminStats`, `listStaff`, `updateStaffStatus`, `listClients`, `assignStaffToClient`, `listAssignedClients`, `updateProfile`. |
| `frontend/services/application.service.ts` | `listApplications`, `getApplication`, `createApplication`, `updateApplication`. |
| `frontend/services/document.service.ts` | `listDocuments`, `uploadDocument` (FormData), `updateDocumentStatus`, `deleteDocument`, `downloadDocument`. |
| `frontend/services/payment.service.ts` | `listPayments`, `createPaymentOrder`, `verifyPayment`, `updatePaymentStatus`. |
| `frontend/services/notification.service.ts` | `listNotifications`, `markAsRead`, `markAllRead` — plus a small `timeAgo` helper. |
| `frontend/services/chat.service.ts` | `listThreads`, `createOrGetThread`, `listMessages`, `sendMessage` — role-aware display name mapping. |
| `frontend/services/report.service.ts` | `applicationsOverTime`, `paymentsOverTime`, `applicationStatusBreakdown`, `recentActivity`. |
| `frontend/services/index.ts` | Barrel that re-exports everything above. |
| `frontend/components/shared/live-notifications.tsx` | Shared "live from MongoDB" notifications list used by all three role-specific notifications pages. Supports "Mark all as read". |
| `frontend/.env.local` and `frontend/.env.local.example` | Sets `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`. |

### Rewritten files (dummy data → API)

| File | Why it was changed |
| ---- | ------------------ |
| `frontend/lib/auth-context.tsx` | Was: fake role toggle with hardcoded user names. Now: `AuthProvider` that hydrates from `localStorage`, verifies via `GET /auth/me`, exposes `{ user, loading, refresh, logout, setUser }`, and enforces role-based route protection. |
| `frontend/components/shared/dashboard-shell.tsx` | Wraps every dashboard in `AuthProvider` with `requireRole`. Reads the actual `user.name` / `user.email` from `/auth/me` (no more hardcoded names). Shows a loading spinner until the user is hydrated. |
| `frontend/components/navbar/navbar.tsx` | Bell dropdown pulls real notifications every 30s and shows true unread count. Click any notification to mark it read + go to the notifications page. Logout button calls the real `POST /auth/logout`. |
| `frontend/app/(admin)/layout.tsx`, `frontend/app/(staff)/layout.tsx`, `frontend/app/(client)/layout.tsx` | Removed hardcoded `userName` / `userEmail`; sourced from auth context. |
| `frontend/app/login/page.tsx` | Real login: `authService.login()` → OTP flow. No more `setTimeout` fake redirect. Role tabs pass the expected role so the API rejects wrong-role attempts. Errors surfaced inline. |
| `frontend/app/register/page.tsx` | Both tabs call the real API. Client tab does not create the user — the backend stores a pending registration and sends OTP. Staff tab creates a pending-approval account. Phone validation is E.164-friendly; department and license type are proper enums. |
| `frontend/app/verify-otp/page.tsx` | Reads its purpose (`register` or `login`) from `sessionStorage`, calls `authService.verifyOtp`, and redirects to `/login` (register) or the role dashboard (login). Real resend button with 60-second cooldown timer. Paste-a-6-digit-code support. |
| `frontend/app/(admin)/admin/dashboard/page.tsx` | Loads `fetchAdminStats`, latest applications, latest payments, recent activity, `applicationsOverTime` and `paymentsOverTime` charts — all from MongoDB via the API. |
| `frontend/app/(admin)/admin/staff/page.tsx` | Lists staff from `GET /users/staff`. Approve / Reject / Activate / Deactivate actions call `PATCH /users/staff/:id/status`. |
| `frontend/app/(admin)/admin/clients/page.tsx` | Lists clients from `GET /users/clients`. Assign staff action calls `PATCH /users/clients/:id/assign` after prompting for a staff Business ID. |
| `frontend/app/(admin)/admin/applications/page.tsx` | Lists applications from `GET /applications`. Approve / Reject / Assign / status transitions call `PATCH /applications/:id`. |
| `frontend/app/(admin)/admin/payments/page.tsx` | Lists payments from `GET /payments`. Verify / Complete / Fail actions call `PATCH /payments/:id/status`. |
| `frontend/app/(admin)/admin/reports/page.tsx` | Charts populated from `/reports/*` endpoints. Export button downloads the fetched data as JSON. |
| `frontend/app/(admin)/admin/notifications/page.tsx` | Uses the shared `<LiveNotifications />` component. |
| `frontend/app/(admin)/admin/settings/page.tsx` | Profile tab shows real admin's account and lets them update `name` via `PATCH /users/me`. Security / Notifications tabs remain UI-only (server enforcement is already active). |
| `frontend/app/(staff)/staff/dashboard/page.tsx` | KPIs and "My Clients" table all come from `GET /users/staff/assigned-clients` + `GET /applications` + `GET /documents`. |
| `frontend/app/(staff)/staff/clients/page.tsx` | Reads only the staff's own assigned clients. Chat action creates/opens a real thread. |
| `frontend/app/(staff)/staff/applications/page.tsx` | Backend filters by `assignedStaffId`; all status transitions hit `PATCH /applications/:id`. |
| `frontend/app/(staff)/staff/documents/page.tsx` | Lists real documents. Verify / Reject actions call `PATCH /documents/:id/status`. Download uses the authenticated `GET /documents/:id/download` route via `fetchBlob`. |
| `frontend/app/(staff)/staff/chat/page.tsx` | Full rewrite. Loads threads and messages from Mongo. Polls every 8-15 seconds. Sending goes through `POST /chat/messages`. Auto-scrolls, supports Enter-to-send, and search filters threads. |
| `frontend/app/(staff)/staff/notifications/page.tsx` | Uses the shared `<LiveNotifications />` component. |
| `frontend/app/(staff)/staff/profile/page.tsx` | Reads the logged-in staff from context. Name editable and persists via `PATCH /users/me`. Live "Assigned clients" / "Completed applications" counts. |
| `frontend/app/(client)/client/dashboard/page.tsx` | Everything is live: application list, latest active application timeline (steps derived from real status), pending documents count, pending payment detection, unread notifications count. |
| `frontend/app/(client)/client/application/page.tsx` | Submits a real application via `POST /applications`; on success it uploads any attached documents via `POST /documents/upload` in one flow. Success screen shows the real returned `businessId`. |
| `frontend/app/(client)/client/applications/page.tsx` | Reads the client's own applications from the backend. |
| `frontend/app/(client)/client/documents/page.tsx` | Uploads via `POST /documents/upload` (select application + type first). Download uses the authenticated download route. Delete supported for non-verified docs. |
| `frontend/app/(client)/client/payments/page.tsx` | Real payments. "Pay now" for a Pending record calls `POST /payments/create-order` → `POST /payments/verify` (stub provider). Payment method selectable. |
| `frontend/app/(client)/client/notifications/page.tsx` | Uses the shared `<LiveNotifications />` component. |
| `frontend/app/(client)/client/profile/page.tsx` | Reads the logged-in client from context. Name and license type editable via `PATCH /users/me`; email and phone are locked. |

### Small updates

| File | What changed |
| ---- | ------------ |
| `frontend/lib/constants.ts` | Removed hardcoded badge counts on nav items (Applications 12 / Documents 5 / Chat 2 / Notifications 1/4 came from dummy data). Added colour tokens for `Submitted`, `Assigned Staff`, and `Failed`. |
| `frontend/types/index.ts` | Trimmed the comment header; no shape changes (kept in sync with backend). |

### Unchanged (verified)

- All UI primitives under `frontend/components/ui/*`
- `components/tables/data-table.tsx`, `components/charts/charts.tsx`, `components/shared/*` (except the shell and live-notifications)
- `components/sidebar/sidebar.tsx`
- `frontend/lib/utils.ts`, `frontend/next.config.ts`, `frontend/tailwind.config.ts`, `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/app/page.tsx`

Design language and responsive layout are **exactly** as before — only data sources changed.

---

## Root-level updates

| File | What changed |
| ---- | ------------ |
| `README.md` | Rewritten to describe the production-ready architecture, API surface, OTP + Twilio behaviour, seeded credentials, and the production checklist. |
| `CHANGES.md` (this file) | New — file-by-file rationale. |
| `docker-compose.yml` | Unchanged — still starts Mongo, Mongo-Express, and the API. |

---

## Verification performed

- `backend/` — `npm run typecheck` and `npm run build` both pass cleanly.
- `frontend/` — `npm run build` produces all 29 routes with no TypeScript errors.
- No page or component imports `services/dummy-data` anywhere (`grep -r "dummy-data" frontend/` returns empty).
- The frontend never renders hardcoded people, applications, payments, or documents — all pages fetch from MongoDB via the backend REST API.
- Registration writes to `PendingRegistration`, not `User`. The real user is created only after OTP verification.
- OTPs are deleted from MongoDB after successful verification.
- Twilio is required in production (`OTP_MOCK_MODE=false` is the new default).
- Every protected page is wrapped in `AuthProvider` with `requireRole`, so wrong-role or logged-out access bounces to `/login` (or the user's own dashboard for role mismatch).
- 401 responses trigger a single-flight refresh; failed refresh forces logout.
