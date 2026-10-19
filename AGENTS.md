# AGENTS.md

## Operational Commands

- 패키지 매니저는 `bun`만 사용한다. npm/yarn/pnpm 금지 (`bun.lock` 기준).
- `bun run dev` — API 서버(3002)와 Vite(5173) 동시 실행.
- `bun run test` — vitest 1회 실행 (`src/**` 및 `server/**` 테스트 포함, `vite.config.ts:20`).
- `bun run lint`, `bun run build` (`tsc -b && vite build`).
- 변경 후에는 `bun run test`와 `bun run build`를 통과시킨다.

## Golden Rules

### Immutable
- API 키를 클라이언트 응답으로 내려보내지 않는다. `/api/config`는 키 존재 여부(boolean)만 반환한다 (`server/index.ts:149-153`). 키 값 자체를 응답·로그에 넣지 않는다.
- `.env`는 커밋하지 않는다 (`.gitignore:32`).
- 생성 코드의 실행 환경 제약(아래 Hard Constraint)을 깨는 방향으로 시스템 프롬프트를 수정하지 않는다.

### 코드에서 확인된 팀 고유 규칙
- **Hard Constraint — 생성 코드 규약:** 미리보기는 react-live `noInline` 모드라 `render(<X />)` 호출이 필수다 (`src/components/LivePreview.tsx:14`, `server/generator.ts:13`). 생성 코드는 import 금지, 순수 JS(TypeScript 문법 금지), inline style만 허용 (`server/index.ts:10-20`). 이 세 곳(시스템 프롬프트, `generator.ts`, `LivePreview`)은 함께 바꾼다.
- **Double Defense — 후처리 이중 방어:** 프롬프트가 "코드펜스 없이, render 호출 포함"을 요구하는데도 `stripCodeFences`/`ensureRenderCall`이 한 번 더 막는다 (`server/index.ts:16`, `server/index.ts:188`). 프롬프트 규칙이 있다는 이유로 후처리를 제거하지 않는다.
- **Asymmetry — 폴백은 Google에만 있다:** 모델 폴백(`withModelFallback`)은 Google 경로에만 적용된다 (`server/index.ts:135`). Anthropic은 단일 모델 고정 (`server/index.ts:77`). 폴백을 Anthropic에도 필요로 하면 의도적으로 추가하고 테스트를 함께 작성한다.
- **Asymmetry — 기본 provider 불일치:** 서버 기본값은 `anthropic` (`server/index.ts:161`), UI 기본값은 `google` (`src/App.tsx`의 `useState<Provider>('google')`). 한쪽만 바꾸지 않는다.
- **Test Boundary:** 순수 함수(`server/generator.ts`, `server/fallback.ts`)와 `PromptInput`만 테스트가 있다. `server/index.ts`(HTTP 핸들러, 외부 API 호출)와 `useComponentGenerator`, `ComponentCard`는 테스트가 없다. 새 로직은 `generator.ts`처럼 부수효과 없는 모듈로 분리해 테스트를 붙인다.
- **Hard Constraint — 서버는 타입체크 대상이 아니다:** `tsconfig.app.json`은 `src`만, `tsconfig.node.json`은 `vite.config.ts`만 포함한다. `bun run build`는 `server/`를 검사하지 않으므로 서버 변경 후 타입 오류는 직접 확인한다.
- **Hard Constraint — 포트 결합:** API 포트 3002가 `server/index.ts:139`와 `vite.config.ts:11`에 각각 하드코딩되어 있다. 변경 시 둘 다 수정한다.
- **Security Boundary:** Google 호출은 API 키를 URL 쿼리에 넣는다 (`server/index.ts:99`). 이 URL을 로그·에러 메시지에 노출하지 않는다. 에러는 상태 코드만 담는다 (`server/index.ts:85`, `112`).

## Project Context

프롬프트로 React 컴포넌트를 생성하고 미리보기·코드를 보여주는 도구.
Tech Stack: React 19, TypeScript, Vite, Bun(API 서버), react-live, vitest, Galmuri(픽셀 폰트).

## Standards & References

- 설치·실행 방법은 `README.md` 참고.
- 코드 주석·UI 문구·커밋 메시지는 한국어.
- 커밋: `feat|fix|refactor|chore: 요약` 형식. `commit` 스킬(`.claude/skills/commit`)을 따른다.
- UI는 레트로 데스크톱 테마(`src/App.css` 상단 토큰). 새 스타일은 기존 `--chrome`, `--ink`, `--yellow` 변수를 사용하고, 둥근 모서리·부드러운 그림자를 도입하지 않는다.
- Maintenance Policy: 이 파일의 규칙과 코드가 어긋나면 수정 대신 먼저 AGENTS.md 업데이트를 제안한다.

## Context Map

- **[서버/API 수정](./server/AGENTS.md)** — Bun 서버, 모델 호출, 응답 후처리 작업 시.
- **[프론트엔드/미리보기 수정](./src/AGENTS.md)** — React UI, react-live 미리보기, 스타일 작업 시.
