import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Read saved preference or default to English ('en')
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('kirsab_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'hi' ? 'hi' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('kirsab_language', validLang);
    } catch (e) {
      console.warn('Could not persist language to localStorage:', e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  // Translation lookup helper
  const t = (key, fallback = '') => {
    const langDict = translations[language] || translations.en;
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English then Hindi if key missing
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    if (translations.hi && translations.hi[key] !== undefined) {
      return translations.hi[key];
    }
    return fallback || key;
  };

  // Helper to format product titles according to active language
  const tProduct = (product) => {
    if (!product) return { name: '', altName: '', unit: '', unitShort: '' };
    
    if (language === 'en') {
      return {
        name: product.nameEn || product.nameHi,
        altName: product.nameHi,
        unit: product.unit || product.unitHindi,
        unitShort: product.unitShort || product.unit,
      };
    }

    return {
      name: product.nameHi || product.nameEn,
      altName: product.nameEn,
      unit: product.unitHindi || product.unit,
      unitShort: product.unitShort ? `प्रति ${product.unitShort}` : (product.unitHindi || product.unit),
    };
  };

  // Helper to format category names
  const tCategory = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    if (language === 'en') {
      return category.nameEn || category.nameHi || '';
    }
    return category.nameHi || category.nameEn || '';
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        tProduct,
        tCategory,
        isHindi: language === 'hi',
        isEnglish: language === 'en',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
