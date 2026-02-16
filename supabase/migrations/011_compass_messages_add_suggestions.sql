ALTER TABLE compass_messages
ADD COLUMN IF NOT EXISTS suggested_todos JSONB NOT NULL DEFAULT '[]'::jsonb;

