-- Let the enquiry date (created_at) be edited. Enquiries are often recorded days after the call or visit,
-- so the team needs to set the real date. The code and the creator stay locked after the first save.
create or replace function public.enquiry_before_write()
returns trigger language plpgsql as $$
begin
  new.primary_phone_normalized := public.normalize_phone(new.primary_phone);
  if tg_op = 'INSERT' then
    new.enquiry_code := 'OZV-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('public.enquiry_seq')::text, 5, '0');
  else
    new.enquiry_code := old.enquiry_code;
    new.created_by := old.created_by;
  end if;
  return new;
end $$;
