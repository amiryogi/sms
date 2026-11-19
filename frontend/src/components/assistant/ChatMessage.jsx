import { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle, BookOpen, PlayCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton, Button } from "../ui";
import AssistantMarkdown from "./AssistantMarkdown";
import { errorText } from "./strings";

/**
 * One question or answer. Answers show the help pages they came from, copy and
 * thumbs up/down (a thumbs down can carry a comment for the school's administrators),
 * and the walkthroughs the server offered with them (`onStartGuide` starts one).
 */
export default function ChatMessage({ message, t, lang, allowedPaths, onNavigate, onRetry, onRate, onStartGuide }) {
  const [copied, setCopied] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [thanked, setThanked] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm break-words whitespace-pre-wrap text-brand-fg">{message.content}</p>
      </div>
    );
  }

  const streaming = message.status === "streaming";
  const failed = message.status === "error";
  const finished = message.status === "done";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };

  const rate = async (value) => {
    const next = message.feedback === value ? 0 : value;
    const ok = await onRate(message.localId, next);
    if (ok && next === -1) setCommenting(true);
    if (ok && next !== -1) {
      setCommenting(false);
      setThanked(next === 1);
    }
  };

  const sendComment = async () => {
    const ok = await onRate(message.localId, -1, comment.trim());
    if (ok) {
      setCommenting(false);
      setThanked(true);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid="assistant-answer">
      <div className={cn("max-w-full rounded-2xl rounded-bl-md border px-3.5 py-2.5", failed ? "border-risk-line bg-risk-surface" : "border-slate-200 bg-white")}>
        {message.content ? (
          <AssistantMarkdown text={message.content} allowedPaths={allowedPaths} onNavigate={onNavigate} />
        ) : streaming ? (
          <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <span className="inline-flex gap-0.5" aria-hidden="true">
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
            {t.thinking}
          </p>
        ) : null}
        {streaming && message.content && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-slate-400 align-middle" aria-hidden="true" />}
        {failed && (
          <p className={cn("flex items-start gap-2 text-sm text-risk", message.content && "mt-2 border-t border-risk-line pt-2")} role="alert">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorText(t, message.errorCode, message.errorMessage)}</span>
          </p>
        )}
        {message.status === "stopped" && <p className="mt-1 text-xs text-slate-400">{t.stopped}</p>}
        {message.truncated && <p className="mt-1 text-xs text-warn">{t.truncated}</p>}
      </div>

      {finished && message.sources?.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 px-1 text-xs text-slate-500">
          <BookOpen size={12} aria-hidden="true" />
          <span className="sr-only">{t.sources}:</span>
          {message.sources.slice(0, 3).map((s) => (
            <span key={s.id} className="rounded-full bg-slate-100 px-2 py-0.5">
              {s.title}
            </span>
          ))}
        </p>
      )}

      {finished && onStartGuide && message.guides?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {message.guides.map((g) => (
            <Button key={g.id} size="sm" variant="secondary" icon={PlayCircle} onClick={() => onStartGuide(g.id)} data-testid="guide-offer">
              {t.guide.start}: {g.title?.[lang] || g.title?.en}
            </Button>
          ))}
        </div>
      )}

      {failed && message.question && (
        <div className="px-1">
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => onRetry(message.localId)}>
            {t.retry}
          </Button>
        </div>
      )}

      {finished && message.content && (
        <div className="flex items-center gap-0.5 px-0.5">
          <IconButton size="sm" icon={copied ? Check : Copy} label={copied ? t.copied : t.copy} onClick={copy} />
          {message.id && (
            <>
              <IconButton
                size="sm"
                icon={ThumbsUp}
                label={t.helpful}
                aria-pressed={message.feedback === 1}
                className={message.feedback === 1 ? "text-brand-700" : undefined}
                onClick={() => rate(1)}
              />
              <IconButton
                size="sm"
                icon={ThumbsDown}
                label={t.notHelpful}
                aria-pressed={message.feedback === -1}
                className={message.feedback === -1 ? "text-risk" : undefined}
                onClick={() => rate(-1)}
              />
            </>
          )}
          {thanked && <span className="ml-1 text-xs text-slate-500">{t.feedbackThanks}</span>}
        </div>
      )}

      {commenting && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <label className="text-xs text-slate-600" htmlFor={`fb-${message.localId}`}>
            {t.feedbackPrompt}
          </label>
          <textarea
            id={`fb-${message.localId}`}
            value={comment}
            maxLength={500}
            rows={2}
            onChange={(e) => setComment(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand-600"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={sendComment}>
              {t.feedbackSend}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
