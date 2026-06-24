import camelcaseKeys from "camelcase-keys";
import type { Message, MessagesChunk } from "./types";

export async function fetchText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  const response = await fetch(input, init);
  return response.text();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchJson<T = any>(
  input: RequestInfo | URL,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  converter: (json: any) => T = (json) => json,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const json = await response.json();
  return converter(json);
}

export async function fetchMessage(id: string) {
  return fetchJson<Message>(`/api/messages/${id}`, (result) =>
    camelcaseKeys(result, { deep: true }),
  );
}

export async function fetchMessagesChunk(
  id: string,
  sequence: number,
  direction: "before" | "after",
) {
  const param = new URLSearchParams();
  param.append("sequence", String(sequence));
  param.append("direction", direction);

  return fetchJson<MessagesChunk>(`/api/messages/${id}?${param.toString()}`, (result) =>
    camelcaseKeys(result, { deep: true }),
  );
}

export async function fetchBeforeMessagesChunk(id: string, sequence: number) {
  return fetchMessagesChunk(id, sequence, "before").then((results) => {
    if (results.messages.length < results.total) {
      results.hasBefore = true;
    }
    results.shouldAdjustScrollTop = true;
    results.messages.reverse();
    return results;
  });
}

export async function fetchAfterMessagesChunk(id: string, sequence: number) {
  return fetchMessagesChunk(id, sequence, "after").then((results) => {
    if (results.messages.length < results.total) {
      results.hasAfter = true;
    }
    return results;
  });
}
