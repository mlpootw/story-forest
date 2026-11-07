-- =====================================================================
-- 小小書房｜故事森林  第四階段更新：每月選一棵樹
-- 已經執行過 schema.sql 的家庭，再執行這一份即可（只需一次）
-- 新架設的家庭不用執行：schema.sql 已經包含這段
-- =====================================================================

create table if not exists public.tree_choices (
  child_id   uuid not null references public.children(id) on delete cascade,
  family_id  uuid not null references public.families(id) on delete cascade,
  month      date not null check (extract(day from month) = 1),
  species    text not null check (species in ('banana','guava','mango','pomelo','waxapple','sakura')),
  chosen_at  timestamptz not null default now(),
  primary key (child_id, month)
);
create index if not exists tree_choices_family_idx on public.tree_choices(family_id);

-- 家庭編號一律從孩子帶入，無法偽造
create or replace function public.tree_choices_fill()
returns trigger language plpgsql set search_path = '' as $$
begin
  select c.family_id into new.family_id from public.children c where c.id = new.child_id;
  if new.family_id is null then raise exception 'child_not_found'; end if;
  new.month := date_trunc('month', new.month)::date;
  return new;
end $$;
drop trigger if exists tree_choices_fill on public.tree_choices;
create trigger tree_choices_fill before insert or update on public.tree_choices
  for each row execute function public.tree_choices_fill();

alter table public.tree_choices enable row level security;
drop policy if exists tree_choices_select on public.tree_choices;
drop policy if exists tree_choices_insert on public.tree_choices;
drop policy if exists tree_choices_update on public.tree_choices;
drop policy if exists tree_choices_delete on public.tree_choices;
create policy tree_choices_select on public.tree_choices for select to authenticated using (public.is_family_member(family_id));
create policy tree_choices_insert on public.tree_choices for insert to authenticated with check (public.is_family_member(family_id));
create policy tree_choices_update on public.tree_choices for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy tree_choices_delete on public.tree_choices for delete to authenticated using (public.is_family_member(family_id));

revoke all on public.tree_choices from anon;
grant select, insert, update, delete on public.tree_choices to authenticated;

-- 匯出資料加入每月選的樹
create or replace function public.export_my_data()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with f as (select public.my_family_id() as id)
  select jsonb_build_object(
    'exported_at', now(),
    'family', (select jsonb_build_object('name', fa.name, 'created_at', fa.created_at)
               from public.families fa, f where fa.id = f.id),
    'parents', (select coalesce(jsonb_agg(jsonb_build_object('display_name', p.display_name, 'role', m.role, 'joined_at', m.joined_at)), '[]'::jsonb)
                from public.family_members m join public.profiles p on p.id = m.user_id, f where m.family_id = f.id),
    'children', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nickname', c.nickname, 'birth_ym', to_char(c.birth_ym, 'YYYY-MM'), 'age_band', c.age_band) order by c.created_at), '[]'::jsonb)
                 from public.children c, f where c.family_id = f.id),
    'child_books', (select coalesce(jsonb_agg(jsonb_build_object(
                      'child_id', cb.child_id, 'title', b.title, 'authors', b.authors, 'publisher', b.publisher,
                      'isbn13', b.isbn13, 'category', cb.category_id, 'secondary_tags', cb.secondary_tags,
                      'favorite', cb.is_favorite, 'note', cb.parent_note)), '[]'::jsonb)
                    from public.child_books cb join public.books b on b.id = cb.book_id, f where cb.family_id = f.id),
    'reading_sessions', (select coalesce(jsonb_agg(jsonb_build_object(
                           'child_id', s.child_id, 'title', b.title, 'read_on', s.read_on, 'mood', s.mood, 'note', s.note)
                           order by s.read_on), '[]'::jsonb)
                         from public.reading_sessions s join public.books b on b.id = s.book_id, f where s.family_id = f.id),
    'tree_choices', (select coalesce(jsonb_agg(jsonb_build_object('child_id', t.child_id, 'month', to_char(t.month, 'YYYY-MM'), 'species', t.species) order by t.month), '[]'::jsonb)
                     from public.tree_choices t, f where t.family_id = f.id)
  );
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- 完成！
