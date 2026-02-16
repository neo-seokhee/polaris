-- Add optional memo field to todos
ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS memo TEXT;
