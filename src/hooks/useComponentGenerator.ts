import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { loadStored, saveStored, reviveComponents } from '../utils/storage';
import { splitNdjson } from '../utils/ndjson';
import { applyStreamEvent, type StreamEvent, type StreamProgress } from '../utils/streamEvents';

export const COMPONENTS_STORAGE_KEY = 'rcg:components';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  /** 코드가 스트리밍으로 생성되는 중인 컴포넌트. 완료되면 같은 id로 components에 들어간다. */
  streamingComponent: GeneratedComponent | null;
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(() =>
    reviveComponents(loadStored<unknown>(COMPONENTS_STORAGE_KEY, [])),
  );
  const [streamingComponent, setStreamingComponent] = useState<GeneratedComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveStored(COMPONENTS_STORAGE_KEY, components);
  }, [components]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date();
    setStreamingComponent({ id, prompt, code: '', createdAt });

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rest = '';
      let progress: StreamProgress = { streamed: '', finalCode: null };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const parsed = splitNdjson(rest, decoder.decode(value, { stream: true }));
        rest = parsed.rest;

        for (const event of parsed.events as StreamEvent[]) {
          progress = applyStreamEvent(progress, event);
          if (event.type === 'delta') {
            const code = progress.streamed;
            setStreamingComponent((prev) => (prev ? { ...prev, code } : prev));
          }
        }
      }

      const finalCode = progress.finalCode;
      if (!finalCode) {
        throw new Error('응답이 중간에 끊겼습니다. 다시 시도해주세요.');
      }

      // 같은 id로 옮겨 카드가 유지되도록 한 뒤 스트리밍 상태를 비운다
      setComponents((prev) => [{ id, prompt, code: finalCode, createdAt }, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setStreamingComponent(null);
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return { components, streamingComponent, isLoading, error, generate, removeComponent, clearAll };
}
