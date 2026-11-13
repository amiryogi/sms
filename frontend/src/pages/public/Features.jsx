import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { buttonClasses } from "../../components/ui";
import { cn } from "../../lib/cn";
import PageHero from "../../components/public/PageHero";
import ShotSwitcher from "../../components/public/ShotSwitcher";
import { Reveal, Stagger, StaggerItem } from "../../components/public/Reveal";
import usePageTitle from "../../components/public/usePageTitle";
import { FEATURES, ROLES, SCREENSHOTS } from "./content";

/** Shown beside the security section, which has no single screen to picture. */
const SecurityPanel = () => (
  <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-xl shadow-blue-950/25 sm:p-8">
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
        <ShieldCheck size={22} aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold">Role-based access</p>
        <p className="text-sm text-white/60">Every request is checked on the server</p>
      </div>
    </div>
    <Stagger as="ul" className="mt-6 grid gap-3 sm:grid-cols-2">
      {[{ id: "super", title: "Super admin", icon: Lock }, ...ROLES].map((r) => (
        <StaggerItem as="li" key={r.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <r.icon size={18} className="text-sky-300" aria-hidden="true" />
          <span className="text-sm font-medium">{r.title}</span>
        </StaggerItem>
      ))}
    </Stagger>
    <p className="mt-6 text-sm text-white/60">Teachers see only their own classes, parents only their own children, and one school never sees another's data.</p>
  </div>
);

const FeatureSection = ({ feature, index }) => {
  const shots = feature.shots.map((key) => SCREENSHOTS[key]);
  const flipped = index % 2 === 1;
  return (
    <section id={feature.id} className={cn("scroll-mt-28 py-16 sm:py-20", flipped && "bg-slate-50")} aria-labelledby={`${feature.id}-title`}>
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:gap-16 lg:px-8">
        <Reveal className={cn("lg:sticky lg:top-28", flipped && "lg:order-2")}>
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <feature.icon size={24} aria-hidden="true" />
          </span>
          <h2 id={`${feature.id}-title`} className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
            {feature.title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-slate-600">{feature.summary}</p>
          <ul className="mt-6 space-y-3">
            {feature.points.map((p) => (
              <li key={p} className="flex gap-3 text-slate-700">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className={cn(flipped && "lg:order-1")}>
          {shots.length ? <ShotSwitcher shots={shots} label={feature.title} /> : <SecurityPanel />}
        </Reveal>
      </div>
    </section>
  );
};

const Features = () => {
  usePageTitle("Features");
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Built for the whole school year"
        intro="Eight areas that work together: what a teacher records in the morning is on the parent's phone that afternoon, and on the report card at the end of term."
      >
        <nav aria-label="Features on this page" className="mt-8 flex flex-wrap justify-center gap-2">
          {FEATURES.map((f) => (
            <Link
              key={f.id}
              to={`#${f.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm ring-1 ring-slate-200 transition-colors hover:text-brand-700 hover:ring-brand-300"
            >
              <f.icon size={14} className="text-brand-600" aria-hidden="true" />
              {f.title}
            </Link>
          ))}
        </nav>
      </PageHero>

      {FEATURES.map((f, i) => (
        <FeatureSection key={f.id} feature={f} index={i} />
      ))}

      <section className="px-4 py-20 text-center sm:px-6">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Questions about a feature?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">Ask us how it would work at your school, or see every screen in the tour.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className={cn(buttonClasses({ size: "lg" }), "no-underline")}>
              Contact us
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/tour" className={cn(buttonClasses({ variant: "secondary", size: "lg" }), "no-underline")}>
              Take the tour
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
};

export default Features;
