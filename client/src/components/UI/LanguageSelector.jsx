import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguageStore } from '../../store/useStore.js';
import LanguageModal from './LanguageModal.jsx';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const { currentLang } = useLanguageStore();
  const [modalOpen, setModalOpen] = useState(false);

  const active = (currentLang || i18n.language || 'en').slice(0, 2).toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-white text-[#991b1b] font-bold text-xs rounded-xl shadow-xs border border-amber-200/80 active:scale-95 transition"
      >
        <Globe size={13} className="text-[#991b1b]" />
        <span>{active}</span>
        <ChevronDown size={13} className="text-[#991b1b]/70" />
      </button>

      <LanguageModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
