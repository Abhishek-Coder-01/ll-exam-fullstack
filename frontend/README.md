# LL Exam Portal — License & Learner Exam Management Dashboard

A production-ready dashboard built with Next.js 15 (App Router), TypeScript, Tailwind CSS,
Radix UI primitives (shadcn-style components), React Hook Form + Zod, Recharts, and Lucide icons.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000

To create a production build:

```bash
npm run build
npm run start
```

## Roles & preview

This is a UI-only build with dummy data (no real backend/auth). From the home page you can
jump straight into any role's dashboard, or go through `/login` and `/register` to see the
role-based auth screens (Admin / Staff / Client tabs, staff pending-approval flow, and client
OTP verification flow).

- **Admin** → `/admin/dashboard` (Staff Management, Client Management, Applications, Payments,
  Reports, Notifications, Settings)
- **Staff** → `/staff/dashboard` (Assigned Clients, Applications, Documents, Chat, Notifications, Profile)
- **Client** → `/client/dashboard` (New Application, My Applications, Documents, Payments,
  Notifications, Profile)

## Structure

```
/app            Route segments grouped by role: (admin), (staff), (client), plus auth routes
/components     sidebar, navbar, cards, charts, tables, forms, ui (shadcn-style primitives), shared
/lib            utils, constants (nav config, status colors), auth-context (dummy)
/types          shared TypeScript interfaces
/services       dummy-data.ts — all mock data used across the app
```

## Notes

- All data is static/dummy (`services/dummy-data.ts`); no backend or real authentication is wired up.
- Sidebar, navbar, tables, charts, forms, empty/loading/error states are all reusable components.
- Fully responsive: collapsible/slide-in mobile sidebar, responsive grids and tables.
- White theme with a blue primary color, soft shadows, rounded cards — government portal styling.
