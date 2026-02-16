-- Update handle_new_user trigger to include phone from user metadata
-- Previously the trigger only copied id, email, name from auth.users
-- This caused phone numbers (passed via signUp options.data.phone) to be lost
-- because savePhone() was fire-and-forget and could be interrupted on iOS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
