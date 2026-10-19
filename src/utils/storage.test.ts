import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadStored,
  saveStored,
  reviveComponents,
  addPromptHistory,
  MAX_PROMPT_HISTORY,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('loadStored / saveStored', () => {
  it('저장한 값을 그대로 읽어온다', () => {
    saveStored('k', { a: 1 });
    expect(loadStored('k', null)).toEqual({ a: 1 });
  });

  it('값이 없으면 fallback을 반환한다', () => {
    expect(loadStored('none', 'x')).toBe('x');
  });

  it('JSON이 깨져 있으면 fallback을 반환한다', () => {
    localStorage.setItem('k', '{broken');
    expect(loadStored('k', 'x')).toBe('x');
  });

  it('localStorage 접근이 예외를 던져도 save는 조용히 무시한다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveStored('k', 1)).not.toThrow();
    spy.mockRestore();
  });
});

describe('reviveComponents', () => {
  it('createdAt 문자열을 Date로 복원한다', () => {
    const iso = '2026-01-02T03:04:05.000Z';
    const result = reviveComponents([{ id: '1', prompt: 'p', code: 'c', createdAt: iso }]);
    expect(result[0].createdAt).toEqual(new Date(iso));
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(reviveComponents({ foo: 1 })).toEqual([]);
  });

  it('형식이 잘못된 항목은 제외한다', () => {
    const result = reviveComponents([
      { id: '1', prompt: 'p', code: 'c', createdAt: '2026-01-02T03:04:05.000Z' },
      { id: 2, prompt: 'p' },
      null,
    ]);
    expect(result).toHaveLength(1);
  });
});

describe('addPromptHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addPromptHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('중복 프롬프트는 기존 항목을 제거하고 맨 앞으로 올린다', () => {
    expect(addPromptHistory(['a', 'b'], 'b')).toEqual(['b', 'a']);
  });

  it(`최대 ${MAX_PROMPT_HISTORY}개까지만 유지한다`, () => {
    const full = Array.from({ length: MAX_PROMPT_HISTORY }, (_, i) => `p${i}`);
    const result = addPromptHistory(full, 'new');
    expect(result).toHaveLength(MAX_PROMPT_HISTORY);
    expect(result[0]).toBe('new');
  });
});
