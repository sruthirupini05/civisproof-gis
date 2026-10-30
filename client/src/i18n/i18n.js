import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import te from './locales/te/translation.json';
import hi from './locales/hi/translation.json';

const defaultLang = localStorage.getItem('civicproof_lang') || 'te';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      te: { translation: te },
      hi: { translation: hi },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    supportedLngs: ['te', 'en', 'hi'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

document.documentElement.lang = defaultLang;

export function changeAppLanguage(lang) {
  i18n.changeLanguage(lang);
  localStorage.setItem('civicproof_lang', lang);
  localStorage.setItem('i18nextLng', lang);
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent('civicproof:languageChanged', { detail: lang }));
}

export default i18n;
