-- Preferensi workspace (SET-02): tampilan bawaan halaman Tasks. Kolom ini hidup di owner_settings,
-- jadi RLS dan GRANT (select/insert/update untuk authenticated) yang sudah ada berlaku tanpa perubahan.
alter table public.owner_settings
  add column default_tasks_view text not null default 'calendar'
    check (default_tasks_view in ('calendar', 'list'));
