-- Pipeline deal scoring rubric + source fields
-- Run this in the Supabase SQL editor

alter table pipeline
  add column if not exists score_team     smallint check (score_team between 1 and 5),
  add column if not exists score_market   smallint check (score_market between 1 and 5),
  add column if not exists score_traction smallint check (score_traction between 1 and 5),
  add column if not exists score_fit      smallint check (score_fit between 1 and 5),
  add column if not exists pass_reason    text,
  add column if not exists referred_by    text;

-- internal_score becomes the computed weighted avg (stored for fast queries)
-- No schema change needed — it already exists as numeric.
