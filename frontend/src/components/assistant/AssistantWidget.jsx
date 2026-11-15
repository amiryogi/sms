import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircleQuestion, X, Maximize2, Minimize2, SquarePen, History, ArrowLeft, Sparkles, Play } from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { assistantService } from "../../api/assistantService";
import { getNavSections, titleForPath } from "../../layouts/navigation";
import { getAssistantPrefs, setAssistantLanguage, subscribeAssistantPrefs, getAssistantSession, setAssistantSession, LANGUAGES } from "../../lib/assistantPrefs";
import { IconButton } from "../ui";
import { stringsFor } from "./strings";
import { useAssistantChat } from "./useAssistantChat";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import HistoryList from "./HistoryList";

/**
 * The help assistant: a floating button on every signed-in page and a chat panel.
 * Rendered by DashboardLayout only, so never on the public site. It shows nothing at all
 * when the assistant is off for this user (the server decides: GET /assistant/bootstrap).
 *
 * Walkthroughs: `onGuidesLoaded(guides)` receives the ones the server allows this user,
 * `onStartGuide(id)` starts one, and `guideActive` hides the help button while one runs.
 */
export default function AssistantWidget({ onGuidesLoaded, onStartGuide, guideActive = false }) {
  const { user } = useAuth();
  // Kept with the user it belongs to, so a different sign-in never sees the previous answer.
  const [loaded, setLoaded] = useState({ userId: null, data: null });
  const boot = loaded.userId === user?.id ? loaded.data : null;

  useEffect(() => {
    let alive = true;
    if (!user?.id) return undefined;
    const userId = user.id;
    assistantService
      .bootstrap()
      .then((res) => alive && setLoaded({ userId, data: res.data.data }))
      .catch(() => alive && setLoaded({ userId, data: { enabled: false } }));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (boot?.enabled) onGuidesLoaded?.(boot.guides || []);
  }, [boot, onGuidesLoaded]);

  if (!boot?.enabled) return null;
  return <AssistantRoot boot={boot} onStartGuide={onStartGuide} guideActive={guideActive} />;
}

function AssistantRoot({ boot, onStartGuide, guideActive }) {
  const { hasRole } = useAuth();
  const location = useLocation();
  const prefs = useSyncExternalStore(subscribeAssistantPrefs, getAssistantPrefs);
  const [open, setOpenState] = useState(() => !!getAssistantSession().open);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState("chat");
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const buttonRef = useRef(null);

  // No personal choice yet: the widget follows the school's default language.
  const language = prefs.language;
  const lang = language === "ne" || (!language && boot.defaultLanguage === "ne") ? "ne" : "en";
  const t = stringsFor(lang);
  const page = titleForPath(location.pathname).title;
  const chat = useAssistantChat({ language: language || undefined, route: location.pathname });

  // Pages this user may open: the only links an answer may contain.
  const allowedPaths = useMemo(() => {
    const set = new Set(["/account/password", "/dashboard"]);
    for (const s of getNavSections(hasRole)) for (const item of s.items) set.add(item.path);
    return set;
  }, [hasRole]);

  const setOpen = (value) => {
    setOpenState(value);
    setAssistantSession({ open: value });
    if (!value) setTimeout(() => buttonRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (open && view === "chat") setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, view]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, open, view]);

  // On a phone the panel covers the page: following a link closes it.
  const onNavigate = () => {
    if (window.matchMedia?.("(max-width: 639px)").matches) setOpen(false);
  };

  const ask = (text) => {
    setView("chat");
    chat.send(text);
  };

  const suggestions = (boot.suggestions || []).map((s) => (language === "ne" ? s.ne : s.en));

  // The panel would cover the page the walkthrough points at.
  const startGuide = (id) => {
    setOpen(false);
    onStartGuide?.(id);
  };

  return (
    <>
      {!open && !guideActive && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          title={t.open}
          data-guide="assistant.button"
          className="fixed right-4 bottom-4 z-40 inline-flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-white/60 transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:right-6 sm:bottom-6 print:hidden"
        >
          <MessageCircleQuestion size={26} aria-hidden="true" />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="assistant-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !e.nativeEvent.isComposing) setOpen(false);
          }}
          className={cn(
            "fixed inset-0 z-40 flex flex-col overflow-hidden bg-slate-50 sm:inset-auto sm:right-6 sm:bottom-6 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-pop print:hidden",
            expanded ? "sm:h-[calc(100dvh-3rem)] sm:w-[min(760px,calc(100vw-3rem))]" : "sm:h-[min(640px,calc(100dvh-3rem))] sm:w-105"
          )}
          data-testid="assistant-panel"
        >
          <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
            {view === "history" ? (
              <IconButton size="sm" icon={ArrowLeft} label={t.back} onClick={() => setView("chat")} />
            ) : (
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
                <Sparkles size={16} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="assistant-title" className="truncate text-sm font-semibold text-slate-900">
                {view === "history" ? t.history : t.title}
              </h2>
              <p className="truncate text-xs text-slate-500">{t.subtitle}</p>
            </div>
            <IconButton size="sm" icon={History} label={t.history} onClick={() => setView(view === "history" ? "chat" : "history")} aria-pressed={view === "history"} />
            <IconButton
              size="sm"
              icon={SquarePen}
              label={t.newChat}
              onClick={() => {
                chat.reset();
                setView("chat");
              }}
            />
            <IconButton size="sm" icon={expanded ? Minimize2 : Maximize2} label={expanded ? t.collapse : t.expand} onClick={() => setExpanded(!expanded)} className="hidden sm:inline-flex" />
            <IconButton size="sm" icon={X} label={t.close} onClick={() => setOpen(false)} />
          </header>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-1.5">
            <span className="text-xs text-slate-500" id="assistant-language-label">
              {t.language}
            </span>
            <div role="group" aria-labelledby="assistant-language-label" className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {LANGUAGES.map((code) => {
                const active = (language || "auto") === code;
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAssistantLanguage(code)}
                    className={cn("cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium", active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                  >
                    {t.languages[code]}
                  </button>
                );
              })}
            </div>
          </div>

          {view === "history" ? (
            <div className="flex-1 overflow-y-auto bg-white">
              <HistoryList
                t={t}
                currentId={chat.conversationId}
                onOpen={async (id) => {
                  await chat.open(id);
                  setView("chat");
                }}
                onDeleted={(id) => {
                  if (id === null || id === chat.conversationId) chat.reset();
                }}
              />
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-live="polite" aria-busy={chat.busy}>
                {chat.loading && <p className="text-sm text-slate-500">{t.historyLoading}</p>}
                {!chat.loading && chat.messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700">
                      <p>{t.greeting}</p>
                      {page && <p className="mt-1.5 text-xs text-slate-500">{t.pageHint(page)}</p>}
                    </div>
                    {suggestions.length > 0 && (
                      <div>
                        <p className="mb-2 px-1 text-xs font-medium tracking-wide text-slate-500 uppercase">{t.tryAsking}</p>
                        <ul className="flex flex-col gap-1.5">
                          {suggestions.map((s) => (
                            <li key={s}>
                              <button
                                type="button"
                                onClick={() => ask(s)}
                                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                              >
                                {s}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {onStartGuide && boot.guides?.length > 0 && (
                      <div>
                        <p className="mb-2 px-1 text-xs font-medium tracking-wide text-slate-500 uppercase">{t.guide.walkthroughs}</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {boot.guides.map((g) => (
                            <li key={g.id}>
                              <button
                                type="button"
                                onClick={() => startGuide(g.id)}
                                data-testid="guide-start"
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
                              >
                                <Play size={12} aria-hidden="true" />
                                {g.title?.[lang] || g.title?.en}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {chat.messages.map((m) => (
                  <ChatMessage
                    key={m.localId}
                    message={m}
                    t={t}
                    lang={lang}
                    allowedPaths={allowedPaths}
                    onNavigate={onNavigate}
                    onRetry={chat.retry}
                    onRate={chat.rate}
                    onStartGuide={onStartGuide ? startGuide : undefined}
                  />
                ))}
              </div>
              <ChatInput ref={inputRef} t={t} busy={chat.busy} maxLength={boot.maxQuestionLength || 1000} onSend={ask} onStop={chat.stop} />
            </>
          )}
        </section>
      )}
    </>
  );
}
