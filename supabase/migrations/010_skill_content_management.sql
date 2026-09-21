BEGIN;
ALTER TABLE public.lessons ADD COLUMN resource_url TEXT;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_resource_url_https CHECK (
  resource_url IS NULL OR resource_url ~ '^https://[^[:space:]]+$'
);
-- Inactive content must not be reachable through a previously saved student URL.
CREATE POLICY "Only published modules for learners" ON public.modules AS RESTRICTIVE
FOR SELECT TO authenticated USING (public.is_super_admin() OR (
  status = 'ACTIVE' AND (skill_id IS NULL OR EXISTS (
    SELECT 1 FROM public.skills s WHERE s.id = modules.skill_id AND s.status = 'ACTIVE'
  ))
));
CREATE POLICY "Only published lessons for learners" ON public.lessons AS RESTRICTIVE
FOR SELECT TO authenticated USING (public.is_super_admin() OR status = 'ACTIVE');
COMMIT;
