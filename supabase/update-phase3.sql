-- =====================================================================
-- 小小書房｜故事森林  第三階段更新：繪本封面照片儲存空間
-- 已經執行過 schema.sql 的家庭，再執行這一份即可（只需一次）
-- 新架設的家庭不用執行：schema.sql 已經包含這段
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

-- 完成！
