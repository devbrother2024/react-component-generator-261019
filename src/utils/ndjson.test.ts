import { describe, it, expect } from 'vitest';
import { splitNdjson } from './ndjson';

describe('splitNdjson', () => {
  it('완결된 줄을 JSON으로 파싱하고 나머지는 rest로 돌려준다', () => {
    const { events, rest } = splitNdjson('', '{"a":1}\n{"b":2}\n{"c"');
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
    expect(rest).toBe('{"c"');
  });

  it('이전 rest와 새 청크를 이어 붙인다', () => {
    const { events, rest } = splitNdjson('{"c"', ':3}\n');
    expect(events).toEqual([{ c: 3 }]);
    expect(rest).toBe('');
  });

  it('빈 줄은 무시한다', () => {
    expect(splitNdjson('', '\n{"a":1}\n\n').events).toEqual([{ a: 1 }]);
  });
});
