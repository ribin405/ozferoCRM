-- Ozfero Offers Vendor Enquiry Platform — initial schema, RLS, seed data.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('admin', 'team_member');
create type public.enquiry_status as enum
  ('new', 'contacted', 'interested', 'not_interested', 'converted');
create type public.enquiry_source as enum
  ('visit', 'phone', 'whatsapp', 'referral', 'email', 'event', 'other');
create type public.activity_type as enum
  ('call', 'whatsapp', 'visit', 'email', 'meeting', 'other');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Digits only; 00971.../971.../05xxxxxxxx/5xxxxxxxx collapse to 971 + national number.
create or replace function public.normalize_phone(p text)
returns text language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d = '' then return null; end if;
  if d like '00%' then d := substr(d, 3); end if;
  if d like '971%' then return d; end if;
  if d like '0%' then return '971' || substr(d, 2); end if;
  if length(d) = 9 then return '971' || d; end if;
  return d;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.user_role not null default 'team_member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

-- The first user to sign up becomes the administrator; everyone else is a team member.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles) then 'team_member'::public.user_role
         else 'admin'::public.user_role end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop team members editing their own role / active flag.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and
     (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Only administrators can change role or access';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------- taxonomy
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_uq on public.categories (lower(name));
create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, category_id)
);
create unique index subcategories_name_uq on public.subcategories (category_id, lower(name));
create trigger subcategories_updated before update on public.subcategories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- enquiries
create sequence public.enquiry_seq;

create table public.vendor_enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_code text not null unique,
  business_name text not null check (length(trim(business_name)) > 0),
  branch_name text,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid not null,
  contact_person text,
  designation text,
  primary_phone text not null check (length(trim(primary_phone)) > 0),
  primary_phone_normalized text,
  alternative_phone text,
  whatsapp_number text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  emirate text,
  area text,
  full_address text,
  maps_url text,
  website_url text,
  social_url text,
  business_description text,
  source public.enquiry_source,
  status public.enquiry_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  interest_notes text,
  next_follow_up_at date,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a subcategory must belong to the selected category
  foreign key (subcategory_id, category_id)
    references public.subcategories (id, category_id)
);
create index enq_status_idx on public.vendor_enquiries (status);
create index enq_cat_idx on public.vendor_enquiries (category_id, subcategory_id);
create index enq_assigned_idx on public.vendor_enquiries (assigned_to);
create index enq_created_idx on public.vendor_enquiries (created_at desc);
create index enq_followup_idx on public.vendor_enquiries (next_follow_up_at);
create index enq_phone_idx on public.vendor_enquiries (primary_phone_normalized);
create index enq_name_trgm_idx on public.vendor_enquiries
  using gin (lower(business_name) gin_trgm_ops);

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
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger enquiry_write before insert or update on public.vendor_enquiries
  for each row execute function public.enquiry_before_write();
create trigger enquiry_updated before update on public.vendor_enquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- follow-ups
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.vendor_enquiries(id) on delete cascade,
  activity_type public.activity_type not null,
  activity_at timestamptz not null default now(),
  outcome text,
  notes text,
  next_follow_up_at date,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index fu_enquiry_idx on public.follow_ups (enquiry_id, activity_at desc);

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.vendor_enquiries enable row level security;
alter table public.follow_ups enable row level security;

-- profiles: active users see the team; own name editable; admins manage all.
create policy profiles_select on public.profiles for select
  using (public.is_active_user());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- taxonomy: everyone active reads; only admins write.
create policy categories_select on public.categories for select using (public.is_active_user());
create policy categories_admin_ins on public.categories for insert with check (public.is_admin());
create policy categories_admin_upd on public.categories for update
  using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_del on public.categories for delete using (public.is_admin());

create policy subcategories_select on public.subcategories for select using (public.is_active_user());
create policy subcategories_admin_ins on public.subcategories for insert with check (public.is_admin());
create policy subcategories_admin_upd on public.subcategories for update
  using (public.is_admin()) with check (public.is_admin());
create policy subcategories_admin_del on public.subcategories for delete using (public.is_admin());

-- enquiries: shared visibility for the team (change `using` for assigned-only).
create policy enq_select on public.vendor_enquiries for select using (public.is_active_user());
create policy enq_insert on public.vendor_enquiries for insert
  with check (public.is_active_user() and created_by = auth.uid());
create policy enq_update on public.vendor_enquiries for update
  using (public.is_active_user()) with check (public.is_active_user());
create policy enq_delete on public.vendor_enquiries for delete using (public.is_admin());

create policy fu_select on public.follow_ups for select using (public.is_active_user());
create policy fu_insert on public.follow_ups for insert
  with check (public.is_active_user() and created_by = auth.uid());
create policy fu_delete on public.follow_ups for delete using (public.is_admin());

-- ---------------------------------------------------------------- RPCs
-- Likely duplicates: exact normalised phone (strong) or similar business name (possible).
create or replace function public.find_duplicate_enquiries(
  p_name text, p_phone text, p_exclude uuid default null)
returns table (
  id uuid, enquiry_code text, business_name text, branch_name text, area text,
  primary_phone text, status public.enquiry_status, assigned_name text, match_type text)
language sql stable security invoker set search_path = public as $$
  select e.id, e.enquiry_code, e.business_name, e.branch_name, e.area,
         e.primary_phone, e.status, p.full_name,
         case when public.normalize_phone(p_phone) is not null
                   and e.primary_phone_normalized = public.normalize_phone(p_phone)
              then 'phone' else 'name' end
  from public.vendor_enquiries e
  left join public.profiles p on p.id = e.assigned_to
  where (p_exclude is null or e.id <> p_exclude)
    and (
      (public.normalize_phone(p_phone) is not null
        and e.primary_phone_normalized = public.normalize_phone(p_phone))
      or (length(trim(coalesce(p_name, ''))) >= 3
        and (lower(e.business_name) = lower(trim(p_name))
             or similarity(lower(e.business_name), lower(trim(p_name))) > 0.5))
    )
  order by (e.primary_phone_normalized = public.normalize_phone(p_phone)) desc nulls last,
           e.created_at desc
  limit 5;
$$;

create or replace function public.dashboard_counts()
returns table (status public.enquiry_status, total bigint)
language sql stable security invoker set search_path = public as $$
  select status, count(*) from public.vendor_enquiries group by status;
$$;

-- ---------------------------------------------------------------- seed taxonomy
do $$
declare
  cats text[][] := array[
    ['Restaurants & Cafes', 'Restaurant|Cafe|Fast Food|Bakery|Juice & Dessert Shop'],
    ['Beauty & Wellness', 'Salon|Barber|Spa|Nail Studio|Clinic & Dental'],
    ['Fitness & Sports', 'Gym|Yoga & Pilates|Sports Academy|Swimming'],
    ['Retail & Shopping', 'Fashion|Electronics|Grocery|Gifts & Flowers|Optical'],
    ['Automotive', 'Car Wash|Garage & Service|Detailing|Tyres & Batteries'],
    ['Entertainment & Leisure', 'Attractions|Gaming|Cinema|Events & Experiences'],
    ['Travel & Hospitality', 'Hotel|Tour Operator|Car Rental'],
    ['Services', 'Cleaning|Laundry|Printing|Education & Training|Other']
  ];
  c_id uuid; i int; s text; j int;
begin
  for i in 1 .. array_length(cats, 1) loop
    insert into public.categories (name, display_order) values (cats[i][1], i * 10)
      returning id into c_id;
    j := 0;
    foreach s in array string_to_array(cats[i][2], '|') loop
      j := j + 1;
      insert into public.subcategories (category_id, name, display_order) values (c_id, s, j * 10);
    end loop;
  end loop;
end $$;
