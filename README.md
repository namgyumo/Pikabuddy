# Vibe-Coding-Team-pj

## 프로젝트 소개
> 프로젝트 설명을 여기에 작성해주세요.
>
> ## 팀원
> | 이름 | 역할 | GitHub |
> |------|------|--------|
> | 남규모 | - | @namgyumo |
> | 박계령 | - | @username |
> | 이주현 | - | @joohyeon |
> | 주인경 | - | @joohyeon |
>
> ## 기술 스택
> > 프로젝트에 사용할 기술 스택을 여기에 작성해주세요.
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
