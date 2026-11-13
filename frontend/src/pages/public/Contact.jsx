import React from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { ChevronDown, Mail, MessageCircle, Phone, PhoneCall, Send } from "lucide-react";
import { Button, Field, TextArea, TextInput } from "../../components/ui";
import PageHero from "../../components/public/PageHero";
import { Reveal, Stagger, StaggerItem } from "../../components/public/Reveal";
import usePageTitle from "../../components/public/usePageTitle";
import { CONTACT, FAQ, PRICING, mailtoLink, whatsappLink } from "./content";

// Names a pricing button may pass as ?plan= (anything else is ignored).
const PLAN_NAMES = [...PRICING.plans.map((p) => p.name), ...PRICING.options.map((o) => o.title)];

/** Opening message when the visitor came from a "Choose …" button on the pricing page. */
const planMessage = (plan) =>
  PLAN_NAMES.includes(plan) ? `I'm interested in the "${plan}" option. Our school has about ___ students.` : "";

const CHANNELS = [
  {
    icon: Phone,
    title: "Call",
    value: CONTACT.phoneDisplay,
    note: "Talk to us directly",
    href: CONTACT.tel,
    action: "Call now",
    tone: "bg-brand-50 text-brand-600 ring-brand-100",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    value: CONTACT.phoneDisplay,
    note: "Message any time",
    href: CONTACT.whatsapp,
    external: true,
    action: "Open WhatsApp",
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  {
    icon: PhoneCall,
    title: "Viber",
    value: CONTACT.phoneDisplay,
    note: "Chat or call on Viber",
    href: CONTACT.viber,
    action: "Open Viber",
    tone: "bg-violet-50 text-violet-600 ring-violet-100",
  },
  {
    icon: Mail,
    title: "Email",
    value: CONTACT.email,
    note: "For details, documents and pricing",
    href: CONTACT.mailto,
    action: "Write an email",
    tone: "bg-sky-50 text-sky-600 ring-sky-100",
  },
];

const enquiryText = ({ name, school, phone, message }) => {
  const details = [`Name: ${name}`, school && `School: ${school}`, phone && `Phone: ${phone}`].filter(Boolean);
  return ["Hello, I'd like to know more about Vidyalaya SMS.", "", ...details, "", message].join("\n");
};

/**
 * Enquiry form. There is no mail service on the server, so it opens the visitor's own
 * email app or WhatsApp with the message filled in; nothing is sent from this page.
 */
const EnquiryForm = ({ plan }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { name: "", school: "", phone: "", message: planMessage(plan) } });

  const byEmail = handleSubmit((values) => {
    window.location.assign(mailtoLink(`Enquiry about Vidyalaya SMS${values.school ? ` — ${values.school}` : ""}`, enquiryText(values)));
  });
  const byWhatsapp = handleSubmit((values) => {
    window.open(whatsappLink(enquiryText(values)), "_blank", "noopener,noreferrer");
  });

  return (
    <form onSubmit={byEmail} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" required error={errors.name?.message}>
          <TextInput id="c-name" autoComplete="name" invalid={Boolean(errors.name)} {...register("name", { required: "Tell us your name" })} />
        </Field>
        <Field label="School" htmlFor="c-school">
          <TextInput id="c-school" autoComplete="organization" placeholder="e.g. Shree Janata Secondary School" {...register("school")} />
        </Field>
      </div>
      <Field label="Phone" htmlFor="c-phone" hint="Optional, if you'd like a call back">
        <TextInput id="c-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="98XXXXXXXX" {...register("phone")} />
      </Field>
      <Field label="Message" htmlFor="c-message" required error={errors.message?.message}>
        <TextArea
          id="c-message"
          rows={5}
          invalid={Boolean(errors.message)}
          placeholder="How many students do you have, and what would you like to see?"
          {...register("message", { required: "Write a short message" })}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" icon={Send} className="flex-1">
          Send by email
        </Button>
        <Button type="button" size="lg" variant="success" icon={MessageCircle} onClick={byWhatsapp} className="flex-1">
          Send on WhatsApp
        </Button>
      </div>
      <p className="text-xs text-slate-500">Both buttons open your own email or WhatsApp app with the message ready to send.</p>
    </form>
  );
};

const Contact = () => {
  usePageTitle("Contact");
  const [params] = useSearchParams();
  const plan = params.get("plan") || "";
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your school"
        intro="For a demonstration, pricing or any question, reach us the way that suits you. The same number works for calls, WhatsApp and Viber."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c) => (
            <StaggerItem key={c.title}>
              <Motion.a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group flex h-full flex-col rounded-card bg-white p-6 no-underline shadow-card ring-1 ring-slate-200 hover:shadow-pop"
              >
                <span className={`flex size-12 items-center justify-center rounded-xl ring-1 ${c.tone}`}>
                  <c.icon size={22} aria-hidden="true" />
                </span>
                <span className="mt-5 text-sm font-medium text-slate-500">{c.title}</span>
                <span className="mt-1 font-semibold break-all text-slate-900">{c.value}</span>
                <span className="mt-1 flex-1 text-sm text-slate-500">{c.note}</span>
                <span className="mt-5 text-sm font-semibold text-brand-700 group-hover:underline">{c.action} →</span>
              </Motion.a>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <Reveal id="enquiry" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Send an enquiry</h2>
          <p className="mt-1.5 mb-6 text-slate-600">Tell us a little about your school and we'll get back to you.</p>
          <EnquiryForm key={plan} plan={plan} />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Common questions</h2>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
};

export default Contact;
