-- =====================================================================
-- 小小書房｜故事森林  更新：小樹的聲音（家長自己錄音）
-- 錄音存在自己的 Supabase，只有自己家的家長能聽、能錄、能刪
-- 需要先執行過 update-phase3.sql（封面那一份）
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voices', 'voices', false, 1048576, array['audio/*'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists voices_select on storage.objects;
drop policy if exists voices_insert on storage.objects;
drop policy if exists voices_update on storage.objects;
drop policy if exists voices_delete on storage.objects;

create policy voices_select on storage.objects for select to authenticated
  using (bucket_id = 'voices' and public.cover_folder_is_mine(name));
create policy voices_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'voices' and public.cover_folder_is_mine(name));
create policy voices_update on storage.objects for update to authenticated
  using (bucket_id = 'voices' and public.cover_folder_is_mine(name))
  with check (bucket_id = 'voices' and public.cover_folder_is_mine(name));
create policy voices_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voices' and public.cover_folder_is_mine(name));
-- 完成！
