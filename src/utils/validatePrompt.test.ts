import { describe, it, expect } from 'vitest';
import { validatePromptLength, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePromptLength', () => {
  it('최대 길이는 500자다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });

  it('500자 이하면 유효하다', () => {
    const result = validatePromptLength('가'.repeat(500));
    expect(result).toEqual({ valid: true, length: 500 });
  });

  it('501자부터는 유효하지 않고 오류 메시지를 돌려준다', () => {
    const result = validatePromptLength('가'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.length).toBe(501);
    expect(result.message).toBe('프롬프트는 500자까지 입력할 수 있어요.');
  });

  it('앞뒤 공백은 길이에 포함하지 않는다', () => {
    const result = validatePromptLength(`  ${'a'.repeat(500)}  `);
    expect(result).toEqual({ valid: true, length: 500 });
  });
});
