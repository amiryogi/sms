import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AtSign,
  Building2,
  Eye,
  EyeOff,
  Facebook,
  Globe,
  Instagram,
  Lock,
  Mail,
  MapPin,
  Phone,
  Youtube,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { schoolService } from "../api/schoolService";
import { resolveAssetUrl } from "../utils/assets";
import { applyBrand } from "../lib/brand";
import { Alert, Button, Field, TextInput } from "../components/ui";

// After login always land on /dashboard, which redirects by role. Returning
// to the pre-login `from` page could send a user to another role's page.
const POST_LOGIN_PATH = "/dashboard";

const SchoolLogo = ({ school, className }) => {
  const [failed, setFailed] = useState(false);
  const logo = school?.logoUrl ? resolveAssetUrl(school.logoUrl) : null;
  if (logo && !failed) {
    return <img src={logo} alt={`${school?.name || "School"} logo`} className={className} onError={() => setFailed(true)} />;
  }
  // No logo: a brand-coloured tile with a building icon. Only the size and
  // corner classes are kept from `className`, so it never renders white-on-white.
  const shape = (className || "").split(/s+/).filter((c) => /^(size-|rounded)/.test(c)).join(" ");
  return (
    <span className={`flex items-center justify-center bg-brand-500 text-white ring-1 ring-white/30 ${shape}`}>
      <Building2 size={22} aria-hidden="true" />
    </span>
  );
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [school, setSchool] = useState(null);

  // School from ?school=CODE, else VITE_DEFAULT_SCHOOL_CODE, else the demo school.
  const schoolCode = searchParams.get("school") || import.meta.env.VITE_DEFAULT_SCHOOL_CODE || "DEMO001";

  useEffect(() => {
    let alive = true;
    schoolService
      .getPublicSchoolByCode(schoolCode)
      .then((res) => {
        if (!alive) return;
        const info = res.data.data;
        setSchool(info);
        applyBrand(info?.brandColor);
        if (info?.name) document.title = `Sign in · ${info.name}`;
      })
      .catch(() => {
        // Unknown school code: keep the default branding.
      });
    return () => {
      alive = false;
    };
  }, [schoolCode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError("");
    try {
      // The school code narrows the lookup to this school; sent only when it named a real school.
      await login({ identifier: data.identifier, password: data.password, ...(school?.code ? { schoolCode: school.code } : {}) });
      navigate(POST_LOGIN_PATH, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Sign-in failed. Check your username and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const banner = school?.bannerUrl ? resolveAssetUrl(school.bannerUrl) : null;
  const contacts = [
    school?.address && { icon: MapPin, text: school.address },
    (school?.landlineNumber || school?.phone) && { icon: Phone, text: [school.landlineNumber, school.phone].filter(Boolean).join(" · ") },
    school?.email && { icon: Mail, text: school.email },
  ].filter(Boolean);
  const socials = [
    school?.website && { href: school.website, label: "Website", icon: Globe },
    school?.facebookUrl && { href: school.facebookUrl, label: "Facebook", icon: Facebook },
    school?.instagramUrl && { href: school.instagramUrl, label: "Instagram", icon: Instagram },
    school?.youtubeUrl && { href: school.youtubeUrl, label: "YouTube", icon: Youtube },
  ].filter(Boolean);

  return (
    <div className="flex min-h-dvh bg-white">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-2xl flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex xl:p-14">
        {banner && <img src={banner} alt="" className="absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity" />}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/90 via-brand-700/90 to-brand-950/95" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <SchoolLogo school={school} className="size-12 rounded-xl bg-white object-contain p-1 ring-1 ring-white/30" />
          <div>
            <p className="text-lg font-semibold">{school?.name || "School Management"}</p>
            {school?.establishedYear && <p className="text-sm text-white/70">Since {school.establishedYear}</p>}
          </div>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight">
            {school?.tagline || "Everything your school runs on, in one place."}
          </h2>
          <p className="mt-4 max-w-md text-base text-white/75">
            Attendance, exams, report cards, fees and notices for staff, students and parents.
          </p>
        </div>

        <div className="relative space-y-4">
          {contacts.length > 0 && (
            <ul className="space-y-2 text-sm text-white/80">
              {contacts.map((c) => (
                <li key={c.text} className="flex items-center gap-2.5">
                  <c.icon size={15} className="shrink-0 text-white/60" aria-hidden="true" />
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
          {socials.length > 0 && (
            <div className="flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="inline-flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <s.icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-pop-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <SchoolLogo school={school} className="size-11 rounded-xl object-contain ring-1 ring-slate-200" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{school?.name || "School Management"}</p>
              {school?.tagline && <p className="truncate text-sm text-slate-500">{school.tagline}</p>}
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Welcome back. Use the username and password your school gave you.</p>

          {error && (
            <Alert tone="danger" className="mt-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Field label="Username or email" htmlFor="identifier" error={errors.identifier?.message}>
              <TextInput
                id="identifier"
                type="text"
                icon={AtSign}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. stu20240001"
                invalid={Boolean(errors.identifier)}
                className="h-11"
                {...register("identifier", { required: "Enter your username or email" })}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <TextInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  invalid={Boolean(errors.password)}
                  className="h-11 pr-11"
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" loading={isLoading} className="w-full">
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {school?.name || "School Management System"}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
