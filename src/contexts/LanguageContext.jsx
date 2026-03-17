import { createContext, useContext } from 'react';

const DEFAULT_LANG = import.meta.env.VITE_DEFAULT_LANG || 'ru';

export const LanguageContext = createContext(DEFAULT_LANG);

export function LanguageProvider({ children }) {
    return (
        <LanguageContext.Provider value={DEFAULT_LANG}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

// Helper: pick text based on current lang
// Usage: tx(lang, 'Русский текст', 'English text')
export function tx(lang, ru, en) {
    return lang === 'en' ? (en || ru) : (ru || en);
}
