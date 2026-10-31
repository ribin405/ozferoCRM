# Ozfero Offers — Vendor Enquiry Platform (MVP)

Internal tool: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, RLS), deployable on Vercel.

## Setup

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_init.sql`
   (tables, constraints, indexes, RLS policies, RPCs, seed categories).
2. Copy `.env.local.example` to `.env.local` and fill in the project URL, anon key and service-role key.
3. In Supabase Auth, create the **first user** (Dashboard → Authentication → Add user, auto-confirm).
   The first user to exist becomes the administrator; later users are team members by default.
   Disable public sign-ups (Auth → Providers → Email → "Allow new users to sign up" off).
4. `npm install && npm run dev`, then sign in at http://localhost:3000.
5. Add teammates from **Team** (admin only). Deactivating a user revokes their sessions and RLS blocks their data access.

## Deploy

Connect the GitHub repo to Vercel, set the three env vars (the service-role key is server-only),
and add the production URL to Supabase Auth redirect URLs. Apply schema changes only via new
versioned files in `supabase/migrations/`.

## Decisions taken (change if the business disagrees)

- **Duplicates**: warn, never block (exact normalised phone = strong, similar name = possible).
- **Visibility**: all active team members see all enquiries. For assigned-only, change the `enq_select`
  policy in the migration.
- **Required fields**: business name, category, subcategory, primary phone.
- **Emirate**: fixed dropdown; area is free text. No data export yet.

## Security notes

- Every table has RLS; admin-only writes for taxonomy and role/active changes are enforced in Postgres
  (including a trigger preventing self-promotion), not just hidden in the UI.
- The service-role key is used only in `createAdminClient()` after `requireAdmin()` passes.
- `src/proxy.ts` is an optimistic redirect; each page re-verifies via `requireUser()`.



git add .
git commit -m "Your update message"
git push