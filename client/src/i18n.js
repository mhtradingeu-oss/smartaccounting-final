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
            loading: 'Loading, please wait…',
            error: 'Something went wrong',
            retry: 'Try again',
            empty: 'No records found',
            success: 'Operation successful',
            disabled: 'This feature is currently unavailable.',
            coming_soon: 'Coming soon',
            read_only: 'You have view-only access. Actions are disabled for your role.',
          },

          dashboard: {
            title: 'Dashboard',
            subtitle: 'Your accounting overview',
            error_title: 'Dashboard unavailable',
            error_loading:
              'We were unable to load your dashboard data. Please try again or contact support if the issue persists.',
            empty_title: 'No KPI data yet',
            empty_message:
              'Your dashboard will display key metrics as soon as you create invoices or upload data.',
            coming_soon: 'Coming Soon',
            coming_soon_desc:
              'This dashboard feature is not yet available. Stay tuned for updates.',
          },

          invoices: 'Invoices',
          bankStatements: 'Bank Statements',
          billing: 'Billing',
          settings: 'Settings',
          logout: 'Logout',
          no_invoices: 'No invoices yet. Create your first invoice to get started.',
          no_expenses: 'No expenses yet. Add your first expense to begin tracking.',
          no_bank_statements:
            'No bank statements uploaded. Upload your first statement to see transactions.',
          no_ai_insights:
            'No AI insights available yet. AI will generate suggestions as your data grows.',

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
