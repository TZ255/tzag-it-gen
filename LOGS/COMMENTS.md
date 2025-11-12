# Comments & Decisions

- 2025-11-12: Passwords remain plain text for this local prototype per request. Passport local strategy compares raw password and excludes it in deserialize to avoid leaking to views. When moving beyond local prototype, switch to bcrypt hashing and update AGENTS.md accordingly.
- 2025-11-12: Removed legacy SMM panel routes/views and repurposed admin area to manage Routes and Accomodations aligned with itinerary generation.
