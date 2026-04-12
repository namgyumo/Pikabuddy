# 팀 컨벤션 가이드

## 브랜치 네이밍
- `main` : 배포용 (직접 push 금지)
- `develop` : 개발 통합
- `feature/기능명` : 기능 개발 (예: `feature/login`)
- `fix/버그명` : 버그 수정 (예: `fix/button-error`)
- `hotfix/긴급수정` : 긴급 배포 수정

## 커밋 메시지

```
<타입>: <설명>
```

### 타입 종류
| 타입 | 설명 |
|------|------|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| docs | 문서 수정 |
| style | 코드 포맷팅 (기능 변경 없음) |
| refactor | 코드 리팩토링 |
| test | 테스트 코드 추가/수정 |
| chore | 빌드, 설정 파일 수정 |

### 예시
```
feat: 로그인 페이지 UI 구현
fix: 회원가입 시 이메일 검증 오류 수정
docs: API 문서 업데이트
```

## Pull Request 규칙
1. PR 제목은 커밋 메시지 규칙과 동일하게 작성
2. 최소 1명 이상 코드 리뷰 후 merge
3. PR 설명에 작업 내용 요약 작성
4. 관련 Issue 번호 연결 (예: `Closes #1`)

## 코드 스타일
- 들여쓰기: 2칸 (spaces)
- 파일명: kebab-case (예: `user-profile.js`)
- 변수/함수명: camelCase
- 클래스/컴포넌트명: PascalCase
- 백엔드 함수명: snake_case
- 타입/인터페이스: PascalCase
