import { createContext, useContext } from 'react';

export const LanguageContext = createContext('ru');
export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }) {
    return (
        <LanguageContext.Provider value="ru">
            {children}
        </LanguageContext.Provider>
    );
}
