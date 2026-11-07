-- =====================================================================
-- 小小書房｜故事森林  更新：英文書森林訪客
-- 已經執行過 schema.sql 的家庭，再執行這一份即可（只需一次）
-- =====================================================================

-- 書籍語言（從 Google Books / Open Library 帶入，例如 en、zh-TW）
alter table public.books add column if not exists language text;

-- 家長可以手動標記「這是英文書」（null = 依書籍語言自動判斷）
alter table public.child_books add column if not exists is_english boolean;

-- 完成！
