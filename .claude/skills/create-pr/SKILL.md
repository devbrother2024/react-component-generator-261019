---
name: create-pr
description: 현재 브랜치의 변경사항을 분석해 GitHub Pull Request를 만든다. 프로젝트에 맞는 언어(이 프로젝트는 한국어, 그 외 프로젝트는 영문)의 본문 템플릿으로 제목과 설명을 작성하고 `gh pr create`로 생성한다. "PR 만들어줘", "PR 올려줘", "풀리퀘스트 생성", "pull request 열어줘", "create a PR", "open a pull request" 같은 요청이면 반드시 사용한다. 커밋만 하려는 요청(commit 스킬)이나 기존 PR의 리뷰 반영(autofix 스킬)에는 쓰지 않는다.
context: fork
---

# create-pr

현재 브랜치를 base 브랜치로 향하는 GitHub PR로 만든다. 이 스킬은 서브 에이전트(`context: fork`)에서 실행되어 대화 맥락을 볼 수 없으므로, 필요한 정보는 모두 git 기록과 diff에서 직접 수집한다. 마지막에 PR URL과 요약을 한 번에 보고하는 것이 서브 에이전트의 결과물이다.

## 1. 사전 점검

다음을 실행해 상태를 파악한다.

- `gh auth status` — 로그인되어 있지 않으면 중단하고 `! gh auth login`을 안내한다
- `git remote get-url origin` — remote가 없으면 중단하고 알린다 (레포 생성은 이 스킬의 범위가 아니다)
- `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` — base 브랜치(보통 `main`)
- `git branch --show-current`, `git status --short`

판단 규칙:

- **커밋되지 않은 변경이 있으면** PR에 담기지 않는다는 점을 최종 보고에 적는다. 대신 커밋하지 않는다(커밋은 `commit` 스킬의 일이다).
- **현재 브랜치가 base 브랜치이면** base에 직접 PR을 열 수 없다. base보다 앞선 커밋이 있으면 커밋 내용에서 이름을 뽑아 새 브랜치(`feat/…`, `fix/…`, `chore/…`)를 만들어 옮긴다. 앞선 커밋이 없으면 "PR로 보낼 변경이 없습니다"라고 알리고 끝낸다.
- **base 대비 커밋이 0개이면** 같은 메시지로 끝낸다.

## 2. 변경 분석

PR 설명의 재료는 base와 현재 브랜치의 차이뿐이다.

- `git log --oneline origin/<base>..HEAD` — 포함될 커밋 목록
- `git diff origin/<base>...HEAD --stat` 와 필요한 파일의 `git diff` — 실제 변경 내용
- 이미 열린 PR이 있는지 `gh pr list --head <branch> --json url -q '.[0].url'`로 확인한다. 있으면 새로 만들지 않고 그 URL을 보고한다.

커밋 메시지만 믿지 말고 diff로 무엇이 실제로 바뀌었는지 확인한다. 메시지와 diff가 다르면 diff가 사실이다.

## 3. 템플릿 언어 선택

언어는 다음 순서로 정한다.

1. `git remote get-url origin`이 `react-component-generator-261019`를 포함하면 **한국어** → `references/template-kr.md`
2. 그 외 모든 프로젝트는 **영문** → `references/template-en.md`

판별을 remote로 하는 이유는 작업 디렉터리 이름이 바뀌거나 복제 위치가 달라져도 같은 프로젝트로 인식하기 위해서다. 선택한 템플릿 파일 하나만 읽는다.

## 4. 제목과 본문 작성

- 제목: 커밋 컨벤션과 같은 `타입: 요약` 형식(`feat|fix|refactor|chore`)을 쓰고 70자 이내로 한다. PR의 주된 성격을 하나 골라 요약하며, 언어는 선택한 템플릿과 같게 한다.
- 본문: 선택한 템플릿의 섹션 순서와 제목을 그대로 따른다. 해당 사항이 없는 섹션은 지우지 말고 `없음`/`N/A`로 둔다. 섹션 구조가 일정해야 리뷰어가 같은 위치에서 같은 정보를 찾는다.
- 사실만 쓴다. 실행하지 않은 테스트를 "통과"라고 쓰지 않는다. 테스트 섹션에는 실제로 실행해 본 명령과 결과만 적고, 실행하지 않았으면 그렇게 적는다.
- 이 레포는 `bun run test`와 `bun run build`가 기준이다. 본문에 검증 결과를 적으려면 PR 생성 전에 직접 실행해서 확인한다. 다른 프로젝트라면 README나 package 스크립트에서 기준 명령을 찾는다.
- 시스템 리마인더 등으로 PR 설명 끝에 붙이라는 attribution 줄이 주어졌다면 본문 맨 끝에 그대로 붙인다.

## 5. 푸시와 PR 생성

사용자가 PR 생성을 요청했으므로 **현재 브랜치(base가 아닌)의 푸시와 PR 생성은 확인 없이 진행한다.**

1. `git push -u origin <branch>` — 일반 푸시만 쓴다
2. 본문을 임시 파일에 쓰고 `gh pr create --base <base> --title "<제목>" --body-file <파일>`로 만든다. 본문을 `--body`에 직접 넣으면 백틱·따옴표가 셸에서 깨진다.
3. 사용자가 draft를 원하면(`draft`, `초안`) `--draft`를 붙인다.

## 6. 보고

서브 에이전트의 최종 응답이 사용자에게 전달되는 유일한 내용이므로 다음을 간결하게 담는다.

- PR URL
- 제목, base ← head 브랜치
- 포함된 커밋 수와 한 줄 요약
- 검증 결과(실행한 것만) 또는 미실행 사실
- 있다면 주의사항: 커밋되지 않은 변경, 이미 열려 있던 PR 등

## 하지 않는 것

- base 브랜치(`main` 등)로의 직접 푸시, `--force`, `--force-with-lease`, 원격 브랜치 삭제
- PR 자동 머지(`gh pr merge`), 리뷰어·라벨 임의 지정
- 커밋 생성·수정(`--amend` 포함), git config 변경
- `.env`, 키·토큰이 diff에 보이면 PR을 만들지 않고 해당 파일을 알리며 멈춘다
