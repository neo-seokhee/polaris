-- 연도별 목표 텍스트 (확언처럼 직접 입력하는 텍스트)
CREATE TABLE IF NOT EXISTS year_goal_texts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- RLS 정책
ALTER TABLE year_goal_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own year goal texts" ON year_goal_texts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own year goal texts" ON year_goal_texts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own year goal texts" ON year_goal_texts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own year goal texts" ON year_goal_texts
    FOR DELETE USING (auth.uid() = user_id);
