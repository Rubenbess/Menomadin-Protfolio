-- Fix internal_score column type to support decimal averages (e.g. 4.8)
-- Run this in the Supabase SQL editor if internal_score is currently integer/smallint

alter table pipeline
  alter column internal_score type numeric(3,1) using internal_score::numeric(3,1);
