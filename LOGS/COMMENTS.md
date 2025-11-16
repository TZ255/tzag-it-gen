# Comments & Decisions

- 2025-11-12: Passwords remain plain text for this local prototype per request. Passport local strategy compares raw password and excludes it in deserialize to avoid leaking to views. When moving beyond local prototype, switch to bcrypt hashing and update AGENTS.md accordingly.
- 2025-11-12: Removed legacy SMM panel routes/views and repurposed admin area to manage Routes and Accomodations aligned with itinerary generation.
 - 2025-11-12: Balance/transactions removed from admin and user scope to focus on itinerary generation. `User` remains minimal (name/password/role). Future finance can reintroduce a dedicated `Transaction` model if needed.
 - 2025-11-12: Theme tokens added in `/public/css/theme.css`, mapping to Bootstrap variables for consistent styling with minimal custom CSS.

## Itinerary Generation Plan
- Keep `Route` as per-day leg with fees and pax fields; simplify `Accommodation` to a catalog with `accomodation_name`, `place`, and `isLuxury` (no prices stored).
- `Itinerary` references ordered `Route` ids and per-day accommodation overrides (name plus per-day `adult_price` and `child_price`), storing computed totals.
- UI flow: dashboard → itinerary builder (HTMX fragments) → review cost breakdown → export printable summary.
