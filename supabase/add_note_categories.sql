-- 노트 카테고리 컬럼 추가 (JSONB 배열로 카테고리 slug 저장)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_notes_categories ON notes USING GIN (categories);

-- AI가 추가한 커스텀 카테고리 저장소
CREATE TABLE IF NOT EXISTS custom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON custom_categories FOR ALL USING (true) WITH CHECK (true);
