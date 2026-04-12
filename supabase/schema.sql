-- AI 교육 플랫폼 데이터베이스 스키마
-- Supabase PostgreSQL
-- ERD 설계서 v1.0 기준

-- ===== 1. users =====
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('professor', 'student', 'personal')),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT DEFAULT '',
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    profile_color VARCHAR(7) DEFAULT '#004AC6',
    school VARCHAR(100) DEFAULT '',
    department VARCHAR(100) DEFAULT '',
    student_id VARCHAR(50) DEFAULT '',
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
    is_personal BOOLEAN NOT NULL DEFAULT false,
    banner_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_professor_id ON courses(professor_id);
CREATE INDEX idx_courses_invite_code ON courses(invite_code);
CREATE INDEX idx_courses_is_personal ON courses(is_personal) WHERE is_personal = true;

-- ===== 3. enrollments =====
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    custom_banner_url TEXT,
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
        CHECK (type IN ('coding', 'writing', 'both', 'algorithm')),
    ai_policy VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (ai_policy IN ('free', 'normal', 'strict', 'exam')),
    language VARCHAR(20) NOT NULL DEFAULT 'python',
    writing_prompt TEXT,
    due_date TIMESTAMPTZ,
    generation_status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (generation_status IN ('generating', 'completed', 'failed')),
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

-- ===== 10. user_exp =====
CREATE TABLE user_exp (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_exp INT NOT NULL DEFAULT 0,
    tier VARCHAR(20) NOT NULL DEFAULT 'seed_iv',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_exp_tier ON user_exp(tier);

-- ===== 11. badges =====
CREATE TABLE badges (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    condition_value INT NOT NULL DEFAULT 1
);

-- ===== 12. user_badges =====
CREATE TABLE user_badges (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE user_exp ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON user_exp FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON badges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON user_badges FOR ALL USING (true) WITH CHECK (true);

-- ===== 13. judge_results =====
CREATE TABLE judge_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    verdict VARCHAR(10) NOT NULL,
    passed_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    total_time_ms FLOAT,
    max_memory_mb FLOAT,
    case_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_judge_results_submission ON judge_results(submission_id);

ALTER TABLE judge_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON judge_results FOR ALL USING (true) WITH CHECK (true);

-- ===== 11. ai_comments =====
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

-- ===== exam_screenshots =====
CREATE TABLE exam_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    r2_key TEXT NOT NULL,
    r2_url TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_size_kb INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_screenshots_assignment ON exam_screenshots(assignment_id);
CREATE INDEX idx_exam_screenshots_student ON exam_screenshots(student_id);
CREATE INDEX idx_exam_screenshots_lookup ON exam_screenshots(assignment_id, student_id, captured_at);

-- ===== exam_violations =====
CREATE TABLE exam_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(30) NOT NULL
        CHECK (violation_type IN ('fullscreen_exit', 'tab_switch', 'window_blur', 'forced_end')),
    violation_count INT NOT NULL DEFAULT 1,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_violations_assignment ON exam_violations(assignment_id);
CREATE INDEX idx_exam_violations_student ON exam_violations(student_id);
CREATE INDEX idx_exam_violations_lookup ON exam_violations(assignment_id, student_id);

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
ALTER TABLE exam_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_violations ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Service role full access" ON exam_screenshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON exam_violations FOR ALL USING (true) WITH CHECK (true);
