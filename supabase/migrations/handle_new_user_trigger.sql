-- Auto-create a team_members row whenever a new user signs up in Supabase Auth.
-- team_members.id IS the auth user UUID (FK to auth.users) — no separate user_id column.
-- Run in: Supabase Dashboard → SQL Editor

-- Function: insert into team_members on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (id, name, email, role, color)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    NEW.email,
    'admin',
    '#6366f1'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: fire after each new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
