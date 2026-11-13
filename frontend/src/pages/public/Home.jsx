import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  MessageCircle,
  Phone,
  PlayCircle,
  Receipt,
  Sparkles,
} from "lucide-react";
import { buttonClasses } from "../../components/ui";
import { cn } from "../../lib/cn";
import BrowserFrame from "../../components/public/BrowserFrame";
import PhoneFrame from "../../components/public/PhoneFrame";
import ShotStage from "../../components/public/ShotStage";
import SectionHeading from "../../components/public/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../../components/public/Reveal";
import usePageTitle from "../../components/public/usePageTitle";
import { CONTACT, FACTS, HOME_FEATURES, MOBILE_SHOT, NEPAL_POINTS, ROLES, SCREENSHOTS } from "./content";

const EASE = [0.16, 1, 0.3, 1];

/** Faint square grid behind the hero, fading out towards the edges. */
const GridBackdrop = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(15_23_42/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
  />
);

/** Small card that floats beside the hero screenshot. */
const FloatingChip = ({ icon, tone, title, value, className, delay = 0 }) => {
  const Icon = icon;
  return (
    <Motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
      transition={{
        opacity: { duration: 0.5, delay: 0.6 + delay },
        scale: { duration: 0.5, delay: 0.6 + delay },
        y: { duration: 5, delay: 1 + delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={cn("absolute flex items-center gap-3 rounded-xl bg-white/95 px-3.5 py-2.5 shadow-pop ring-1 ring-slate-900/5 backdrop-blur", className)}
    >
      <span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-xs text-slate-500">{title}</span>
        <span className="block text-sm font-semibold text-slate-900">{value}</span>
      </span>
    </Motion.div>
  );
};

const Hero = () => (
  <section className="relative -mt-16 overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pt-16">
    <GridBackdrop />
    <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />

    <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:px-8 lg:pt-20 lg:pb-28">
      <div>
        <Motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-700 shadow-sm ring-1 ring-brand-200"
        >
          <Sparkles size={14} aria-hidden="true" />
          <span lang="ne">विद्यालय</span>
          <span className="text-brand-300" aria-hidden="true">·</span>
          KG to Grade 10
        </Motion.p>

        <Motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl xl:text-6xl"
        >
          Run your whole school from{" "}
          <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-sky-500 bg-clip-text text-transparent">one place</span>
        </Motion.h1>

        <Motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-600"
        >
          Vidyalaya SMS brings attendance, exams, NEB report cards, fees and parent access together, built around the
          Bikram Sambat calendar and the way Nepali schools already work.
        </Motion.p>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link to="/tour" className={cn(buttonClasses({ size: "lg" }), "group no-underline shadow-lg shadow-brand-600/20")}>
            <PlayCircle size={18} aria-hidden="true" />
            Take the tour
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link to="/contact" className={cn(buttonClasses({ variant: "secondary", size: "lg" }), "no-underline")}>
            <Phone size={17} aria-hidden="true" />
            Talk to us
          </Link>
        </Motion.div>

        <Motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600"
        >
          {["Nothing to install", "Works on phones", "Prints on A4"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <Check size={16} className="text-emerald-600" aria-hidden="true" />
              {t}
            </li>
          ))}
        </Motion.ul>
      </div>

      <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
        <Motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          style={{ transformPerspective: 1200 }}
        >
          <Motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>
            <BrowserFrame shot={SCREENSHOTS.adminDashboard} priority />
          </Motion.div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
          className="absolute -right-2 -bottom-14 hidden w-36 sm:block lg:-right-6 xl:w-44"
        >
          <Motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}>
            <PhoneFrame shot={MOBILE_SHOT} />
          </Motion.div>
        </Motion.div>

        <FloatingChip
          icon={CalendarCheck}
          tone="bg-emerald-50 text-emerald-600"
          title="Attendance this year"
          value="92.7%"
          className="-top-5 left-4 hidden sm:flex lg:-left-8"
        />
        <FloatingChip
          icon={BadgeCheck}
          tone="bg-brand-50 text-brand-600"
          title="Report card published"
          value="GPA 3.26 · B+"
          className="bottom-16 -left-4 hidden sm:flex lg:-left-12"
          delay={0.25}
        />
        <FloatingChip
          icon={Receipt}
          tone="bg-amber-50 text-amber-600"
          title="Receipt"
          value="RCP-2083-84-00039"
          className="-bottom-8 left-1/3 hidden md:flex"
          delay={0.5}
        />
      </div>
    </div>
  </section>
);

const Facts = () => (
  <section aria-label="At a glance" className="border-y border-slate-200/80 bg-slate-50/60">
    <Stagger as="dl" className="mx-auto grid max-w-7xl grid-cols-2 divide-slate-200/80 px-4 sm:px-6 md:grid-cols-4 md:divide-x lg:px-8">
      {FACTS.map((f) => (
        <StaggerItem key={f.label} className="flex flex-col-reverse items-center gap-1 px-4 py-7 text-center">
          <dt className="text-sm text-slate-500">{f.label}</dt>
          <dd className="text-3xl font-extrabold tracking-tight text-brand-700">{f.value}</dd>
        </StaggerItem>
      ))}
    </Stagger>
  </section>
);

const FeatureGrid = () => (
  <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <SectionHeading
      eyebrow="Features"
      title="Everything a school year needs"
      intro="From the first day's register to the last report card and every fee receipt in between."
    />
    <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {HOME_FEATURES.map((f) => (
        <StaggerItem key={f.id}>
          <Motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="h-full">
            <Link
              to={`/features#${f.id}`}
              className="group flex h-full flex-col rounded-card bg-white p-6 no-underline shadow-card ring-1 ring-slate-200 transition-shadow hover:shadow-pop hover:ring-brand-200"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <f.icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{f.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                Learn more
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </Motion.div>
        </StaggerItem>
      ))}
    </Stagger>
  </section>
);

const SHOWCASE = [
  { label: "Admin", shot: SCREENSHOTS.adminDashboard },
  { label: "Marks entry", shot: SCREENSHOTS.marks },
  { label: "Report card", shot: SCREENSHOTS.reportCard },
  { label: "Finance", shot: SCREENSHOTS.financeDashboard },
  { label: "Student", shot: SCREENSHOTS.studentDashboard },
  { label: "Parent", shot: SCREENSHOTS.parentFees },
];

/**
 * Tabs of real screenshots. They advance on their own (each tab's progress bar is a CSS
 * animation whose end moves to the next tab), pause while hovered or focused, and stop
 * for visitors who prefer reduced motion (the bar is hidden, so it never ends).
 */
const Showcase = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = SHOWCASE[active];

  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="See it in action"
          title="Real screens, not mock-ups"
          intro="Every picture on this site is a screenshot of the system running on demo data."
        />

        <Reveal
          className="mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div role="tablist" aria-label="Screens" className="mx-auto flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-slate-200 sm:w-fit">
            {SHOWCASE.map((item, i) => {
              const selected = i === active;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="tab"
                  id={`showcase-tab-${i}`}
                  aria-selected={selected}
                  aria-controls="showcase-panel"
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative shrink-0 cursor-pointer overflow-hidden rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    selected ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.label}
                  {selected && (
                    <span
                      key={active}
                      aria-hidden="true"
                      onAnimationEnd={() => setActive((a) => (a + 1) % SHOWCASE.length)}
                      className={cn(
                        "absolute inset-x-0 bottom-0 h-0.5 origin-left animate-progress bg-white/70 motion-reduce:hidden",
                        paused && "[animation-play-state:paused]",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div id="showcase-panel" role="tabpanel" aria-labelledby={`showcase-tab-${active}`} className="relative mx-auto mt-8 max-w-5xl">
            <AnimatePresence mode="wait" initial={false}>
              <Motion.div
                key={current.label}
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <ShotStage>
                  <BrowserFrame shot={current.shot} dark />
                  <p className="mt-5 text-center text-sm text-blue-100/80">
                    <span className="font-semibold text-white">{current.shot.title}.</span> {current.shot.caption}
                  </p>
                </ShotStage>
              </Motion.div>
            </AnimatePresence>
          </div>
        </Reveal>

        <div className="mt-10 text-center">
          <Link to="/tour" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 no-underline">
            See all {Object.keys(SCREENSHOTS).length} screens
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

const BuiltForNepal = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 py-20 text-white sm:py-28">
    <div aria-hidden="true" className="pointer-events-none absolute -right-40 -bottom-40 size-[36rem] rounded-full bg-sky-500/20 blur-3xl" />
    <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <Reveal>
          <p className="text-sm font-semibold tracking-wide text-sky-300 uppercase">Built for Nepal</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">Made for how Nepali schools actually work</h2>
          <p className="mt-4 max-w-xl text-lg text-blue-100/80">Not a foreign system with a currency swapped in. The calendar, the grading and the books follow Nepal.</p>
        </Reveal>
        <Stagger as="dl" className="mt-10 grid gap-6 sm:grid-cols-2">
          {NEPAL_POINTS.map((p, i) => (
            <StaggerItem key={p.title} className="rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
              <dt className="flex items-center gap-2.5 font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-400/20 text-xs font-bold text-sky-200">{i + 1}</span>
                {p.title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-blue-100/75">{p.text}</dd>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
      <Reveal delay={0.15}>
        <BrowserFrame shot={SCREENSHOTS.studentAttendance} dark />
        <p className="mt-4 text-center text-sm text-blue-100/70">{SCREENSHOTS.studentAttendance.caption}</p>
      </Reveal>
    </div>
  </section>
);

const RolesStrip = () => (
  <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <SectionHeading
      eyebrow="Portals"
      title="One system, a portal for everyone"
      intro="Each person signs in and sees only what their role allows — checked on the server, not just hidden in the browser."
    />
    <Stagger className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {ROLES.map((r) => (
        <StaggerItem key={r.id}>
          <Link
            to={`/portals?role=${r.id}`}
            className="group flex h-full flex-col items-center rounded-card bg-white p-5 text-center no-underline ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-pop hover:ring-brand-200"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition-transform group-hover:scale-110">
              <r.icon size={22} aria-hidden="true" />
            </span>
            <span className="mt-3 font-semibold text-slate-900">{r.title}</span>
            <span className="mt-1 text-xs leading-snug text-slate-500">{r.summary}</span>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  </section>
);

const ContactBand = () => (
  <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
    <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center text-white shadow-pop sm:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full bg-sky-400/20 blur-2xl" />
      <h2 className="relative text-3xl font-bold tracking-tight text-balance sm:text-4xl">Want to see it with your school's data?</h2>
      <p className="relative mx-auto mt-4 max-w-2xl text-lg text-white/80">
        Call, message on WhatsApp or Viber, or send an email. We'll walk you through it and answer your questions.
      </p>
      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href={CONTACT.tel} className={cn(buttonClasses({ size: "lg" }), "bg-white text-brand-700 no-underline hover:bg-brand-50")}>
          <Phone size={17} aria-hidden="true" />
          {CONTACT.phoneDisplay}
        </a>
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonClasses({ size: "lg" }), "bg-white/10 text-white ring-1 ring-white/30 no-underline hover:bg-white/20")}
        >
          <MessageCircle size={17} aria-hidden="true" />
          WhatsApp
        </a>
        <Link to="/contact" className={cn(buttonClasses({ size: "lg" }), "bg-white/10 text-white ring-1 ring-white/30 no-underline hover:bg-white/20")}>
          All contact options
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </Reveal>
  </section>
);

const Home = () => {
  usePageTitle(null);
  return (
    <>
      <Hero />
      <Facts />
      <FeatureGrid />
      <Showcase />
      <BuiltForNepal />
      <RolesStrip />
      <ContactBand />
    </>
  );
};

export default Home;
