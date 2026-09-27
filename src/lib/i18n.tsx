'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
export const locales = ['en', 'es', 'fr', 'ar'] as const;
export type Locale = (typeof locales)[number];
const messages: Record<Locale, Record<string, string>> = {
  en: { settings: 'Settings', save: 'Save changes', discover: 'Discover Creators', language: 'Language', loading: 'Loading…' },
  es: { settings: 'Configuración', save: 'Guardar cambios', discover: 'Descubrir creadores', language: 'Idioma', loading: 'Cargando…' },
  fr: { settings: 'Paramètres', save: 'Enregistrer', discover: 'Découvrir des créateurs', language: 'Langue', loading: 'Chargement…' },
  ar: { settings: 'الإعدادات', save: 'حفظ التغييرات', discover: 'اكتشف المبدعين', language: 'اللغة', loading: 'جار التحميل…' },
};
interface I18nContextValue { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string) => string; direction: 'ltr' | 'rtl'; }
const I18nContext = createContext<I18nContextValue | null>(null);
export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => { const stored = window.localStorage.getItem('dorisio-locale') as Locale | null; if (stored && locales.includes(stored)) setLocaleState(stored); }, []);
  const setLocale = (next: Locale) => { setLocaleState(next); window.localStorage.setItem('dorisio-locale', next); document.documentElement.lang = next; document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'; };
  const value = useMemo(() => ({ locale, setLocale, t: (key: string) => messages[locale][key] || messages.en[key] || key, direction: locale === 'ar' ? 'rtl' as const : 'ltr' as const }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n(): I18nContextValue { const context = useContext(I18nContext); if (!context) throw new Error('useI18n must be used inside I18nProvider'); return context; }
export function LanguageSelector(): JSX.Element { const { locale, setLocale, t } = useI18n(); return <label className="flex items-center gap-2 text-sm"><span>{t('language')}</span><select aria-label={t('language')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="rounded border bg-background px-2 py-1"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="ar">العربية</option></select></label>; }
