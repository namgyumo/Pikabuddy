-- ===== 팀 + 공유 노트 스냅샷 =====
-- 교수가 과목 내에서 팀을 편성하고, 팀원들이 공유 노트를 함께 편집
-- 각 저장 시 스냅샷으로 누가 수정했는지 기록

-- ===== 1. teams =====
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_course_id ON teams(course_id);

-- ===== 2. team_members =====
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_student_id ON team_members(student_id);

-- ===== 3. notes 테이블에 team_id 추가 =====
ALTER TABLE notes ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notes_team_id ON notes(team_id);

-- ===== 4. note_snapshots =====
CREATE TABLE IF NOT EXISTS note_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    saved_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_snapshots_note_id ON note_snapshots(note_id);
CREATE INDEX IF NOT EXISTS idx_note_snapshots_created_at ON note_snapshots(created_at);

-- ===== 5. assignments 테이블에 is_team_assignment 추가 =====
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_team_assignment BOOLEAN NOT NULL DEFAULT FALSE;

-- ===== 6. team_submission_votes (조별과제 제출 투표) =====
CREATE TABLE IF NOT EXISTS team_submission_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    submission_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    deadline TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tsv_assignment ON team_submission_votes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_tsv_team ON team_submission_votes(team_id);
-- 한 팀+과제에 pending 투표 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_tsv_active_vote
    ON team_submission_votes(assignment_id, team_id) WHERE status = 'pending';

-- ===== 7. team_vote_responses (개별 투표 응답) =====
CREATE TABLE IF NOT EXISTS team_vote_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id UUID NOT NULL REFERENCES team_submission_votes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response VARCHAR(10) NOT NULL CHECK (response IN ('approve', 'reject')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(vote_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_tvr_vote_id ON team_vote_responses(vote_id);

-- ===== RLS =====
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_submission_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_vote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON note_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON team_submission_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON team_vote_responses FOR ALL USING (true) WITH CHECK (true);
