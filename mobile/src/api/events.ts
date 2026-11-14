/**
 * What the HTTP layer tells the rest of the app, without importing React:
 * the auth context subscribes (src/contexts/AuthContext.tsx).
 */
export type ApiEvent =
  | { type: "session-expired" }
  | { type: "token-refreshed" }
  | { type: "forbidden"; url: string; message: string }
  | { type: "password-change-required" };

type Listener = (event: ApiEvent) => void;

const listeners = new Set<Listener>();

export const apiEvents = {
  emit(event: ApiEvent) {
    for (const l of [...listeners]) {
      try {
        l(event);
      } catch {
        // a listener's failure must not break the request that triggered it
      }
    }
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
