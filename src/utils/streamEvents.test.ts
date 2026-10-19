import { describe, it, expect } from 'vitest';
import { applyStreamEvent, type StreamProgress } from './streamEvents';

const start: StreamProgress = { streamed: '', finalCode: null };

describe('applyStreamEvent', () => {
  it('delta는 받은 텍스트에 이어 붙인다', () => {
    const next = applyStreamEvent({ streamed: 'a', finalCode: null }, { type: 'delta', text: 'b' });
    expect(next).toEqual({ streamed: 'ab', finalCode: null });
  });

  it('done은 최종 코드를 기록한다', () => {
    expect(applyStreamEvent(start, { type: 'done', code: 'X' }).finalCode).toBe('X');
  });

  it('error는 예외로 던진다', () => {
    expect(() => applyStreamEvent(start, { type: 'error', error: '실패' })).toThrow('실패');
  });
});
