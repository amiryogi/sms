import React from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { CONTACT, CREDIT, FEATURES, NAV_LINKS, PRODUCT } from "../../pages/public/content";
import ProductLogo from "./ProductLogo";

const linkClass = "text-sm text-slate-400 no-underline transition-colors hover:text-white";

const contactLinks = [
  { href: CONTACT.tel, label: CONTACT.phoneDisplay, icon: Phone },
  { href: CONTACT.whatsapp, label: "WhatsApp", icon: MessageCircle, external: true },
  { href: CONTACT.viber, label: "Viber", icon: PhoneCall },
  { href: CONTACT.mailto, label: CONTACT.email, icon: Mail },
];

const PublicFooter = () => (
  <footer className="bg-slate-950 text-slate-300">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:px-8">
      <div>
        <Link to="/" className="no-underline" aria-label="Vidyalaya SMS home">
          <ProductLogo inverted />
        </Link>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{PRODUCT.description}</p>
      </div>

      <nav aria-label="Footer">
        <h2 className="text-sm font-semibold text-white">Explore</h2>
        <ul className="mt-4 space-y-2.5">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className={linkClass}>{link.label}</Link>
            </li>
          ))}
          <li>
            <Link to="/login" className={linkClass}>Sign in</Link>
          </li>
        </ul>
      </nav>

      <div>
        <h2 className="text-sm font-semibold text-white">Features</h2>
        <ul className="mt-4 space-y-2.5">
          {FEATURES.slice(0, 6).map((f) => (
            <li key={f.id}>
              <Link to={`/features#${f.id}`} className={linkClass}>{f.title}</Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white">Contact for more information</h2>
        <ul className="mt-4 space-y-2.5">
          {contactLinks.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                className={`${linkClass} inline-flex items-center gap-2.5`}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <c.icon size={15} className="shrink-0 text-brand-300" aria-hidden="true" />
                {c.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">The same number works on WhatsApp and Viber.</p>
      </div>
    </div>

    <div className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} {PRODUCT.name}. All rights reserved.</p>
        <p>
          Created and Designed by{" "}
          <a
            href={CREDIT.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-300 underline-offset-4 hover:text-white hover:underline"
          >
            {CREDIT.name}
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
