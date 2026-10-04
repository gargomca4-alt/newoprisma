-- ================================================================
-- Oprisma Migration V5: Désactiver la confirmation par email
-- & Validation automatique des utilisateurs dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase (SQL Editor)
-- ================================================================

-- 1. Confirmer immédiatement tous les comptes utilisateurs existants non confirmés
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 2. Fonction déclencheur pour auto-confirmer automatiquement tout nouveau compte à l'inscription
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Dès qu'un utilisateur est créé, on valide son email immédiatement
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Déclencheur BEFORE INSERT sur la table auth.users
DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_confirm_user();

-- ================================================================
-- IMPORTANT (Conseillé en plus dans le Dashboard Supabase) :
-- Allez dans : Authentication -> Providers -> Email
-- Décochez "Confirm email" -> Cliquez sur "Save"
-- ================================================================
