-- PROJ-04: project notes may also be milestones, bugs and risks, with an optional due date and a resolved mark.
-- RLS and grants from 20261010160913_project_notes.sql stay as they are (table-level, so the new columns are covered).

alter table public.project_notes drop constraint project_notes_kind_check;
alter table public.project_notes
  add constraint project_notes_kind_check check (kind in ('note', 'decision', 'milestone', 'bug', 'risk'));

alter table public.project_notes
  add column due_date date,       -- milestone target / bug or mitigation deadline
  add column resolved_at timestamptz; -- done (milestone) or handled (bug, risk)

-- Plain notes and decisions carry neither; existing rows have both null, so they stay valid.
alter table public.project_notes
  add constraint project_notes_tracking_check
  check (kind in ('milestone', 'bug', 'risk') or (due_date is null and resolved_at is null));
