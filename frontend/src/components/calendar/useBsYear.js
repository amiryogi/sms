import { useSearchParams } from "react-router-dom";
import { bsYearRange, todayBs, MIN_BS_YEAR, MAX_BS_YEAR } from "../../lib/calendar/bsDateAdapter";

/**
 * The B.S. year a calendar page is showing, kept in the URL (?year=2083) so a
 * page can be bookmarked and its print view opens on the same year.
 * Returns { year, setYear, range: { from, to } (AD), years: choices for a select }.
 */
export const useBsYear = () => {
  const [params, setParams] = useSearchParams();
  const current = todayBs()?.year || 2083;
  const asked = Number.parseInt(params.get("year"), 10);
  const year = Number.isInteger(asked) && asked >= MIN_BS_YEAR && asked <= MAX_BS_YEAR ? asked : current;

  const years = Array.from({ length: 9 }, (_, i) => current - 4 + i).filter((y) => y >= MIN_BS_YEAR && y <= MAX_BS_YEAR);
  const setYear = (next) => {
    const copy = new URLSearchParams(params);
    copy.set("year", String(next));
    setParams(copy, { replace: true });
  };
  return { year, setYear, range: bsYearRange(year), years: years.includes(year) ? years : [...years, year].sort((a, b) => a - b) };
};
