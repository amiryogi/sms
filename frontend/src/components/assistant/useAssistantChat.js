import { useCallback, useEffect, useRef, useState } from "react";
import { assistantService } from "../../api/assistantService";
import { streamChat, StreamError } from "../../api/assistantStream";
import { getAssistantSession, setAssistantSession } from "../../lib/assistantPrefs";

let seq = 0;
const nextId = () => `local-${++seq}`;

/** A saved message from the API in the shape the widget renders. */
const fromApi = (m) => ({
  localId: `m-${m.id}`,
  id: m.id,
  role: m.role,
  content: m.content,
  sources: m.sources || [],
  guides: m.guides || [],
  feedback: m.feedback || 0,
  status: "done",
});

/**
 * State and actions of one help conversation: send (streamed, with a non-streaming fallback),
 * stop, retry, start over, open an earlier conversation, rate an answer.
 *
 * @param {{ language: string|null, route: string }} opts  route = the page the user is on
 */
export function useAssistantChat({ language, route }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(() => getAssistantSession().conversationId || null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const busyRef = useRef(false);

  const update = useCallback((localId, patch) => {
    setMessages((list) => list.map((m) => (m.localId === localId ? (typeof patch === "function" ? patch(m) : { ...m, ...patch }) : m)));
  }, []);

  const remember = useCallback((id) => {
    setConversationId(id);
    setAssistantSession({ conversationId: id });
  }, []);

  const open = useCallback(async (id) => {
    abortRef.current?.abort();
    setLoading(true);
    try {
      const res = await assistantService.getConversation(id);
      setMessages(res.data.data.messages.map(fromApi));
      remember(id);
      return true;
    } catch {
      setMessages([]);
      remember(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [remember]);

  // Reopen this tab's conversation after a reload or a page change.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const id = getAssistantSession().conversationId;
    if (id) open(id);
  }, [open]);

  const send = useCallback(
    async (text) => {
      const question = String(text || "").trim();
      if (!question || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      const answerId = nextId();
      setMessages((list) => [
        ...list,
        { localId: nextId(), role: "user", content: question, status: "done" },
        { localId: answerId, role: "assistant", content: "", status: "streaming", sources: [], guides: [], feedback: 0, question },
      ]);
      const controller = new AbortController();
      abortRef.current = controller;
      const body = { message: question, conversationId: conversationId || undefined, language: language || undefined, context: { route } };
      let heard = false;

      const onEvent = ({ event, data }) => {
        heard = true;
        if (event === "meta") {
          remember(data.conversationId);
          update(answerId, { sources: data.sources || [], guides: data.guides || [], language: data.language });
        } else if (event === "delta") {
          update(answerId, (m) => ({ ...m, content: m.content + data.text }));
        } else if (event === "done") {
          update(answerId, { status: "done", id: data.messageId, truncated: !!data.truncated });
        } else if (event === "error") {
          update(answerId, (m) => ({ ...m, status: "error", errorCode: data.code, errorMessage: data.message, id: data.messageId || m.id }));
        }
      };

      try {
        await streamChat(body, { onEvent, signal: controller.signal });
        // The stream ended without "done" or "error".
        update(answerId, (m) => (m.status === "streaming" ? { ...m, status: m.content ? "done" : "error", errorCode: m.content ? undefined : "unknown" } : m));
      } catch (err) {
        if (controller.signal.aborted) {
          update(answerId, (m) => ({ ...m, status: "stopped" }));
        } else if (err instanceof StreamError && err.fallback && !heard) {
          // The network in between does not pass the stream: ask for the whole answer at once.
          try {
            const res = await assistantService.chat(body, { signal: controller.signal });
            const d = res.data.data;
            if (d.conversationId) remember(d.conversationId);
            update(answerId, {
              content: d.answer || "",
              sources: d.sources || [],
              guides: d.guides || [],
              id: d.messageId || d.error?.messageId,
              status: d.error ? "error" : "done",
              errorCode: d.error?.code,
              errorMessage: d.error?.message,
            });
          } catch (e2) {
            update(answerId, { status: controller.signal.aborted ? "stopped" : "error", errorCode: e2.response?.data?.code || (e2.response ? `http_${e2.response.status}` : "network"), errorMessage: e2.response?.data?.message });
          }
        } else if (err instanceof StreamError) {
          update(answerId, { status: "error", errorCode: err.code || `http_${err.status}`, errorMessage: err.message });
          if (err.status === 404) remember(null);
        } else {
          update(answerId, { status: "error", errorCode: err?.isSessionExpired ? "unknown" : "network" });
        }
      } finally {
        abortRef.current = null;
        busyRef.current = false;
        setBusy(false);
      }
    },
    [conversationId, language, route, remember, update]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Ask the failed question again (the failed answer is removed). */
  const retry = useCallback(
    (localId) => {
      const failed = messages.find((m) => m.localId === localId);
      if (!failed?.question) return;
      setMessages((list) => {
        const i = list.findIndex((m) => m.localId === localId);
        return i > 0 ? list.slice(0, i - 1) : list;
      });
      send(failed.question);
    },
    [messages, send]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    remember(null);
  }, [remember]);

  const rate = useCallback(
    async (localId, value, comment) => {
      const m = messages.find((x) => x.localId === localId);
      if (!m?.id) return false;
      update(localId, { feedback: value });
      try {
        await assistantService.feedback(m.id, value, comment || undefined);
        return true;
      } catch {
        update(localId, { feedback: m.feedback || 0 });
        return false;
      }
    },
    [messages, update]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, conversationId, busy, loading, send, stop, retry, reset, open, rate };
}
