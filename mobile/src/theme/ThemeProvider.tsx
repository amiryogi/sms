import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme as useSystemScheme, View } from "react-native";
import { vars } from "nativewind";
import { PREF_KEYS, readJson, writeJson } from "@/lib/storage";
import { brandCssVariables, brandForeground, brandPalette, type BrandPalette } from "./brand";
import { TOKENS, tokenVariables, toTriplet, type Scheme } from "./tokens";

export type SchemePreference = "system" | "light" | "dark";

type Colors = { [K in keyof (typeof TOKENS)["light"]]: string } & {
  /** Brand colour readable as text/icon on this scheme's surfaces. */
  brand: string;
  /** Brand fill (buttons, the home header): the school's colour itself. */
  brandFill: string;
  // Older names kept for icon colours across the app.
  text: string;
  muted: string;
  subtle: string;
  background: string;
  border: string;
  success: string;
  danger: string;
  warning: string;
};

type ThemeValue = {
  scheme: Scheme;
  preference: SchemePreference;
  setPreference: (p: SchemePreference) => void;
  /** Set the school colour (after sign-in, or from the public branding on the login screen). */
  setBrandColor: (hex: string | null) => void;
  brand: BrandPalette;
  /** Text colour on brand-600. */
  onBrand: string;
  /** True when that text is white (a dark brand colour): light status-bar icons, white veils. */
  onBrandIsLight: boolean;
  colors: Colors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Light / dark / system, and the school's brand colour.
 *
 * Everything visual reads CSS variables that this provider sets on the root
 * view (src/theme/tokens.ts, brand.ts). Changing theme swaps those values and
 * nothing else: no NativeWind setColorScheme, no change to the phone's own
 * appearance setting (that path threw on some builds and leaked the app's
 * choice into the system).
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const system = useSystemScheme();
  const [preference, setPref] = useState<SchemePreference>("system");
  const [brandColor, setBrandColor] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    readJson<SchemePreference>(PREF_KEYS.colorScheme, "system").then((p) => {
      if (alive && (p === "light" || p === "dark" || p === "system")) setPref(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setPreference = useCallback((p: SchemePreference) => {
    setPref(p);
    writeJson(PREF_KEYS.colorScheme, p);
  }, []);

  const scheme: Scheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const brand = useMemo(() => brandPalette(brandColor), [brandColor]);
  const onBrand = brandForeground(brandColor);
  // Brand-coloured text and icons: a light shade on dark surfaces, a dark one on light.
  const brandInk = scheme === "dark" ? brand[300] : brand[700];
  const brandSoft = scheme === "dark" ? brand[950] : brand[50];

  const value = useMemo<ThemeValue>(() => {
    const t = TOKENS[scheme];
    return {
      scheme,
      preference,
      setPreference,
      setBrandColor,
      brand,
      onBrand,
      onBrandIsLight: onBrand === "#ffffff",
      colors: {
        ...t,
        brand: brandInk,
        brandFill: brand[600],
        text: t.ink,
        muted: t["ink-muted"],
        subtle: t["ink-subtle"],
        background: t.canvas,
        border: t.line,
        success: t.ok,
        danger: t.bad,
        warning: t.warn,
      },
    };
  }, [brand, brandInk, onBrand, scheme, preference, setPreference]);

  const style = useMemo(
    () =>
      vars({
        ...tokenVariables(scheme),
        ...brandCssVariables(brandColor),
        "--brand-soft": toTriplet(brandSoft),
        "--brand-ink": toTriplet(brandInk),
      }),
    [brandColor, brandInk, brandSoft, scheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: value.colors.canvas }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
