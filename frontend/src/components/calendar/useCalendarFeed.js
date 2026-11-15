import { useCallback, useEffect, useState } from "react";
import { calendarService } from "../../api/calendarService";

/**
 * Calendar items for [from, to] (AD days). `sources` narrows the feed
 * (["exam"], ["event"], ...). Returns { items, loading, error, reload }.
 *
 * While a new range loads, the previous items stay on screen (the caller dims
 * them), and a slower answer for an older range never replaces a newer one.
 */
export const useCalendarFeed = (from, to, sources) => {
  const [result, setResult] = useState({ key: "", items: [], error: "" });
  const [version, setVersion] = useState(0);
  const sourceKey = sources?.length ? sources.join(",") : "";
  const key = from && to ? `${from}|${to}|${sourceKey}|${version}` : "";

  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    calendarService
      .getFeed({ from, to, sources: sourceKey ? sourceKey.split(",") : undefined })
      .then((res) => alive && setResult({ key, items: res.data?.items || [], error: "" }))
      .catch((error) => alive && setResult({ key, items: [], error: error.response?.data?.message || "Could not load the calendar" }));
    return () => {
      alive = false;
    };
  }, [key, from, to, sourceKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { items: result.items, error: result.key === key ? result.error : "", loading: Boolean(key) && result.key !== key, reload };
};
