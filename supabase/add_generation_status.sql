-- assignments 테이블에 generation_status 컬럼 추가
-- 문제 생성이 백그라운드에서 비동기로 처리되므로 상태 추적이 필요
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS generation_status VARCHAR(20) NOT NULL DEFAULT 'completed';

-- CHECK 제약 조건 추가
ALTER TABLE assignments
ADD CONSTRAINT assignments_generation_status_check
CHECK (generation_status IN ('generating', 'completed', 'failed'));
