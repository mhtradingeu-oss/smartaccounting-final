
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

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

    resources: {
      en: {
        translation: {
          common: {
            loading: 'Loading...',
            error: 'Error',
            retry: 'Retry',
            empty: 'No data available',
            success: 'Success',
          },

          dashboard: {
            title: 'Dashboard',
            subtitle: 'Your accounting overview',
            error_title: 'Dashboard Error',
            error_loading: 'Failed to load dashboard data',
            empty_title: 'No data yet',
            empty_message: 'Your dashboard is waiting for data.',
            coming_soon: 'Coming Soon',
            coming_soon_desc: 'This dashboard feature is disabled or coming soon in v0.1.',
          },

          invoices: 'Invoices',
          bankStatements: 'Bank Statements',
          billing: 'Billing',
          settings: 'Settings',
          logout: 'Logout',

          auth: {
            signInToAccount: 'Sign in to your account',
            email: 'Email',
            password: 'Password',
            signIn: 'Sign In',
          },
        },
      },

      de: {
        translation: {
          common: {
            loading: 'Lädt...',
            error: 'Fehler',
            retry: 'Erneut versuchen',
            empty: 'Keine Daten verfügbar',
            success: 'Erfolgreich',
          },

          dashboard: {
            title: 'Dashboard',
            subtitle: 'Ihre Buchhaltungsübersicht',
            error_title: 'Dashboard-Fehler',
            error_loading: 'Dashboard-Daten konnten nicht geladen werden',
            empty_title: 'Noch keine Daten',
            empty_message: 'Ihr Dashboard wartet auf Daten.',
            coming_soon: 'Bald verfügbar',
            coming_soon_desc: 'Dieses Dashboard-Feature ist in v0.1 deaktiviert oder kommt bald.',
          },

          invoices: 'Rechnungen',
          bankStatements: 'Kontoauszüge',
          billing: 'Abrechnung',
          settings: 'Einstellungen',
          logout: 'Abmelden',

          auth: {
            signInToAccount: 'Bei Ihrem Konto anmelden',
            email: 'E-Mail',
            password: 'Passwort',
            signIn: 'Anmelden',
          },
        },
      },

      ar: {
        translation: {
          common: {
            loading: 'جارٍ التحميل...',
            error: 'خطأ',
            retry: 'إعادة المحاولة',
            empty: 'لا توجد بيانات',
            success: 'تم بنجاح',
          },

          dashboard: {
            title: 'لوحة التحكم',
            subtitle: 'نظرة عامة على المحاسبة',
            error_title: 'خطأ في لوحة التحكم',
            error_loading: 'فشل تحميل بيانات لوحة التحكم',
            empty_title: 'لا توجد بيانات بعد',
            empty_message: 'لوحة التحكم بانتظار البيانات.',
            coming_soon: 'قريباً',
            coming_soon_desc: 'هذه الميزة في لوحة التحكم معطلة أو ستتوفر قريباً في الإصدار 0.1.',
          },

          invoices: 'الفواتير',
          bankStatements: 'كشوفات البنك',
          billing: 'الفوترة',
          settings: 'الإعدادات',
          logout: 'تسجيل الخروج',

          auth: {
            signInToAccount: 'تسجيل الدخول إلى حسابك',
            email: 'البريد الإلكتروني',
            password: 'كلمة المرور',
            signIn: 'تسجيل الدخول',
          },
        },
      },
    },
  });

export default i18n;
