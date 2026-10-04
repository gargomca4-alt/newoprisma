-- ============================================
-- Oprisma V4 Migration: Fix RLS Policies
-- Run this in Supabase SQL Editor
-- Fixes: stagiaires can't insert quotes
-- Fixes: admin can't see all quotes
-- ============================================

-- =====================
-- STEP 1: Drop all V3 user-scoped policies
-- =====================

-- Quotes
DROP POLICY IF EXISTS "user_quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "user_quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "user_quotes_update" ON public.quotes;
DROP POLICY IF EXISTS "user_quotes_delete" ON public.quotes;

-- Paper types
DROP POLICY IF EXISTS "user_paper_types_select" ON public.paper_types;
DROP POLICY IF EXISTS "user_paper_types_insert" ON public.paper_types;
DROP POLICY IF EXISTS "user_paper_types_update" ON public.paper_types;
DROP POLICY IF EXISTS "user_paper_types_delete" ON public.paper_types;

-- Print types
DROP POLICY IF EXISTS "user_print_types_select" ON public.print_types;
DROP POLICY IF EXISTS "user_print_types_insert" ON public.print_types;
DROP POLICY IF EXISTS "user_print_types_update" ON public.print_types;
DROP POLICY IF EXISTS "user_print_types_delete" ON public.print_types;

-- Finitions
DROP POLICY IF EXISTS "user_finitions_select" ON public.finitions;
DROP POLICY IF EXISTS "user_finitions_insert" ON public.finitions;
DROP POLICY IF EXISTS "user_finitions_update" ON public.finitions;
DROP POLICY IF EXISTS "user_finitions_delete" ON public.finitions;

-- Pelliculages
DROP POLICY IF EXISTS "user_pelliculages_select" ON public.pelliculages;
DROP POLICY IF EXISTS "user_pelliculages_insert" ON public.pelliculages;
DROP POLICY IF EXISTS "user_pelliculages_update" ON public.pelliculages;
DROP POLICY IF EXISTS "user_pelliculages_delete" ON public.pelliculages;

-- Products
DROP POLICY IF EXISTS "user_products_select" ON public.products;
DROP POLICY IF EXISTS "user_products_insert" ON public.products;
DROP POLICY IF EXISTS "user_products_update" ON public.products;
DROP POLICY IF EXISTS "user_products_delete" ON public.products;

-- Paper sizes
DROP POLICY IF EXISTS "user_paper_sizes_select" ON public.paper_sizes;
DROP POLICY IF EXISTS "user_paper_sizes_insert" ON public.paper_sizes;
DROP POLICY IF EXISTS "user_paper_sizes_update" ON public.paper_sizes;
DROP POLICY IF EXISTS "user_paper_sizes_delete" ON public.paper_sizes;

-- Settings
DROP POLICY IF EXISTS "user_settings_select" ON public.settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.settings;
DROP POLICY IF EXISTS "user_settings_delete" ON public.settings;

-- =====================
-- STEP 2: Enable RLS on all tables (idempotent)
-- =====================
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelliculages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =====================
-- STEP 3: New RLS Policies
-- Strategy:
--   SELECT: All authenticated users can read everything (admin scoping done in app)
--   INSERT: Authenticated users can insert (user_id must match auth.uid() OR be NULL)
--   UPDATE: Users can update their own rows or rows with NULL user_id
--   DELETE: Users can delete their own rows or rows with NULL user_id
-- =====================

-- ── QUOTES ──
CREATE POLICY "quotes_select_authenticated" ON public.quotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "quotes_insert_authenticated" ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "quotes_update_authenticated" ON public.quotes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "quotes_delete_authenticated" ON public.quotes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── PAPER TYPES ──
CREATE POLICY "paper_types_select_authenticated" ON public.paper_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "paper_types_insert_authenticated" ON public.paper_types FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "paper_types_update_authenticated" ON public.paper_types FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "paper_types_delete_authenticated" ON public.paper_types FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── PRINT TYPES ──
CREATE POLICY "print_types_select_authenticated" ON public.print_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "print_types_insert_authenticated" ON public.print_types FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "print_types_update_authenticated" ON public.print_types FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "print_types_delete_authenticated" ON public.print_types FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── FINITIONS ──
CREATE POLICY "finitions_select_authenticated" ON public.finitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "finitions_insert_authenticated" ON public.finitions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "finitions_update_authenticated" ON public.finitions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "finitions_delete_authenticated" ON public.finitions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── PELLICULAGES ──
CREATE POLICY "pelliculages_select_authenticated" ON public.pelliculages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pelliculages_insert_authenticated" ON public.pelliculages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "pelliculages_update_authenticated" ON public.pelliculages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "pelliculages_delete_authenticated" ON public.pelliculages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── PRODUCTS ──
CREATE POLICY "products_select_authenticated" ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert_authenticated" ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "products_update_authenticated" ON public.products FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "products_delete_authenticated" ON public.products FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── PAPER SIZES ──
CREATE POLICY "paper_sizes_select_authenticated" ON public.paper_sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "paper_sizes_insert_authenticated" ON public.paper_sizes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "paper_sizes_update_authenticated" ON public.paper_sizes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "paper_sizes_delete_authenticated" ON public.paper_sizes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── SETTINGS ── (more permissive: shared config data)
CREATE POLICY "settings_select_authenticated" ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "settings_insert_authenticated" ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "settings_update_authenticated" ON public.settings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "settings_delete_authenticated" ON public.settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ── ANON access for portal/public quote links ──
-- Allow anonymous users to read quotes (for client portal)
DROP POLICY IF EXISTS "quotes_select_anon" ON public.quotes;
CREATE POLICY "quotes_select_anon" ON public.quotes FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "quotes_update_anon" ON public.quotes;
CREATE POLICY "quotes_update_anon" ON public.quotes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- =====================
-- DONE! Run this migration in your Supabase SQL Editor.
-- After running, stagiaires will be able to create quotes
-- and admin will see all quotes in the dashboard.
-- =====================
