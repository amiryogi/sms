import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2,
  Save,
  Upload,
  ImageIcon,
  Phone,
  Mail,
  Globe,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  User,
  Calendar,
  Palette,
  BarChart3,
  LayoutTemplate,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { schoolService } from "../../api/schoolService";
import { resolveAssetUrl } from "../../utils/assets";
import GradeScaleSettings from "../../components/admin/GradeScaleSettings";
import BrandColorSettings from "../../components/admin/BrandColorSettings";
import ReportCardLayoutSettings from "../../components/admin/ReportCardLayoutSettings";
import { Input, Textarea } from "../../components/common/FormElements";
import { PageHeader, Card, CardHeader, Button, Tabs, Alert, LoadingBlock, toast } from "../../components/ui";

const EMPTY = {
  name: "",
  address: "",
  phone: "",
  email: "",
  tagline: "",
  website: "",
  landlineNumber: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  principalName: "",
  establishedYear: "",
};

const TABS = [
  { value: "profile", label: "School profile", icon: Building2 },
  { value: "branding", label: "Branding", icon: Palette },
  { value: "grading", label: "Grading", icon: BarChart3 },
  { value: "report-card", label: "Report card", icon: LayoutTemplate },
];

const IMAGE_LIMITS = {
  logo: { max: 2, label: "Logo", upload: (f) => schoolService.uploadLogo(f), key: "logoUrl" },
  banner: { max: 5, label: "Banner", upload: (f) => schoolService.uploadBanner(f), key: "bannerUrl" },
};

/** One image slot (logo or banner) with its own upload button. */
const ImageSlot = ({ kind, url, busy, onPick, title, hint, wide }) => {
  const inputRef = useRef(null);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className={wide ? "flex flex-col gap-3" : "flex items-center gap-4"}>
        <div
          className={
            wide
              ? "flex aspect-[4/1] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50"
              : "flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50"
          }
        >
          {url ? (
            <img src={resolveAssetUrl(url)} alt={`School ${kind}`} className={wide ? "size-full object-cover" : "size-full object-contain p-2"} />
          ) : (
            <ImageIcon size={wide ? 28 : 24} className="text-slate-400" aria-hidden="true" />
          )}
        </div>
        <div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(kind, e, inputRef)} />
          <Button variant="secondary" size="sm" icon={Upload} loading={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : url ? `Replace ${kind}` : `Upload ${kind}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SchoolSettings = () => {
  const { refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === searchParams.get("tab")) ? searchParams.get("tab") : "profile";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // "logo" | "banner" | null
  const [problem, setProblem] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState(EMPTY);
  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await schoolService.getMySchool();
        const school = response.data.data;
        setSchoolInfo(school);
        setFormData(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, school[k] || ""])));
      } catch {
        setProblem("Could not load the school settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const changeTab = (value) => setSearchParams(value === "profile" ? {} : { tab: value }, { replace: true });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProblem("");
    setFieldErrors({});
    try {
      const response = await schoolService.updateSchool(formData);
      setSchoolInfo(response.data.data);
      toast.success("School profile saved");
      // The sidebar and the user menu read the school from the session.
      if (refreshUser) refreshUser();
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length) {
        const map = {};
        backendErrors.forEach((err) => {
          if (err.field) map[err.field] = err.message;
        });
        setFieldErrors(map);
        setProblem(`Please fix ${backendErrors.length} field(s) highlighted below.`);
      } else {
        toast.error(error.response?.data?.message || "Could not save the school profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async (kind, e, inputRef) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cfg = IMAGE_LIMITS[kind];
    const clear = () => {
      if (inputRef.current) inputRef.current.value = "";
    };
    if (!file.type.startsWith("image/")) {
      clear();
      return toast.error(`Choose an image file for the ${kind}.`);
    }
    if (file.size > cfg.max * 1024 * 1024) {
      clear();
      return toast.error(`${cfg.label} must be smaller than ${cfg.max} MB.`);
    }
    setUploading(kind);
    try {
      const response = await cfg.upload(file);
      setSchoolInfo((prev) => ({ ...prev, [cfg.key]: response.data.data[cfg.key] }));
      toast.success(`${cfg.label} updated`);
      if (kind === "logo" && refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not upload the ${kind}`);
    } finally {
      setUploading(null);
      clear();
    }
  };

  const field = (name, label, props = {}) => (
    <Input label={label} name={name} value={formData[name]} onChange={handleChange} error={fieldErrors[name]} className="mb-0" {...props} />
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        icon={Settings}
        title="School settings"
        description="Your school's profile, branding, grading and report card."
        className="mb-2"
      />

      <Tabs tabs={TABS} value={tab} onChange={changeTab} />

      {loading ? (
        <LoadingBlock text="Loading school settings…" />
      ) : (
        <>
          {tab === "profile" && (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card>
                <form onSubmit={handleSubmit} noValidate>
                  {problem && <Alert tone="danger" className="mb-5">{problem}</Alert>}

                  <CardHeader icon={Building2} title="About the school" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field("name", "School name", { required: true, placeholder: "Enter school name", className: "mb-0 sm:col-span-2" })}
                    {field("tagline", "Tagline / motto", { placeholder: "e.g. Education for Excellence", className: "mb-0 sm:col-span-2" })}
                    {field("principalName", "Principal", { icon: User, placeholder: "e.g. Mr. Ram Prasad Sharma" })}
                    {field("establishedYear", "Established", { icon: Calendar, type: "number", min: "1800", max: new Date().getFullYear(), placeholder: "e.g. 1990" })}
                  </div>

                  <div className="my-6 border-t border-slate-100" />
                  <CardHeader icon={MapPin} title="Contact" description="Printed on report cards and shown on the sign-in page." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Textarea
                      label="Address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      error={fieldErrors.address}
                      rows={2}
                      placeholder="Enter full address"
                      className="mb-0 sm:col-span-2"
                    />
                    {field("phone", "Mobile number", { icon: Phone, type: "tel", placeholder: "e.g. 9841234567" })}
                    {field("landlineNumber", "Landline", { icon: Phone, type: "tel", placeholder: "e.g. 01-4123456" })}
                    {field("email", "Email", { icon: Mail, type: "email", placeholder: "e.g. info@school.edu.np" })}
                    {field("website", "Website", { icon: Globe, type: "url", placeholder: "https://www.school.edu.np" })}
                  </div>

                  <div className="my-6 border-t border-slate-100" />
                  <CardHeader icon={Globe} title="Social media" description="Linked from everyone's user menu." />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {field("facebookUrl", "Facebook", { icon: Facebook, type: "url", placeholder: "https://facebook.com/…" })}
                    {field("instagramUrl", "Instagram", { icon: Instagram, type: "url", placeholder: "https://instagram.com/…" })}
                    {field("youtubeUrl", "YouTube", { icon: Youtube, type: "url", placeholder: "https://youtube.com/@…" })}
                  </div>

                  <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                    <Button type="submit" icon={Save} loading={saving}>
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Live preview of the header people see */}
              <Card padding="none" className="overflow-hidden lg:sticky lg:top-20">
                <div className="aspect-[3/1] bg-gradient-to-br from-brand-600 to-brand-800">
                  {schoolInfo?.bannerUrl && <img src={resolveAssetUrl(schoolInfo.bannerUrl)} alt="" className="size-full object-cover" />}
                </div>
                <div className="px-5 pb-5">
                  <div className="-mt-8 mb-3 flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-pop">
                    {schoolInfo?.logoUrl ? (
                      <img src={resolveAssetUrl(schoolInfo.logoUrl)} alt="" className="size-full object-contain p-1" />
                    ) : (
                      <Building2 size={28} className="text-brand-600" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{formData.name || "School name"}</h3>
                  {formData.tagline && <p className="mt-0.5 text-sm text-slate-500 italic">{formData.tagline}</p>}
                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    {formData.address && (
                      <div className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /><dd>{formData.address}</dd></div>
                    )}
                    {(formData.phone || formData.landlineNumber) && (
                      <div className="flex gap-2"><Phone size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /><dd>{[formData.phone, formData.landlineNumber].filter(Boolean).join(" · ")}</dd></div>
                    )}
                    {formData.email && (
                      <div className="flex gap-2"><Mail size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /><dd className="truncate">{formData.email}</dd></div>
                    )}
                  </dl>
                  {(formData.facebookUrl || formData.instagramUrl || formData.youtubeUrl) && (
                    <div className="mt-4 flex gap-2">
                      {[
                        { url: formData.facebookUrl, icon: Facebook, label: "Facebook" },
                        { url: formData.instagramUrl, icon: Instagram, label: "Instagram" },
                        { url: formData.youtubeUrl, icon: Youtube, label: "YouTube" },
                      ]
                        .filter((s) => s.url)
                        .map((s) => (
                          <a
                            key={s.label}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={s.label}
                            className="inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <s.icon size={16} aria-hidden="true" />
                          </a>
                        ))}
                    </div>
                  )}
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Preview of the sign-in page and report card header.</p>
                </div>
              </Card>
            </div>
          )}

          {tab === "branding" && (
            <div className="space-y-5">
              <Card>
                <CardHeader icon={ImageIcon} title="Logo and banner" description="Shown in the sidebar, on the sign-in page and on report cards." />
                <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
                  <ImageSlot kind="logo" title="Logo" hint="Square, PNG or JPG, up to 2 MB" url={schoolInfo?.logoUrl} busy={uploading === "logo"} onPick={handleImage} />
                  <ImageSlot kind="banner" title="Banner" hint="Wide (about 4:1), up to 5 MB" url={schoolInfo?.bannerUrl} busy={uploading === "banner"} onPick={handleImage} wide />
                </div>
              </Card>
              <BrandColorSettings />
            </div>
          )}

          {tab === "grading" && <GradeScaleSettings />}

          {tab === "report-card" && <ReportCardLayoutSettings />}
        </>
      )}
    </div>
  );
};

export default SchoolSettings;
