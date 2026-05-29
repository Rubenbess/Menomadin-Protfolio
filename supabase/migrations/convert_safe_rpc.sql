-- Transactional SAFE conversion: atomically marks the SAFE as converted and
-- inserts a cap-table entry in a single BEGIN/COMMIT block. Eliminates the
-- best-effort rollback that existed in the TypeScript action layer.
--
-- Idempotency: the UPDATE filters on status='unconverted' so a second call on
-- the same SAFE updates zero rows and the function aborts before inserting a
-- duplicate cap_table row. This guards against double-clicks, network retries,
-- and any caller that forgets the TS-layer status check.

create or replace function convert_safe(
  p_safe_id            uuid,
  p_round_id           uuid,
  p_holder_name        text,
  p_ownership_pct      numeric,
  p_shares             numeric default null,
  p_price_per_share    numeric default null
) returns void
language plpgsql
security invoker  -- run as the calling user so RLS is enforced
as $$
declare
  v_company_id uuid;
begin
  update safes
  set
    status                    = 'converted',
    converted_round_id        = p_round_id,
    converted_shares          = p_shares,
    converted_price_per_share = p_price_per_share
  where id = p_safe_id
    and status = 'unconverted'
  returning company_id into v_company_id;

  if v_company_id is null then
    -- Either the SAFE doesn't exist, or it's already been converted.
    -- Either way, refuse to insert a duplicate cap_table row.
    raise exception 'SAFE % is already converted or does not exist', p_safe_id;
  end if;

  insert into cap_table (company_id, round_id, shareholder_name, ownership_percentage)
  values (v_company_id, p_round_id, p_holder_name, p_ownership_pct);
end;
$$;
