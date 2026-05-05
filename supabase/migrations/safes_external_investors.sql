-- Track external investor SAFEs (held by other investors, not Menomadin)
-- Run this in the Supabase SQL editor

alter table safes
  add column if not exists investor_name         text,          -- null = Menomadin's own SAFE
  add column if not exists converted_shares      integer,       -- shares issued on conversion
  add column if not exists converted_price_per_share numeric;   -- price per share on conversion
