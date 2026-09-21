-- Link learning modules to skills without changing enrolments or skill scoring.
BEGIN;
ALTER TABLE public.modules ADD COLUMN skill_id UUID REFERENCES public.skills(id) ON DELETE RESTRICT;
CREATE INDEX idx_modules_skill ON public.modules(skill_id, sequence);
COMMENT ON COLUMN public.modules.skill_id IS 'Optional parent skill for learning navigation. Assessment question mappings remain the source of proficiency.';
COMMIT;
