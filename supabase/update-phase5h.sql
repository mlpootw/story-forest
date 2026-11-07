-- =====================================================================
-- 小小書房｜故事森林  更新：媽媽看書簽到（連續天數）
-- =====================================================================
create table if not exists public.mom_reads (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  read_on date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (family_id, book_id, read_on)
);
create index if not exists mom_reads_family_day_idx on public.mom_reads (family_id, read_on);
alter table public.mom_reads enable row level security;
drop policy if exists mom_reads_select on public.mom_reads;
drop policy if exists mom_reads_insert on public.mom_reads;
drop policy if exists mom_reads_delete on public.mom_reads;
create policy mom_reads_select on public.mom_reads for select using (is_family_member(family_id));
create policy mom_reads_insert on public.mom_reads for insert with check (is_family_member(family_id));
create policy mom_reads_delete on public.mom_reads for delete using (is_family_member(family_id));
-- 完成！
