import { createContext, useContext, useState, useCallback } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        try {
            return localStorage.getItem('theme') === 'dark';
        } catch {
            return false;
        }
    });

    const toggleTheme = useCallback(() => {
        setIsDark(prev => {
            const next = !prev;
            try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            <ConfigProvider
                locale={ruRU}
                theme={{
                    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
                    token: {
                        colorPrimary: '#1677ff',
                        borderRadius: 8,
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
