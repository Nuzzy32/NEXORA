-- The daily e-learning sync runs without a signed-in user (Vercel Cron, service_role key).
-- service_role bypasses RLS but still needs table privileges now that new public tables are not opened to the Data API by default (D-009).
-- Only what the sync touches: it reads and writes tasks and its own status row. No delete, no other table.
grant select, insert, update on public.tasks to service_role;
grant select, insert, update on public.integration_syncs to service_role;
