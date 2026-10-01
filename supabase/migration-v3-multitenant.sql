-- ============================================
-- Oprisma V3 Migration: Multi-Tenant User Isolation
-- Run this in Supabase SQL Editor
-- Each user gets their own quotes, prices, settings
-- Admin can see everything
-- ============================================

-- =====================
-- STEP 1: Add user_id to all data tables
-- =====================

-- Quotes: each user has their own quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Paper types: each user has their own paper prices
ALTER TABLE public.paper_types
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Print types: each user has their own print prices
ALTER TABLE public.print_types
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Finitions: each user has their own finition prices
ALTER TABLE public.finitions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Pelliculages: each user has their own pelliculage prices
ALTER TABLE public.pelliculages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Products: each user has their own product list
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Paper sizes: each user has their own paper sizes
ALTER TABLE public.paper_sizes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Settings: each user has their own settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================
-- STEP 2: Indexes for performance
-- =====================
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_types_user_id ON public.paper_types(user_id);
CREATE INDEX IF NOT EXISTS idx_print_types_user_id ON public.print_types(user_id);
CREATE INDEX IF NOT EXISTS idx_finitions_user_id ON public.finitions(user_id);
CREATE INDEX IF NOT EXISTS idx_pelliculages_user_id ON public.pelliculages(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_sizes_user_id ON public.paper_sizes(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- =====================
-- STEP 3: Drop old "public_all" policies and create user-scoped policies
-- =====================

-- Drop old policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "public_all" ON public.quotes;
DROP POLICY IF EXISTS "public_all" ON public.paper_types;
DROP POLICY IF EXISTS "public_all" ON public.print_types;
DROP POLICY IF EXISTS "public_all" ON public.finitions;
DROP POLICY IF EXISTS "public_all" ON public.pelliculages;
DROP POLICY IF EXISTS "public_all" ON public.products;
DROP POLICY IF EXISTS "public_all" ON public.paper_sizes;
DROP POLICY IF EXISTS "public_all" ON public.settings;

-- QUOTES: users see only their own
CREATE POLICY "user_quotes_select" ON public.quotes FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_quotes_insert" ON public.quotes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_quotes_update" ON public.quotes FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_quotes_delete" ON public.quotes FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- PAPER TYPES: users see only their own
CREATE POLICY "user_paper_types_select" ON public.paper_types FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_paper_types_insert" ON public.paper_types FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_paper_types_update" ON public.paper_types FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_paper_types_delete" ON public.paper_types FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- PRINT TYPES: users see only their own
CREATE POLICY "user_print_types_select" ON public.print_types FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_print_types_insert" ON public.print_types FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_print_types_update" ON public.print_types FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_print_types_delete" ON public.print_types FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- FINITIONS: users see only their own
CREATE POLICY "user_finitions_select" ON public.finitions FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_finitions_insert" ON public.finitions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_finitions_update" ON public.finitions FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_finitions_delete" ON public.finitions FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- PELLICULAGES: users see only their own
CREATE POLICY "user_pelliculages_select" ON public.pelliculages FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_pelliculages_insert" ON public.pelliculages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_pelliculages_update" ON public.pelliculages FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_pelliculages_delete" ON public.pelliculages FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- PRODUCTS: users see only their own
CREATE POLICY "user_products_select" ON public.products FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_products_insert" ON public.products FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_products_update" ON public.products FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_products_delete" ON public.products FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- PAPER SIZES: users see only their own
CREATE POLICY "user_paper_sizes_select" ON public.paper_sizes FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_paper_sizes_insert" ON public.paper_sizes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_paper_sizes_update" ON public.paper_sizes FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_paper_sizes_delete" ON public.paper_sizes FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- SETTINGS: users see only their own
CREATE POLICY "user_settings_select" ON public.settings FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_settings_insert" ON public.settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "user_settings_update" ON public.settings FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_settings_delete" ON public.settings FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Keep existing policies on junction tables (shared, product-based)
-- product_print_types, product_paper_types, product_sizes stay public
-- since they link to products which are already user-scoped

-- =====================
-- STEP 4: Activity Logs - add user_id too
-- =====================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE public.activity_logs
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
  END IF;
END $$;

-- =====================
-- DONE! Now go back to the app - it will automatically
-- assign user_id on all new data.
-- Existing data (user_id = NULL) remains visible to everyone
-- until you assign it to a specific user.
-- =====================
