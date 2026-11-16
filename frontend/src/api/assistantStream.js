/**
 * Streaming chat with the help assistant (Server-Sent Events over a POST).
 *
 * This is the one place the app uses fetch() instead of apiClient: axios cannot read a
 * response body as it arrives in the browser. It still uses the same token and the same
 * single-flight refresh as apiClient (refreshSession).
 *
 * Text is decoded with TextDecoder({ stream: true }), so a Nepali character whose bytes are
 * split across two network chunks is never broken.
 *
 * If the network in between turns the stream into something else (no readable body, or not
 * an event stream, or a gateway error before anything arrived), the caller falls back to the
 * non-streaming endpoint (see useAssistantChat).
 */
import { API_BASE_URL, refreshSession } from "./apiClient";

export class StreamError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, fallback?: boolean }} info
   *   fallback: the stream could not be used at all; try the non-streaming endpoint.
   */
  constructor(message, { status, code, fallback = false } = {}) {
    super(message);
    this.name = "StreamError";
    this.status = status;
    this.code = code;
    this.fallback = fallback;
  }
}

/**
 * Incremental SSE parser. Feed it raw bytes with push(); it calls onEvent({ event, data })
 * for every complete event. Comment lines (": ping") are ignored.
 */
export function createSseParser(onEvent) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const flushBlocks = () => {
    let at;
    while ((at = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, at);
      buffer = buffer.slice(at + 2);
      let event = "message";
      const data = [];
      for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (!data.length) continue;
      let parsed;
      try {
        parsed = JSON.parse(data.join("\n"));
      } catch {
        continue;
      }
      onEvent({ event, data: parsed });
    }
  };

  return {
    push(bytes) {
      buffer += decoder.decode(bytes, { stream: true }).replace(/\r\n/g, "\n");
      flushBlocks();
    },
    end() {
      buffer += decoder.decode();
      buffer += "\n\n";
      flushBlocks();
    },
  };
}

const GATEWAY = new Set([502, 503, 504]);

/**
 * POST /assistant/chat/stream. Resolves when the stream ends; events arrive via onEvent.
 * Rejects with StreamError for refusals (403, 404, 429…, with the server's message and code)
 * and network problems; `fallback: true` means "use the non-streaming endpoint instead".
 *
 * @param {object} body  { message, conversationId?, language, context: { route } }
 * @param {{ onEvent: (e: { event: string, data: object }) => void, signal?: AbortSignal }} opts
 */
export async function streamChat(body, { onEvent, signal }) {
  const send = (token) =>
    fetch(`${API_BASE_URL}/assistant/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal,
    });

  let res = await send(localStorage.getItem("accessToken"));
  if (res.status === 401) {
    const token = await refreshSession();
    res = await send(token);
  }

  const type = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (GATEWAY.has(res.status)) throw new StreamError("The connection does not allow streaming", { status: res.status, fallback: true });
    let json = null;
    try {
      json = await res.json();
    } catch {
      // not JSON
    }
    throw new StreamError(json?.message || `Request failed (${res.status})`, { status: res.status, code: json?.code });
  }
  if (!res.body || !type.includes("text/event-stream")) {
    throw new StreamError("The response is not a stream", { status: res.status, fallback: true });
  }

  const parser = createSseParser(onEvent);
  const reader = res.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.push(value);
  }
  parser.end();
}
