-- =====================================================================
-- 小小書房｜故事森林  資料庫結構（第二階段）
-- 使用方式：Supabase 後台 → SQL Editor → New query → 貼上整份 → Run
-- 只需要在新專案執行一次。
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1. 表格
-- =====================================================================

-- 家長個人資料（與登入帳號一對一）
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text check (char_length(display_name) <= 20),
  created_at    timestamptz not null default now()
);

-- 家庭
create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '我們家的故事森林' check (char_length(name) between 1 and 30),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 家庭成員（家長）
create table public.family_members (
  family_id  uuid not null references public.families(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'parent' check (role in ('owner','parent')),
  joined_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);
-- 第一版：每位家長只屬於一個家庭（之後要放寬時，刪掉這個索引即可）
create unique index family_members_one_family_per_user on public.family_members(user_id);

-- 邀請另一位家長加入用的邀請碼（一次性、7 天有效）
create table public.family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  code        text not null unique check (code ~ '^[A-Z2-9]{8}$'),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references public.profiles(id) on delete set null,
  used_at     timestamptz
);
create index family_invites_family_idx on public.family_invites(family_id);

-- 孩子（預設不公開，只有同家庭家長看得到）
create table public.children (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  nickname      text not null check (char_length(nickname) between 1 and 20),
  -- 出生年月：只存到「月」，固定存成該月 1 號
  birth_ym      date check (birth_ym is null or (extract(day from birth_ym) = 1 and birth_ym >= date '2005-01-01')),
  -- 不想填出生年月時，可只選年齡階段
  age_band      text check (age_band in ('0-1','2-3','4-5','6-8','9+')),
  avatar_color  text not null default '#83A48A' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index children_family_idx on public.children(family_id);

-- 八大繪本分類（決定葉子顏色）
create table public.book_categories (
  id          text primary key,
  name        text not null,
  color       text not null,
  sort_order  smallint not null
);
insert into public.book_categories (id, name, color, sort_order) values
  ('emotion',     '情緒與自我認識', '#C88F99', 1),
  ('social',      '人際與社交',     '#D5A57C', 2),
  ('nature',      '自然與科學',     '#83A48A', 3),
  ('vehicle',     '交通與機械',     '#D6B65E', 4),
  ('life',        '生活與習慣',     '#A5B6A0', 5),
  ('imagination', '想像與創造',     '#AD9DBD', 6),
  ('cognition',   '認知與思考',     '#8EAEBB', 7),
  ('culture',     '文化與世界',     '#BE9582', 8);

-- 書籍資料
--   owner_family_id 為 null：公共書庫（有 ISBN、來自 Google Books / Open Library），同一 ISBN 只存一筆
--   owner_family_id 有值：某個家庭手動建立的書（例如沒有 ISBN），只有該家庭看得到
--   同一作品的不同版本（不同 ISBN）各自一筆，可用 work_key 歸組
create table public.books (
  id                  uuid primary key default gen_random_uuid(),
  isbn13              text check (isbn13 ~ '^97[89][0-9]{10}$'),
  isbn10              text check (isbn10 ~ '^[0-9]{9}[0-9X]$'),
  title               text not null check (char_length(title) between 1 and 200),
  authors             text[] not null default '{}',
  publisher           text,
  published_date      text,
  description         text,
  subjects            text[] not null default '{}',
  suggested_category  text references public.book_categories(id),
  cover_url           text,
  cover_source        text not null default 'none' check (cover_source in ('google','openlibrary','upload','none')),
  source              text not null check (source in ('google','openlibrary','manual')),
  source_id           text,
  work_key            text,
  owner_family_id     uuid references public.families(id) on delete cascade,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint public_books_need_isbn check (owner_family_id is not null or isbn13 is not null)
);
create unique index books_public_isbn13_unique on public.books(isbn13) where owner_family_id is null;
create index books_owner_family_idx on public.books(owner_family_id);
create index books_work_key_idx on public.books(work_key);

-- 孩子的個人書房：同一個孩子＋同一本書只有一筆（分類由家長確認，存在這裡）
create table public.child_books (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  child_id        uuid not null references public.children(id) on delete cascade,
  book_id         uuid not null references public.books(id),
  category_id     text references public.book_categories(id),  -- null = 待確認分類
  secondary_tags  text[] not null default '{}' check (cardinality(secondary_tags) <= 2),
  is_favorite     boolean not null default false,
  parent_note     text check (char_length(parent_note) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (child_id, book_id)
);
create index child_books_family_idx on public.child_books(family_id);
create index child_books_book_idx on public.child_books(book_id);

-- 每一次共讀（同一本書重複閱讀＝多筆；可補登過去日期）
create table public.reading_sessions (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families(id) on delete cascade,
  child_id         uuid not null references public.children(id) on delete cascade,
  child_book_id    uuid not null references public.child_books(id) on delete cascade,
  book_id          uuid not null references public.books(id),
  read_on          date not null default current_date,
  mood             smallint check (mood between 1 and 3),   -- 3 好喜歡 / 2 還不錯 / 1 還好
  note             text check (char_length(note) <= 500),
  growth_shown_at  timestamptz,   -- 孩子模式澆水後填入，成長動畫只播一次
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index reading_sessions_child_date_idx on public.reading_sessions(child_id, read_on);
create index reading_sessions_family_date_idx on public.reading_sessions(family_id, read_on);
create index reading_sessions_child_book_idx on public.reading_sessions(child_book_id);

-- 每月閱讀樹摘要（由資料庫自動維護，供月曆、報告、年度森林快速讀取）
create table public.reading_trees (
  child_id         uuid not null references public.children(id) on delete cascade,
  family_id        uuid not null references public.families(id) on delete cascade,
  month            date not null check (extract(day from month) = 1),
  distinct_books   int not null default 0,
  total_sessions   int not null default 0,
  reading_days     int not null default 0,
  category_counts  jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now(),
  primary key (child_id, month)
);
create index reading_trees_family_idx on public.reading_trees(family_id);

-- =====================================================================
-- 2. 輔助函式
-- =====================================================================

create or replace function public.is_family_member(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_family_owner(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

create or replace function public.shares_family_with(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members a
    join public.family_members b on a.family_id = b.family_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  );
$$;

create or replace function public.my_family_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.family_id from public.family_members m where m.user_id = (select auth.uid()) limit 1;
$$;

-- =====================================================================
-- 3. 觸發器
-- =====================================================================

-- 新帳號自動建立 profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger children_updated_at before update on public.children for each row execute function public.set_updated_at();
create trigger books_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger child_books_updated_at before update on public.child_books for each row execute function public.set_updated_at();
create trigger reading_sessions_updated_at before update on public.reading_sessions for each row execute function public.set_updated_at();

-- child_books：family_id 一律從孩子帶入，無法偽造；私人書目只能放進自己家庭
create or replace function public.child_books_fill()
returns trigger language plpgsql set search_path = '' as $$
declare v_owner uuid;
begin
  select c.family_id into new.family_id from public.children c where c.id = new.child_id;
  if new.family_id is null then raise exception 'child_not_found'; end if;
  select b.owner_family_id into v_owner from public.books b where b.id = new.book_id;
  if not found then raise exception 'book_not_found'; end if;
  if v_owner is not null and v_owner <> new.family_id then raise exception 'book_not_accessible'; end if;
  return new;
end $$;
create trigger child_books_fill before insert or update of child_id, book_id, family_id
  on public.child_books for each row execute function public.child_books_fill();

-- reading_sessions：孩子、家庭、書籍一律從 child_books 帶入；日期不能是未來
create or replace function public.reading_sessions_fill()
returns trigger language plpgsql set search_path = '' as $$
begin
  select cb.child_id, cb.family_id, cb.book_id
    into new.child_id, new.family_id, new.book_id
    from public.child_books cb where cb.id = new.child_book_id;
  if new.family_id is null then raise exception 'child_book_not_found'; end if;
  if new.read_on > current_date + 1 then raise exception 'future_date'; end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := (select auth.uid()); end if;
  return new;
end $$;
create trigger reading_sessions_fill before insert or update of child_book_id, read_on, family_id, child_id, book_id
  on public.reading_sessions for each row execute function public.reading_sessions_fill();

-- 重新計算某孩子某月份的閱讀樹摘要
create or replace function public.recompute_reading_tree(p_child uuid, p_month date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_family uuid; v_start date := date_trunc('month', p_month)::date;
begin
  select c.family_id into v_family from public.children c where c.id = p_child;
  if v_family is null then return; end if;
  insert into public.reading_trees as t
    (child_id, family_id, month, distinct_books, total_sessions, reading_days, category_counts, updated_at)
  select p_child, v_family, v_start,
         count(distinct s.book_id), count(*), count(distinct s.read_on),
         coalesce((
           select jsonb_object_agg(x.cat, x.n) from (
             select coalesce(cb.category_id, 'tbd') as cat, count(distinct s2.book_id) as n
             from public.reading_sessions s2
             join public.child_books cb on cb.id = s2.child_book_id
             where s2.child_id = p_child and s2.read_on >= v_start and s2.read_on < (v_start + interval '1 month')
             group by 1) x), '{}'::jsonb),
         now()
  from public.reading_sessions s
  where s.child_id = p_child and s.read_on >= v_start and s.read_on < (v_start + interval '1 month')
  on conflict (child_id, month) do update set
    distinct_books = excluded.distinct_books, total_sessions = excluded.total_sessions,
    reading_days = excluded.reading_days, category_counts = excluded.category_counts, updated_at = now();
end $$;

create or replace function public.reading_sessions_after()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.recompute_reading_tree(old.child_id, old.read_on); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.recompute_reading_tree(new.child_id, new.read_on); end if;
  return null;
end $$;
create trigger reading_sessions_after after insert or update or delete
  on public.reading_sessions for each row execute function public.reading_sessions_after();

-- 修改分類時，更新這本書出現過的所有月份
create or replace function public.child_books_category_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select distinct date_trunc('month', s.read_on)::date as m
           from public.reading_sessions s where s.child_book_id = new.id loop
    perform public.recompute_reading_tree(new.child_id, r.m);
  end loop;
  return null;
end $$;
create trigger child_books_category_after after update of category_id
  on public.child_books for each row execute function public.child_books_category_after();

-- =====================================================================
-- 4. 給前端呼叫的功能（RPC）
-- =====================================================================

-- 建立家庭（建立者成為 owner）
create or replace function public.create_family(p_family_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members m where m.user_id = v_uid) then raise exception 'already_in_family'; end if;
  insert into public.profiles (id, display_name) values (v_uid, nullif(trim(p_display_name), ''))
    on conflict (id) do update set display_name = excluded.display_name;
  insert into public.families (name, created_by)
    values (coalesce(nullif(trim(p_family_name), ''), '我們家的故事森林'), v_uid) returning id into v_id;
  insert into public.family_members (family_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

-- 產生邀請碼（8 碼，排除容易看錯的 0/O/1/I）
create or replace function public.create_invite()
returns table (invite_code text, invite_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_fam uuid;
  v_code text;
  v_alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  i int;
begin
  select m.family_id into v_fam from public.family_members m where m.user_id = v_uid;
  if v_fam is null then raise exception 'no_family'; end if;
  if (select count(*) from public.family_invites fi
      where fi.family_id = v_fam and fi.used_at is null and fi.expires_at > now()) >= 5 then
    raise exception 'too_many_invites';
  end if;
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alpha, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.family_invites fi where fi.code = v_code);
  end loop;
  insert into public.family_invites (family_id, code, created_by) values (v_fam, v_code, v_uid);
  return query select v_code, now() + interval '7 days';
end $$;

-- 用邀請碼加入家庭
create or replace function public.join_family(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_inv public.family_invites%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.family_members m where m.user_id = v_uid) then raise exception 'already_in_family'; end if;
  select * into v_inv from public.family_invites fi where fi.code = upper(trim(p_code)) for update;
  if not found then raise exception 'invalid_code'; end if;
  if v_inv.used_at is not null then raise exception 'code_used'; end if;
  if v_inv.expires_at < now() then raise exception 'code_expired'; end if;
  insert into public.profiles (id, display_name) values (v_uid, nullif(trim(p_display_name), ''))
    on conflict (id) do update set display_name = coalesce(excluded.display_name, public.profiles.display_name);
  insert into public.family_members (family_id, user_id, role) values (v_inv.family_id, v_uid, 'parent');
  update public.family_invites set used_by = v_uid, used_at = now() where id = v_inv.id;
  return v_inv.family_id;
end $$;

-- 匯出自己家庭的全部紀錄（JSON）
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
                         from public.reading_sessions s join public.books b on b.id = s.book_id, f where s.family_id = f.id)
  );
$$;

-- 刪除自己的帳號
--   你是家庭唯一成員：家庭與所有孩子、閱讀紀錄一併刪除
--   還有其他家長：家庭交給另一位家長，紀錄保留
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_fam uuid; v_role text; v_next uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select m.family_id, m.role into v_fam, v_role from public.family_members m where m.user_id = v_uid;
  if v_fam is not null and v_role = 'owner' then
    select m.user_id into v_next from public.family_members m
      where m.family_id = v_fam and m.user_id <> v_uid order by m.joined_at limit 1;
    if v_next is null then
      delete from public.families where id = v_fam;
    else
      update public.family_members set role = 'owner' where family_id = v_fam and user_id = v_next;
    end if;
  end if;
  delete from auth.users where id = v_uid;
end $$;

-- =====================================================================
-- 5. Row Level Security（每個家庭只能看到、改到自己的資料）
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.families          enable row level security;
alter table public.family_members    enable row level security;
alter table public.family_invites    enable row level security;
alter table public.children          enable row level security;
alter table public.book_categories   enable row level security;
alter table public.books             enable row level security;
alter table public.child_books       enable row level security;
alter table public.reading_sessions  enable row level security;
alter table public.reading_trees     enable row level security;

-- profiles：看自己與同家庭家長；只能改自己
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_family_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- families：成員可看；owner 可改名、刪除（建立走 create_family）
create policy families_select on public.families for select to authenticated
  using (public.is_family_member(id));
create policy families_update on public.families for update to authenticated
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));
create policy families_delete on public.families for delete to authenticated
  using (public.is_family_owner(id));

-- family_members：成員可看；一般家長可自行退出；owner 可移除其他家長（加入走 join_family）
create policy family_members_select on public.family_members for select to authenticated
  using (public.is_family_member(family_id));
create policy family_members_delete on public.family_members for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or (public.is_family_owner(family_id) and user_id <> (select auth.uid()))
  );

-- family_invites：成員可看、可作廢（產生走 create_invite）
create policy family_invites_select on public.family_invites for select to authenticated
  using (public.is_family_member(family_id));
create policy family_invites_delete on public.family_invites for delete to authenticated
  using (public.is_family_member(family_id));

-- children
create policy children_select on public.children for select to authenticated
  using (public.is_family_member(family_id));
create policy children_insert on public.children for insert to authenticated
  with check (public.is_family_member(family_id));
create policy children_update on public.children for update to authenticated
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy children_delete on public.children for delete to authenticated
  using (public.is_family_member(family_id));

-- book_categories：所有人可讀
create policy book_categories_select on public.book_categories for select to anon, authenticated
  using (true);

-- books：公共書庫大家可讀；私人書目只有該家庭可讀可改
create policy books_select on public.books for select to authenticated
  using (owner_family_id is null or public.is_family_member(owner_family_id));
create policy books_insert on public.books for insert to authenticated
  with check (
    created_by = (select auth.uid()) and (
      (owner_family_id is null and source in ('google','openlibrary'))
      or (owner_family_id is not null and public.is_family_member(owner_family_id))
    )
  );
create policy books_update on public.books for update to authenticated
  using (owner_family_id is not null and public.is_family_member(owner_family_id))
  with check (owner_family_id is not null and public.is_family_member(owner_family_id));
create policy books_delete on public.books for delete to authenticated
  using (owner_family_id is not null and public.is_family_member(owner_family_id));

-- child_books
create policy child_books_select on public.child_books for select to authenticated
  using (public.is_family_member(family_id));
create policy child_books_insert on public.child_books for insert to authenticated
  with check (public.is_family_member(family_id));
create policy child_books_update on public.child_books for update to authenticated
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy child_books_delete on public.child_books for delete to authenticated
  using (public.is_family_member(family_id));

-- reading_sessions
create policy reading_sessions_select on public.reading_sessions for select to authenticated
  using (public.is_family_member(family_id));
create policy reading_sessions_insert on public.reading_sessions for insert to authenticated
  with check (public.is_family_member(family_id));
create policy reading_sessions_update on public.reading_sessions for update to authenticated
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy reading_sessions_delete on public.reading_sessions for delete to authenticated
  using (public.is_family_member(family_id));

-- reading_trees：只讀（由資料庫自動維護）
create policy reading_trees_select on public.reading_trees for select to authenticated
  using (public.is_family_member(family_id));

-- =====================================================================
-- 6. 權限收緊：未登入者不能碰私人資料；內部函式不開放呼叫
-- =====================================================================

-- 明確授權給登入的家長（即使建立專案時關掉「自動公開新表格」也能正常運作；實際能看到哪些資料仍由上面的 RLS 決定）
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.families, public.family_members, public.family_invites,
              public.children, public.books, public.child_books, public.reading_sessions,
              public.reading_trees to authenticated;
grant select on public.book_categories to anon, authenticated;

revoke all on public.profiles, public.families, public.family_members, public.family_invites,
              public.children, public.books, public.child_books, public.reading_sessions,
              public.reading_trees from anon;

revoke execute on function public.recompute_reading_tree(uuid, date) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.reading_sessions_after() from public, anon, authenticated;
revoke execute on function public.child_books_category_after() from public, anon, authenticated;

revoke execute on function public.create_family(text, text) from public, anon;
revoke execute on function public.create_invite() from public, anon;
revoke execute on function public.join_family(text, text) from public, anon;
revoke execute on function public.export_my_data() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.is_family_owner(uuid) from public, anon;
revoke execute on function public.shares_family_with(uuid) from public, anon;
revoke execute on function public.my_family_id() from public, anon;

grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.join_family(text, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;
grant execute on function public.shares_family_with(uuid) to authenticated;
grant execute on function public.my_family_id() to authenticated;

-- =====================================================================
-- 7. 繪本封面照片儲存空間（第三階段）
-- =====================================================================

-- 封面儲存空間：只收壓縮後的 WebP / JPEG，每張最大 300 KB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 307200, array['image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 檔案路徑固定為「家庭編號/檔名」，只有該家庭的家長能上傳、刪除自己的封面
create or replace function public.cover_folder_is_mine(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_folder text := split_part(p_name, '/', 1);
begin
  if v_folder !~ '^[0-9a-f-]{36}$' then return false; end if;
  return public.is_family_member(v_folder::uuid);
end $$;
revoke execute on function public.cover_folder_is_mine(text) from public, anon;
grant execute on function public.cover_folder_is_mine(text) to authenticated;

drop policy if exists covers_insert on storage.objects;
drop policy if exists covers_update on storage.objects;
drop policy if exists covers_delete on storage.objects;

create policy covers_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.cover_folder_is_mine(name));
create policy covers_update on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.cover_folder_is_mine(name))
  with check (bucket_id = 'covers' and public.cover_folder_is_mine(name));
create policy covers_delete on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.cover_folder_is_mine(name));

-- =====================================================================
-- 8. 每月選一棵樹（第四階段）
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
