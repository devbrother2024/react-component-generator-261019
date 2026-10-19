# server/

## Module Context

Bun 런타임 API 프록시. Vite dev 서버가 `/api`를 이 서버(3002)로 프록시한다. 프론트엔드와 코드를 공유하지 않는다.

## Tech Stack & Constraints

- 런타임은 Bun (`Bun.serve`, `process.env`). Node 전용 API에 의존하지 않는다.
- 외부 SDK 없이 `fetch`로 Anthropic/Gemini REST를 직접 호출한다 (`index.ts:69`, `index.ts:101`). SDK를 추가하지 않는다.
- `bun run server`는 `--watch`로 실행된다.

## Implementation Patterns

- 부수효과 없는 로직은 `generator.ts`, `fallback.ts`처럼 별도 모듈로 분리하고 같은 이름의 `*.test.ts`를 둔다. `index.ts`는 `Bun.serve`가 import 시점에 실행되므로 테스트에서 import하지 않는다.
- 모든 응답은 `CORS_HEADERS`를 포함한다 (`index.ts:51`). 새 응답 분기에서 누락하지 않는다.
- 에러 분류는 메시지 문자열의 `503`/`429` 포함 여부로 한다 (`index.ts:194-206`). 상위 호출부가 `API error: <status>` 형식을 유지해야 매핑이 동작한다.

## Testing Strategy

- `bun run test`로 실행 (jsdom 환경이 적용되지만 서버 테스트는 DOM을 쓰지 않는다).
- 폴백·정규화처럼 순수 함수만 단위 테스트한다. 외부 API는 모킹한다.

## Local Golden Rules

- 시스템 프롬프트(`index.ts:7-49`)의 "import 금지 / 순수 JS / render 호출" 규칙은 `generator.ts`의 후처리와 짝이다. 하나를 바꾸면 다른 하나와 테스트를 함께 점검한다.
- Google 모델 우선순위는 `GOOGLE_MODELS` 배열 순서다 (`index.ts:5`). 모델 교체 시 배열만 수정한다.
- `MAX_TOKENS` 응답은 잘린 코드이므로 오류로 처리한다 (`index.ts:123`). 잘린 코드를 반환하지 않는다.
- 키 해석 순서는 클라이언트 입력, 그다음 환경변수다 (`index.ts:64-66`). 순서를 바꾸지 않는다.
