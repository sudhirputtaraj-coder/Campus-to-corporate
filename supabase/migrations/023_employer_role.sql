-- Run separately and commit before migration 024 uses this enum value.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'EMPLOYER';
