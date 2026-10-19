// 제공사 스트리밍 응답(SSE)을 텍스트 조각으로 바꾸는 순수 함수들.
// 부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다.

export interface StreamChunk {
  text: string;
  /** 토큰 한도로 응답이 잘렸는지 여부 */
  truncated: boolean;
  /** 제공사가 정상 종료 신호를 보냈는지 여부 (message_stop, finishReason) */
  finished: boolean;
}

const EMPTY_CHUNK: StreamChunk = { text: '', truncated: false, finished: false };

/** SSE 바이트 스트림에서 이벤트별 `data:` 페이로드를 순서대로 꺼낸다. */
export async function* readSSEData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const extractData = (event: string): string | null => {
    const lines = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''));
    return lines.length > 0 ? lines.join('\n') : null;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // 청크 경계에서 \r\n이 쪼개질 수 있어 누적 버퍼에서 정규화하고, 끝의 \r는 다음 청크까지 보류한다
      const held = buffer.endsWith('\r') ? '\r' : '';
      buffer = buffer.slice(0, buffer.length - held.length).replace(/\r\n/g, '\n') + held;

      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const data = extractData(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (data !== null) yield data;
      }
    }

    const rest = extractData((buffer + decoder.decode()).replace(/\r\n/g, '\n'));
    if (rest !== null) yield rest;
  } finally {
    // 소비자가 중간에 멈추면 업스트림 연결도 끊어 불필요한 생성을 막는다
    await reader.cancel().catch(() => {});
  }
}

export function parseAnthropicEvent(data: string): StreamChunk {
  const event = JSON.parse(data) as {
    type?: string;
    delta?: { type?: string; text?: string; stop_reason?: string };
    error?: { type?: string };
  };

  if (event.type === 'error') {
    throw new Error(`Claude stream error: ${event.error?.type ?? 'unknown'}`);
  }
  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return { ...EMPTY_CHUNK, text: event.delta.text ?? '' };
  }
  if (event.type === 'message_delta' && event.delta?.stop_reason === 'max_tokens') {
    return { ...EMPTY_CHUNK, truncated: true };
  }
  if (event.type === 'message_stop') {
    return { ...EMPTY_CHUNK, finished: true };
  }
  return EMPTY_CHUNK;
}

export function parseGeminiEvent(data: string): StreamChunk {
  const event = JSON.parse(data) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const candidate = event.candidates?.[0];
  return {
    text: candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '',
    truncated: candidate?.finishReason === 'MAX_TOKENS',
    finished: !!candidate?.finishReason,
  };
}
