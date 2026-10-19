// 제공사 스트림 조각을 클라이언트로 보낼 NDJSON 이벤트로 바꾸는 순수 로직.
// 후처리(코드펜스 제거, render 호출 주입)는 여기서 한 번 더 적용한다.
import { stripCodeFences, ensureRenderCall } from './generator';
import type { StreamChunk } from './sse';

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

export const TRUNCATED_MESSAGE = '생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.';
const INCOMPLETE_MESSAGE = '응답이 중간에 끊겼습니다. 다시 시도해주세요.';

/** 에러를 사용자에게 보여줄 문구와 상태 코드로 변환한다. 상태 코드 외 URL·키는 담지 않는다. */
export function mapError(err: unknown): { message: string; status: number } {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message.includes('503')) {
    return { message: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.', status: 503 };
  }
  if (message.includes('429')) {
    return { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', status: 429 };
  }
  return { message, status: 500 };
}

/** 잘림·조기 종료·빈 응답은 성공(done)으로 내보내지 않고 error로 끝낸다. */
export async function* toStreamEvents(chunks: AsyncIterable<StreamChunk>): AsyncGenerator<StreamEvent> {
  let text = '';
  let finished = false;

  try {
    for await (const chunk of chunks) {
      if (chunk.truncated) throw new Error(TRUNCATED_MESSAGE);
      if (chunk.text) {
        text += chunk.text;
        yield { type: 'delta', text: chunk.text };
      }
      if (chunk.finished) finished = true;
    }

    const code = ensureRenderCall(stripCodeFences(text));
    if (!finished || !code) throw new Error(INCOMPLETE_MESSAGE);

    yield { type: 'done', code };
  } catch (err) {
    yield { type: 'error', error: mapError(err).message };
  }
}
