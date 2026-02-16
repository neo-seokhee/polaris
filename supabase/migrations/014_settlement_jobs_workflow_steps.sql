-- Settlement workflow expansion: optional dates + in-progress checklist steps
ALTER TABLE IF EXISTS public.settlement_jobs
  ADD COLUMN IF NOT EXISTS edit_date DATE,
  ADD COLUMN IF NOT EXISTS shoot_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_done BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.settlement_jobs
  ALTER COLUMN work_date DROP NOT NULL,
  ALTER COLUMN delivery_date DROP NOT NULL,
  ALTER COLUMN payment_due_date DROP NOT NULL;

UPDATE public.settlement_jobs
SET
  shoot_done = CASE
    WHEN status IN ('work_done', 'paid') THEN true
    ELSE COALESCE(shoot_done, false)
  END,
  edit_done = CASE
    WHEN status IN ('work_done', 'paid') THEN true
    ELSE COALESCE(edit_done, false)
  END,
  delivery_done = CASE
    WHEN status IN ('work_done', 'paid') THEN true
    ELSE COALESCE(delivery_done, false)
  END;
