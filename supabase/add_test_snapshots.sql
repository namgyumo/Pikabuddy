-- 테스트 계정 스냅샷 저장용 테이블
CREATE TABLE IF NOT EXISTS test_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE test_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_snapshots_all" ON test_snapshots
  FOR ALL USING (true) WITH CHECK (true);
