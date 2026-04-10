-- 사용자 개인 일정
CREATE TABLE user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    color VARCHAR(20) DEFAULT 'primary',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_events_user ON user_events(user_id);
CREATE INDEX idx_user_events_date ON user_events(user_id, event_date);
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON user_events FOR ALL USING (true) WITH CHECK (true);
