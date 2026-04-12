-- exp_logs: EXP 부여 이력 (같은 대상에 대해 차액만 부여하기 위한 추적 테이블)
CREATE TABLE IF NOT EXISTS exp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,        -- 'note_create', 'note_analyze', 'assignment_submit', 'assignment_score', 'comment', 'tutor_chat', 'daily_login'
  ref_id TEXT,                     -- 관련 엔티티 ID (note_id, assignment_id 등)
  exp_amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_exp_logs_user ON exp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exp_logs_user_event ON exp_logs(user_id, event_type);

-- RLS
ALTER TABLE exp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own exp_logs"
  ON exp_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage exp_logs"
  ON exp_logs FOR ALL
  USING (true)
  WITH CHECK (true);


-- user_achievements: 배지/도전과제 달성 기록
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage achievements"
  ON user_achievements FOR ALL
  USING (true)
  WITH CHECK (true);
