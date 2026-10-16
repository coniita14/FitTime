import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../styles/theme';

const ThemeContext = createContext(null);
const THEME_KEY = '@fittime_theme_dark';

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((storedValue) => {
        if (storedValue !== null) setIsDark(storedValue === 'true');
      })
      .catch((error) => console.error('No se pudo restaurar el tema:', error));
  }, []);

  const toggleTheme = async () => {
    const nextValue = !isDark;
    await AsyncStorage.setItem(THEME_KEY, String(nextValue));
    setIsDark(nextValue);
  };

  return (
    <ThemeContext.Provider value={{ isDark, theme: getTheme(isDark), toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider.');
  return context;
};
