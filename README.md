# Campus-to-Corporate — Phase 1 Foundation

**Secure multi-tenant B2B SaaS platform for college employability readiness.**

Phase 1 implements: Database schema, Authentication, Roles (SUPER_ADMIN / COLLEGE_ADMIN / TRAINER / STUDENT), Multi-tenancy with RLS, College/Department/Batch/Student/Trainer management, CSV import, Role-based dashboards, In-app notifications, Audit logging.

**Do not build Phase 2+ until this foundation is tested and approved.**

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend / DB**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **UI**: Lucide icons, clean professional corporate design

## Prerequisites (Windows / any OS)

1. Node.js 18+ (LTS recommended) — https://nodejs.org
2. A free Supabase account — https://supabase.com
3. Git (optional)

## Quick Setup (Windows-friendly)

### 1. Open the project

```powershell
cd path\to\campus-to-corporate
```

### 2. Install dependencies

```powershell
npm install
```

If you hit peer dependency warnings on Windows, use:

```powershell
npm install --legacy-peer-deps
```

### 3. Create Supabase project

1. Go to https://supabase.com/dashboard → New Project
2. Note your **Project URL** and **anon public key**
3. In Project Settings → API also note the **service_role** key (keep secret, server-only)

### 4. Apply database schema

1. In Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/001_phase1_schema.sql`
3. Run it
4. Verify tables appear under Table Editor

### 5. Environment variables

Copy the example file:

```powershell
copy .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Never commit `.env.local` or expose the service_role key in browser code.**

### 6. Create the first Super Admin

After schema is applied, create a user via Supabase Auth (Dashboard → Authentication → Users → Add user) **or** via the app signup, then manually set the role:

```sql
-- Replace with the actual user UUID from auth.users / profiles
UPDATE profiles SET role = 'SUPER_ADMIN' WHERE email = 'admin@example.com';
```

### 7. Run the app

```powershell
npm run dev
```

Open http://localhost:3000

## Demo Data

After Super Admin is ready, use the Admin UI to:

1. Create a college (e.g. "Mysuru Institute of Technology", code `MIT`)
2. Create a College Admin for that college
3. Log in as College Admin → create Departments, Batches, Students, Trainers
4. Assign Trainer to Batch
5. Log in as Student / Trainer and verify isolation

## Project Structure

```
campus-to-corporate/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # login, register
│   │   ├── admin/              # Super Admin routes
│   │   ├── college/            # College Admin routes
│   │   ├── trainer/            # Trainer routes
│   │   ├── student/            # Student routes
│   │   └── layout.tsx
│   ├── components/             # Reusable UI
│   ├── lib/                    # Supabase clients, helpers, auth
│   └── types/                  # TypeScript types
├── supabase/
│   └── migrations/             # SQL schema + RLS
├── public/
├── .env.example
└── README.md
```

## Security Notes (Phase 1)

- All sensitive tables have **Row Level Security** enabled.
- Tenant isolation is enforced by `college_id` + RLS policies + helper functions (`is_super_admin`, `is_college_admin`, `get_trainer_batch_ids`, etc.).
- Frontend role checks control navigation only; **real authorization is database-level**.
- Service role key is never sent to the browser.
- Audit logs capture sensitive actions.

## Mandatory Acceptance Tests

Confirm:

1. Super Admin creates College A + College A Admin → College Admin only sees College A
2. College Admin creates Dept → Batch → Student → Student logs in and sees only own data
3. Trainer assigned to Batch A sees only those students; cannot see Batch B
4. College A cannot access College B data
5. Student A cannot access Student B

## Known Limitations (by design)

- No AI, payments, courses, assessments, email/WhatsApp, n8n, recruiter features (Phase 2+)
- CSV import is implemented for students with validation + preview
- Password reset uses Supabase built-in flow

## Windows Tips

- Use PowerShell or Command Prompt
- If path length issues occur, enable long paths or move project closer to drive root
- Node version managers (nvm-windows) recommended

## Next Phase

After Phase 1 acceptance tests pass and you approve:

**Phase 2 — Learning** (Courses → Modules → Lessons → Enrollments → Assessments → Results)

---

Built as a production-oriented foundation. Frontend can later be replaced without losing business data or RLS security model.
