import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { ruRU } from "./ru-RU";
import { enUS } from "./en-US";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "ru-RU": { translation: ruRU },
      "en-US": { translation: enUS },
    },
    fallbackLng: "en-US",
    supportedLngs: ["ru-RU", "en-US"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;
