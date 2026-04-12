-- 강의 배너 이미지 지원
ALTER TABLE courses ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 학생별 커스텀 배너 (교수 설정 배너를 개인적으로 덮어쓸 수 있음)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS custom_banner_url TEXT;
