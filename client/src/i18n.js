import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import enTranslation from '../public/locales/en/translation.json';
import deTranslation from '../public/locales/de/translation.json';
import arTranslation from '../public/locales/ar/translation.json';

const allowBackend = !import.meta.env.TEST;

if (allowBackend) {
  i18n.use(Backend).use(LanguageDetector);
}

const resources = {
  en: {
    translation: enTranslation,
  },
  de: {
    translation: deTranslation,
  },
  ar: {
    translation: arTranslation,
  },
};

const debugMode = import.meta.env.DEV && !import.meta.env.TEST;

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: debugMode,

    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    resources,
  });

export default i18n;
