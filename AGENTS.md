# Tanzania Adventures Group — Itinery Generating System

Implementation guide for the Tanzania Adventures Group Itinery Generating System. This replaces legacy SMM panel language and aligns routes, models, UI, and practices to the itinerary use-case.

Last Synced: 2025-11-16T16:00:00Z

## Change Discipline
- Always update both `AGENTS.md` and `/LOGS/UPDATES.log` for every change.
- Use `npm run sync:docs` to stamp and log changes quickly.
- Significant decisions go to `/LOGS/COMMENTS.md`; features to `CHANGELOG.md`.

## Overview
- Goal: Tanzania Adventures Group Itinery Generating System (prototype, local use).
- Stack: Express.js, EJS (layouts + partials), MongoDB (Mongoose), Bootstrap 5, HTMX, Passport + express-session.
- Priorities: Simple, mobile-first UX; admin can manage routes and accommodations.

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
│   └── passport.js       # Local strategy (plain password for prototype)
│
├── /models               # Mongoose schemas (User, Route, Accommodation, Booking)
├── /routes               # index, auth, admin, api (legacy endpoints may exist)
├── /views                # layouts, partials, auth, admin, fragments, errors
├── /public               # css/theme.css, js/*, assets
└── /LOGS                 # change tracking (see below)

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
- Note: No bcrypt or hashing. Prototype stores plain passwords by request.

## Data Models (Mongoose)
User
- fields:
  - name: String, required (used as username at login)
  - password: String, required (stored in plain text for local prototype)
  - role: String, enum ["user", "admin", "owner"], default "admin"
  - createdAt, updatedAt: Date

Route
- fields:
  - name: String, required
  - description: String, required
  - day: Number (>=1)
  - origin: String, destination: String (optional)
  - image: String (URL)
  - vehicle_fee: Number
  - park_fee_adult: Number
  - park_fee_child: Number
  - transit_fee: Number
  - createdAt, updatedAt: Date

Accommodation
- fields:
  - accomodation_name: String, required
  - place: String, required
  - isLuxury: Boolean
  - createdAt, updatedAt: Date


Itinerary
- fields:
  - title: String, required
  - clientName: String (optional)
  - startDate: Date
  - pax: { adults: Number, children: Number }
  - days[]: { route: ObjectId(ref Route), accomodation: { name: String, adult_price: Number, child_price: Number } }
  - totals: { accomodation, vehicle, park, transit, grand }
  - inclusions[], exclusions[]
  - profit: { percent, amount }


## Routes & Views
Conventions
- All user-facing text in English.
- Guarded routes require `authCheck.ensureAuth`.
- Use standard HTTP status codes and redirects.

Public
- `GET /` → redirect to `/auth/login` (no landing page).

Auth
- `GET /auth/login` → login form (HTMX-enhanced + non-JS fallback with submit button).
- `POST /auth/login` → authenticate (Passport local, plain password compare). On success: HTMX responds with `HX-Redirect: /dashboard`, non-HTMX redirects to `/dashboard`. On failure: HTMX returns `fragments/auth-message`, non-HTMX flashes error and redirects back.
- `POST /auth/logout` → destroy session; redirect `/`.
 

Dashboard (guarded)
- Focused on itinerary generation and summaries (no funds/services/orders).

HTMX Endpoints (progressive enhancement)
- Use forms that work without JS; enhance with HTMX where helpful.
- Auth uses `fragments/auth-message.ejs`. Additional fragments can be added as features grow.

Auth via HTMX
- Login form submits with `hx-post` to `/auth/login` and targets `#auth-messages`.
- On success, respond with `HX-Redirect: /dashboard`.
- On validation errors, return `views/fragments/auth-message.ejs` with `kind` and `messages`.
 - Show a Bootstrap spinner during login with an HTMX indicator: set `hx-indicator="#login-spinner"` on the form and include a `<span id="login-spinner" class="htmx-indicator spinner-border spinner-border-sm">` element inside the submit button.

## Middlewares
- `authCheck.ensureAuth(req, res, next)` → if not logged in, redirect `/auth/login` with flash.
- `authCheck.ensureGuest(req, res, next)` → if logged in, redirect to `/dashboard`.
- `adminCheck.ensureAdmin(req, res, next)` → require `req.user.role === 'admin'`; else 403 or redirect with flash.
- `attachLocals(req, res, next)` → sets `res.locals.BASE_URL`, `canonical`, `siteName`, `path`, and default `title|description|keywords` fallbacks; used by layout for meta tags.
- Flash handling: only read/clear flashes if `req.session.flash` has keys to avoid creating/updating empty sessions (`saveUninitialized:false`).
- `rateLimiter` (optional) → lightweight limiter for `/auth/*` and `/api/*` (e.g., IP+route window counter). Keep configurable; can be a no-op in dev.
- `errorHandler` → centralized error capture; render `errors/500.ejs` with user-friendly English message; log stack in server console only.

## Authentication (Passport Local)
- Username field: `username` (maps to `User.name`).
- Verify function: plain equality of `req.body.password` to `User.password` (prototype only; do NOT use in production).
- Sessions: `express-session` + `connect-mongo` with TTL (7 days) and collection `sessions`.
- Cookie: `httpOnly`, `sameSite=lax`, `maxAge=7d`; store `ttl=7d`, `collectionName='sessions'`, `autoRemove='native'`.
- Serialize: by user `_id`. `deserializeUser` excludes `password`.

## UI & EJS Conventions
- Layout: `layouts/main.ejs` contains `<header>`, `<nav>`, `<main>`, `<footer>`; yield with `<%- body %>`.
- Partials: `partials/nav.ejs`, `partials/alerts.ejs`, `partials/footer.ejs`.
- Alerts: use `connect-flash` keys `success`, `error`, `info`; render with Bootstrap alerts.
- Toasts: render flash messages via Bootstrap toast partial `views/partials/toasts.ejs`; errors use red (bg-danger), show on page load.
- Bootstrap: use grid + cards; avoid custom CSS unless necessary.
- English copy: short, clear, and consistent; currency is USD.
- Navbar logic (sidebar): if `res.locals.user` exists, show Dashboard and Logout; otherwise show Login.

## SEO & Metadata
- Every `res.render(view, data)` MUST include: `title`, `description`, `keywords`, and `page`.
- `page` values: `dashboard`, `itineraries`, `auth-login`, `404`, `500`.
- Keep `title` and `description` in clear English. `keywords` as a comma-separated English list.
- Layout must output `<title>`, `<meta name="description">`, `<meta name="keywords">`. Optionally include Open Graph tags.
- Root redirects to login, so no landing page metadata is needed.
 - Print preview includes a company footer with phone, email, and address, and hides the print button during printing.

## Nav Activeness
- Determine active links using `page`. Sidebar highlights:
  - Dashboard: `page === 'dashboard'`
  - Itineraries: `page === 'itineraries'`
  - Admin: `page === 'admin'`
  Ensure a single `active` class at a time.

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
- `auth-shell`: full-viewport wrapper used on login to center the card and apply a subtle background.
- `sb-hero-icon`: circular icon chip (`primary|success|warning` variants) for page headers.
- `sb-input-group`: styled input group that blends icon and input seamlessly.
- `sb-navbar-cta`: align nav CTA buttons nicely on large screens.

Responsive Rules
- Mobile-first. Breakpoints: use Bootstrap (`sm=576`, `md=768`, `lg=992`).
- On small screens: single-column cards; table overflow with `.table-responsive`.
- Avoid hidden content; collapse secondary actions into dropdowns on mobile.
 - Itinerary builder/edit day rows: compact grid fits one row at `lg` (Route 4, Accommodation 3, Adult 2, Child 1, Day 1, Actions 1) with `form-control-sm`/`form-select-sm` to reduce visual width.

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
- Buttons/CTAs are verbs: "Create Itinerary", "Save", "Export".
- Currency: `USD 1,234` (use non-breaking space between code and number if possible).
- Dates: `DD/MM/YYYY` for UI; ISO for logs.

Assets & Structure
- Add `/public/css/theme.css`; include in `layouts/main.ejs` after Bootstrap CSS.
- Page-specific scripts should be kept inline at the bottom of their EJS views (avoid global JS). Remove shared `/public/js/ui.js` unless truly needed.

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
- Known failures → flash in English with guidance (e.g., "Please try again later."), not raw errors.

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
1) Bootstrap app: config, DB, layout, 404/500, root→/auth/login
2) Auth: login/logout (HTMX), sessions, flashes
3) Admin basics: routes and accommodations list + create, users list/role
4) Admin CRUD: add/edit/delete for Routes and Accommodations
5) Dashboard skeleton for itinerary generation (routes added)
6) Seed data for Routes and Accomodation

## Recent Changes (Prototype Scope)
- Added `/dashboard` routes to render existing dashboard views with meta.
- Removed balance-related admin actions and UI; no `User.balance` usage.
- Added `/public/css/theme.css` implementing design tokens and Bootstrap mapping.
- Implemented `Itinerary` model and itinerary flow (list, create in 2 steps, show).
- Added calculator util for totals; created sidebar navigation layout.
- Added server-side guard for itinerary details to ensure all referenced routes exist before rendering and simplified the hydration logic for clarity.
- Added itinerary deletion endpoint and UI button so admins can remove itineraries safely.
- Added itinerary edit workflow (list/detail actions + prepopulated edit form) so admins can fix day selections without recreating the itinerary; missing routes render as blank inputs for manual correction.
- Added print-friendly itinerary preview route/view (layout-free) accessible via the new "Open Print Preview" button for PDF exports.
- Ensured print preview enforces browser color preservation via `print-color-adjust` so theme colors survive PDF export.
- Captured custom inclusions/exclusions and internal profit percent on itineraries (create/edit forms) with storage on the model and rendering on the print preview (profit remains internal-only).
- Replaced route/accommodation datalists with ID-backed select pickers (new + edit) so deleted records never appear in suggestions and server logic always references current documents.
- Review step now shows per-day fee breakdowns (vehicle, park, transit, accommodation + concession fees) before saving itineraries.
- Accommodation selectors display price hints and concession fees are now included in accommodation totals system-wide. The review step now itemizes base vs. concession amounts so admins can verify the totals (client grand total includes profit).

## Itinerary Generation — Way Forward
- Source of truth: `Route` (per-day legs, fees, pax counts) + `Accommodation` catalog (name/place/luxury only).
- Compose itineraries by selecting ordered `Route` items and per-day `Accommodation` name, with per-day unit prices entered in the builder (`adult_price`, `child_price`).
- `Itinerary` stores client name, pax counts, days with `{ route, accomodation: { name, adult_price, child_price } }`, and computed totals.
- Builder: enter title and client name, pick start date, add days (route + accommodation), input adult/child unit prices, review totals (accommodation computed as `adult_price*adults + child_price*children`), then save and print.
- Keep responses small and fragment-based (dashboard → itinerary builder fragments) while maintaining non-JS form fallbacks.

## Acceptance Criteria
- User can only login, logout; sessions persist across refreshes.
- Dashboard shows necessary things
- User role "owner" can add a route; accomodation; update users.
- All primary pages render with consistent layout and English copy.
- 404 and 500 pages render with helpful messaging.
- Logs in /LOGS are updated for features delivered.

Admin Acceptance
- Non-admins cannot access `/admin` routes (403 or redirect with flash in English).
- Admin can create/edit routes and accommodations.

## Seeding
- Command: `npm run seed` (runs `node scripts/seed.js`).
- Seeds sample Route and Accommodation documents suitable for local demo.
- Safe to run multiple times (uses upsert-like guards by name).


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
- Use clear English verbs like "Create Itinerary", "Save", "Print/Export".

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
