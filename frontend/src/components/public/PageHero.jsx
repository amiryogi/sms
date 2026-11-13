import React from "react";
import { motion as Motion } from "framer-motion";

/** Header band at the top of each inner public page (Features, Portals, Tour, Contact). */
const PageHero = ({ eyebrow, title, intro, children }) => (
  <section className="relative -mt-16 overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white pt-16">
    <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
    <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-20">
      <Motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-sm font-semibold tracking-wide text-brand-600 uppercase"
      >
        {eyebrow}
      </Motion.p>
      <Motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl"
      >
        {title}
      </Motion.h1>
      {intro && (
        <Motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-slate-600"
        >
          {intro}
        </Motion.p>
      )}
      {children}
    </div>
  </section>
);

export default PageHero;
