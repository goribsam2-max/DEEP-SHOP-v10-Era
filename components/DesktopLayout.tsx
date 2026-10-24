import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

import { useTheme } from './ThemeContext';
import { Header } from './ui/header-3';
import { HeaderNotification } from './HeaderNotification';
import { PageLoadingContext } from '../App';

const DesktopLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setCartCount] = useState(0);
  const [, setCartTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useTheme();
  const { isPageLoading } = useContext(PageLoadingContext);

  useEffect(() => {
    const updateSidebar = (e: any) => setSidebarOpen(e.detail);
    window.addEventListener('toggleSidebar', updateSidebar);
    return () => window.removeEventListener('toggleSidebar', updateSidebar);
  }, []);

  useEffect(() => {
    const updateCart = () => {
      try {
        const cartStr = localStorage.getItem('f_cart');
        const cart = cartStr && cartStr !== "undefined" ? JSON.parse(cartStr) : [];
        if (!Array.isArray(cart)) {
          setCartCount(0);
          setCartTotal(0);
          return;
        }
        const count = cart.reduce((acc: number, item: any) => acc + (item?.quantity || 0), 0);
        const total = cart.reduce((acc: number, item: any) => acc + ((item?.price || 0) * (item?.quantity || 0)), 0);
        setCartCount(count);
        setCartTotal(total);
      } catch (err) {
        console.error("Cart parse error:", err);
        setCartCount(0);
        setCartTotal(0);
      }
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    const interval = setInterval(updateCart, 1000);
    return () => {
      window.removeEventListener('storage', updateCart);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('f_cart');
    navigate('/');
    window.dispatchEvent(new CustomEvent('openAccountCenter'));
  };
  void handleLogout;

  const isHomePage = location.pathname === '/';

  const isNoHeaderPage =
    location.pathname === '/help-center' ||
    location.pathname === '/messages' ||
    location.pathname.startsWith('/news-hub') ||
    location.pathname.startsWith('/news') ||
    location.pathname.startsWith('/author') ||
    location.pathname.startsWith('/creator') ||
    location.pathname.startsWith('/creator-dashboard') ||
    location.pathname.startsWith('/buy-stars') ||
    location.pathname.startsWith('/gift-stars') ||
    location.pathname.startsWith('/sponsor') ||
    isPageLoading;

  return (
    <div
      className={`relative min-h-screen flex flex-col transition-all duration-300 ${
        isHomePage ? 'bg-[#F5F9FF]/45 dark:bg-[#121212] pt-15 md:pt-16' : 'bg-transparent'
      } ${!isHomePage && !isNoHeaderPage ? 'pt-14 md:pt-16' : ''}`}
    >
      {/* News Hub Sky-Blue Ambient Top Gradient on Shop Home (/) */}
      {isHomePage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-[#6BB2F8]/85 via-[#DCEEFF]/60 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent z-0"
        />
      )}

      {!isNoHeaderPage && <Header />}

      <div className="relative z-10 flex-1 flex w-full flex-col min-h-[calc(100vh-56px)]">
        {/* Main Content Area */}
        <div className={`transition-all duration-300 flex-1 w-full max-w-full ${sidebarOpen ? 'md:pl-72' : ''} bg-transparent`}>
          {isHomePage && !isPageLoading && <HeaderNotification />}
          <div className="w-full max-w-[1920px] mx-auto pb-0 min-h-[70vh]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopLayout;
