import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const Logo: React.FC<{ className?: string, scale?: number, centerOrigin?: boolean, showIcon?: boolean }> = ({ 
  className = '', 
  scale = 1, 
  centerOrigin = false,
  showIcon = true 
}) => {
  const [logoImg, setLogoImg] = useState<string>('');

  useEffect(() => {
    const unsubSeo = onSnapshot(doc(db, 'settings', 'seo'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const img = d.appIconUrl || d.logoUrl || d.faviconUrl;
        if (img) setLogoImg(img);
      }
    });

    const unsubPlatform = onSnapshot(doc(db, 'settings', 'platform'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.logoUrl) setLogoImg(d.logoUrl);
      }
    });

    return () => {
      unsubSeo();
      unsubPlatform();
    };
  }, []);

  return (
    <div 
      className={`inline-flex items-center gap-2 ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: centerOrigin ? 'center center' : 'left center' }}
    >
      {showIcon && logoImg && (
        <img 
          src={logoImg} 
          alt="Deep Shop Logo" 
          className="w-7 h-7 object-contain rounded-lg shadow-sm"
          onError={() => setLogoImg('')}
        />
      )}
      <h1 
        className="lowercase text-[28px] tracking-tight mt-0.5 text-zinc-900 dark:text-white"
        style={{ 
          fontFamily: "'Comfortaa', 'Righteous', cursive", 
          fontWeight: 800, 
          letterSpacing: '-0.02em'
        }}
      >
        deep shop
      </h1>
    </div>
  );
};

export default Logo;
