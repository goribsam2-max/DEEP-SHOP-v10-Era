import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode, e?: React.MouseEvent | HTMLElement | { clientX: number, clientY: number }) => void;
  toggleTheme: (e?: React.MouseEvent | any) => void;
};

const ThemeContext = createContext<ThemeContextType>({ 
  theme: 'system', 
  isDark: false, 
  setTheme: () => {},
  toggleTheme: () => {} 
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as ThemeMode | null;
    if (saved) {
      setThemeState(saved);
    }
  }, []);

  const applyThemeClass = (isDarkMode: boolean) => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const isDarkMode = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
    setIsDark(isDarkMode);
    applyThemeClass(isDarkMode);

    const listener = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setIsDark(e.matches);
        applyThemeClass(e.matches);
      }
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = useCallback(async (mode: ThemeMode, event?: React.MouseEvent | HTMLElement | { clientX: number, clientY: number }) => {
    const nextIsDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark === nextIsDark && theme === mode) return;

    if (!document.startViewTransition) {
      setThemeState(mode);
      setIsDark(nextIsDark);
      applyThemeClass(nextIsDark);
      localStorage.setItem('theme', mode);
      return;
    }

    let centerX = window.innerWidth / 2;
    let centerY = 50;

    if (event) {
      if ('clientX' in event && typeof event.clientX === 'number' && event.clientX > 0) {
        centerX = event.clientX;
        centerY = event.clientY;
      } else if (event instanceof Element) {
        const rect = event.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
      } else if ('currentTarget' in event && event.currentTarget instanceof Element) {
        const rect = event.currentTarget.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
      }
    }

    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setThemeState(mode);
          setIsDark(nextIsDark);
          applyThemeClass(nextIsDark);
          localStorage.setItem('theme', mode);
        });
      });

      await transition.ready;
      const maxDistance = Math.hypot(
        Math.max(centerX, window.innerWidth - centerX),
        Math.max(centerY, window.innerHeight - centerY)
      );

      const clipPath = [
        `circle(0px at ${centerX}px ${centerY}px)`,
        `circle(${maxDistance}px at ${centerX}px ${centerY}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath,
        },
        {
          duration: 260,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    } catch (e) {
      setThemeState(mode);
      setIsDark(nextIsDark);
      applyThemeClass(nextIsDark);
      localStorage.setItem('theme', mode);
    }

  }, [isDark, theme]);

  const toggleTheme = useCallback((e?: React.MouseEvent) => {
    setTheme(isDark ? 'light' : 'dark', e);
  }, [isDark, setTheme]);

  return <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

