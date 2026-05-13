/*
  # Images produits - Supabase Storage

  Le frontend vendeur enregistre les images dans le bucket public `produits`.
  Chaque vendeur uploade uniquement dans le dossier de sa boutique :
  `produits/{boutique_id}/{fichier}`.
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produits',
  'produits',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product images" on storage.objects;
drop policy if exists "Vendors can upload product images" on storage.objects;
drop policy if exists "Vendors can update own product images" on storage.objects;
drop policy if exists "Vendors can delete own product images" on storage.objects;

create policy "Public can read product images"
  on storage.objects for select
  using (bucket_id = 'produits');

create policy "Vendors can upload product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'produits'
    and exists (
      select 1
      from public.boutiques b
      where b.id::text = (storage.foldername(name))[1]
      and b.vendeur_id = auth.uid()
    )
  );

create policy "Vendors can update own product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'produits'
    and exists (
      select 1
      from public.boutiques b
      where b.id::text = (storage.foldername(name))[1]
      and b.vendeur_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'produits'
    and exists (
      select 1
      from public.boutiques b
      where b.id::text = (storage.foldername(name))[1]
      and b.vendeur_id = auth.uid()
    )
  );

create policy "Vendors can delete own product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'produits'
    and exists (
      select 1
      from public.boutiques b
      where b.id::text = (storage.foldername(name))[1]
      and b.vendeur_id = auth.uid()
    )
  );
