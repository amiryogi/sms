import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

/**
 * Translations. English is the only language today; the structure is ready for
 * Nepali: add locales/ne.json with the same keys and list it in `resources`.
 * Avoid i18next plural keys: Hermes' Intl.PluralRules support varies, so
 * counts are interpolated into neutral wording instead.
 */
export const LANGUAGES = [{ code: "en", label: "English" }] as const;

export const resources = { en: { translation: en } } as const;

// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API
i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React escapes already
  returnNull: false,
});

export default i18n;
