-- Auth is the source of truth for sign-in email. Pending email changes do not
-- change auth.users.email, so the profile stays unchanged until confirmation.
BEGIN;
CREATE FUNCTION public.fn_sync_account_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL
     AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_sync_account_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_confirmed_account_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_account_email();
COMMIT;
