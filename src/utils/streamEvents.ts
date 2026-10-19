// 서버가 보내는 스트림 이벤트를 누적 상태로 반영하는 순수 함수.

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

export interface StreamProgress {
  streamed: string;
  finalCode: string | null;
}

/** error 이벤트는 예외로 던져 호출부의 catch가 처리하게 한다. */
export function applyStreamEvent(progress: StreamProgress, event: StreamEvent): StreamProgress {
  switch (event.type) {
    case 'delta':
      return { ...progress, streamed: progress.streamed + event.text };
    case 'done':
      return { ...progress, finalCode: event.code };
    case 'error':
      throw new Error(event.error);
  }
}
