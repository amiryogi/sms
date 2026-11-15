import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

/**
 * Renders an answer's Markdown safely:
 *  - raw HTML is dropped (skipHtml), images are not shown;
 *  - a link becomes a link only when it is an app page this user may open (`allowedPaths`,
 *    from their own menu); anything else, including every external URL, is plain text;
 *  - a path in backticks like `/teacher/attendance` becomes a link on the same condition.
 */
const isAllowed = (href, allowedPaths) => typeof href === "string" && allowedPaths.has(href.split(/[?#]/)[0]);

export default function AssistantMarkdown({ text, allowedPaths, onNavigate }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p: ({ children }) => <p>{children}</p>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          h1: ({ children }) => <p className="font-semibold text-slate-900">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-slate-900">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-slate-900">{children}</p>,
          blockquote: ({ children }) => <div className="border-l-2 border-slate-200 pl-3 text-slate-600">{children}</div>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-slate-200 px-2 py-1 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-slate-100 px-2 py-1 align-top">{children}</td>,
          img: () => null,
          a: ({ href, children }) =>
            isAllowed(href, allowedPaths) ? (
              <Link to={href} onClick={onNavigate} className="font-medium text-brand-700 underline underline-offset-2">
                {children}
              </Link>
            ) : (
              <span>{children}</span>
            ),
          code: ({ children }) => {
            const value = String(children).trim();
            const chip = <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-800">{value}</code>;
            return isAllowed(value, allowedPaths) ? (
              <Link to={value} onClick={onNavigate} className="underline decoration-brand-300 underline-offset-2" title="Open this page">
                {chip}
              </Link>
            ) : (
              chip
            );
          },
          pre: ({ children }) => <div className="overflow-x-auto rounded-lg bg-slate-50 p-2">{children}</div>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
