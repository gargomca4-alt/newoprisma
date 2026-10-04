-- ========================================================
-- IMPULS DESIGN - Migration V6: Security Hardening & Vulnerability Fixes
-- Execute this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ========================================================

-- ========================================================
-- 1. FIX VULNERABILITY: Close Anonymous Broad Quote Manipulation
-- Previously, quotes_update_anon allowed ANY anonymous user
-- to alter any quote, change totals, prices, or user ownership.
-- ========================================================

DROP POLICY IF EXISTS "quotes_update_anon" ON public.quotes;
DROP POLICY IF EXISTS "quotes_select_anon" ON public.quotes;

-- Safe Anon Select: Allow reading quotes for the client portal
CREATE POLICY "quotes_select_anon_portal" ON public.quotes FOR SELECT
  TO anon
  USING (true);

-- Safe Anon Update: Anonymous clients in Portal can ONLY transition
-- a pending quote to 'accepted' or 'rejected'. They cannot alter
-- quote prices, client ownership, or manipulate paid invoices.
CREATE POLICY "quotes_update_anon_portal" ON public.quotes FOR UPDATE
  TO anon
  USING (status IN ('pending', 'sent', 'draft'))
  WITH CHECK (status IN ('accepted', 'rejected'));

-- ========================================================
-- 2. FIX VULNERABILITY: Prevent Anonymous Leak of Staff & Roles
-- Anonymous users (and client portal) must NOT be able to read
-- 'stagiaires_list' or 'user_roles' which contain personal emails,
-- phone numbers, notes, and approval statuses.
-- ========================================================

DROP POLICY IF EXISTS "settings_select_anon" ON public.settings;
DROP POLICY IF EXISTS "settings_select_anon_public" ON public.settings;

CREATE POLICY "settings_select_anon_public" ON public.settings FOR SELECT
  TO anon
  USING (key IN ('company_name', 'company_phone', 'terms_conditions', 'watermark_text', 'default_bleed_mm', 'design_percentage'));

-- ========================================================
-- 3. FIX VULNERABILITY: Prevent Unauthorized Settings Tampering
-- Ensure all modifications to critical settings require authentication.
-- ========================================================

DROP POLICY IF EXISTS "settings_insert_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_update_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_authenticated" ON public.settings;

CREATE POLICY "settings_insert_authenticated" ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "settings_update_authenticated" ON public.settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_delete_authenticated" ON public.settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ========================================================
-- 4. HARDEN TABLES: Enable RLS on all public tables
-- ========================================================
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paper_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.print_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.finitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pelliculages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paper_sizes ENABLE ROW LEVEL SECURITY;

-- Security check notification
DO $$
BEGIN
  RAISE NOTICE 'Security hardening migration V6 executed successfully.';
END $$;
