import { describe, it, expect } from 'vitest';
import { readSSEData, parseAnthropicEvent, parseGeminiEvent } from './sse';

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const out: string[] = [];
  for await (const data of readSSEData(stream)) out.push(data);
  return out;
}

describe('readSSEData', () => {
  it('이벤트의 data 줄만 순서대로 뽑는다', async () => {
    const result = await collect(streamOf('event: a\ndata: {"x":1}\n\ndata: {"x":2}\n\n'));
    expect(result).toEqual(['{"x":1}', '{"x":2}']);
  });

  it('청크 경계에서 쪼개진 이벤트를 이어 붙인다', async () => {
    const result = await collect(streamOf('data: {"x"', ':1}\n', '\ndata: {"x":2}\n\n'));
    expect(result).toEqual(['{"x":1}', '{"x":2}']);
  });

  it('CRLF 구분자도 처리한다', async () => {
    const result = await collect(streamOf('data: a\r\n\r\ndata: b\r\n\r\n'));
    expect(result).toEqual(['a', 'b']);
  });

  it('CRLF가 청크 경계에서 쪼개져도 이벤트를 분리한다', async () => {
    const result = await collect(streamOf('data: {"x":1}\r\n\r', '\ndata: {"x":2}\r\n\r\n'));
    expect(result).toEqual(['{"x":1}', '{"x":2}']);
  });

  it('마지막 이벤트가 빈 줄 없이 끝나도 내보낸다', async () => {
    const result = await collect(streamOf('data: a\n\ndata: b'));
    expect(result).toEqual(['a', 'b']);
  });
});

describe('parseAnthropicEvent', () => {
  it('content_block_delta의 텍스트를 반환한다', () => {
    const data = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'const' } });
    expect(parseAnthropicEvent(data)).toEqual({ text: 'const', truncated: false, finished: false });
  });

  it('stop_reason이 max_tokens이면 잘림으로 표시한다', () => {
    const data = JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'max_tokens' } });
    expect(parseAnthropicEvent(data)).toEqual({ text: '', truncated: true, finished: false });
  });

  it('message_stop이면 정상 종료로 표시한다', () => {
    expect(parseAnthropicEvent(JSON.stringify({ type: 'message_stop' }))).toEqual({
      text: '',
      truncated: false,
      finished: true,
    });
  });

  it('error 이벤트는 예외로 던진다', () => {
    const data = JSON.stringify({ type: 'error', error: { type: 'overloaded_error' } });
    expect(() => parseAnthropicEvent(data)).toThrow('overloaded_error');
  });

  it('관련 없는 이벤트는 빈 청크를 반환한다', () => {
    expect(parseAnthropicEvent(JSON.stringify({ type: 'ping' }))).toEqual({
      text: '',
      truncated: false,
      finished: false,
    });
  });
});

describe('parseGeminiEvent', () => {
  it('parts의 텍스트를 이어 붙여 반환한다', () => {
    const data = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] });
    expect(parseGeminiEvent(data)).toEqual({ text: 'ab', truncated: false, finished: false });
  });

  it('finishReason이 MAX_TOKENS이면 잘림으로 표시한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'MAX_TOKENS' }],
    });
    expect(parseGeminiEvent(data)).toEqual({ text: 'x', truncated: true, finished: true });
  });

  it('finishReason이 STOP이면 정상 종료로 표시한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'STOP' }],
    });
    expect(parseGeminiEvent(data)).toEqual({ text: 'x', truncated: false, finished: true });
  });

  it('candidates가 없으면 빈 청크를 반환한다', () => {
    expect(parseGeminiEvent('{}')).toEqual({ text: '', truncated: false, finished: false });
  });
});
