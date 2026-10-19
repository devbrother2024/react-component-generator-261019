import type { GeneratedComponent } from '../types';

export const MAX_PROMPT_HISTORY = 20;

// 저장소 접근이 막힌 환경(사생활 보호 모드 등)에서도 앱이 죽지 않도록 모두 try/catch로 감싼다
export function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과·접근 불가는 무시한다
  }
}

// JSON으로 직렬화된 createdAt(문자열)을 Date로 복원하고, 형식이 틀린 항목은 버린다
export function reviveComponents(raw: unknown): GeneratedComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (
      item &&
      typeof item.id === 'string' &&
      typeof item.prompt === 'string' &&
      typeof item.code === 'string'
    ) {
      const createdAt = new Date(item.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        return [{ id: item.id, prompt: item.prompt, code: item.code, createdAt }];
      }
    }
    return [];
  });
}

export function addPromptHistory(history: string[], prompt: string): string[] {
  return [prompt, ...history.filter((p) => p !== prompt)].slice(0, MAX_PROMPT_HISTORY);
}
