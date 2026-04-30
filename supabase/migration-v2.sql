-- ============================================
-- Oprisma V2 Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Add status to quotes (pending, accepted, rejected)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
