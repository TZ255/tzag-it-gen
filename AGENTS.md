# Tanzania Adv. Group SMM Panel — Implementation Blueprint

This document refines the original brief into a clear, implementation-ready plan. It specifies structure, routes, models, environment, coding standards, and acceptance criteria to enable fast, consistent delivery by a small team or an AI agent.

Last Synced: 2025-10-28T13:29:43.364Z

## Change Discipline
- Always update both `AGENTS.md` and `/LOGS/UPDATES.log` for every change.
- Use `npm run sync:docs` to stamp and log changes quickly.
- Significant decisions go to `/LOGS/COMMENTS.md`; features to `CHANGELOG.md`.

## Overview
- Goal: Build an Itinery Generating System for Tanzania Aventures Group.
- Stack: Express.js, EJS (layouts + partials), MongoDB (Mongoose), Bootstrap 5, HTMX, Passport + express-session.
- Priorities: Good UX, simplicity, modular code, admin-ready foundation.

## Environment & Setup
- Node: 18+ (LTS recommended)
- MongoDB: 6+
- Package manager: npm
- .env variables (required):
  - `PORT=3000`
  - `MONGODB_URI=mongodb://localhost:27017/TZ-AG-SYSTEM`
  - `SESSION_SECRET=<strong-random-string>`
  - `SESSION_NAME=sb.sid`
  - `BASE_URL=http://localhost:3000`
- Scripts (recommended in `package.json`):
  - `dev`: `nodemon index.js`
  - `start`: `node index.js`

## Folder Structure
tz-ag-sys/
│
├── index.js
├── package.json
├── .env
│
├── /config
│   ├── db.js             # Mongoose connection
│   └── passport.js       # Local strategy + serialize/deserialize
│
├── /models               # Mongoose schemas
.....

Notes on /LOGS
- Purpose: ensure continuity across contributors/agents.
- Use exactly this folder (/LOGS). Remove references to "/llm"; consolidate in /LOGS.
- Files:
  - README.md: explains logging practices and file purposes.
  - CHANGELOG.md: features, fixes, improvements per release.
  - COMMENTS.md: rationale for key decisions and trade-offs.
  - UPDATES.log: timestamped summaries per edit or instruction.

## Dependencies
- Runtime: express, express-session, passport, passport-local, mongoose, connect-mongo, ejs, express-ejs-layouts, dotenv, htmx.org, morgan, connect-flash
- Dev: nodemon

## Data Models (Mongoose)
User
- fields:
  - password: String, required
  - username: String, required
  - role: String, enum ["user", "admin", "owner"], default "user"
  - createdAt, updatedAt: Date

Routes
- fields:
  ...


## Routes & Views
Conventions
- All user-facing text in English.
- Guarded routes require `authCheck.ensureAuth`.
- Use standard HTTP status codes and redirects.

Public
- `GET /` → `views/index/index.ejs` (Landing). Includes sections: hero, huduma (services highlight), bei (pricing preview), CTA "Jiunge".
- `GET /blog` → `views/blog/index.ejs` (List-only initially). Optional single post route later.

Auth
- `GET /auth/login` → login form
- `POST /auth/login` → authenticate (Passport local). On success → `/dashboard`, on failure → back with flash.
- `GET /auth/register` → register form
- `POST /auth/register` → if email exists: update that user’s name, phone, and password; otherwise create; auto-login then redirect to `/dashboard`.
- `GET /auth/reset` → reset form (email-only placeholder)
- `POST /auth/reset` → flash success message in English; actual email integration later.
- `POST /auth/logout` → destroy session; redirect `/` with flash.
 

Dashboard (guarded)
- `GET /dashboard` → overview: salio (balance), shughuli za karibuni (recent orders/transactions).
- `GET /dashboard/services` → list all active services and prices.
- `GET /dashboard/new-order` → order form (select service, quantity, link). Shows computed total.
- `POST /dashboard/new-order` → create order; debit balance; create transaction.
- `GET /dashboard/orders` → user orders table with status.
- `GET /dashboard/add-funds` → add funds screen (placeholder for payment integration).
- `POST /dashboard/add-funds` → mock credit transaction for now; update balance.

HTMX Endpoints (progressive enhancement)
- Use forms that work without JS; enhance with HTMX where helpful.
- Suggested endpoints returning fragments under `views/fragments/`:
  - `GET /api/price?serviceId=...&qty=...` → returns `fragments/price.ejs` showing computed total.
  - `POST /api/orders` → returns `fragments/order-row.ejs` to prepend into orders table.
  - `POST /api/funds` → returns `fragments/balance.ejs` to update balance display.

Auth via HTMX
- Forms (register/login/reset) submit with `hx-post` to `/auth/*` endpoints and target a `#auth-messages` container per page.
- On success, server responds with `HX-Redirect` header to navigate (e.g., to `/dashboard`).
- On validation errors, return `views/fragments/auth-message.ejs` with messages array and a `kind` (`success|info|warning|danger`).

## Middlewares
- `authCheck.ensureAuth(req, res, next)` → if not logged in, redirect `/auth/login` with flash.
- `authCheck.ensureGuest(req, res, next)` → if logged in, redirect to `/dashboard`.
- `adminCheck.ensureAdmin(req, res, next)` → require `req.user.role === 'admin'`; else 403 or redirect with flash.
- `attachLocals(req, res, next)` → sets `res.locals.BASE_URL`, `canonical`, `siteName`, `path`, and default `title|description|keywords` fallbacks; used by layout for meta tags.
- Flash handling: only read/clear flashes if `req.session.flash` has keys to avoid creating/updating empty sessions (`saveUninitialized:false`).
- `rateLimiter` (optional) → lightweight limiter for `/auth/*` and `/api/*` (e.g., IP+route window counter). Keep configurable; can be a no-op in dev.
- `errorHandler` → centralized error capture; render `errors/500.ejs` with user-friendly English message; log stack in server console only.

## Authentication (Passport Local)
- Username field: `email` (unique)
- Verify function: compare `bcryptjs.compare` on `password` vs `passwordHash`.
- Sessions: `express-session` + `connect-mongo` with TTL (7 days) and Mongo collection `sessions`.
- Cookie: `httpOnly`, `sameSite=lax`, `maxAge=7d`; store `ttl=7d`, `collectionName='sessions'`, `autoRemove='native'`.
- Serialize: by user `_id`. Minimal session payload.

## UI & EJS Conventions
- Layout: `layouts/main.ejs` contains `<header>`, `<nav>`, `<main>`, `<footer>`; yield with `<%- body %>`.
- Partials: `partials/nav.ejs`, `partials/alerts.ejs`, `partials/footer.ejs`.
- Alerts: use `connect-flash` keys `success`, `error`, `info`; render with Bootstrap alerts.
- Toasts: render flash messages via Bootstrap toast partial `views/partials/toasts.ejs`; errors use red (bg-danger), show on page load.
- Bootstrap: use grid + cards; avoid custom CSS unless necessary.
- English copy: short, clear, and consistent; use Tanzanian context (TZS, M-Pesa).
- Navbar logic: if `res.locals.user` exists, show `Dashibodi` and `Toka`; otherwise show `Ingia`.

## SEO & Metadata
- Every `res.render(view, data)` MUST include: `title`, `description`, `keywords`, and `page`.
- `page` values: `home`, `blog`, `blog-post`, `dashboard`, `orders`, `services`, `new-order`, `add-funds`, `auth-login`, `auth-register`, `404`, `500`, etc.
- Keep `title` and `description` in clear English. `keywords` as a comma-separated English list.
- Layout must output `<title>`, `<meta name="description">`, `<meta name="keywords">`. Optionally include Open Graph tags.
- Example: `res.render('index/index', { title: 'Karibu Tanzania Adv. Group', description: 'Paneli ya SMM kwa Tanzania', keywords: 'smm, mitandao ya kijamii, tanzania, bei nafuu', page: 'home' })`.

## Nav Activeness
- Determine active navbar links using the `page` variable, not `req.path`.
- Mapping guideline:
  - Home: `page === 'home'`
  - Dashboard: `page in {'dashboard','orders','services','new-order','add-funds'}`
- Implement with EJS conditionals or a helper; ensure a single `active` class is present at a time.

## HTMX Practices (Critical)
- Always return HTTP 200 for HTMX responses; avoid 4xx/5xx for validation.
- Render fragments with `layout: false` so only the intended HTML swaps in.
- Use `HX-Redirect` header for navigation after success.
- Keep endpoints small and predictable; respond with a single fragment or redirect header only.

## Theme & Design System
- Design goal: clean, trustworthy, mobile-first dashboard with minimal custom CSS.
- Source of truth: Bootstrap 5 with a thin theme layer under `/public/css/theme.css`.

Design Tokens (CSS variables)
- Define in `:root` within `/public/css/theme.css`:
  - Colors: `--sb-primary` (#0d6efd), `--sb-secondary` (#6c757d), `--sb-success` (#198754), `--sb-warning` (#ffc107), `--sb-danger` (#dc3545), `--sb-info` (#0dcaf0), `--sb-bg` (#f8f9fa), `--sb-surface` (#ffffff), `--sb-text` (#212529), `--sb-muted` (#6c757d).
  - Radii: `--sb-radius-sm: 0.25rem;`, `--sb-radius: 0.5rem;`, `--sb-radius-lg: 0.75rem`.
  - Spacing scale (4/8 rule): `--sb-space-1: 0.25rem; --sb-space-2: 0.5rem; --sb-space-3: 0.75rem; --sb-space-4: 1rem; --sb-space-6: 1.5rem; --sb-space-8: 2rem`.
  - Shadows: `--sb-shadow-sm`, `--sb-shadow` (subtle), `--sb-shadow-lg`.
  - Typography: prefer system stack: `-apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, sans-serif`.

Bootstrap Integration
- Map Bootstrap variables to theme tokens where possible (override in `:root`):
  - `--bs-primary: var(--sb-primary);` etc. Do not scatter hard-coded colors.
- Do not write per-page CSS; prefer Bootstrap utilities (`.pt-4`, `.mb-3`, `.text-muted`).
- Keep custom classes prefixed with `sb-` for clarity (e.g., `sb-card`, `sb-badge-soft`).

Layout & Spacing
- Use `.container` + `.row` + `.col-*` grid; max width via Bootstrap defaults.
- Global sections: top/bottom padding `--sb-space-6` on landing; `--sb-space-4` within dashboard.
- Cards: apply `border-radius: var(--sb-radius); box-shadow: var(--sb-shadow-sm); background: var(--sb-surface)`.
- Dashboard nav: top navbar + simple subnav breadcrumbs; avoid sidebars unless necessary.

Components (standardize usage)
- Buttons: use Bootstrap variants only (`.btn-primary`, `.btn-outline-secondary`). Sizes: `btn-sm`, `btn`.
- Forms: always include `<label>` with `for`, placeholders optional; help text via `.form-text`.
- Tables: `.table .table-hover .align-middle`; truncate long text with utility classes; use badges for statuses.
- Badges for order status: `pending=secondary`, `processing=info`, `completed=success`, `failed=danger`.
- Alerts: `success`, `danger`, `warning`, `info`; avoid custom colors.

Tanzania Adv. Group UI helpers (prefix `sb-`)
- `sb-card`: elevated card with larger radius and shadow for auth/hero sections.
- `sb-auth`: section wrapper with minimum viewport height for auth pages.
- `sb-hero-icon`: circular icon chip (`primary|success|warning` variants) for page headers.
- `sb-input-group`: styled input group that blends icon and input seamlessly.
- `sb-navbar-cta`: align nav CTA buttons nicely on large screens.

Responsive Rules
- Mobile-first. Breakpoints: use Bootstrap (`sm=576`, `md=768`, `lg=992`).
- On small screens: single-column cards; table overflow with `.table-responsive`.
- Avoid hidden content; collapse secondary actions into dropdowns on mobile.

Accessibility
- Ensure 4.5:1 contrast for text; do not lower contrast of `--sb-text` on `--sb-bg`.
- Visible focus styles: keep Bootstrap focus ring; do not remove outlines.
- Provide `aria-label`/`aria-live` for HTMX updates; associate labels and inputs.

Icons & Imagery
- Use Font Awesome 6. Keep size consistent (`fa-sm` for inline, `fa-lg` in nav) and prefer outlined/solid variants per context.
- Avoid heavy imagery; use SVG where possible; compress raster assets.

Dark Mode (optional, future)
- Support via `[data-theme="dark"]` switching: redefine only CSS variables (`--sb-bg`, `--sb-surface`, `--sb-text`, `--bs-*`).
- Do not write component-specific dark CSS; rely on variables.

Content & Copy (English)
- Buttons/CTAs are verbs: "Weka Oda", "Ongeza Salio", "Hifadhi".
- Currency: `TZS 12,345` (use non-breaking space between code and number if possible).
- Dates: `DD/MM/YYYY` for UI; ISO for logs.

Assets & Structure
- Add `/public/css/theme.css`; include in `layouts/main.ejs` after Bootstrap CSS.
- Optional `/public/js/ui.js` for small UI hooks (e.g., htmx loading spinners); keep under 100 lines.

Design Acceptance
- No inline styles; zero hard-coded colors in views.
- All components render correctly at `sm`, `md`, `lg` breakpoints.
- Status colors and variants match the mapping above consistently.

## Security & Hardening
- No Helmet/CSP enforced during development to avoid friction with CDNs.
- Production note (future): prefer self-hosted assets and enable CSP/headers; when ready, add Helmet back with a strict config (documented in COMMENTS.md).
- Session cookie: `name=SESSION_NAME`, `httpOnly=true`, `sameSite=lax`, `secure=prod-only`.
- Rate limiting (optional later) on auth and API endpoints.
- Validate user inputs on server (simple checks: required fields, min/max quantity).

## Error Handling & 404
- Unmatched routes → render `errors/404.ejs`.
- Known failures → flash in English with guidance (e.g., "Tafadhali jaribu tena"), not raw errors.

## Logging & Change Tracking (/LOGS)
- On each significant change, append to `UPDATES.log` with ISO timestamp, author (or "AI"), and 1–2 line summary.
- For features/bugfixes, update `CHANGELOG.md` under Unreleased → Released when deploying.
- Document important decisions in `COMMENTS.md` with context and options considered.
- Enforce: every code or docs change must update both `AGENTS.md` and `/LOGS/UPDATES.log`. Use `npm run sync:docs`.

## Coding Standards
- Async/await with try/catch; never leave unhandled promise rejections.
- Controllers in route files should remain small; extract helpers if >50 lines.
- Name style: camelCase for JS, kebab-case for filenames, PascalCase for models.
- HTTP: use appropriate status codes and redirect-after-POST on standard flows.
- Database writes: check for sufficient balance before debiting; wrap debit+order creation in a transaction if using Mongo sessions (optional).

## Localization (English)
- All user-facing strings in English, including errors and flashes.

## Implementation Phases
1) Bootstrap app: config, DB, layouts, landing, 404/500
2) Auth: register/login/logout, sessions, flashes
3) Dashboard skeleton:
4) New routes
5) New Accomodations
6) 
7) Admin basics: ensureAdmin middleware, `/routes/admin.js`, `/views/admin/index.ejs`
8) Admin CRUD for services, order moderation, users/transactions list

## Acceptance Criteria
- User can only login, logout; sessions persist across refreshes.
- Dashboard shows necessary things
- User role "owner" can add a route; accomodation; update users.
- All primary pages render with consistent layout and English copy.
- 404 and 500 pages render with helpful messaging.
- Logs in /LOGS are updated for features delivered.

Admin Acceptance
- Non-admins cannot access `/admin` routes (403 or redirect with flash in English).
- Admin can create/edit routes and accomodations.


## 🎨 Tanzania Adv. Group Theme Guide (MVP Style)

A minimal, modern, and mobile-first visual theme for **Tanzania Adv. Group**.

---

## 🏷️ Theme Identity
- **Style:** Clean, minimal, premium tech look  
- **Tone:** Trustworthy, youthful, and Tanzanian  
- **Goal:** Deliver a simple experience that looks professional and feels local  

---

## 🌈 Color Palette
| Usage | Color | Description |
|--------|--------|-------------|
| Primary | `#0066cc` | Deep modern blue – main brand color |
| Accent | `#FFD700` | Gold – VIP/premium highlights |
| Background | `#f8f9fa` | Light gray-white for clean mobile comfort |
| Text | `#212529` | Neutral dark gray for high contrast |
| Success | `#1B5E20` | Deep green for confirmations or balance increase |
| Error | `#dc3545` | Red for alerts and validation errors |
| Borders | `#dee2e6` | Light gray lines for separation |

---

## 🧱 Typography
- **Font Family:** System default or Bootstrap default (Arial, Helvetica, sans-serif)
- **Headings:** Bold, uppercase optional for emphasis  
- **Body Text:** Medium weight, high contrast against background  
- **Size:** Base 15–16px for readability on mobile  
- **Color:** Use `#212529` for all text to maintain accessibility  

---

## 🪟 Layout Principles
- Use **Bootstrap 5 grid system** with `.container-fluid` and `.row` for full responsiveness  
- Keep **max content width between 480px–600px** for centered mobile design  
- Maintain **ample spacing (1–2rem)** between sections for breathing room  
- Use **shadow-sm** and **rounded corners** for cards and containers  
- Stick to **flat elements** (no gradients or excessive shadows)  
- Navigation and footer should stay **consistent across pages**  

---

## 🧭 Navigation
- Minimal links
- Navbar background: white with subtle border for separation  

---

## 🧩 Buttons & Links
- **Primary Buttons:** Deep blue background, white text, rounded edges  
- **Accent Buttons:** Gold background for VIP or premium actions  
- **Outline Buttons:** White background with blue border for secondary actions  
- **Hover States:** Slightly darker blue tone or reduced brightness for feedback  
- **Disabled States:** Gray tone, reduced opacity  
- **Link Text:** Blue with no underline (underline only on hover)  
- **Mobile Buttons:** Full width with clear padding for thumb comfort  
- Use clear English verbs like *“Nunua Wafuasi”*, *“Ongeza Salio”*, *“Tuma Oda”*

---

## 🧾 Cards & Sections
- Use **Bootstrap cards** for all content blocks (services, balance, orders)  
- Background white with **shadow-sm** for depth  
- Rounded corners for modern smooth look  
- Each card must have clear titles and icons for quick scanning  
- Cards on dashboard should highlight:
  - Current balance 💰  
  - New order 📝  
  - Available services 🛒  
  - Order history 📋  

---

## 🪄 Forms & Inputs
- Rounded, border-light inputs with enough padding  
- Labels should be **bold and in English**
- Use placeholder hints for clarity  
- Form buttons follow the primary color  
- Validation messages appear in red below the field  

---

## 📱 Mobile UX
- Design for **one-thumb navigation**  
- Keep text and elements large and well-spaced  
- Collapse non-essential elements  
- Use **HTMX fragments** for dynamic sections to avoid reloads  
- Maintain consistent padding (`p-3`) on all pages  

---

## 💡 Visual Personality
- Feels **premium but simple**  
- Emphasizes **trust and speed**  
- Uses color sparingly — **blue for actions**, **gold for highlights**, **green for success**  
- Avoids clutter; focus on the **core goal: making orders and tracking results easily**

---

## 🧭 Overall Feel
> “A fast, clean, and proudly Tanzania Adventure Group - Itinery Generating System... simple enough for anyone to use, elegant enough to be trusted.”
> A local system - dont encrypt the passwords
