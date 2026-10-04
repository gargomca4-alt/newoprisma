-- ========================================================
-- IMPULS DESIGN - Migration V7: Complete User Deletion & Auth Sync
-- Execute this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ========================================================

-- Function to completely delete a user from auth.users when removed by admin
CREATE OR REPLACE FUNCTION public.delete_auth_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the user matching the email from auth.users
  DELETE FROM auth.users WHERE LOWER(email) = LOWER(TRIM(user_email));
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_auth_user(text) TO authenticated;

-- Confirmation notice
DO $$
BEGIN
  RAISE NOTICE 'Migration V7 (delete_auth_user) executed successfully.';
END $$;
