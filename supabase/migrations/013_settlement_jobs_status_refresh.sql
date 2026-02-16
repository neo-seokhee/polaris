-- Settlement status refresh: vertical workflow states
ALTER TABLE IF EXISTS public.settlement_jobs
  DROP CONSTRAINT IF EXISTS settlement_jobs_status_check;

UPDATE public.settlement_jobs
SET status = CASE
  WHEN status IN ('delivered', 'payment_pending') THEN 'work_done'
  WHEN status = 'in_progress' AND work_date > CURRENT_DATE THEN 'before_work'
  WHEN status = 'in_progress' THEN 'in_progress'
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'before_work' THEN 'before_work'
  WHEN status = 'work_done' THEN 'work_done'
  ELSE 'before_work'
END;

ALTER TABLE IF EXISTS public.settlement_jobs
  ALTER COLUMN status SET DEFAULT 'before_work';

ALTER TABLE IF EXISTS public.settlement_jobs
  ADD CONSTRAINT settlement_jobs_status_check
  CHECK (status IN ('before_work', 'in_progress', 'work_done', 'paid'));

UPDATE public.settlement_jobs
SET
  is_paid = (status = 'paid'),
  paid_at = CASE
    WHEN status = 'paid' THEN COALESCE(paid_at, CURRENT_DATE)
    ELSE NULL
  END;
