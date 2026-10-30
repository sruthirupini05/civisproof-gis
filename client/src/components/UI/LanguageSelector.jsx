import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useLanguageStore } from '../../store/useStore.js';

const LANGUAGES = [
  { code: 'te', label: 'తెలుగు' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const { currentLang, setLang } = useLanguageStore();

  useEffect(() => {
    const handleEvent = (e) => {
      if (e.detail && e.detail !== currentLang) {
        setLang(e.detail);
      }
    };
    window.addEventListener('civicproof:languageChanged', handleEvent);
    return () => window.removeEventListener('civicproof:languageChanged', handleEvent);
  }, [currentLang, setLang]);

  const active = (currentLang || i18n.language || 'te').slice(0, 2);

  return (
    <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/20">
      <div className="pl-1.5 pr-0.5 text-amber-300">
        <Globe size={13} />
      </div>
      <div className="flex items-center gap-0.5">
        {LANGUAGES.map((lang) => {
          const isSelected = active === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLang(lang.code);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? 'bg-amber-400 text-[#1e3a5f] shadow-xs scale-102'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
