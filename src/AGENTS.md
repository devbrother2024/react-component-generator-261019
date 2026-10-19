# src/

## Module Context

React 19 SPA. `/api/generate`로 받은 코드 문자열을 react-live로 렌더링하고 코드 뷰를 제공한다. 상태는 `hooks/useComponentGenerator.ts` 하나에 모여 있다.

## Tech Stack & Constraints

- 미리보기는 react-live `noInline` (`components/LivePreview.tsx:14`). 생성 코드는 `render()` 호출로 마운트되므로 미리보기 방식을 인라인 모드로 바꾸지 않는다.
- 컴포넌트 목록은 메모리 상태뿐이다 (`useComponentGenerator.ts:14`). 영속화가 필요하면 별도 요청 후 추가한다.
- 새 컴포넌트는 목록 맨 앞에 추가된다 (`useComponentGenerator.ts:42`).

## Implementation Patterns

- 스타일은 `App.css` 한 파일에 클래스 기반으로 둔다. 윈도우형 컨테이너는 `.win` / `.win-title` / `.win-body` 구조를 재사용한다.
- 폰트는 `index.css`의 `@font-face`로 필요한 굵기만 선언한다 (Galmuri11 400/700, Galmuri14, GalmuriMono11). 전체 `galmuri.css`를 import하지 않는다.
- 카드 삭제는 타이틀바의 닫기 박스(`.win-box--close`)가 담당한다 (`ComponentCard.tsx`). 텍스트 삭제 버튼을 중복으로 만들지 않는다.

## Testing Strategy

- `bun run test` (vitest + Testing Library, `src/test/setup.ts`).
- 테스트는 버튼 접근 이름에 의존한다: `컴포넌트 생성`, `생성 중...` (`PromptInput.test.tsx`). 이 문구를 바꾸면 테스트를 함께 수정한다.

## Local Golden Rules

- 미리보기 영역(`.preview-render`)은 생성 코드의 inline style을 그대로 보여주는 곳이다. 테마 스타일(전역 `button`, `*` 규칙 등)이 생성 컴포넌트를 오염시키지 않도록 전역 요소 선택자를 추가하지 않는다. 클래스 선택자만 쓴다.
- API 키는 입력값을 상태로만 들고 있고 provider 변경 시 비운다 (`App.tsx`의 `handleProviderChange`). 로컬스토리지 등에 저장하지 않는다.
- `generate` 호출은 `apiKey`가 비어 있으면 필드를 보내지 않는다 (`useComponentGenerator.ts:26`). 서버가 환경변수 키를 쓰는 경로이므로 빈 문자열을 보내지 않는다.
