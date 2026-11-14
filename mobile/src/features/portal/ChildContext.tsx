import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Child } from "@/types/api";
import { useUser } from "@/contexts/AuthContext";
import { readJson, userKey, writeJson } from "@/lib/storage";
import { useChildrenQuery } from "./hooks";

type ChildValue = {
  children: Child[];
  child: Child | null;
  selectChild: (studentId: number) => void;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

const ChildContext = createContext<ChildValue | null>(null);

/**
 * The parent's linked children and the one being viewed. The list comes only
 * from /parents/me/children (StudentParent); an id the server does not list
 * is never used. The choice is remembered per parent on this phone and is
 * deleted at sign-out.
 */
/**
 * Ask the parent area to show one child (a tapped notification about them).
 * Kept until a ChildProvider that lists the child takes it; an id the server
 * does not list for this parent is ignored, as everywhere else.
 */
let requested: number | null = null;
const requestListeners = new Set<() => void>();
export const requestChild = (studentId: number) => {
  requested = studentId;
  requestListeners.forEach((l) => l());
};

export const ChildProvider = ({ children: node }: { children: ReactNode }) => {
  const user = useUser();
  const query = useChildrenQuery();
  const [wanted, setWanted] = useState<number | null>(null);
  const key = userKey(user.id, "child");

  useEffect(() => {
    readJson<number | null>(key, null).then((id) => setWanted((w) => w ?? id));
  }, [key]);

  const list = useMemo(() => query.data ?? [], [query.data]);
  const child = list.find((c) => c.studentId === wanted) ?? list[0] ?? null;

  // Take a child requested from outside, once the list is known.
  useEffect(() => {
    const take = () => {
      if (requested === null || !list.length) return;
      const id = requested;
      requested = null;
      if (list.some((c) => c.studentId === id)) {
        setWanted(id);
        writeJson(key, id);
      }
    };
    take();
    requestListeners.add(take);
    return () => {
      requestListeners.delete(take);
    };
  }, [list, key]);

  const selectChild = useCallback(
    (studentId: number) => {
      if (!list.some((c) => c.studentId === studentId)) return;
      setWanted(studentId);
      writeJson(key, studentId);
    },
    [list, key],
  );

  const value = useMemo<ChildValue>(
    () => ({
      children: list,
      child,
      selectChild,
      isLoading: query.isLoading,
      error: query.error,
      refetch: () => {
        query.refetch();
      },
    }),
    [list, child, selectChild, query],
  );

  return <ChildContext.Provider value={value}>{node}</ChildContext.Provider>;
};

export const useChild = () => {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChild must be used inside ChildProvider (parent area)");
  return ctx;
};
