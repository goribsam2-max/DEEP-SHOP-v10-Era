import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import Icon from './Icon';

import { useTheme } from './ThemeContext';
import { Header } from './ui/header-3';
import { HeaderNotification } from './HeaderNotification';
import { PageLoadingContext } from '../App';


const DesktopLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
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
    const interval = setInterval(updateCart, 1000); // Polling for fast local updates
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

  const showNav = ['/', '/profile', '/search', '/notifications', '/orders', '/wishlist'].includes(location.pathname);

  const isNoHeaderPage = location.pathname === '/help-center' || location.pathname === '/messages' || isPageLoading;

  return (
    <div 
      className="min-h-screen bg-transparent flex flex-col transition-all duration-300"
      style={{
        paddingTop: isNoHeaderPage 
          ? 'var(--pwa-banner-height, 0px)' 
          : 'calc(var(--pwa-banner-height, 0px) + 3.5rem)'
      }}
    >
      {location.pathname !== '/help-center' && location.pathname !== '/messages' && !isPageLoading && <Header />}
      <div className="flex-1 flex w-full flex-col min-h-[calc(100vh-56px)]">
        {/* Main Content Area */}
        <div className={`transition-all duration-300 flex-1 w-full max-w-full ${sidebarOpen ? 'md:pl-72' : ''} bg-transparent`}>
          {location.pathname === '/' && !isPageLoading && <HeaderNotification />}
          <div className="w-full max-w-[1920px] mx-auto pb-0 min-h-[70vh]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopLayout;
