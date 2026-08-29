# LL Exam Portal — Backend API

Production-ready **Node.js + Express + TypeScript + MongoDB (Mongoose)** REST API for the
LL Exam Portal — License & Learner Exam Management Dashboard (front-end shipped separately as a
Next.js 15 app).

> Built to plug directly into the existing `ll-exam-dashboard` (Next.js) frontend.
> Every backend response shape is aligned with the frontend `/types/index.ts` and
> `/services/dummy-data.ts` conventions (STF-101, CLT-2001, APP-90012, PAY-55001, …).

---

## ✨ Features

| Area                | Capability                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Auth**            | Email + password login, JWT access + refresh (cookies + Bearer), httpOnly session, role-based ACL   |
| **Registration**    | Client (OTP-activated), Staff (admin-approved), Admin (bootstrap on first boot)                     |
| **OTP**             | 6-digit numeric, bcrypt-hashed, expiry + attempts + cooldown, Twilio integration + **Mock mode**    |
| **RBAC**            | `admin`, `staff`, `client` roles enforced on every route                                            |
| **Applications**    | Full lifecycle: Submitted → Under Review → Assigned Staff → Verified → Approved → Completed         |
| **Documents**       | Multer upload (PDF/PNG/JPG), status workflow (Pending/In Progress/Verified/Rejected), owner ACL     |
| **Payments**        | Provider-agnostic (`stub` default, Razorpay stub scaffolded) — introduction phase only, per request |
| **Chat**            | Staff ↔ Client threads, unread counters, auto-notifications                                          |
| **Notifications**   | In-app; auto-generated on registration, assignment, status changes, payments, chat                  |
| **Reports**         | Admin analytics: applications/payments over time, status breakdown, activity log                    |
| **Security**        | Helmet, CORS, cookie-parser, express-rate-limit, bcrypt, Zod validation                             |
| **Docs**            | Live Swagger UI at `/api/v1/docs`, JSON at `/api/v1/docs.json`                                      |
| **TypeScript**      | `strict` mode, no `any`, path aliases (`@/*`)                                                       |
| **Docker Compose**  | API + MongoDB + Mongo Express (web GUI) — one command                                                |

---

## 🚀 Quick start

### Option A — Docker (recommended)

```bash
cp .env.example .env       # (optional) edit values
docker compose up --build
```

Services:
- **API** → http://localhost:5000
- **Swagger docs** → http://localhost:5000/api/v1/docs
- **Health check** → http://localhost:5000/api/v1/health
- **Mongo Express (DB GUI)** → http://localhost:8081 (admin / admin)

### Option B — Local Node.js

Prereqs: **Node ≥ 18**, MongoDB running on `localhost:27017`.

```bash
cp .env.example .env
npm install
npm run dev              # dev with tsx watch
# or
npm run build && npm start
```

### Seed demo data

```bash
npm run seed
```

Loads the same demo users, applications and payments the frontend dummy data uses. Default
seeded password for all users is `Password@123`.

---

## 🔐 Environment variables

See [`.env.example`](./.env.example). The most important ones:

| Key                       | Default                                             | Purpose                                          |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `MONGO_URI`               | `mongodb://localhost:27017/ll_exam_portal`         | Mongo connection string                          |
| `JWT_ACCESS_SECRET`       | (dev value)                                         | **Change in production**                         |
| `JWT_REFRESH_SECRET`      | (dev value)                                         | **Change in production**                         |
| `OTP_MOCK_MODE`           | `true`                                              | Skip Twilio, log OTPs to console (dev-friendly)  |
| `TWILIO_ACCOUNT_SID`      | ``                                                  | Only used if `OTP_MOCK_MODE=false`               |
| `TWILIO_AUTH_TOKEN`       | ``                                                  | Only used if `OTP_MOCK_MODE=false`               |
| `TWILIO_FROM_NUMBER`      | ``                                                  | E.164 sender number                              |
| `PAYMENT_PROVIDER`        | `stub`                                              | Set to `razorpay` when you wire the real gateway |
| `BOOTSTRAP_ADMIN_EMAIL`   | `admin@llportal.gov.in`                             | Auto-created on first boot                       |
| `BOOTSTRAP_ADMIN_PASSWORD`| `Admin@12345`                                       | Auto-created on first boot                       |

---

## 📱 OTP flow (mock mode)

1. `POST /api/v1/auth/register/client` — creates client with `clientStatus: Inactive` and sends OTP.
2. Read the OTP from the **API console log** (in mock mode) — response also includes `mockedCode`.
3. `POST /api/v1/auth/otp/verify` — activates client and returns access + refresh tokens.
4. Subsequent requests: `Authorization: Bearer <accessToken>` (or the `accessToken` cookie).

Flip `OTP_MOCK_MODE=false` and fill Twilio credentials to send real SMS.

---

## 🗺️ Architecture overview

```
src/
├── config/          env, MongoDB connection, Swagger spec
├── models/          Mongoose schemas (User, Application, Document, Payment, Chat, Notification, Otp, Activity)
├── controllers/     Route handlers (auth, users, applications, documents, payments, chat, notifications, reports)
├── routes/          Express routers, versioned under /api/v1
├── middlewares/     auth (JWT + RBAC), validation (Zod), upload (Multer), error, rate limit
├── services/        sms, otp, payment provider, activity log, notifications
├── validators/      Zod schemas mirroring frontend forms
├── utils/           ApiError, ApiResponse, JWT, logger, ID generators
├── jobs/            bootstrapAdmin, seed
├── types/           domain enums + Express type augmentation
├── app.ts           Express app factory
└── server.ts        HTTP server + graceful shutdown
```

### Data model highlights

- Every domain document has a **human-readable `businessId`** (e.g. `STF-101`) — this is the field
  the frontend uses, kept stable across environments so the two systems interop with zero mapping.
- **OTPs** use a TTL index — expired documents disappear automatically after ~1 hour.
- **Documents** are stored on disk under `/uploads` (relative to project root) with metadata in Mongo;
  downloads are proxied through the API (`GET /documents/:id/download`) so ACL is enforced.

---

## 🔌 API surface

All routes are versioned under `/api/v1`. Full interactive reference is at `/api/v1/docs`.

### Auth (`/auth`)
| Method | Path                | Body                                             | Description                              |
| ------ | ------------------- | ------------------------------------------------ | ---------------------------------------- |
| POST   | `/register/client`  | `{ name, email, phone, password, licenseType }`  | Create client + send OTP                 |
| POST   | `/register/staff`   | `{ name, email, phone, password, department }`   | Staff signup (Pending state)             |
| POST   | `/otp/send`         | `{ phone, purpose }`                             | Send OTP                                 |
| POST   | `/otp/verify`       | `{ phone, code, purpose }`                       | Verify OTP → activates & logs in         |
| POST   | `/login`            | `{ email, password, role? }`                     | Login                                    |
| POST   | `/refresh`          | `{ refreshToken? }` (or cookie)                  | Rotate tokens                            |
| POST   | `/logout`           | –                                                | Revoke refresh + clear cookies           |
| GET    | `/me`               | –                                                | Current user                             |
| POST   | `/forgot-password`  | `{ phone }`                                      | Send reset OTP                           |
| POST   | `/reset-password`   | `{ phone, code, newPassword }`                   | Reset with OTP                           |

### Users (`/users`)
- `PATCH /me` — update own profile
- Admin: `GET /staff`, `PATCH /staff/:businessId/status`, `GET /clients`, `PATCH /clients/:businessId/assign`, `GET /admin/stats`
- Staff: `GET /staff/assigned-clients`

### Applications (`/applications`)
- `POST /` (client) — create
- `GET /` — list (role-scoped)
- `GET /:businessId` — detail
- `PATCH /:businessId` — update / assign / status change

### Documents (`/documents`)
- `POST /upload` (multipart `file` + `applicationId`, `type`)
- `GET /?applicationId=...` — list
- `GET /:businessId/download` — download
- `PATCH /:businessId/status` (staff/admin) — Verified / Rejected / …
- `DELETE /:businessId`

### Payments (`/payments`)
- `POST /create-order` — start a payment (returns provider order info)
- `POST /verify` — verify signature (stub always OK)
- `GET /` — list (role-scoped)
- `PATCH /:businessId/status` (admin)

> Payments are in the **introduction phase**: `PAYMENT_PROVIDER=stub` completes end-to-end without a
> real gateway. When you're ready, set `PAYMENT_PROVIDER=razorpay` and complete the TODO block in
> `src/services/payment.service.ts` (Razorpay SDK + HMAC signature check).

### Chat (`/chat`)
- `GET /threads`, `POST /threads`, `GET /threads/:id/messages`, `POST /messages`

### Notifications (`/notifications`)
- `GET /`, `PATCH /:id/read`, `PATCH /read-all`

### Reports (`/reports`) — **admin only**
- `GET /applications-over-time`, `/payments-over-time`, `/application-status-breakdown`, `/recent-activity`

---

## 🔗 Wiring the frontend

In your frontend `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Then replace `services/dummy-data.ts` imports with actual `fetch` calls — the response
shapes (`success`, `message`, `data`, `meta`) and the `businessId` values match one-to-one.

A minimal client helper:

```ts
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as T;
}
```

---

## 🧪 Sample requests

### Register a client + verify OTP (mock mode)

```bash
# 1. Register — OTP is logged to the API console
curl -X POST http://localhost:5000/api/v1/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kulkarni",
    "email": "rahul.kulkarni@gmail.com",
    "phone": "+919021011111",
    "password": "Password@123",
    "licenseType": "Learner'\''s License"
  }'

# 2. Verify OTP (see console log for the 6-digit code, or check `mockedCode` in response)
curl -X POST http://localhost:5000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+919021011111", "code": "123456", "purpose": "register" }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@llportal.gov.in", "password": "Admin@12345" }'
```

### Upload a document

```bash
curl -X POST http://localhost:5000/api/v1/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@aadhaar.pdf" \
  -F "applicationId=APP-90012" \
  -F "type=Identity Proof"
```

---

## 🩺 Health & observability

- `GET /api/v1/health` — uptime + timestamp
- Structured console logs via a lightweight logger (`src/utils/logger.ts`). Swap for pino/winston
  when you're ready to ship logs to CloudWatch/Datadog/etc.

---

## 🔒 Security checklist for production

- [ ] Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (min 32 chars)
- [ ] Set `NODE_ENV=production` and `OTP_MOCK_MODE=false`
- [ ] Configure real Twilio credentials
- [ ] Configure `CLIENT_URL` to the frontend's actual origin (CORS whitelist)
- [ ] Put the API behind HTTPS (nginx / ALB / Cloudflare)
- [ ] Set `BOOTSTRAP_ADMIN_PASSWORD` before first boot and rotate immediately
- [ ] Consider moving uploads to S3/GCS — the multer disk store is fine for dev but not for
      horizontally scaled production

---

## 🛣️ Roadmap (what to hook up next)

- Real Razorpay integration (`src/services/payment.service.ts` — TODOs marked)
- Socket.IO for live chat / notification push
- S3-compatible object storage for document uploads
- Redis-backed rate limits + refresh-token blacklist
- End-to-end tests (Jest + supertest) — scaffolding-ready
- CI/CD (GitHub Actions) — Docker image + `npm run typecheck && npm run lint`

---

## 📄 License

MIT — See `LICENSE` (add your own file if needed).
