# MinePOS Cloud Migration Plan

Migrate the entire app from `localStorage` to Lovable Cloud (Supabase) with authentication, role-based access, and live multi-device sync. Given the scope, I will deliver this in **3 phases** so you can verify each before moving on.

## Phase 1 — Foundation (Cloud + Auth + Schema)

1. **Enable Lovable Cloud** (provisions Postgres + Auth + Storage).
2. **Database schema** — create tables with proper relationships, RLS, timestamps, indexes:
   - `profiles` (id → auth.users, full_name, phone)
   - `user_roles` (admin / staff) + `has_role()` security definer function
   - `companies`, `products`, `operators`, `hitachi_machines`
   - `bills` + `bill_items` (normalized) + `payments`
   - `expenses`, `hitachi_entries`, `hitachi_fuel`
   - Indexes on `vehicle_number`, `company_id`, `bill_id`, `created_at`
3. **RLS policies** — every table accessible to any authenticated user (single-business app); destructive ops (delete) admin-only.
4. **Auth pages** — `/login` and `/signup` with Email/Password + Google sign-in via Lovable broker. Auto-create profile on signup via trigger.
5. **Route guards** — wrap all existing routes under `_authenticated` layout.

## Phase 2 — Data Layer Refactor

6. **Replace `src/lib/store.ts`** — convert every `getX/saveX/updateX/deleteX` from localStorage into Supabase queries. Keep the same function signatures so route files need minimal edits.
7. **Add TanStack Query** wrapping for live updates + cache invalidation.
8. **Real-time subscriptions** on `bills`, `payments`, `companies`, `expenses` so dashboards update across devices instantly.
9. **One-time import button** in Dashboard Settings — reads existing `localStorage` data and inserts into Supabase (idempotent; marks done in localStorage).

## Phase 3 — Polish & Reliability

10. **Loading & error states** on every page (skeletons, retry).
11. **Dashboard** recalculated from cloud aggregates.
12. **Offline cache** via TanStack Query's persistent cache (best-effort; writes still require network).
13. **Logout button** in app header.

## Technical Notes

- **Tables use UUIDs** (`gen_random_uuid()`) — existing localStorage IDs map to new UUIDs during import.
- **Roles**: `app_role` enum (`admin`, `staff`) in separate `user_roles` table (never on profiles — prevents privilege escalation).
- **Vehicle lookup**: unique index on `companies.vehicle_number` (case-insensitive) for fast search.
- **Bill items normalized**: separate `bill_items` table instead of JSON column → enables product-level reports later.
- **Payments**: outstanding amount derived via DB trigger so it can never drift.
- **Real-time**: Supabase channels subscribed in route loaders; invalidate React Query on change.
- **Google OAuth**: Lovable broker (`lovable.auth.signInWithOAuth("google")`) + `supabase--configure_social_auth` call.

## What I'll Deliver in Phase 1 (this response)

Just Phase 1 — Cloud enabled, schema migrated, auth working, all existing pages protected behind login. Your existing localStorage data stays untouched until you click "Import" in Phase 2.

Reply **"go"** to start Phase 1, or tell me which adjustments to make first.