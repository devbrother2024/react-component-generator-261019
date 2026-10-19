// 서버가 보내는 NDJSON 스트림을 청크 단위로 파싱한다.

/** 이전에 남은 rest와 새 청크를 합쳐 완결된 줄만 JSON으로 파싱한다. */
export function splitNdjson(rest: string, chunk: string): { events: unknown[]; rest: string } {
  const lines = (rest + chunk).split('\n');
  const remaining = lines.pop() ?? '';
  const events = lines.filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
  return { events, rest: remaining };
}
