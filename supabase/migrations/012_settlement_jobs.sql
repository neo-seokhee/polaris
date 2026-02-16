-- Freelancer workflow & settlement tracking module
CREATE TABLE IF NOT EXISTS settlement_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  client TEXT,
  work_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  payment_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'delivered', 'payment_pending', 'paid')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settlement_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settlement jobs"
  ON settlement_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settlement jobs"
  ON settlement_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settlement jobs"
  ON settlement_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settlement jobs"
  ON settlement_jobs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_jobs_user_id
  ON settlement_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_jobs_user_status
  ON settlement_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_settlement_jobs_user_due
  ON settlement_jobs(user_id, payment_due_date);

CREATE OR REPLACE FUNCTION public.set_updated_at_settlement_jobs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_settlement_jobs_updated_at ON settlement_jobs;
CREATE TRIGGER trg_settlement_jobs_updated_at
  BEFORE UPDATE ON settlement_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_settlement_jobs();
