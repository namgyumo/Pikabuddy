-- AI 교육 플랫폼 데이터베이스 스키마
-- Supabase PostgreSQL
-- ERD 설계서 v1.0 기준

-- ===== 1. users =====
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('professor', 'student')),
    avatar_url TEXT,
    supabase_uid VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX idx_users_role ON users(role);

-- ===== 2. courses =====
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    objectives JSONB,
    invite_code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_professor_id ON courses(professor_id);
CREATE INDEX idx_courses_invite_code ON courses(invite_code);

-- ===== 3. enrollments =====
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);

-- ===== 4. assignments =====
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    topic VARCHAR(200),
    problems JSONB NOT NULL DEFAULT '[]'::jsonb,
    rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
    type VARCHAR(20) NOT NULL DEFAULT 'coding'
        CHECK (type IN ('coding', 'writing', 'both')),
    ai_policy VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (ai_policy IN ('free', 'normal', 'strict', 'exam')),
    language VARCHAR(20) NOT NULL DEFAULT 'python',
    writing_prompt TEXT,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_course_id ON assignments(course_id);

-- ===== 5. submissions =====
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL DEFAULT '',
    content JSONB,
    problem_index INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'analyzing', 'completed')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);

-- ===== 6. snapshots =====
CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_diff JSONB NOT NULL,
    cursor_position JSONB,
    is_paste BOOLEAN NOT NULL DEFAULT false,
    paste_source VARCHAR(20) CHECK (paste_source IN ('internal', 'external')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_assignment_id ON snapshots(assignment_id);
CREATE INDEX idx_snapshots_student_id ON snapshots(student_id);
CREATE INDEX idx_snapshots_created_at ON snapshots(created_at);

-- ===== 7. ai_analyses =====
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    logic_analysis JSONB,
    quality_analysis JSONB,
    suggestions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_analyses_submission_id ON ai_analyses(submission_id);

-- ===== 8. notes =====
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    gap_analysis JSONB,
    understanding_score INTEGER CHECK (understanding_score >= 0 AND understanding_score <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_student_id ON notes(student_id);
CREATE INDEX idx_notes_course_id ON notes(course_id);
CREATE INDEX idx_notes_parent_id ON notes(parent_id);

-- ===== 9. course_materials =====
CREATE TABLE course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_materials_course_id ON course_materials(course_id);

-- ===== 10. ai_comments =====
CREATE TABLE ai_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_text TEXT NOT NULL,
    comment TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_comments_note_id ON ai_comments(note_id);

-- ===== updated_at 자동 갱신 트리거 =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== RLS (Row Level Security) 기본 설정 =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_comments ENABLE ROW LEVEL SECURITY;

-- 서비스 키로 접근 시 모든 테이블 ��근 허용 (백엔드 API 서버용)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ai_analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON course_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ai_comments FOR ALL USING (true) WITH CHECK (true);
