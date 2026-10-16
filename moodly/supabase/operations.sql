-- Optional unattended reservation cleanup; run once as project owner in Supabase SQL editor.
-- Active app reads already expire reservations; this job also cleans up during idle periods.
create extension if not exists pg_cron;
select cron.schedule(
  'moodly-expire-pending-orders',
  '*/5 * * * *',
  'select public.expire_moodly_reservations();'
);
