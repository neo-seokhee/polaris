-- Compass chat history table
CREATE TABLE IF NOT EXISTS compass_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  follow_up_question TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE compass_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compass messages"
  ON compass_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own compass messages"
  ON compass_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own compass messages"
  ON compass_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_compass_messages_user_id_created_at
  ON compass_messages(user_id, created_at);

