import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import App from './App.jsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext.jsx';

const LANG = import.meta.env.VITE_DEFAULT_LANG || 'ru';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <ConfigProvider locale={LANG === 'en' ? enUS : ruRU}>
        <App />
      </ConfigProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
