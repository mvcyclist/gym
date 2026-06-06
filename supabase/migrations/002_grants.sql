-- Required so signed-in users can read/write their rows (run if sync inserts fail silently).

grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.manual_activities to authenticated;
