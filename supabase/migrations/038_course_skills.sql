-- Connect courses to the same skill catalogue used by modules.
-- Existing unmatched courses remain available and can be assigned by an admin.
BEGIN;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS skill_id uuid REFERENCES public.skills(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS courses_skill_id_idx ON public.courses(skill_id);
-- Only backfill unambiguous exact names; never guess a course's subject.
UPDATE public.courses c SET skill_id = s.id
FROM public.skills s
WHERE c.skill_id IS NULL AND lower(trim(c.category)) = lower(trim(s.name))
AND (SELECT count(*) FROM public.skills other WHERE lower(trim(other.name)) = lower(trim(s.name))) = 1;
COMMIT;
