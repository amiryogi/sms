import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Tabs, buttonClasses } from "../../components/ui";
import { cn } from "../../lib/cn";
import PageHero from "../../components/public/PageHero";
import BrowserFrame from "../../components/public/BrowserFrame";
import ShotStage from "../../components/public/ShotStage";
import { Reveal } from "../../components/public/Reveal";
import usePageTitle from "../../components/public/usePageTitle";
import { ROLES, SCREENSHOTS } from "./content";

/** What each role gets. The chosen role lives in ?role= so a link can open one directly. */
const Portals = () => {
  usePageTitle("Portals");
  const [params, setParams] = useSearchParams();
  const role = ROLES.find((r) => r.id === params.get("role")) || ROLES[0];
  const shot = SCREENSHOTS[role.shot];

  const choose = (id) => setParams(id === ROLES[0].id ? {} : { role: id }, { replace: true, preventScrollReset: true });

  return (
    <>
      <PageHero
        eyebrow="Portals"
        title="A portal for every person in your school"
        intro="Administrators, teachers, exam officers, accountants, students and parents each get their own view, with only the data their role allows."
      />

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <Reveal className="flex justify-center">
          <Tabs
            tabs={ROLES.map((r) => ({ value: r.id, label: r.title, icon: r.icon }))}
            value={role.id}
            onChange={choose}
            className="bg-slate-100/80"
          />
        </Reveal>

        <div className="mt-12" role="tabpanel" aria-label={role.title}>
          <AnimatePresence mode="wait" initial={false}>
            <Motion.div
              key={role.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr]"
            >
              <div>
                <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
                  <role.icon size={26} aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{role.title}</h2>
                <p className="mt-2 text-lg text-slate-600">{role.summary}</p>
                <ul className="mt-6 space-y-3">
                  {role.can.map((item, i) => (
                    <Motion.li
                      key={item}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="flex gap-3 text-slate-700"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={13} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {item}
                    </Motion.li>
                  ))}
                </ul>
              </div>
              <div>
                <ShotStage>
                  <BrowserFrame shot={shot} dark />
                  <p className="mt-4 text-sm text-blue-100/80">
                    <span className="font-semibold text-white">{shot.title}.</span> {shot.caption}
                  </p>
                </ShotStage>
              </div>
            </Motion.div>
          </AnimatePresence>
        </div>

        <Reveal className="mt-20 rounded-2xl bg-slate-50 p-8 text-center ring-1 ring-slate-200 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Already have an account?</h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Sign in with the username your school gave you. Students use their admission number; parents use p. followed by their child's.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/login" className={cn(buttonClasses({ size: "lg" }), "no-underline")}>
              Sign in
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/contact" className={cn(buttonClasses({ variant: "secondary", size: "lg" }), "no-underline")}>
              Ask about your school
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
};

export default Portals;
