-- Add free-text notes to rounds and investments
ALTER TABLE rounds      ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS notes TEXT;
