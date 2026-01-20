-- Policies
create policy "Enable read access for all users"
on theory_nodes for select
using (true);

create policy "Enable insert for authenticated users only"
on theory_nodes for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users only"
on theory_nodes for update
to authenticated
using (true);

create policy "Enable delete for authenticated users only"
on theory_nodes for delete
to authenticated
using (true);

-- Create storage bucket for theory media (optional, if you want to store images/videos)
insert into storage.buckets (id, name, public)
values ('theory-media', 'theory-media', true)
on conflict (id) do nothing;

create policy "Give public access to theory-media"
on storage.objects for select
using ( bucket_id = 'theory-media' );

create policy "Enable upload for authenticated users to theory-media"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'theory-media' );
