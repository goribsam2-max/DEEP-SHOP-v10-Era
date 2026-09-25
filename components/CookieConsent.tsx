import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
  const [showConsent, setShowConsent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isAccepted = localStorage.getItem('vibe_cookie_consent_accepted');
    if (!isAccepted) {
      // Show consent banner after a tiny delay
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('vibe_cookie_consent_accepted', 'true');
    setShowConsent(false);
  };

  const handleMoreDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/cookie-policy');
  };

  if (!showConsent) return null;

  return (
    <>
      <style>{`
        .ckW {
          position: fixed;
          left: 20px;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          background: #fffdfc;
          color: #08102b;
          padding: 20px;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 420px;
          border: 1px solid #eceff1;
          font-family: var(--font-sans), system-ui, sans-serif;
          animation: ckW-slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .dark .ckW, .drK .ckW {
          background: #18181b;
          color: #fffdfc;
          border-color: #27272a;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        }

        @media (min-width: 768px) {
          .ckW {
            left: auto;
            right: 24px;
            bottom: 24px;
          }
        }

        .ckA {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        .ckH {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #08102b;
        }

        .dark .ckH, .drK .ckH {
          color: #ffffff;
        }

        .ckD {
          font-size: 12px;
          line-height: 1.6;
          color: #52525b;
          font-weight: 500;
        }

        .dark .ckD, .drK .ckD {
          color: #a1a1aa;
        }

        .ckF {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: flex-start; /* Align to the left/start */
        }

        .ckB {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 22px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 50px; /* Full border-radius 50px */
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          outline: none;
          text-decoration: none;
        }

        #ckAccept {
          background: #2563eb; /* Royal blue for Accept in light mode */
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        #ckAccept:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        #ckAccept:active {
          transform: translateY(0);
        }

        .dark #ckAccept, .drK #ckAccept {
          background: #3b82f6; /* Modern light blue in dark mode */
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .dark #ckAccept:hover, .drK #ckAccept:hover {
          background: #60a5fa;
        }

        .ckF a.ckB {
          background: #f4f4f5;
          color: #18181b;
          border: 1px solid #e4e4e7;
        }

        .ckF a.ckB:hover {
          background: #e4e4e7;
          transform: translateY(-1px);
        }

        .dark .ckF a.ckB, .drK .ckF a.ckB {
          background: #27272a;
          color: #f4f4f5;
          border-color: #3f3f46;
        }

        .dark .ckF a.ckB:hover, .drK .ckF a.ckB:hover {
          background: #3f3f46;
        }

        @keyframes ckW-slideUp {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Cookies Consent HTML exact structure from XML */}
      <div className="ckW" id="ckWrap">
        <div className="ckA">
          <div className="ckH">Cookie Consent</div>
          <div className="ckD">
            We serve cookies on this site to analyze traffic, remember your preferences, and optimize your experience.
          </div>
        </div>
        <div className="ckF">
          <button className="ckB" id="ckAccept" onClick={handleAccept}>
            Accept
          </button>
          <a
            className="ckB"
            href="/cookie-policy"
            onClick={handleMoreDetails}
            title="Cookie Policy"
          >
            Learn More
          </a>
        </div>
      </div>
    </>
  );
};
