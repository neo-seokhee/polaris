-- Settlement jobs: work type selection
ALTER TABLE IF EXISTS public.settlement_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT;

UPDATE public.settlement_jobs
SET job_type = CASE
  WHEN job_type IN ('shoot_only', 'edit_only', 'shoot_edit') THEN job_type
  WHEN work_date IS NOT NULL AND edit_date IS NULL THEN 'shoot_only'
  WHEN work_date IS NULL AND edit_date IS NOT NULL THEN 'edit_only'
  ELSE 'shoot_edit'
END;

ALTER TABLE IF EXISTS public.settlement_jobs
  ALTER COLUMN job_type SET DEFAULT 'shoot_edit',
  ALTER COLUMN job_type SET NOT NULL;

ALTER TABLE IF EXISTS public.settlement_jobs
  DROP CONSTRAINT IF EXISTS settlement_jobs_job_type_check;

ALTER TABLE IF EXISTS public.settlement_jobs
  ADD CONSTRAINT settlement_jobs_job_type_check
  CHECK (job_type IN ('shoot_only', 'edit_only', 'shoot_edit'));
