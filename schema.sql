-- ============================================================
-- VC Portfolio Manager — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Companies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  sector     TEXT NOT NULL DEFAULT '',
  strategy   TEXT NOT NULL CHECK (strategy IN ('impact', 'venture')),
  hq         TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'exited', 'written-off', 'watchlist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Funding Rounds ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rounds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  type          TEXT NOT NULL,
  pre_money     NUMERIC(20, 2) NOT NULL DEFAULT 0,
  post_money    NUMERIC(20, 2) NOT NULL DEFAULT 0,
  amount_raised NUMERIC(20, 2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Investments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  round_id       UUID REFERENCES rounds(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  amount         NUMERIC(20, 2) NOT NULL DEFAULT 0,
  instrument     TEXT NOT NULL CHECK (instrument IN ('SAFE', 'Equity', 'Note', 'Warrant')),
  valuation_cap  NUMERIC(20, 2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cap Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cap_table (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  round_id             UUID REFERENCES rounds(id) ON DELETE SET NULL,
  shareholder_name     TEXT NOT NULL,
  ownership_percentage NUMERIC(7, 4) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reserves ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reserves (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reserved_amount  NUMERIC(20, 2) NOT NULL DEFAULT 0,
  deployed_amount  NUMERIC(20, 2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Documents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Deal Pipeline ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  sector     TEXT NOT NULL DEFAULT '',
  stage      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'prospecting'
               CHECK (status IN ('prospecting', 'initial-meeting', 'due-diligence', 'term-sheet', 'closed', 'passed')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Enable RLS on all tables (only authenticated users can access)

ALTER TABLE companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_table   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserves    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline    ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "authenticated_all" ON companies   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON rounds      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON investments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON cap_table   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON reserves    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON documents   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON pipeline    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Storage Bucket ──────────────────────────────────────────
-- Create a storage bucket for company documents.
-- Run this separately in Supabase Dashboard → Storage
-- OR via: INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);
