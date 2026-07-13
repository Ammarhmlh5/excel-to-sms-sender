-- Drop auto-confirm trigger and function
-- This removes the dangerous behaviour that auto-confirmed any registration email

DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_email;
