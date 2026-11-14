import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useColorScheme, vars } from "nativewind";
import { PREF_KEYS, readJson, writeJson } from "@/lib/storage";
import { brandCssVariables, brandForeground, brandPalette, type BrandPalette } from "./brand";
import { neutral } from "./colors";

export type SchemePreference = "system" | "light" | "dark";

type ThemeValue = {
  /** The scheme in effect. */
  scheme: "light" | "dark";
  preference: SchemePreference;
  setPreference: (p: SchemePreference) => void;
  /** Set the school colour (after sign-in, or from the public branding on the login screen). */
  setBrandColor: (hex: string | null) => void;
  brand: BrandPalette;
  /** Text colour on brand-600. */
  onBrand: string;
  /** Hex values for places className can't reach (icons, charts, status bar). */
  colors: {
    text: string;
    muted: string;
    subtle: string;
    background: string;
    surface: string;
    border: string;
    brand: string;
    brandStrong: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
};

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Light/dark scheme (system by default, the user can override it in Profile)
 * and the school's brand colour. The brand shades are CSS variables on the root
 * view, so `bg-brand-600` everywhere follows the school.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { colorScheme, setColorScheme: setNativeWindScheme } = useColorScheme();
  // Never let a styling problem take the app down: fall back to the system scheme.
  const setColorScheme = useCallback(
    (p: SchemePreference) => {
      try {
        setNativeWindScheme(p);
      } catch {
        // darkMode "class" missing from the build: system scheme stays
      }
    },
    [setNativeWindScheme],
  );
  const [preference, setPref] = useState<SchemePreference>("system");
  const [brandColor, setBrandColor] = useState<string | null>(null);

  useEffect(() => {
    readJson<SchemePreference>(PREF_KEYS.colorScheme, "system").then((p) => {
      setPref(p);
      setColorScheme(p);
    });
  }, [setColorScheme]);

  const setPreference = useCallback(
    (p: SchemePreference) => {
      setPref(p);
      setColorScheme(p);
      writeJson(PREF_KEYS.colorScheme, p);
    },
    [setColorScheme],
  );

  const scheme = colorScheme === "dark" ? "dark" : "light";

  const value = useMemo<ThemeValue>(() => {
    const brand = brandPalette(brandColor);
    const n = neutral[scheme];
    return {
      scheme,
      preference,
      setPreference,
      setBrandColor,
      brand,
      onBrand: brandForeground(brandColor),
      colors: {
        ...n,
        brand: scheme === "dark" ? brand[400] : brand[600],
        brandStrong: scheme === "dark" ? brand[300] : brand[700],
      },
    };
  }, [brandColor, scheme, preference, setPreference]);

  const brandVars = useMemo(() => vars(brandCssVariables(brandColor)), [brandColor]);

  return (
    <ThemeContext.Provider value={value}>
      {/* dark: variants follow setColorScheme() (darkMode "class"); this view only carries the brand variables. */}
      <View style={[{ flex: 1 }, brandVars]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
