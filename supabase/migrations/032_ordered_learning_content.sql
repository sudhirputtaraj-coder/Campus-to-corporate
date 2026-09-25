BEGIN;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS display_order INTEGER;
UPDATE public.skills SET display_order=CASE code WHEN 'PROF' THEN 10 WHEN 'COMM' THEN 20 WHEN 'CRT' THEN 30 WHEN 'PROB' THEN 40 WHEN 'TEAM' THEN 50 WHEN 'TIME' THEN 60 WHEN 'ADAPT' THEN 70 ELSE CASE WHEN lower(trim(name))='ai knowledge' THEN 80 ELSE 999 END END WHERE display_order IS NULL;
ALTER TABLE public.skills ALTER COLUMN display_order SET DEFAULT 999;
ALTER TABLE public.skills ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_display_order_range;
ALTER TABLE public.skills ADD CONSTRAINT skills_display_order_range CHECK(display_order BETWEEN 1 AND 100000);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS practice_questions JSONB NOT NULL DEFAULT '[]';
CREATE OR REPLACE FUNCTION public.fn_valid_practice_questions(items JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE item JSONB;
BEGIN
 IF items IS NULL OR jsonb_typeof(items)<>'array' THEN RETURN false; END IF;
 IF jsonb_array_length(items)>50 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  IF jsonb_typeof(item)<>'object' OR jsonb_typeof(item->'question') IS DISTINCT FROM 'string' OR jsonb_typeof(item->'answer') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  IF length(trim(item->>'question')) NOT BETWEEN 1 AND 1000 OR length(trim(item->>'answer')) NOT BETWEEN 1 AND 5000 THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_valid_practice_questions;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_valid_practice_questions CHECK(public.fn_valid_practice_questions(practice_questions));
-- Move only the imported AI module when exactly one active AI Knowledge skill exists.
-- Keep module/lesson IDs, progress, existing assessments and skill evidence unchanged.
DO $$ DECLARE ai UUID; BEGIN
 IF (SELECT count(*) FROM public.skills WHERE lower(trim(name))='ai knowledge' AND status='ACTIVE')=1 THEN
  SELECT id INTO ai FROM public.skills WHERE lower(trim(name))='ai knowledge' AND status='ACTIVE';
  UPDATE public.modules SET skill_id=ai WHERE course_id='5ad4db9e-9dfe-5478-870c-21ac5871fa5d' AND title='6.4: Technology and AI Fluency at Work' AND skill_id IN(SELECT id FROM public.skills WHERE code='ADAPT');
 END IF;
END $$;
-- Adjust only the original imported Communication sequence; preserve later administrator edits.
UPDATE public.modules SET sequence=CASE title
 WHEN '1.5: Basic Grammar for Workplace English' THEN 1
 WHEN '1.3: Active Listening and Asking Good Questions' THEN 2
 WHEN '1.1: Business Email and Written Communication' THEN 3
 WHEN '1.2: Speaking Clearly: The PREP Method' THEN 4
 WHEN '1.4: Self-Introduction and Interview Communication' THEN 5 END
WHERE course_id='5ad4db9e-9dfe-5478-870c-21ac5871fa5d' AND (
 (title='1.5: Basic Grammar for Workplace English' AND sequence=5) OR
 (title='1.3: Active Listening and Asking Good Questions' AND sequence=3) OR
 (title='1.1: Business Email and Written Communication' AND sequence=1) OR
 (title='1.2: Speaking Clearly: The PREP Method' AND sequence=2) OR
 (title='1.4: Self-Introduction and Interview Communication' AND sequence=4));
UPDATE public.modules SET skill_id=(SELECT id FROM public.skills WHERE code='COMM')
 WHERE course_id='a0000000-0000-4000-8000-000000000001' AND title='Basics of Professional Email' AND skill_id IS NULL;
UPDATE public.courses SET description='Professional email writing for the workplace.'
 WHERE id='a0000000-0000-4000-8000-000000000001' AND description='Professional email writing for the workplace. DEMO course for Phase 2 testing.';
COMMIT;
