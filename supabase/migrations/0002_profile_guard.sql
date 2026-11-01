-- Let trusted server and SQL-editor changes through the role guard.
-- auth.uid() is null for the service-role key and the SQL editor, so only signed-in
-- non-administrators are blocked from changing role or access.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and
     (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Only administrators can change role or access';
  end if;
  return new;
end $$;
