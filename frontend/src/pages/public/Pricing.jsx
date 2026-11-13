import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Gift, Minus, Sparkles, Users } from "lucide-react";
import { Tabs, buttonClasses } from "../../components/ui";
import { cn } from "../../lib/cn";
import PageHero from "../../components/public/PageHero";
import SectionHeading from "../../components/public/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../../components/public/Reveal";
import usePageTitle from "../../components/public/usePageTitle";
import { PRICING, npr } from "./content";

const BILLING = [
  { value: "yearly", label: "Pay yearly" },
  { value: "monthly", label: `Pay monthly (${PRICING.monthlyPayments}×)` },
];

// Opens the enquiry form with the choice already written in the message.
const contactFor = (label) => `/contact?plan=${encodeURIComponent(label)}#enquiry`;

/** One plan card. The popular plan sits on the same dark blue gradient as the screenshots. */
const PlanCard = ({ plan, billing }) => {
  const dark = Boolean(plan.popular);
  const monthly = Math.round(plan.yearly / PRICING.monthlyPayments);
  const amount = billing === "yearly" ? plan.yearly : monthly;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl p-7",
        dark
          ? "bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white shadow-xl shadow-blue-950/30 ring-1 ring-blue-900 lg:-my-4 lg:py-11"
          : "bg-white shadow-card ring-1 ring-slate-200",
      )}
    >
      {dark && (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-sky-400 px-3 py-1 text-xs font-semibold text-slate-950 shadow">
          <Sparkles size={13} aria-hidden="true" />
          Most popular
        </span>
      )}
      <h3 className={cn("text-lg font-semibold", dark ? "text-white" : "text-slate-900")}>{plan.name}</h3>
      <p className={cn("mt-1 inline-flex items-center gap-1.5 text-sm", dark ? "text-sky-200" : "text-brand-700")}>
        <Users size={15} aria-hidden="true" />
        {plan.students}
      </p>
      <p className={cn("mt-3 min-h-10 text-sm", dark ? "text-blue-100/80" : "text-slate-600")}>{plan.blurb}</p>

      <div className="mt-6 min-h-20" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <Motion.div
            key={billing}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <p className="flex items-baseline gap-1.5">
              <span className={cn("text-4xl font-extrabold tracking-tight", dark ? "text-white" : "text-slate-900")} data-testid={`price-${plan.id}`}>
                {npr(amount)}
              </span>
              <span className={cn("text-sm", dark ? "text-blue-100/70" : "text-slate-500")}>/{billing === "yearly" ? "year" : "month"}</span>
            </p>
            <p className={cn("mt-1 text-sm", dark ? "text-blue-100/70" : "text-slate-500")}>
              {billing === "yearly"
                ? `or ${npr(monthly)} a month, ${PRICING.monthlyPayments} payments`
                : `${PRICING.monthlyPayments} payments a year · ${npr(plan.yearly)} in total`}
            </p>
          </Motion.div>
        </AnimatePresence>
      </div>

      <ul className={cn("mt-6 flex-1 space-y-2.5 text-sm", dark ? "text-blue-50" : "text-slate-700")}>
        {["Every feature included", "Free setup", "Unlimited logins", "Help by phone or WhatsApp"].map((item) => (
          <li key={item} className="flex gap-2.5">
            <Check size={17} className={cn("mt-0.5 shrink-0", dark ? "text-sky-300" : "text-emerald-600")} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      <Link
        to={contactFor(plan.name)}
        className={cn(
          buttonClasses({ size: "lg" }),
          "mt-8 w-full no-underline",
          dark ? "bg-white text-blue-950 hover:bg-sky-50" : "",
        )}
      >
        Choose {plan.name}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
};

const OptionCard = ({ option }) => (
  <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200">
    <h3 className="text-lg font-semibold text-slate-900">{option.title}</h3>
    <p className="mt-3 flex items-baseline gap-1.5">
      <span className="text-3xl font-extrabold tracking-tight text-slate-900">{option.price}</span>
      <span className="text-sm text-slate-500">{option.unit}</span>
    </p>
    <p className="mt-2 text-sm text-slate-600">{option.note}</p>
    {option.modules ? (
      <ul className="mt-5 flex-1 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
        {option.modules.map((m) => (
          <li key={m.name} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm">
            <span className="text-slate-700">{m.name}</span>
            <span className="shrink-0 font-semibold text-slate-900">{npr(m.price)}</span>
          </li>
        ))}
      </ul>
    ) : (
      <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
        {option.points.map((p) => (
          <li key={p} className="flex gap-2.5">
            <Check size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    )}
    <Link to={contactFor(option.title)} className={cn(buttonClasses({ variant: "secondary", size: "md" }), "mt-6 no-underline")}>
      Ask about this
    </Link>
  </div>
);

const Pricing = () => {
  usePageTitle("Pricing");
  const [billing, setBilling] = useState("yearly");

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple prices for every school"
        intro={`Pay once a year, or in ${PRICING.monthlyPayments} monthly payments through the academic year. Setup is free.`}
      >
        <div className="mt-8 flex justify-center">
          <Tabs tabs={BILLING} value={billing} onChange={setBilling} className="bg-white shadow-sm ring-1 ring-slate-200" />
        </div>
      </PageHero>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <Stagger className="grid items-stretch gap-6 md:grid-cols-3 md:gap-5 lg:gap-8">
          {PRICING.plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <PlanCard plan={plan} billing={billing} />
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-8 text-center text-sm text-slate-500">
          Setup is free. Importing your existing data from Excel or old software is {npr(PRICING.setup.dataImport)}, once.
        </Reveal>
      </section>

      {/* Offers */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <Stagger className="grid gap-5 md:grid-cols-2">
          {PRICING.offers.map((offer) => (
            <StaggerItem
              key={offer.title}
              className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-pop"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Gift size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{offer.title}</h3>
                <p className="mt-1 text-white/85">{offer.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Included in every plan */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="No surprises" title="Every plan includes" />
          <Stagger as="ul" className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
            {PRICING.included.map((item) => (
              <StaggerItem as="li" key={item} className="flex gap-3 rounded-xl bg-white p-4 text-slate-700 ring-1 ring-slate-200">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Other ways to pay */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Other ways to pay"
          title="Choose what suits your school"
          intro="Prefer to pay per student, start with a few modules, or buy it once? These work too."
        />
        <Stagger className="mt-12 grid gap-6 lg:grid-cols-3">
          {PRICING.options.map((option) => (
            <StaggerItem key={option.id}>
              <OptionCard option={option} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Extras and not yet included */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:px-8">
        <Reveal className="rounded-2xl p-6 ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Extras, priced per job</h2>
          <p className="mt-1 text-sm text-slate-500">Quoted before we start, so you always know the cost.</p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
            {PRICING.extras.map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check size={17} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="rounded-2xl p-6 ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Not included yet</h2>
          <p className="mt-1 text-sm text-slate-500">Not part of the system today. Ask us if you need one.</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {PRICING.notYet.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                <Minus size={13} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* FAQ + CTA */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Questions about price?</h2>
            <p className="mt-3 text-slate-600">Tell us how many students you have and we'll suggest the cheapest way for your school.</p>
            <Link to="/contact" className={cn(buttonClasses({ size: "lg" }), "mt-6 no-underline")}>
              Talk to us
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="divide-y divide-slate-200 border-y border-slate-200">
            {PRICING.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default Pricing;
