-- 메신저 테이블: 교수↔학생 1:1 메시지
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_course ON messages(course_id);
CREATE INDEX idx_messages_conversation ON messages(course_id, sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true) WITH CHECK (true);
