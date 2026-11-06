-- Duplicate warning: compare the distinctive part of a business name, not generic words.
-- "Al Jinaah Furniture" and "Al Asool Furniture" are different businesses of the same kind
-- and must not be flagged; "Coffee Club" and "The Coffee Club" are the same business and should.

create or replace function public.normalize_business_name(p text)
returns text language sql immutable as $$
  select trim(regexp_replace(
    regexp_replace(
      lower(coalesce(p, '')),
      '\m(al|el|the|and|llc|l\.l\.c|fze|fzc|est|establishment|co|company|corp|inc|ltd|trading|general|group|international|enterprises|shop|store|stores|center|centre|furniture|furnitures|restaurant|cafe|cafeteria|salon|gym|garage|market|supermarket|bakery|pharmacy|clinic|tailoring|motors|auto|car|cars)\M',
      ' ', 'g'),
    '[^a-z0-9؀-ۿ]+', ' ', 'g'));
$$;

create or replace function public.find_duplicate_enquiries(
  p_name text, p_phone text, p_exclude uuid default null)
returns table (
  id uuid, enquiry_code text, business_name text, branch_name text, area text,
  primary_phone text, status public.enquiry_status, assigned_name text, match_type text)
language sql stable security invoker set search_path = public as $$
  with q as (
    select public.normalize_business_name(p_name) as n,
           public.normalize_phone(p_phone) as ph
  )
  select e.id, e.enquiry_code, e.business_name, e.branch_name, e.area,
         e.primary_phone, e.status, p.full_name,
         case when q.ph is not null and e.primary_phone_normalized = q.ph
              then 'phone' else 'name' end
  from public.vendor_enquiries e
  cross join q
  left join public.profiles p on p.id = e.assigned_to
  where (p_exclude is null or e.id <> p_exclude)
    and (
      (q.ph is not null and e.primary_phone_normalized = q.ph)
      or (
        length(q.n) >= 3
        and (
          public.normalize_business_name(e.business_name) = q.n
          or similarity(public.normalize_business_name(e.business_name), q.n) >= 0.75
        )
      )
    )
  order by (q.ph is not null and e.primary_phone_normalized = q.ph) desc,
           e.created_at desc
  limit 5;
$$;
