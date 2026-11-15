import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Play, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { titleForPath } from "../../../layouts/navigation";
import { getAssistantPrefs, subscribeAssistantPrefs } from "../../../lib/assistantPrefs";
import { stringsFor } from "../strings";
import { GUIDES, resolvePath } from "./registry";
import { findTarget } from "./targets";

/**
 * Runs one walkthrough at a time with driver.js.
 *
 * Safety: a step can point only at a `data-guide` id from ./registry.js (checked against
 * TARGET_PATTERN and looked up with CSS.escape); only walkthroughs the server offered this
 * user (bootstrap) can start. The runner highlights and navigates; it never clicks, types or
 * submits. The person can go Back, Pause, Resume and Exit at any step.
 *
 * State ({ id, step, paused }) lives in sessionStorage, so a walkthrough survives the page
 * changes it asks for and a reload.
 *
 * Children are a render function: ({ start, setAllowed, active }) => node.
 */
const KEY = "sms.assistant.guide";
const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};
const save = (value) => {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: the walkthrough still runs until the page reloads
  }
};

const onPath = (path, base) => path === base || path.startsWith(`${base}/`);

export default function GuideRunner({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const roles = useMemo(() => user?.roles || [], [user?.roles]);
  const prefs = useSyncExternalStore(subscribeAssistantPrefs, getAssistantPrefs);
  const lang = prefs.language === "ne" ? "ne" : "en";
  const t = stringsFor(lang).guide;

  const [allowed, setAllowedState] = useState(null); // null until the widget's bootstrap arrives
  const [run, setRunState] = useState(load);
  const drv = useRef(null);
  const quiet = useRef(false);

  const setRun = useCallback((value) => {
    setRunState(value);
    save(value);
  }, []);

  // The walkthroughs the server offered this user. A saved one that is not among them
  // (another role signed in, or it was withdrawn) is dropped.
  const setAllowed = useCallback(
    (guides) => {
      const ids = new Set((guides || []).map((g) => g.id));
      setAllowedState(ids);
      const saved = load();
      if (saved && !ids.has(saved.id)) setRun(null);
    },
    [setRun]
  );

  const guide = run && allowed?.has(run.id) ? GUIDES[run.id] : null;

  const stopDriver = useCallback(() => {
    if (!drv.current) return;
    quiet.current = true;
    drv.current.destroy();
    drv.current = null;
    quiet.current = false;
  }, []);

  const exit = useCallback(() => {
    stopDriver();
    setRun(null);
  }, [setRun, stopDriver]);

  const start = useCallback(
    (id) => {
      if (!GUIDES[id] || !allowed?.has(id)) return false;
      setRun({ id, step: 0, paused: false });
      return true;
    },
    [allowed, setRun]
  );

  useEffect(() => () => stopDriver(), [stopDriver]);

  useEffect(() => {
    if (!guide || !run || run.paused) {
      stopDriver();
      return undefined;
    }
    const total = guide.steps.length;
    const index = Math.min(run.step, total - 1);
    const step = guide.steps[index];
    const last = index === total - 1;
    const text = (o) => (o ? o[lang] || o.en : "");
    const path = location.pathname;
    const go = (i) => setRun({ ...run, step: i, paused: false });
    const next = () => (last ? exit() : go(index + 1));
    let cancelled = false;
    let timer = null;

    const show = (element, { title, body, nextLabel, onNext }) => {
      if (cancelled) return;
      if (!drv.current) {
        drv.current = driver({
          animate: true,
          smoothScroll: true,
          allowClose: true,
          overlayClickBehavior: "none",
          stagePadding: 6,
          stageRadius: 10,
          popoverClass: "sms-guide",
          // Esc or the × button: leave the walkthrough.
          onDestroyStarted: () => {
            if (!quiet.current) {
              const d = drv.current;
              drv.current = null;
              d?.destroy();
              setRun(null);
            }
          },
        });
      }
      drv.current.highlight({
        element: element || undefined,
        popover: {
          title,
          description: body,
          showButtons: ["next", "previous", "close"],
          disableButtons: index === 0 ? ["previous"] : [],
          nextBtnText: nextLabel || (last ? t.done : t.next),
          prevBtnText: t.back,
          onNextClick: () => (onNext ? onNext() : next()),
          onPrevClick: () => index > 0 && go(index - 1),
          onCloseClick: () => exit(),
          onPopoverRender: (popover) => {
            popover.progress.textContent = `${guide.title[lang] || guide.title.en} · ${t.progress(index + 1, total)}`;
            popover.progress.style.display = "block";
            const pause = document.createElement("button");
            pause.type = "button";
            pause.textContent = t.pause;
            pause.className = "sms-guide-pause";
            pause.addEventListener("click", () => setRun({ ...run, step: index, paused: true }));
            popover.footerButtons.prepend(pause);
          },
        },
      });
    };

    const navPath = step.target?.startsWith("nav:/") ? resolvePath(step.target.slice(4), roles) : null;
    const route = resolvePath(step.route, roles);

    if (navPath) {
      // Already there (the person clicked the link): on to the next step.
      if (onPath(path, navPath) && !last) {
        timer = setTimeout(() => go(index + 1), 0);
        return () => clearTimeout(timer);
      }
      const page = titleForPath(navPath).title;
      const goThere = () => navigate(navPath);
      let showingMenu = false;
      const tryShow = () => {
        if (cancelled) return;
        const link = findTarget(`nav:${navPath}`);
        if (link) {
          show(link, { title: text(step.title), body: text(step.body), nextLabel: t.goTo(page), onNext: goThere });
          return;
        }
        // Phone: the menu is closed. Point at the menu button once, then wait for the link to appear.
        if (!showingMenu) {
          showingMenu = true;
          show(findTarget("nav:menu"), { title: text(step.title), body: `${text(step.body)} ${t.menuNote}`, nextLabel: t.goTo(page), onNext: goThere });
        }
        timer = setTimeout(tryShow, 400);
      };
      tryShow();
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    if (route && path !== route) {
      const page = titleForPath(route).title;
      show(null, { title: t.goTitle, body: t.goBody(page), nextLabel: t.goTo(page), onNext: () => navigate(route) });
      return undefined;
    }

    if (!step.target) {
      show(null, { title: text(step.title), body: text(step.body) });
      return undefined;
    }

    // Wait up to 3 s for the control (pages load their data first), then explain.
    const begun = Date.now();
    const wait = () => {
      if (cancelled) return;
      const el = findTarget(step.target);
      if (el) show(el, { title: text(step.title), body: text(step.body) });
      else if (Date.now() - begun > 3000) show(null, { title: text(step.title), body: text(step.missing) || t.notFound });
      else timer = setTimeout(wait, 150);
    };
    wait();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [guide, run, location.pathname, lang, roles, navigate, setRun, exit, stopDriver, t]);

  const paused = guide && run?.paused;

  return (
    <>
      {children({ start, setAllowed, active: !!guide && !run?.paused })}
      {paused && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pr-1.5 pl-4 text-sm shadow-lg print:hidden"
          data-testid="guide-paused"
        >
          <span className="truncate text-slate-700">
            {t.paused}: <span className="font-medium">{guide.title[lang] || guide.title.en}</span>
          </span>
          <button type="button" onClick={() => setRun({ ...run, paused: false })} className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700">
            <Play size={12} aria-hidden="true" /> {t.resume}
          </button>
          <button type="button" onClick={exit} aria-label={t.exit} title={t.exit} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
