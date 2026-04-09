-- 시험 응시 리셋 감사 로그 테이블
CREATE TABLE IF NOT EXISTS exam_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_reset_logs_assignment ON exam_reset_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_exam_reset_logs_student ON exam_reset_logs(student_id);
