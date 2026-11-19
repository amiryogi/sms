import { useEffect, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { assistantService } from "../../api/assistantService";
import { confirmDialog, IconButton, Button } from "../ui";
import { formatDateTime } from "../../utils/format";

/** The user's earlier conversations (their own only; the server checks). */
export default function HistoryList({ t, currentId, onOpen, onDeleted }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    assistantService
      .listConversations({ limit: 50 })
      .then((res) => alive && setItems(res.data.data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const remove = async (id) => {
    if (!(await confirmDialog({ title: t.deleteOne, message: t.deleteOneConfirm, tone: "danger", confirmLabel: t.deleteOne }))) return;
    await assistantService.deleteConversation(id).catch(() => null);
    setItems((list) => list.filter((c) => c.id !== id));
    onDeleted(id);
  };

  const clearAll = async () => {
    if (!(await confirmDialog({ title: t.clearAll, message: t.clearAllConfirm, tone: "danger", confirmLabel: t.clearAll }))) return;
    await assistantService.clearHistory().catch(() => null);
    setItems([]);
    onDeleted(null);
  };

  if (error) return <p className="p-4 text-sm text-risk" role="alert">{t.errors.network}</p>;
  if (!items) return <p className="p-4 text-sm text-slate-500">{t.historyLoading}</p>;
  if (!items.length) return <p className="p-4 text-sm text-slate-500">{t.historyEmpty}</p>;

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-slate-100">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-1 pr-2">
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 px-4 py-3 text-left hover:bg-slate-50"
              aria-current={c.id === currentId ? "true" : undefined}
            >
              <MessageSquare size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{c.title}</span>
                <span className="block text-xs text-slate-500">{formatDateTime(c.lastMessageAt)}</span>
              </span>
            </button>
            <IconButton size="sm" icon={Trash2} label={t.deleteOne} onClick={() => remove(c.id)} />
          </li>
        ))}
      </ul>
      <div className="p-3">
        <Button size="sm" variant="ghost" icon={Trash2} onClick={clearAll}>
          {t.clearAll}
        </Button>
      </div>
    </div>
  );
}
