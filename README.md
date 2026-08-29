# LL Exam Portal — Fullstack (Production Ready)

> **License & Learner Exam Management Dashboard** — Admin / Staff / Client portals.
> Frontend: Next.js 15 · React 19 · TypeScript · Tailwind · Radix UI.
> Backend: Node 20 · Express 4 · TypeScript · MongoDB · Mongoose · JWT · Twilio OTP.

```
ll-exam-fullstack/
├── frontend/            # Next.js 15 App-Router (no dummy data — every page hits the API)
├── backend/             # Express + TypeScript + MongoDB
└── docker-compose.yml   # Mongo + Mongo-Express + API
```

## ⚡ Quick start

```bash
# 1. Backend + MongoDB via Docker
cd backend && cp .env.example .env
docker compose up --build         # api on :5000, mongo on :27017

# 2. Frontend (new terminal)
cd frontend
cp .env.local.example .env.local  # already points to http://localhost:5000/api/v1
npm install
npm run dev                       # frontend on :3000
```

Open:

- 🖥️ Frontend → http://localhost:3000
- 🔌 API      → http://localhost:5000
- 📘 Docs     → http://localhost:5000/api/v1/docs

## 🔐 First login

An admin is bootstrapped from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` on the first
API boot. **Change these before deploying.** Optional demo data:

```bash
cd backend && npm run seed
```

Seeded credentials (all passwords = `Password@123`):

| Role   | Email                                | Notes                                    |
| ------ | ------------------------------------ | ---------------------------------------- |
| Admin  | `admin@llportal.gov.in`              | Bootstrapped on first boot               |
| Staff  | `ananya.sharma@llportal.gov.in`      | Status: Approved                         |
| Client | `rahul.kulkarni@gmail.com`           | Phone verified                           |

Every login (including admin) requires OTP verification. In local dev the OTP is logged to
the API console and returned in the response (see `OTP_MOCK_MODE`).

## 📱 SMS / OTP

Production **must** use Twilio:

```bash
OTP_MOCK_MODE=false
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

If Twilio env vars are missing while `OTP_MOCK_MODE=false`, the API returns a clear
`500 SMS provider not configured` — no silent fallback.

## 🧩 Architecture at a glance

- **Registration (client)** — form → validate → check phone uniqueness → hash password →
  store in `PendingRegistration` (24h TTL) → send OTP via Twilio → redirect to
  `/verify-otp`. **The User document is created ONLY after the OTP verifies.** On success
  we redirect the user to `/login`.
- **Registration (staff)** — creates a User with `staffStatus: "Pending"`. Login is
  blocked until admin approval.
- **Admin** — never publicly registerable. Provisioned via bootstrap env variables.
- **Login (all roles)** — email + password → OTP sent to phone → verify OTP → JWT access
  (15 min) + refresh (7 d) tokens issued → redirect to the role's dashboard.
- **OTP** — 6-digit, 10 min expiry, 60 s resend cooldown, 5 wrong attempts before invalidation,
  deleted from Mongo on successful verification, cannot be reused. TTL index cleans expired
  records automatically.
- **Auth** — Bearer JWT in `Authorization` header; automatic single-flight refresh in the
  frontend API client; refresh token stored hashed in the user document; auto logout when the
  refresh fails.
- **Frontend data flow** — every page uses the domain services under `frontend/services/*`
  (a thin wrapper over the API client). No dummy data anywhere.

## 🔗 API surface

| Area           | Endpoints (prefix `/api/v1`) |
| -------------- | ---------------------------- |
| Auth           | `POST /auth/register/client` · `POST /auth/register/staff` · `POST /auth/login` · `POST /auth/otp/send` · `POST /auth/otp/verify` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/forgot-password` · `POST /auth/reset-password` |
| Users          | `PATCH /users/me` · `GET /users/staff` · `PATCH /users/staff/:id/status` · `GET /users/clients` · `PATCH /users/clients/:id/assign` · `GET /users/staff/assigned-clients` · `GET /users/admin/stats` |
| Applications   | `POST /applications` · `GET /applications` · `GET /applications/:id` · `PATCH /applications/:id` |
| Documents      | `POST /documents/upload` · `GET /documents` · `GET /documents/:id/download` · `PATCH /documents/:id/status` · `DELETE /documents/:id` |
| Payments       | `POST /payments/create-order` · `POST /payments/verify` · `GET /payments` · `PATCH /payments/:id/status` |
| Chat           | `GET /chat/threads` · `POST /chat/threads` · `GET /chat/threads/:id/messages` · `POST /chat/messages` |
| Notifications  | `GET /notifications` · `PATCH /notifications/read-all` · `PATCH /notifications/:id/read` |
| Reports        | `GET /reports/applications-over-time` · `GET /reports/payments-over-time` · `GET /reports/application-status-breakdown` · `GET /reports/recent-activity` |

## 🔒 Production checklist

- [ ] Set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (≥32 chars each)
- [ ] `NODE_ENV=production` and `OTP_MOCK_MODE=false`
- [ ] Real Twilio credentials
- [ ] Rotate `BOOTSTRAP_ADMIN_PASSWORD` on first login
- [ ] Restrict CORS `CLIENT_URL` to your actual frontend origin
- [ ] Put API behind HTTPS
- [ ] Move `/uploads` to S3/GCS when horizontally scaling

## 🧾 What changed in this refactor

See `CHANGES.md` for the full list of modified files and the reasoning behind each change.

## 📄 License

MIT
