-- =====================================================================
-- 小小書房｜故事森林  更新：雜誌的每一期（年月、那期封面、英文單元）
-- 已經執行過前面更新的家庭，再執行這一份即可（只需一次）
-- =====================================================================
alter table public.reading_sessions add column if not exists issue text;
alter table public.reading_sessions drop constraint if exists reading_sessions_issue_len;
alter table public.reading_sessions add constraint reading_sessions_issue_len check (char_length(issue) <= 40);
alter table public.reading_sessions add column if not exists issue_cover_url text;
alter table public.reading_sessions add column if not exists has_english boolean not null default false;
-- 完成！
