-- Google Calendar OAuth 토큰 저장 테이블
CREATE TABLE google_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자 본인의 토큰만 접근 가능
CREATE POLICY "Users can view own google tokens"
    ON google_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google tokens"
    ON google_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google tokens"
    ON google_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own google tokens"
    ON google_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_google_tokens_user_id ON google_tokens(user_id);
