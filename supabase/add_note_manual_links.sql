-- Manual links between notes (created from graph UI)
CREATE TABLE IF NOT EXISTS note_manual_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_note_id, target_note_id)
);

CREATE INDEX idx_note_manual_links_course ON note_manual_links(course_id);
CREATE INDEX idx_note_manual_links_source ON note_manual_links(source_note_id);
CREATE INDEX idx_note_manual_links_target ON note_manual_links(target_note_id);

ALTER TABLE note_manual_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON note_manual_links FOR ALL USING (true) WITH CHECK (true);
