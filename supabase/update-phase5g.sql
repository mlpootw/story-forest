-- =====================================================================
-- 小小書房｜故事森林  更新：借閱書分「彬彬的書」與「媽媽看的書」
-- 需要先執行過 update-phase5f.sql
-- =====================================================================
alter table public.book_loans add column if not exists audience text not null default 'kid' check (audience in ('kid','mom'));
-- 完成！
