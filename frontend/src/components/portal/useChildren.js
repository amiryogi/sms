import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { parentService } from "../../api/parentService";

const STORAGE_KEY = "sms.parent.child";
const remembered = () => {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
};

/**
 * The signed-in parent's linked children and the one being viewed.
 * The choice lives in the URL (?child=<studentId>) so it survives reloads,
 * links and the back button; the last choice is also remembered for the
 * browser session, so sidebar links (which carry no ?child) keep it. The API
 * decides who the children are; an unknown id falls back to the first child.
 */
export const useChildren = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ children: null, error: "" });

  useEffect(() => {
    let alive = true;
    parentService
      .getMyChildren()
      .then((res) => alive && setState({ children: res.data?.children || [], error: "" }))
      .catch((err) => alive && setState({ children: [], error: err.response?.data?.message || "Could not load your children" }));
    return () => {
      alive = false;
    };
  }, []);

  const wanted = Number(searchParams.get("child")) || remembered();
  const children = state.children;
  const child = children ? children.find((c) => c.id === wanted) || children[0] || null : null;

  // Remember the child being viewed (sessionStorage is an external system).
  useEffect(() => {
    if (!child) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, String(child.id));
    } catch {
      // Private mode or blocked storage: the URL still carries the choice.
    }
  }, [child]);

  const select = useCallback(
    (id) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("child", String(id));
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  return {
    kids: children,
    child,
    childId: child?.id ?? null,
    loading: children === null,
    error: state.error,
    select,
    /** "?child=12" to keep the choice on links to other parent pages. */
    query: child ? `?child=${child.id}` : "",
  };
};

export default useChildren;
