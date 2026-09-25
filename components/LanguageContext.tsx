import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn' | 'hi' | 'ar' | 'es' | 'fr' | 'de';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    'home': 'Home',
    'search': 'Search',
    'cart': 'Cart',
    'profile': 'Profile',
    'wishlist': 'Wishlist',
    'all_products': 'All Products',
    'start': 'Start',
    'contact_us': 'Contact Us',
    'helpline': 'Helpline',
    'accepted_payments': 'Accepted Payments',
    'privacy_policy': 'Privacy Policy',
    'terms': 'Terms of Service',
    'customer_support': 'Customer Support',
    'policies': 'Policies',
    'faqs': 'FAQs',
    'help_center': 'Help Center',
    'my_tickets': 'My Support Tickets',
    'about_us': 'About Us',
    'terms_conditions': 'Terms & Conditions',
    'refund_policy': 'Refund Policy',
    'shipping_policy': 'Shipping Policy',
    'cookie_policy': 'Cookie Policy',
  },
  bn: {
    'home': 'হোম',
    'search': 'সার্চ',
    'cart': 'কার্ট',
    'profile': 'প্রোফাইল',
    'wishlist': 'উইশলিস্ট',
    'all_products': 'সব পণ্য',
    'start': 'শুরু করুন',
    'contact_us': 'যোগাযোগ করুন',
    'helpline': 'হেল্পলাইন',
    'accepted_payments': 'গ্রহণযোগ্য পেমেন্ট',
    'privacy_policy': 'গোপনীয়তা নীতি',
    'terms': 'শর্তাবলী',
    'customer_support': 'গ্রাহক সহায়তা',
    'policies': 'পলিসি সমূহ',
    'faqs': 'জিজ্ঞাসা (FAQs)',
    'help_center': 'সহায়তা কেন্দ্র',
    'my_tickets': 'আমার সাপোর্ট টিকিট',
    'about_us': 'আমাদের সম্পর্কে',
    'terms_conditions': 'নিয়ম ও শর্তাবলী',
    'refund_policy': 'রিফান্ড নীতি',
    'shipping_policy': 'শিপিং নীতি',
    'cookie_policy': 'কুকি নীতি',
    'Sign In Required': 'সাইন ইন আবশ্যক',
    'Please login to view and manage your saved tech essentials.': 'আপনার সংরক্ষিত প্রযুক্তি পণ্যগুলি দেখতে এবং পরিচালনা করতে অনুগ্রহ করে লগইন করুন।',
    'Sign In Now': 'এখনই সাইন ইন করুন',
    'Nothing saved yet': 'এখনো কিছু সংরক্ষণ করা হয়নি',
    'Start Exploring': 'এক্সপ্লোর শুরু করুন',
    'Shipping Information': 'শিপিং তথ্য',
    'Add Shipping Address': 'শিপিং ঠিকানা যোগ করুন',
    'No Address Found': 'কোনো ঠিকানা পাওয়া যায়নি',
    'Please add a shipping address to continue.': 'এগিয়ে যেতে অনুগ্রহ করে একটি শিপিং ঠিকানা যোগ করুন।',
    'Payment Method': 'পেমেন্ট পদ্ধতি',
    'Order Summary': 'অর্ডারের সারাংশ',
    'Subtotal': 'উপমোট',
    'Delivery Fee': 'ডেলিভারি চার্জ',
    'Total': 'মোট',
    'Place Order': 'অর্ডার করুন',
    'Checkout & Pay': 'চেকআউট ও পে করুন',
    'Payment Details': 'পেমেন্টের বিবরণ',
    'Select a Voucher': 'ভাউচার নির্বাচন করুন',
    'Use': 'ব্যবহার করুন'
  },
  hi: {
    'home': 'होम',
    'search': 'खोजें',
    'cart': 'कार्ट',
    'profile': 'प्रोफाइल',
    'wishlist': 'विशलिस्ट',
    'all_products': 'सभी उत्पाद',
    'contact_us': 'संपर्क करें',
    'helpline': 'हेल्पलाइन',
    'about_us': 'हमारे बारे में',
    'terms': 'सेवा की शर्तें'
  },
  ar: {
    'home': 'الرئيسية',
    'search': 'بحث',
    'cart': 'السلة',
    'profile': 'الملف الشخصي',
    'wishlist': 'قائمة الرغبات',
    'all_products': 'جميع المنتجات',
    'contact_us': 'اتصل بنا',
    'helpline': 'خط المساعدة'
  },
  es: {
    'home': 'Inicio',
    'search': 'Buscar',
    'cart': 'Carrito',
    'profile': 'Perfil',
    'wishlist': 'Deseos',
    'all_products': 'Productos',
    'contact_us': 'Contacto'
  },
  fr: {
    'home': 'Accueil',
    'search': 'Rechercher',
    'cart': 'Panier',
    'profile': 'Profil',
    'wishlist': 'Favoris',
    'all_products': 'Tous les produits',
    'contact_us': 'Contactez-nous'
  },
  de: {
    'home': 'Startseite',
    'search': 'Suche',
    'cart': 'Warenkorb',
    'profile': 'Profil',
    'wishlist': 'Wunschliste',
    'all_products': 'Alle Produkte'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const val = translations[language]?.[key];
    if (val) return val;
    if (key.includes('_')) {
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

