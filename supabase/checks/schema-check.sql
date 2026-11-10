-- Read-only schema check: lists everything the app expects and whether it exists.
-- Rows with present = false are missing and are listed first.
with expected(kind, name) as (values
  ('extension','pg_trgm'),
  ('type','user_role'),('type','enquiry_status'),('type','enquiry_source'),('type','activity_type'),
  ('table','profiles'),('table','categories'),('table','subcategories'),
  ('table','vendor_enquiries'),('table','follow_ups'),
  ('sequence','enquiry_seq'),
  ('function','set_updated_at'),('function','normalize_phone'),('function','is_active_user'),
  ('function','is_admin'),('function','handle_new_user'),('function','guard_profile_update'),
  ('function','enquiry_before_write'),('function','find_duplicate_enquiries'),
  ('function','dashboard_counts'),('function','normalize_business_name'),
  ('trigger','on_auth_user_created'),('trigger','profiles_guard'),('trigger','enquiry_write'),
  ('policy','profiles_select'),('policy','profiles_update_self'),('policy','profiles_admin_update'),
  ('policy','categories_select'),('policy','categories_admin_ins'),('policy','categories_admin_upd'),('policy','categories_admin_del'),
  ('policy','subcategories_select'),('policy','subcategories_admin_ins'),('policy','subcategories_admin_upd'),('policy','subcategories_admin_del'),
  ('policy','enq_select'),('policy','enq_insert'),('policy','enq_update'),('policy','enq_delete'),
  ('policy','fu_select'),('policy','fu_insert'),('policy','fu_delete')
)
select e.kind, e.name,
  case e.kind
    when 'extension' then exists (select 1 from pg_extension where extname = e.name)
    when 'type'      then exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = e.name)
    when 'table'     then exists (select 1 from pg_tables where schemaname = 'public' and tablename = e.name)
    when 'sequence'  then exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'S' and c.relname = e.name)
    when 'function'  then exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = e.name)
    when 'trigger'   then exists (select 1 from pg_trigger t where t.tgname = e.name and not t.tgisinternal)
    when 'policy'    then exists (select 1 from pg_policies where schemaname = 'public' and policyname = e.name)
  end as present
from expected e
order by present, e.kind, e.name;
