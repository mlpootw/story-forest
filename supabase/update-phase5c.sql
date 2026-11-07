-- =====================================================================
-- 小小書房｜故事森林  更新：雜誌（樹下的花）
-- 已經執行過 schema.sql 的家庭，再執行這一份即可（只需一次）
-- =====================================================================

-- 書的種類：book 繪本／magazine 雜誌
alter table public.books add column if not exists kind text not null default 'book';
alter table public.books drop constraint if exists books_kind_check;
alter table public.books add constraint books_kind_check check (kind in ('book', 'magazine'));

-- 雜誌的 ISSN（條碼 977 開頭），掃描時用來認出是哪本雜誌
alter table public.books add column if not exists issn text;
create index if not exists books_issn_idx on public.books(issn);

-- 完成！
