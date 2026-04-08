# Vibe-Coding-Team-pj

## 프로젝트 소개
> 바이브 코딩 공모전 프로젝트
> 주제: 학교 내 빈강의실을 알려주는 서비스
>
> ## 팀원
> | 이름 | 역할 | GitHub |
> |------|------|--------|
> | 남규모 | 프론트엔드/ 배포 | @namgyumo |
> | 박계령 | 백엔드 | @bbkkrr0416-svg |
> | 이주현 | 프론트엔드 | @joohyeon |
> | 주인경 | 백엔드 | @joohyeon |
>
> ## 기술 스택
> > 프론트엔드 : html, css, js (피그마 사용 검토 중)
> > 백엔드 : Python
> > 데이터베이스 : Superbase
> > 배포 : AWS EC2, Ubuntu, Docker (ClaudFlare 검토 중)
> >
> > ## 폴더 구조
> > ```
> > ├── .github/                  # GitHub 설정 (PR 템플릿 등)
> > ├── docs/                     # 문서 (컨벤션, 회의록 등)
> > ├── src/                      # 소스 코드
> > ├── tests/                    # 테스트 코드
> > ├── .gitignore
> > └── README.md
> > ```
> >
> > ## 시작하기
> >
> > ### 설치
> > ```bash
> > # 레포 클론
> > git clone https://github.com/namgyumo/Vibe-Coding-Team-pj.git
> > cd Vibe-Coding-Team-pj
> > ```
> >
> > ### 브랜치 전략
> > - `main` : 배포용 브랜치 (직접 push 금지)
> > - - `develop` : 개발 통합 브랜치
> >   - - `feature/기능명` : 기능 개발 브랜치
> >    
> >     - ### 작업 흐름
> >     - 1. Issue 생성
> >       2. 2. feature 브랜치 생성 (`git checkout -b feature/기능명 develop`)
> >          3. 3. 작업 후 commit & push
> >             4. 4. Pull Request 생성
> >                5. 5. 코드 리뷰 후 merge
> >                  
> >                   6. ## 커밋 규칙
> >                   7. - `feat` : 새로운 기능 추가
> >                      - - `fix` : 버그 수정
> >                        - - `docs` : 문서 수정
> >                          - - `style` : 코드 포맷팅 (기능 변경 없음)
> >                            - - `refactor` : 코드 리팩토링
> >                              - - `test` : 테스트 코드 추가/수정
> >                                - - `chore` : 빌드, 설정 파일 수정
> >                                 
> >                                  - > 예시: `feat: 로그인 기능 추가`
