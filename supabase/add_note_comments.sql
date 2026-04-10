-- 노트 코멘트 테이블: 블록별/노트 전체 코멘트 + 답글 스레드
CREATE TABLE IF NOT EXISTS note_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block_index INTEGER,              -- null = 노트 전체 코멘트, integer = Tiptap content[index] 블록
    parent_id UUID REFERENCES note_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_note_comments_note ON note_comments(note_id);
CREATE INDEX idx_note_comments_block ON note_comments(note_id, block_index);
CREATE INDEX idx_note_comments_parent ON note_comments(parent_id);

ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON note_comments FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_note_comments_updated_at
    BEFORE UPDATE ON note_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
