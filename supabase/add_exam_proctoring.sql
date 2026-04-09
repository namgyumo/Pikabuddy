-- 시험 감독 시스템 마이그레이션
-- 1. assignments에 시험 모드 설정 추가
-- 2. 스크린샷 기록 테이블
-- 3. 이탈 위반 로그 테이블

-- ===== 1. assignments 시험 설정 =====
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS exam_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS exam_config JSONB NOT NULL DEFAULT '{}'::jsonb;
-- exam_config 예시:
-- {
--   "screenshot_interval": 30,     -- 캡쳐 간격(초)
--   "max_violations": 3,           -- 최대 이탈 허용 횟수
--   "screenshot_quality": 0.3,     -- JPEG 품질 (0.1~1.0)
--   "fullscreen_required": true    -- 전체화면 강제 여부
-- }

-- ===== 2. exam_screenshots =====
CREATE TABLE IF NOT EXISTS exam_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    r2_key TEXT NOT NULL,            -- R2 오브젝트 키 (경로)
    r2_url TEXT NOT NULL,            -- 접근 URL
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_size_kb INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_screenshots_assignment ON exam_screenshots(assignment_id);
CREATE INDEX idx_exam_screenshots_student ON exam_screenshots(student_id);
CREATE INDEX idx_exam_screenshots_lookup ON exam_screenshots(assignment_id, student_id, captured_at);

-- ===== 3. exam_violations =====
CREATE TABLE IF NOT EXISTS exam_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(30) NOT NULL
        CHECK (violation_type IN ('fullscreen_exit', 'tab_switch', 'window_blur', 'forced_end')),
    violation_count INT NOT NULL DEFAULT 1,  -- 이 시점까지의 누적 횟수
    detail TEXT,                              -- 추가 정보
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_violations_assignment ON exam_violations(assignment_id);
CREATE INDEX idx_exam_violations_student ON exam_violations(student_id);
CREATE INDEX idx_exam_violations_lookup ON exam_violations(assignment_id, student_id);

-- ===== RLS (서비스 키 전체 접근) =====
ALTER TABLE exam_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON exam_screenshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON exam_violations FOR ALL USING (true) WITH CHECK (true);
