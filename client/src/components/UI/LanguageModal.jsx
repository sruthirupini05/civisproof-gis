import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check, X } from 'lucide-react';
import { useLanguageStore } from '../../store/useStore.js';

const LANGUAGES = [
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { code: 'en', label: 'English', sub: 'English' },
  { code: 'hi', label: 'हिंदी', sub: 'Hindi' },
];

export default function LanguageModal({ isOpen, onClose }) {
  const { i18n } = useTranslation();
  const { currentLang, setLang } = useLanguageStore();
  const [selected, setSelected] = useState(() => (currentLang || i18n.language || 'en').slice(0, 2));

  if (!isOpen) return null;

  const handleApply = () => {
    setLang(selected);
    i18n.changeLanguage(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-[#fffdf9] rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 text-center relative border-b border-amber-100 bg-gradient-to-b from-amber-50/80 to-[#fffdf9]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <X size={16} />
          </button>
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-amber-100 text-[#991b1b] flex items-center justify-center shadow-xs">
            <Languages size={24} />
          </div>
          <h3 className="text-xl font-bold text-[#881337]">Select Language</h3>
          <p className="text-xs text-amber-900/60 mt-0.5">భాషను ఎంచుకోండి / भाषा चुनें</p>
        </div>

        {/* Options list */}
        <div className="p-5 space-y-3">
          {LANGUAGES.map((lang) => {
            const isSelected = selected === lang.code;
            return (
              <label
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                  isSelected
                    ? 'border-[#991b1b] bg-[#fff5f5] shadow-xs'
                    : 'border-slate-200 bg-white hover:border-amber-300'
                }`}
              >
                <div>
                  <div className={`font-bold text-base ${isSelected ? 'text-[#991b1b]' : 'text-slate-800'}`}>
                    {lang.label}
                  </div>
                  <div className="text-xs text-slate-500">{lang.sub}</div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    isSelected ? 'border-[#991b1b] bg-[#991b1b]' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                </div>
              </label>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="p-5 pt-0">
          <button
            onClick={handleApply}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white font-bold text-base rounded-2xl shadow-lg shadow-red-950/20 active:scale-[0.99] transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
