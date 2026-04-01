# Menomadin Portfolio VC Management Platform - Summary

**Platform:** Next.js 15 + Supabase + Tailwind CSS
**Hosting:** Vercel (auto-deploy on git push)
**Repository:** https://github.com/Rubenbess/Menomadin-Protfolio

---

## ✅ IMPLEMENTED FEATURES (6 Total)

### 1. **Health Score Algorithm** ✅
- Calculates 0-100 score from: KPI trends, runway, update recency, MOIC
- Displays in Companies page cards and detail views
- Color-coded: green (70+), yellow (40-69), red (<40)
- Server-side calculation in `lib/calculations.ts`
- Component: `HealthScoreBadge.tsx`

### 2. **Pipeline Deal Scoring Rubric** ✅
- 1-5 star ratings for: Team, Market, Traction, Strategic Fit
- Weighted average composite score
- Pass reason tracking
- Referred by contact field
- Form: `components/forms/PipelineForm.tsx`
- Can create/edit/delete pipeline deals on `/pipeline` page

### 3. **Contacts CRM** ✅
- Contact type classification (Founder/Advisor/Co-investor/Service Provider/Other)
- Relationship owner assignment
- Interaction logging (call/meeting/email/other)
- Interaction timeline with delete
- Filter by type and owner
- Last interaction date tracking
- **Status:** Mostly working, but has schema issues (see Issues below)
- Page: `/contacts`

### 4. **Document Vault** ✅
- Supabase Storage integration for file uploads
- 8 categories: Term Sheet, SHA, Investment Agreement, Board Minutes, Financials, Pitch Deck, Legal, Other
- Company tagging and date tracking
- PDF preview modal
- Search and company filters
- Page: `/documents`

### 5. **Portfolio KPI Charts** ✅
- Sparkline charts (inline SVG with 4-value visualization)
- Portfolio ARR chart (Recharts stacked area by company)
- CSV bulk import with column mapping
- Trend badges showing QoQ % change
- Strategy and "with data only" filtering
- Page: `/portfolio-kpis`

### 6. **Notifications & Activity Feed** ✅
- Bell icon with unread count badge (shows "9+" if > 9)
- Dropdown panel showing last 30 notifications
- 10 event types: kpi_added, update_added, stage_changed, new_deal, task_overdue, investment_added, company_added, safe_added, document_uploaded, general
- Each type has emoji icon
- Mark as read / Delete per notification
- Mark all as read functionality
- Relative time formatting (5m ago, 2h ago)
- Component: `NotificationBell.tsx`

---

## 🎨 UX POLISH

### Dark/Light Mode ✅
- Toggle in top bar (both mobile and desktop)
- Persisted to localStorage
- Context provider: `lib/theme-context.tsx`
- Uses Tailwind's `dark:` prefix

### Empty State Illustrations ✅
- Reusable component: `EmptyState.tsx`
- Type-specific icons for each page
- Used in Companies, Contacts, Documents, Pipeline, KPIs pages

### Loading Skeletons ✅
- 5 variants: Skeleton, CompanyCardSkeleton, TableRowSkeleton, TableSkeleton, CardGridSkeleton
- Component: `Skeleton.tsx`
- Wrapper: `SuspenseWithSkeleton.tsx`

---

## 🗂️ PROJECT STRUCTURE

### Pages
```
app/(protected)/
├── dashboard/          - Dashboard overview
├── companies/          - Portfolio companies (working)
├── companies/[id]/     - Company detail view
├── pipeline/           - Deal pipeline board (working)
├── contacts/           - Contacts CRM (has issues - see below)
├── documents/          - Document vault (working)
├── portfolio-kpis/     - KPI charts (working)
├── network/            - Co-investors network
├── reminders/          - Reminders list
├── reports/            - Reports
├── import/             - Data import
├── settings/           - Settings pages
└── updates/            - Company updates
```

### Key Components
- `Sidebar.tsx` - Main navigation (Tasks removed)
- `ThemeToggle.tsx` - Dark/light mode toggle
- `NotificationBell.tsx` - Notifications
- `EmptyState.tsx` - Empty state fallback
- `Skeleton.tsx` - Loading skeletons

### Server Actions
- `actions/companies.ts` - Create/update/delete companies
- `actions/contacts.ts` - Create/update/delete contacts
- `actions/pipeline.ts` - Create/update/delete pipeline entries
- `actions/notifications.ts` - Notification operations
- `actions/global-documents.ts` - Document vault operations

---

## 🗄️ DATABASE SCHEMA

### Tables Created
```
companies
├── id (UUID, PK)
├── name, sector, strategy, hq, status
├── description, logo_url, entry_stage, investment_owner, board_seat, co_investors
└── created_at

contacts ⚠️ SCHEMA ISSUE
├── id (UUID, PK)
├── company_id (NULLABLE - fixed but needs Supabase SQL update)
├── name, position, email, phone, address, linkedin_url
├── contact_type, relationship_owner, last_interaction_date, notes
└── created_at

contact_interactions
├── id (UUID, PK)
├── contact_id (FK → contacts)
├── date, interaction_type (call/meeting/email/other), notes
└── created_at

pipeline
├── id (UUID, PK)
├── name, sector, stage, status, notes, hq
├── fundraising_ask, lead_partner, source, internal_score
├── score_team, score_market, score_traction, score_fit (1-5 star ratings)
├── pass_reason, referred_by, next_steps, deck_url
└── created_at

pipeline_stages
├── id (UUID, PK)
├── name, color, position
└── created_at

global_documents
├── id (UUID, PK)
├── company_id (NULLABLE FK)
├── file_url, file_name, category, doc_date, notes
└── created_at

notifications
├── id (UUID, PK)
├── type (enum), title, body, company_id, link
├── read (boolean)
└── created_at

team_members
├── id (UUID, PK)
├── name, role, color
└── created_at
```

### RLS Policies
- All tables: `Authenticated users can manage [table]` (full access)
- Simple allow-all for authenticated users

---

## ❌ KNOWN ISSUES & BLOCKERS

### 1. **Tasks Feature - REMOVED** ❌
- Attempted to rebuild from scratch multiple times
- Manifest.json corruption issue on Vercel
- Root cause: Unknown build issue with JavaScript bundling
- **Status:** Deleted completely (`/tasks` page, `TaskForm.tsx`, `actions/tasks.ts`)
- **Tasks table exists in Supabase** but feature is not accessible in app

### 2. **Contacts Schema Issue** ⚠️ IN PROGRESS
- **Problem:** `company_id` column is NOT NULL in database
- **Impact:** Cannot add contacts without a company
- **Fix Required:** Run this SQL in Supabase:
  ```sql
  ALTER TABLE contacts
  ALTER COLUMN company_id DROP NOT NULL;
  ```
- **Code:** Form already supports optional company (has "No company" option)
- **Status:** Code is ready, just needs database schema update

### 3. **Contacts Missing Address Column** ⚠️ PENDING
- Created in migration but not fully applied to existing database
- Run this SQL:
  ```sql
  ALTER TABLE contacts
  ADD COLUMN address text;
  ```

### 4. **Manifest.json Still Has Schema Cache Error** ⚠️
- Some browser caches still showing old manifest errors
- Form says: "Could not find the 'address' column of 'contacts' in the schema cache"
- **Fix:** Disable browser cache in DevTools Network tab or close/reopen browser

---

## 🚀 DEPLOYMENT STATUS

- **Platform:** Vercel (auto-deploy on git push)
- **Branch:** main
- **Last Deploy:** Successful
- **Build Status:** ✅ No errors in Next.js build

### Recent Commits
- `b85d7031` - Add ability to create new company while adding contact
- `95114c58` - Add contacts and contact_interactions tables migration
- `67a1c7e3` - Remove Tasks from navigation menu
- `269117a4` - Remove tasks feature for now
- `d336277b` - Fix manifest.json syntax and formatting

---

## 📊 WORKING PAGES (TESTED)

✅ **Dashboard** - Loads without errors
✅ **Companies** - Can add/edit/delete companies
✅ **Pipeline** - Can add/edit/delete deals with star ratings
✅ **Documents** - Can upload and manage documents
✅ **Portfolio KPIs** - Can view KPI charts and import CSV data
✅ **Network** - Co-investor network view
✅ **Reminders** - Reminders list with badges
✅ **Reports** - Reports view
✅ **Settings** - Security and email scanner settings

⚠️ **Contacts** - Partially working (needs company_id schema fix)

---

## 🔑 KEY TECHNOLOGIES

- **Framework:** Next.js 15 (App Router, Server Components)
- **Database:** Supabase PostgreSQL + Row Level Security
- **Storage:** Supabase Storage (for documents)
- **Styling:** Tailwind CSS (with dark mode support)
- **Charts:** Recharts (portfolio ARR, KPI sparklines)
- **Icons:** Lucide React
- **Drag & Drop:** @dnd-kit/core (for pipeline board)
- **Language:** TypeScript
- **Hosting:** Vercel

---

## 📋 TYPE DEFINITIONS

Located in `lib/types.ts`:

```typescript
interface Company { id, name, sector, strategy, hq, status, ... }
interface Contact { id, name, position, email, phone, address, ... }
interface ContactInteraction { id, contact_id, date, interaction_type, notes }
interface GlobalDocument { id, company_id, file_url, category, doc_date }
interface CompanyKPI { id, date, revenue, arr, burn_rate, runway, ... }
interface Task { id, title, status, priority, due_date, company_id, assignee_id } (NOT IMPLEMENTED)
interface Notification { id, type, title, body, company_id, link, read }
interface TeamMember { id, name, email, role, color }
interface HealthScore { total, kpiScore, runwayScore, updateScore, moicScore }
interface PipelineEntry { id, name, score_team, score_market, ... }
```

---

## 🎯 NEXT STEPS (PRIORITY)

1. **URGENT:** Fix Contacts schema in Supabase
   - Make `company_id` nullable
   - Add `address` column if missing
   - Clear browser cache or use incognito window

2. **OPTIONAL:** Rebuild Tasks feature (when time permits)
   - May need to investigate root cause of manifest issue
   - Or use simpler implementation without complex features

3. **NICE-TO-HAVE:** Add more analytics/reporting features

---

## 📝 NOTES FOR OTHER AIS

- **Never assume Tasks work** - it's removed from the app
- **Contacts needs schema fixes** - don't try to use it until SQL is run
- **Supabase schema cache** - Sometimes shows outdated schema errors; use incognito windows to test
- **Vercel deployment** - All changes auto-deploy on git push
- **Type safety** - Codebase is strictly typed; check `lib/types.ts` for interfaces
- **Server actions** - All mutations use 'use server' in `actions/` folder
- **RLS is permissive** - All authenticated users have full access to all tables
