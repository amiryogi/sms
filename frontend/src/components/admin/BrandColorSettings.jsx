import React, { useEffect, useState } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { schoolService } from "../../api/schoolService";
import { applyBrand, contrastRatio, DEFAULT_BRAND, isValidBrandColor } from "../../lib/brand";
import { Badge, Button, Card, CardHeader, toast } from "../ui";
import { cn } from "../../lib/cn";

const PRESETS = [
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Sky", hex: "#0284c7" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Green", hex: "#16a34a" },
  { name: "Maroon", hex: "#9f1239" },
  { name: "Red", hex: "#dc2626" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Slate", hex: "#334155" },
];

/**
 * School Settings -> Brand colour. The colour themes the whole app (buttons,
 * active navigation, links, the login page) for everyone in the school.
 * Printed report cards stay black and white.
 */
const BrandColorSettings = () => {
  const { user, refreshUser } = useAuth();
  const saved = user?.school?.brandColor || null;
  const [value, setValue] = useState(saved || DEFAULT_BRAND);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(saved || DEFAULT_BRAND);
  }, [saved]);

  // Live preview; restore the saved colour when leaving the page unsaved.
  useEffect(() => {
    if (isValidBrandColor(value)) applyBrand(value);
  }, [value]);
  useEffect(() => () => applyBrand(saved), [saved]);

  const valid = isValidBrandColor(value);
  const dirty = valid && value.toLowerCase() !== (saved || DEFAULT_BRAND).toLowerCase();
  const onWhite = valid ? contrastRatio(value, "#ffffff") : 0;

  const save = async (hex) => {
    setSaving(true);
    try {
      await schoolService.updateSchool({ brandColor: hex });
      await refreshUser?.();
      toast.success(hex ? "Brand colour saved. Everyone in the school now sees it." : "Back to the default colour.");
    } catch (error) {
      toast.error(error.response?.data?.errors?.[0]?.message || error.response?.data?.message || "Could not save the colour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg" className="mb-6">
      <CardHeader
        icon={Palette}
        title="Brand colour"
        description="Used for buttons, highlights, the navigation and the sign-in page, for everyone in your school. Printed report cards stay black and white."
        actions={saved ? <Badge tone="brand" dot>Custom</Badge> : <Badge>Default</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Presets</p>
          <div className="flex flex-wrap gap-2.5">
            {PRESETS.map((p) => {
              const active = valid && value.toLowerCase() === p.hex;
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setValue(p.hex)}
                  aria-label={p.name}
                  aria-pressed={active}
                  title={p.name}
                  className={cn(
                    "relative size-9 cursor-pointer rounded-full ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
                    active && "ring-2 ring-slate-900",
                  )}
                  style={{ backgroundColor: p.hex }}
                >
                  {active && <Check size={16} className="absolute inset-0 m-auto text-white" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <p className="mt-5 mb-2 text-sm font-medium text-slate-700">Custom colour</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative size-10 cursor-pointer overflow-hidden rounded-lg ring-1 ring-slate-300">
              <span className="sr-only">Pick a colour</span>
              <input
                type="color"
                value={valid ? value : DEFAULT_BRAND}
                onChange={(e) => setValue(e.target.value)}
                className="absolute -inset-2 size-14 cursor-pointer border-0 p-0"
              />
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value.trim())}
              maxLength={7}
              aria-label="Hex colour"
              aria-invalid={!valid}
              className={cn("w-28 font-mono uppercase", !valid && "border-red-400")}
            />
            {!valid && <span className="text-xs font-medium text-red-600">Use a hex colour like #4F46E5</span>}
            {valid && onWhite < 3 && (
              <span className="text-xs text-amber-700">
                Very light colour: text will use a darker shade so it stays readable.
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => save(value.toLowerCase())} loading={saving} disabled={!dirty}>
              Save colour
            </Button>
            {dirty && (
              <Button variant="secondary" onClick={() => setValue(saved || DEFAULT_BRAND)} disabled={saving}>
                Discard
              </Button>
            )}
            {saved && (
              <Button variant="ghost" icon={RotateCcw} onClick={() => save(null)} disabled={saving}>
                Reset to default
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Preview">
          <p className="mb-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Preview</p>
          <div className="space-y-3 rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-2 text-sm font-medium text-brand-700">
              <span className="size-2 rounded-full bg-brand-500" /> Active menu item
            </div>
            <p className="text-sm text-slate-600">
              A sentence with a <span className="font-medium text-brand-700 underline">link</span> in it.
            </p>
            <div className="flex gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="outline">Outline</Button>
            </div>
            <Badge tone="brand" dot>Published</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BrandColorSettings;
