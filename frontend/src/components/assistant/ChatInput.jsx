import { forwardRef, useState } from "react";
import { SendHorizontal, Square } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * The question box. Enter sends, Shift+Enter starts a new line. While a Nepali (or any)
 * input method is composing a word, Enter belongs to the input method, not to sending.
 */
const ChatInput = forwardRef(function ChatInput({ t, busy, maxLength = 1000, onSend, onStop }, ref) {
  const [value, setValue] = useState("");
  const left = maxLength - value.length;

  const submit = () => {
    if (busy || !value.trim()) return;
    onSend(value);
    setValue("");
  };

  return (
    <form
      className="border-t border-slate-200 bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <label htmlFor="assistant-input" className="sr-only">
          {t.placeholder}
        </label>
        <textarea
          id="assistant-input"
          ref={ref}
          rows={1}
          value={value}
          maxLength={maxLength}
          placeholder={t.placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-36 min-h-6 flex-1 resize-none bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus-visible:outline-none"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={t.stop}
            title={t.stop}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700"
          >
            <Square size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label={t.send}
            title={t.send}
            className={cn(
              "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand-600 text-brand-fg hover:bg-brand-700",
              "disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-400"
            )}
          >
            <SendHorizontal size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 px-0.5 text-[11px] text-slate-400">
        <span>{t.disclaimer}</span>
        {left < 200 && <span className="shrink-0">{t.charactersLeft(left)}</span>}
      </div>
    </form>
  );
});

export default ChatInput;
