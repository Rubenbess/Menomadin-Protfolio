-- Auto-create a team_members row whenever a new user signs up in Supabase Auth.
-- This is a server-side backstop — the protected layout also does this in code.
-- Run in: Supabase Dashboard → SQL Editor

-- 1. Ensure user_id is unique so ON CONFLICT works
ALTER TABLE team_members
  ADD CONSTRAINT IF NOT EXISTS team_members_user_id_key UNIQUE (user_id);

-- 2. Function: insert into team_members on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (user_id, name, email, role, color)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    NEW.email,
    'admin',
    '#6366f1'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Trigger: fire after each new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
