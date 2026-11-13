import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Dialog, IconButton, Tabs } from "../../components/ui";
import PageHero from "../../components/public/PageHero";
import ShotStage from "../../components/public/ShotStage";
import { Reveal } from "../../components/public/Reveal";
import usePageTitle from "../../components/public/usePageTitle";
import { SHOT_AREAS, TOUR } from "./content";

/** Larger view of one screenshot, with previous / next buttons and arrow keys. */
const Lightbox = ({ shots, index, onIndex, onClose }) => {
  const open = index !== null;
  const shot = open ? shots[index] : null;
  const step = (delta) => onIndex((i) => (i + delta + shots.length) % shots.length);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowRight") onIndex((i) => (i + 1) % shots.length);
      if (e.key === "ArrowLeft") onIndex((i) => (i - 1 + shots.length) % shots.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shots.length, onIndex]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="full"
      title={shot?.title}
      description={shot ? `${index + 1} of ${shots.length} · ${shot.area}` : undefined}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="hidden text-sm text-slate-600 sm:block">{shot?.caption}</p>
          <div className="ml-auto flex gap-2">
            <IconButton icon={ChevronLeft} label="Previous screenshot" variant="secondary" onClick={() => step(-1)} />
            <IconButton icon={ChevronRight} label="Next screenshot" variant="secondary" onClick={() => step(1)} />
          </div>
        </div>
      }
    >
      {shot && (
        <AnimatePresence mode="wait" initial={false}>
          <Motion.img
            key={shot.name}
            src={shot.src}
            width={shot.width}
            height={shot.height}
            alt={shot.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="block h-auto w-full rounded-lg ring-1 ring-slate-200"
          />
        </AnimatePresence>
      )}
      <p className="mt-3 text-sm text-slate-600 sm:hidden">{shot?.caption}</p>
    </Dialog>
  );
};

const Tour = () => {
  usePageTitle("Tour");
  const [area, setArea] = useState("All");
  const [index, setIndex] = useState(null);
  // Stable, so the Dialog does not re-run its focus handling on every step.
  const close = useCallback(() => setIndex(null), []);
  const shots = area === "All" ? TOUR : TOUR.filter((s) => s.area === area);

  return (
    <>
      <PageHero
        eyebrow="Product tour"
        title="Every screen, as it really is"
        intro="Screenshots of the running system on demo data. Click any of them for a closer look."
      />

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal className="flex justify-center">
          <Tabs
            tabs={SHOT_AREAS.map((a) => ({ value: a, label: a, count: a === "All" ? TOUR.length : TOUR.filter((s) => s.area === a).length }))}
            value={area}
            onChange={(a) => {
              setArea(a);
              setIndex(null);
            }}
          />
        </Reveal>

        <Motion.ul layout className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {shots.map((shot, i) => (
              <Motion.li
                key={shot.name}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className="group block w-full cursor-pointer text-left focus-visible:outline-none"
                  aria-label={`Open ${shot.title}`}
                >
                  <ShotStage
                    as="span"
                    compact
                    className="shadow-card transition-shadow group-hover:shadow-xl group-hover:shadow-blue-950/30 group-focus-visible:ring-2 group-focus-visible:ring-sky-400"
                  >
                    <img
                      src={shot.src}
                      width={shot.width}
                      height={shot.height}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="block h-auto w-full rounded-lg shadow-lg shadow-black/40 ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/0 transition-colors group-hover:bg-slate-900/25">
                      <span className="flex size-11 scale-75 items-center justify-center rounded-full bg-white text-slate-900 opacity-0 shadow-pop transition-all group-hover:scale-100 group-hover:opacity-100">
                        <Maximize2 size={18} aria-hidden="true" />
                      </span>
                    </span>
                  </ShotStage>
                  <span className="mt-3 block text-xs font-semibold tracking-wide text-brand-600 uppercase">{shot.area}</span>
                  <span className="mt-1 block font-semibold text-slate-900">{shot.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">{shot.caption}</span>
                </button>
              </Motion.li>
            ))}
          </AnimatePresence>
        </Motion.ul>
      </section>

      <Lightbox shots={shots} index={index} onIndex={setIndex} onClose={close} />
    </>
  );
};

export default Tour;
