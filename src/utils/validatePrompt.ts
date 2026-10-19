export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  valid: boolean;
  length: number;
  message?: string;
}

// 제출 시 trim된 값이 전송되므로 길이도 trim 기준으로 센다
export function validatePromptLength(prompt: string): PromptValidation {
  const length = prompt.trim().length;
  if (length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      length,
      message: `프롬프트는 ${MAX_PROMPT_LENGTH}자까지 입력할 수 있어요.`,
    };
  }
  return { valid: true, length };
}
