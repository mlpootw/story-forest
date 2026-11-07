-- =====================================================================
-- 小小書房｜故事森林  更新：借閱中書單（book_loans）
-- 從圖書館借來的書記錄到期日，「新增閱讀」會多一個「借閱中」分頁，點書就能記一次共讀
-- =====================================================================
create table if not exists public.book_loans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  due_on date,
  borrowed_on date,
  card text,
  ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, book_id)
);
create index if not exists book_loans_family_idx on public.book_loans (family_id);
alter table public.book_loans enable row level security;
drop policy if exists book_loans_select on public.book_loans;
drop policy if exists book_loans_insert on public.book_loans;
drop policy if exists book_loans_update on public.book_loans;
drop policy if exists book_loans_delete on public.book_loans;
create policy book_loans_select on public.book_loans for select using (is_family_member(family_id));
create policy book_loans_insert on public.book_loans for insert with check (is_family_member(family_id));
create policy book_loans_update on public.book_loans for update using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy book_loans_delete on public.book_loans for delete using (is_family_member(family_id));
drop trigger if exists book_loans_updated on public.book_loans;
create trigger book_loans_updated before update on public.book_loans for each row execute function public.set_updated_at();
-- 完成！
