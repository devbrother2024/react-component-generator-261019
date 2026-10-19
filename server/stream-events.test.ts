import { describe, it, expect } from 'vitest';
import { toStreamEvents, mapError, type StreamEvent } from './stream-events';
import type { StreamChunk } from './sse';

async function* chunksOf(...chunks: Array<Partial<StreamChunk>>): AsyncGenerator<StreamChunk> {
  for (const c of chunks) yield { text: '', truncated: false, finished: false, ...c };
}

async function* failing(): AsyncGenerator<StreamChunk> {
  yield { text: 'const A', truncated: false, finished: false };
  throw new Error('Gemini API error: 503');
}

async function collect(source: AsyncIterable<StreamChunk>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of toStreamEvents(source)) out.push(e);
  return out;
}

describe('toStreamEvents', () => {
  it('텍스트 조각마다 delta를 내보낸다', async () => {
    const events = await collect(chunksOf({ text: 'a' }, { text: 'b', finished: true }));
    expect(events.slice(0, 2)).toEqual([
      { type: 'delta', text: 'a' },
      { type: 'delta', text: 'b' },
    ]);
  });

  it('완료 시 코드펜스 제거와 render 호출 주입을 적용한 done을 내보낸다', async () => {
    const events = await collect(chunksOf({ text: '```jsx\nconst Box = () => <div />;\n```', finished: true }));
    expect(events.at(-1)).toEqual({ type: 'done', code: 'const Box = () => <div />;\n\nrender(<Box />);' });
  });

  it('잘린 응답은 error로 끝낸다', async () => {
    const events = await collect(chunksOf({ text: 'const A', truncated: true, finished: true }));
    expect(events.at(-1)).toMatchObject({ type: 'error' });
    expect(events.some((e) => e.type === 'done')).toBe(false);
  });

  it('정상 종료 신호 없이 끊기면 error로 끝낸다', async () => {
    const events = await collect(chunksOf({ text: 'const A = () => <div />;' }));
    expect(events.at(-1)).toMatchObject({ type: 'error' });
  });

  it('빈 응답은 error로 끝낸다', async () => {
    const events = await collect(chunksOf({ finished: true }));
    expect(events.at(-1)).toMatchObject({ type: 'error' });
  });

  it('중간에 예외가 나면 매핑된 메시지로 error를 내보낸다', async () => {
    const events = await collect(failing());
    expect(events.at(-1)).toEqual({
      type: 'error',
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });
});

describe('mapError', () => {
  it('503을 과부하 안내로 바꾼다', () => {
    expect(mapError(new Error('Claude API error: 503')).message).toContain('과부하');
  });

  it('429를 요청 과다 안내로 바꾼다', () => {
    expect(mapError(new Error('Gemini API error: 429')).message).toContain('너무 많습니다');
  });

  it('그 외 에러는 메시지를 그대로 쓴다', () => {
    expect(mapError(new Error('boom')).message).toBe('boom');
  });
});
