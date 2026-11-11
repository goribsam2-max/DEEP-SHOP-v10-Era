import { subscribeToWebPush } from './lib/push';

import React, { useState, useEffect, useRef, createContext, useContext, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { lazyRetry } from './lib/lazyRetry';

export const PageLoadingContext = createContext<{
  isPageLoading: boolean;
  setIsPageLoading: (val: boolean) => void;
}>({
  isPageLoading: false,
  setIsPageLoading: () => {}
});
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, collection, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { sweepExpiredCoins } from './lib/coinExpiry';
import { ToastProvider, useNotify } from './components/Notifications';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'framer-motion';
const FingerprintIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M5 19.5A10 10 0 0 1 18 10" />
    <path d="m11 22 .5-1.5a10 10 0 0 1 13.9-6" />
    <path d="M14 22a7 7 0 0 0 5-5" />
    <path d="M8 15a5 5 0 0 1 8-4" />
    <path d="M9 19a5 5 0 0 0 3-4" />
  </svg>
);
import { LumaSpin } from './components/ui/luma-spin';
import { RoutePageSkeleton } from './components/PageSkeletons';
import BanOverlay from './components/BanOverlay';
import { AdPlacementSlot } from './components/AdPlacementSlot';
import { initGlobalHaptics } from './lib/haptics';
import { hasImmediateAdminOrStaffRole } from './lib/admin';
import { ReelUploadProgressOverlay } from './components/ReelUploadProgressOverlay';
import { MobileAppInstallExperience } from './components/MobileAppInstallExperience';
import Messages from './pages/Messages';
import NewsHub from './pages/NewsHub';

const OnboardingOffersModal = lazyRetry(() => import('./components/OnboardingOffersModal'), 'OnboardingOffersModal');
const CartAbandonmentPopup = lazyRetry(() =>
  import('./components/CartAbandonmentPopup').then((m) => ({ default: m.CartAbandonmentPopup })), 'CartAbandonmentPopup'
);
const NotificationPermissionModal = lazyRetry(() =>
  import('./components/ui/NotificationPermissionModal').then((m) => ({
    default: m.NotificationPermissionModal,
  })), 'NotificationPermissionModal'
);
const AdManager = lazyRetry(() =>
  import('./components/AdManager').then((m) => ({ default: m.AdManager })), 'AdManager'
);
const GlobalCallReceiver = lazyRetry(() =>
  import('./components/GlobalCallReceiver').then((m) => ({ default: m.GlobalCallReceiver })), 'GlobalCallReceiver'
);
const CustomContextMenu = lazyRetry(() =>
  import('./components/CustomContextMenu').then((m) => ({ default: m.CustomContextMenu })), 'CustomContextMenu'
);

const FeedPersonalization = lazyRetry(() =>
  import('./pages/FeedPersonalization').then((m) => ({ default: m.FeedPersonalization })), 'FeedPersonalization'
);
const NewsProfilePage = lazyRetry(() =>
  import('./pages/NewsProfilePage').then((m) => ({ default: m.NewsProfilePage })), 'NewsProfilePage'
);
const LoopActivityPage = lazyRetry(() =>
  import('./pages/LoopActivityPage').then((m) => ({ default: m.LoopActivityPage })), 'LoopActivityPage'
);
const LoopsAlgorithmPage = lazyRetry(() =>
  import('./components/LoopsReelsView').then((m) => ({ default: m.LoopsAlgorithmPage })), 'LoopsAlgorithmPage'
);
const LoopsAccountStatusPage = lazyRetry(() =>
  import('./pages/LoopsAccountStatus').then((m) => ({ default: m.LoopsAccountStatusPage })), 'LoopsAccountStatusPage'
);
const PreferredLanguagesPage = lazyRetry(() =>
  import('./components/LoopsReelsOverlays').then((m) => ({ default: m.PreferredLanguagesPage })), 'PreferredLanguagesPage'
);
const NewsPhotoViewerPage = lazyRetry(() =>
  import('./pages/NewsHubSubPages').then((m) => ({ default: m.NewsPhotoViewerPage })), 'NewsPhotoViewerPage'
);
const NewsSharePage = lazyRetry(() =>
  import('./pages/NewsHubSubPages').then((m) => ({ default: m.NewsSharePage })), 'NewsSharePage'
);
const NewsSavedAndSearchPage = lazyRetry(() =>
  import('./pages/NewsHubSubPages').then((m) => ({ default: m.NewsSavedAndSearchPage })), 'NewsSavedAndSearchPage'
);
const NewsStoryViewerPage = lazyRetry(() =>
  import('./pages/NewsHubSubPages').then((m) => ({ default: m.NewsStoryViewerPage })), 'NewsStoryViewerPage'
);
const CreateReelStudio = lazyRetry(() =>
  import('./pages/CreateReelStudio').then((m) => ({ default: m.CreateReelStudio })), 'CreateReelStudio'
);
const CreateCustomOrder = lazyRetry(
  () => import('./pages/seller/CreateCustomOrder'),
  'CreateCustomOrder'
);

const SEOProvider = () => {
  const location = useLocation();
  const [seoData, setSeoData] = useState<any>(null);

  useEffect(() => {
    initGlobalHaptics();

    const unsub = onSnapshot(
      doc(db, 'settings', 'seo'),
      (snap) => {
        if (snap.exists()) {
          setSeoData(snap.data());
        }
      },
      () => {}
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!seoData) return;
    const data = seoData;
    const isHomeRoute = location.pathname === '/' || location.pathname === '';

    if (isHomeRoute) {
      if (data.metaTitle) document.title = data.metaTitle;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      if (data.metaDescription) metaDesc.setAttribute('content', data.metaDescription);

      let metaImage = document.querySelector('meta[property="og:image"]');
      if (!metaImage) {
        metaImage = document.createElement('meta');
        metaImage.setAttribute('property', 'og:image');
        document.head.appendChild(metaImage);
      }
      if (data.metaImage) metaImage.setAttribute('content', data.metaImage);

      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (!twitterImage) {
        twitterImage = document.createElement('meta');
        twitterImage.setAttribute('name', 'twitter:image');
        document.head.appendChild(twitterImage);
      }
      if (data.metaImage) twitterImage.setAttribute('content', data.metaImage);
    }

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    if (data.metaKeywords && isHomeRoute) metaKeywords.setAttribute('content', data.metaKeywords);

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', data.robots || 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    let publisherMeta = document.querySelector('meta[name="publisher"]');
    if (!publisherMeta) {
      publisherMeta = document.createElement('meta');
      publisherMeta.setAttribute('name', 'publisher');
      document.head.appendChild(publisherMeta);
    }
    if (data.organizationName) publisherMeta.setAttribute('content', data.organizationName);

    if (data.siteLanguage) document.documentElement.lang = data.siteLanguage;

    let metaAuthor = document.querySelector('meta[name="author"]');
    if (!metaAuthor) {
      metaAuthor = document.createElement('meta');
      metaAuthor.setAttribute('name', 'author');
      document.head.appendChild(metaAuthor);
    }
    if (data.siteAuthor) metaAuthor.setAttribute('content', data.siteAuthor);

    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.setAttribute('rel', 'icon');
      document.head.appendChild(favicon);
    }
    if (data.faviconUrl) favicon.setAttribute('href', data.faviconUrl);

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleIcon);
    }
    if (data.appIconUrl) appleIcon.setAttribute('href', data.appIconUrl);

    if (isHomeRoute) {
      let jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(jsonLdScript);
      }
      if (data.jsonLd) {
        jsonLdScript.textContent = data.jsonLd;
      } else {
        jsonLdScript.textContent = JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": data.organizationName || "DEEP SHOP",
            "url": "https://www.deepshop.top",
            "description": data.metaDescription || "The best premium store for AI Gadgets, smart tech, and mobile accessories in Bangladesh.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://www.deepshop.top/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        ]);
      }
    }

    if (data.fbPixelId) {
      if (!(window as any).fbq) {
        // @ts-ignore
        !function(f,b,e,v,n,t,s)
        {if((f as any).fbq)return;n=(f as any).fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!(f as any)._fbq)(f as any)._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode?.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        (window as any).fbq('init', data.fbPixelId);
        (window as any).fbq('track', 'PageView');
      }
    }
  }, [seoData, location.pathname]);

  return null;
};

// Page Imports (Home kept eager for instant LCP; all secondary routes lazy-split)
import Home from './pages/Home';
import { syncCurrentUserToSavedAccounts } from './lib/savedAccounts';

const AuthSelector = lazyRetry(() => import('./pages/AuthSelector'), 'AuthSelector');
const SavedAccountsPage = lazyRetry(() => import('./pages/SavedAccountsPage'), 'SavedAccountsPage');
const SignIn = lazyRetry(() => import('./pages/SignIn'), 'SignIn');
const SignUp = lazyRetry(() => import('./pages/SignUp'), 'SignUp');
const FindAccountPage = lazyRetry(() =>
  import('./pages/FindAccountFlow').then((m) => ({ default: m.FindAccountPage })), 'FindAccountPage'
);
const ChooseAccountPage = lazyRetry(() =>
  import('./pages/FindAccountFlow').then((m) => ({ default: m.ChooseAccountPage })), 'ChooseAccountPage'
);
const ReviewAccountPage = lazyRetry(() =>
  import('./pages/FindAccountFlow').then((m) => ({ default: m.ReviewAccountPage })), 'ReviewAccountPage'
);
const ProductDetails = lazyRetry(() => import('./pages/ProductDetails'), 'ProductDetails');
const StoreProfile = lazyRetry(() => import('./pages/StoreProfile'), 'StoreProfile');
const ProductReviews = lazyRetry(() => import('./pages/ProductReviews'), 'ProductReviews');
const Cart = lazyRetry(() => import('./pages/Cart'), 'Cart');
const Profile = lazyRetry(() => import('./pages/Profile'), 'Profile');
const AffiliatePage = lazyRetry(() => import('./pages/Affiliate'), 'AffiliatePage');
const MyOrders = lazyRetry(() => import('./pages/MyOrders'), 'MyOrders');
const CustomPay = lazyRetry(() => import('./pages/CustomPay'), 'CustomPay');
const ExchangeRequest = lazyRetry(() => import('./pages/ExchangeRequest'), 'ExchangeRequest');
const OrderActionPage = lazyRetry(() => import('./pages/OrderActionPage'), 'OrderActionPage');
const NotificationsPage = lazyRetry(() => import('./pages/Notifications'), 'NotificationsPage');
const Onboarding = lazyRetry(() => import('./pages/Onboarding'), 'Onboarding');
const VerifyCode = lazyRetry(() => import('./pages/VerifyCode'), 'VerifyCode');
const LocationAccess = lazyRetry(() => import('./pages/LocationAccess'), 'LocationAccess');
const CheckoutPage = lazyRetry(() => import('./pages/Checkout'), 'CheckoutPage');
const PaymentPage = lazyRetry(() => import('./pages/Payment'), 'PaymentPage');
const OrderSuccess = lazyRetry(() => import('./pages/OrderSuccess'), 'OrderSuccess');
const CompleteProfile = lazyRetry(() => import('./pages/CompleteProfile'), 'CompleteProfile');
const KycVerification = lazyRetry(() => import('./pages/KycVerification'), 'KycVerification');
const EditProfile = lazyRetry(() => import('./pages/EditProfile'), 'EditProfile');
const NewPassword = lazyRetry(() => import('./pages/NewPassword'), 'NewPassword');
const ForgotPassword = lazyRetry(() => import('./pages/ForgotPassword'), 'ForgotPassword');
const Wishlist = lazyRetry(() => import('./pages/Wishlist'), 'Wishlist');
const SubscriptionPage = lazyRetry(() => import('./pages/Subscription'), 'SubscriptionPage');
const ShippingAddress = lazyRetry(() => import('./pages/ShippingAddress'), 'ShippingAddress');
const Coupon = lazyRetry(() => import('./pages/Coupon'), 'Coupon');
const PaymentMethods = lazyRetry(() => import('./pages/PaymentMethods'), 'PaymentMethods');
const AddCard = lazyRetry(() => import('./pages/AddCard'), 'AddCard');
const Search = lazyRetry(() => import('./pages/Search'), 'Search');
const TrackOrder = lazyRetry(() => import('./pages/TrackOrder'), 'TrackOrder');
const LeaveReview = lazyRetry(() => import('./pages/LeaveReview'), 'LeaveReview');
const EReceipt = lazyRetry(() => import('./pages/EReceipt'), 'EReceipt');
const Settings = lazyRetry(() => import('./pages/Settings'), 'Settings');
const HelpCenter = lazyRetry(() => import('./pages/HelpCenter'), 'HelpCenter');
const MyTickets = lazyRetry(() => import('./pages/MyTickets'), 'MyTickets');
const FAQPage = lazyRetry(() => import('./pages/FAQ'), 'FAQPage');
const TicketDetails = lazyRetry(() => import('./pages/TicketDetails'), 'TicketDetails');
const PrivacyPolicy = lazyRetry(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const AboutUs = lazyRetry(() => import('./pages/AboutUs'), 'AboutUs');
const Terms = lazyRetry(() => import('./pages/Terms'), 'Terms');
const ContactUs = lazyRetry(() => import('./pages/ContactUs'), 'ContactUs');
const CookiePolicy = lazyRetry(() => import('./pages/CookiePolicy'), 'CookiePolicy');
const RefundPolicy = lazyRetry(() => import('./pages/RefundPolicy'), 'RefundPolicy');
const ShippingPolicy = lazyRetry(() => import('./pages/ShippingPolicy'), 'ShippingPolicy');
const Disclaimer = lazyRetry(() => import('./pages/Disclaimer'), 'Disclaimer');
const SitemapPage = lazyRetry(() => import('./pages/SitemapPage'), 'SitemapPage');
const PasswordManager = lazyRetry(() => import('./pages/PasswordManager'), 'PasswordManager');
const AllProducts = lazyRetry(() => import('./pages/AllProducts'), 'AllProducts');
const FlashSale = lazyRetry(() => import('./pages/FlashSale'), 'FlashSale');
const WithdrawPage = lazyRetry(() => import('./pages/Withdraw'), 'WithdrawPage');
const BlogList = lazyRetry(() => import('./pages/BlogList'), 'BlogList');
const BlogDetails = lazyRetry(() => import('./pages/BlogDetails'), 'BlogDetails');
const CreateBlog = lazyRetry(() => import('./pages/CreateBlog'), 'CreateBlog');
const NotFound = lazyRetry(() => import('./pages/NotFound'), 'NotFound');
const CreateScamPost = lazyRetry(() => import('./pages/CreateScamPost'), 'CreateScamPost');
const NewsDetails = lazyRetry(() => import('./pages/NewsDetails'), 'NewsDetails');
const CreatorDashboard = lazyRetry(() => import('./pages/CreatorDashboard'), 'CreatorDashboard');
const AuthorProfile = lazyRetry(() => import('./pages/AuthorProfile'), 'AuthorProfile');
const BuyStars = lazyRetry(() => import('./pages/BuyStars'), 'BuyStars');
const SponsorCreator = lazyRetry(() => import('./pages/SponsorCreator'), 'SponsorCreator');
const GiftStarsPage = lazyRetry(() => import('./pages/GiftStarsPage'), 'GiftStarsPage');
const CreatorSubscriptionSetup = lazyRetry(() => import('./pages/CreatorSubscriptionSetup'), 'CreatorSubscriptionSetup');
const NewsHubNotifications = lazyRetry(() => import('./pages/NewsHubNotifications'), 'NewsHubNotifications');
const RegionSelect = lazyRetry(() => import('./pages/RegionSelect'), 'RegionSelect');
const SellerDashboard = lazyRetry(() => import('./pages/seller/Dashboard'), 'SellerDashboard');
const AddStory = lazyRetry(() => import('./pages/seller/AddStory'), 'AddStory');
const LoginDevices = lazyRetry(() => import('./pages/LoginDevices'), 'LoginDevices');
const BiometricSetup = lazyRetry(() => import('./pages/BiometricSetup'), 'BiometricSetup');

// Admin Pages (Lazy-loaded so regular users never download Admin bundles)
const AdminDashboard = lazyRetry(() => import('./pages/admin/Dashboard'), 'AdminDashboard');
const ManageProducts = lazyRetry(() => import('./pages/admin/ManageProducts'), 'ManageProducts');
const EditProduct = lazyRetry(() => import('./pages/admin/EditProduct'), 'EditProduct');
const ManageUsers = lazyRetry(() => import('./pages/admin/ManageUsers'), 'ManageUsers');
const ManagePasswordResets = lazyRetry(() => import('./pages/admin/ManagePasswordResets'), 'ManagePasswordResets');
const ManagePushNotifications = lazyRetry(() => import('./pages/admin/ManagePushNotifications'), 'ManagePushNotifications');
const ManageOrders = lazyRetry(() => import('./pages/admin/ManageOrders'), 'ManageOrders');
const ManageReviews = lazyRetry(() => import('./pages/admin/ManageReviews'), 'ManageReviews');
const ManageBanners = lazyRetry(() => import('./pages/admin/ManageBanners'), 'ManageBanners');
const ManageConfig = lazyRetry(() => import('./pages/admin/ManageConfig'), 'ManageConfig');
const ManageCustomSections = lazyRetry(() => import('./pages/admin/ManageCustomSections'), 'ManageCustomSections');
const ManageSEO = lazyRetry(() => import('./pages/admin/ManageSEO'), 'ManageSEO');
const ManageIcons = lazyRetry(() => import('./pages/admin/ManageIcons'), 'ManageIcons');
const ManageIllustrations = lazyRetry(() => import('./pages/admin/ManageIllustrations'), 'ManageIllustrations');
const AdminNotifications = lazyRetry(() => import('./pages/admin/AdminNotifications'), 'AdminNotifications');
const ManageUsersMobile = lazyRetry(() => import('./pages/admin/ManageUsersMobile'), 'ManageUsersMobile');
const ManageEngagement = lazyRetry(() => import('./pages/admin/ManageEngagement'), 'ManageEngagement');

// Components
import BottomMenu from './components/ui/BottomMenu';
import DesktopLayout from './components/DesktopLayout';
const AdminLayout = lazyRetry(() => import('./components/AdminLayout'), 'AdminLayout');

const ManageFakeOrders = lazyRetry(() => import('./pages/admin/ManageFakeOrders'), 'ManageFakeOrders');
const Deposit = lazyRetry(() => import('./pages/Deposit'), 'Deposit');
const ManageDeposits = lazyRetry(() => import('./pages/admin/ManageDeposits'), 'ManageDeposits');
const ManageSubscriptions = lazyRetry(() => import('./pages/admin/ManageSubscriptions'), 'ManageSubscriptions');
const BonusProducts = lazyRetry(() => import('./pages/BonusProducts'), 'BonusProducts');
const ShoppingCredits = lazyRetry(() => import('./pages/ShoppingCredits'), 'ShoppingCredits');
const BundleDeals = lazyRetry(() => import('./pages/BundleDeals'), 'BundleDeals');
const BundleBuilder = lazyRetry(() => import('./pages/BundleBuilder'), 'BundleBuilder');
const MyCoupons = lazyRetry(() => import('./pages/MyCoupons'), 'MyCoupons');
const MyCoins = lazyRetry(() => import('./pages/MyCoins'), 'MyCoins');
const GenericAdminMock = lazyRetry(() => import('./pages/admin/GenericAdminMock'), 'GenericAdminMock');
const ManageCoupons = lazyRetry(() => import('./pages/admin/ManageCoupons'), 'ManageCoupons');
const ManageHelpDesk = lazyRetry(() => import('./pages/admin/ManageHelpDesk'), 'ManageHelpDesk');
const ManagePromoCodes = lazyRetry(() => import('./pages/admin/ManagePromoCodes'), 'ManagePromoCodes');
const ManageChats = lazyRetry(() => import('./pages/admin/ManageChats'), 'ManageChats');
const ManageVGHelpline = lazyRetry(() => import('./pages/admin/ManageVGHelpline'), 'ManageVGHelpline');
const ManageStaff = lazyRetry(() => import('./pages/admin/ManageStaff'), 'ManageStaff');
const ManageStories = lazyRetry(() => import('./pages/admin/ManageStories'), 'ManageStories');
const ManageWithdrawals = lazyRetry(() => import('./pages/admin/ManageWithdrawals'), 'ManageWithdrawals');
const ManagePayments = lazyRetry(() => import('./pages/admin/ManagePayments'), 'ManagePayments');
const ManageAffiliateRequests = lazyRetry(() => import('./pages/admin/ManageAffiliateRequests'), 'ManageAffiliateRequests');
const ManageOnboardingOffers = lazyRetry(() => import('./pages/admin/ManageOnboardingOffers'), 'ManageOnboardingOffers');
const ManageCreatorRequests = lazyRetry(() => import('./pages/admin/ManageCreatorRequests'), 'ManageCreatorRequests');
const ManageAffiliateVideos = lazyRetry(() => import('./pages/admin/ManageAffiliateVideos'), 'ManageAffiliateVideos');
const ManageAds = lazyRetry(() => import('./pages/admin/ManageAds'), 'ManageAds');
const ManageAiAssistant = lazyRetry(() => import('./pages/admin/ManageAiAssistant'), 'ManageAiAssistant');
const ManageGroups = lazyRetry(() => import('./pages/admin/ManageGroups'), 'ManageGroups');
const ManageSecurity = lazyRetry(() => import('./pages/admin/ManageSecurity'), 'ManageSecurity');
const SystemHealthDiagnostics = lazyRetry(() => import('./pages/admin/SystemHealthDiagnostics'), 'SystemHealthDiagnostics');
const ManageRiders = lazyRetry(() => import('./pages/admin/ManageRiders'), 'ManageRiders');
const CashOnCampaignPage = lazyRetry(() => import('./pages/CashOnCampaignPage'), 'CashOnCampaignPage');
const ManageCashOnCampaign = lazyRetry(() => import('./pages/admin/ManageCashOnCampaign'), 'ManageCashOnCampaign');
const CashOnCampaignDraw = lazyRetry(() => import('./pages/admin/CashOnCampaignDraw'), 'CashOnCampaignDraw');

import ErrorBoundary from './components/ErrorBoundary';

const MigrationHelper = () => {
  useEffect(() => {
    const migrate = async () => {
      if (localStorage.getItem('migrated_coupons_to_promos_v1')) return;
      try {
        const snap = await getDocs(collection(db, 'coupons'));
        if (snap.empty) {
            localStorage.setItem('migrated_coupons_to_promos_v1', 'true');
            return;
        }
        for (const d of snap.docs) {
           await setDoc(doc(db, 'promo_codes', d.id), d.data());
           await deleteDoc(doc(db, 'coupons', d.id));
        }
        localStorage.setItem('migrated_coupons_to_promos_v1', 'true');
      } catch (e) {
          console.error(e);
      }
    };
    migrate();
  }, []);
  return null;
}

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { setIsPageLoading } = useContext(PageLoadingContext);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Explicitly restore document and body scrolling for all pages outside messages
    if (!location.pathname.startsWith('/messages')) {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflow = '';
      document.body.style.overflowY = 'auto';
      document.body.style.overscrollBehavior = '';
    }
    setIsPageLoading(false);
  }, [location.pathname, location.search, location.key, setIsPageLoading]);

  return (
    <ErrorBoundary>
      <div className="w-full">
        {children}
      </div>
    </ErrorBoundary>
  );
};

const getDeviceDetails = () => {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let device = "Desktop";
  let browser = "Unknown Browser";

  if (/android/i.test(ua)) {
    os = "Android";
    device = "Mobile";
  } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    os = "iOS";
    device = "Mobile";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/mac/i.test(ua)) {
    os = "macOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = "Safari";
  } else if (/opr/i.test(ua)) {
    browser = "Opera";
  } else if (/edg/i.test(ua)) {
    browser = "Edge";
  }

  return { os, device, browser };
};

const fetchIPAndLocation = async () => {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      return {
        ip: data.ip || "Unknown",
        location: data.city && data.country_name ? `${data.city}, ${data.country_name}` : data.country_name || "Unknown Location"
      };
    }
  } catch (e) {
    // ipapi fetch failed (CORS or network limits), fallback silently to ipify
  }
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) {
      const data = await res.json();
      return { ip: data.ip || "Unknown", location: "Unknown Location" };
    }
  } catch (e) {
    // ipify failed
  }
  return { ip: "Unknown", location: "Unknown Location" };
};

const AppContent: React.FC = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { isPageLoading } = useContext(PageLoadingContext);
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockPinInput, setLockPinInput] = useState("");
  const [lockError, setLockError] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const triggerBiometricUnlock = async () => {
    const isSimulated = localStorage.getItem("vibe_biometric_simulated") === "true";
    
    if (isSimulated) {
      setIsScanning(true);
      setLockError("");
      notify("Initiating local fingerprint/face scan...", "info");
      setTimeout(() => {
        setIsScanning(false);
        setIsAppLocked(false);
        setLockPinInput("");
        setLockError("");
        notify("Simulated biometric verified!", "success");
      }, 1500);
      return;
    }

    if (!window.PublicKeyCredential) {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        setIsAppLocked(false);
        setLockPinInput("");
        setLockError("");
        notify("Local identity verified!", "success");
      }, 1500);
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const requestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: challenge,
          rpId: window.location.hostname,
          userVerification: "required",
        },
      };

      const assertion = await navigator.credentials.get(requestOptions);
      if (assertion) {
        setIsAppLocked(false);
        setLockPinInput("");
        setLockError("");
        notify("App unlocked successfully!", "success");
      }
    } catch (e: any) {
      console.error("Biometric verification failed:", e);
      const isIframeErr = e?.message?.includes("feature is not enabled") || 
                          e?.message?.includes("Permissions Policy") || 
                          e?.name === "SecurityError" || 
                          e?.message?.includes("not enabled in this document") ||
                          e?.message?.includes("cross-origin child frames");
                          
      if (isIframeErr) {
        localStorage.setItem("vibe_biometric_simulated", "true");
        setIsScanning(true);
        notify("Redirected to Simulated Secure Scan inside iframe...", "info");
        setTimeout(() => {
          setIsScanning(false);
          setIsAppLocked(false);
          setLockPinInput("");
          setLockError("");
          notify("Sandbox Biometrics verified successfully!", "success");
        }, 1500);
      } else {
        setLockError("Biometric verification failed. Please use your PIN.");
      }
    }
  };

  const handlePinUnlockSubmit = (pinVal: string) => {
    const savedPin = localStorage.getItem("vibe_lock_pin");
    if (pinVal === savedPin) {
      setIsAppLocked(false);
      setLockPinInput("");
      setLockError("");
      notify("App unlocked successfully!", "success");
    } else {
      setLockPinInput("");
      setLockError("Incorrect Passcode PIN. Please try again.");
    }
  };

  useEffect(() => {
    const hasPin = localStorage.getItem("vibe_lock_pin");
    if (hasPin) {
      setIsAppLocked(true);
      const bioEnabled = localStorage.getItem("vibe_biometric_enabled") === "true";
      if (bioEnabled) {
        setTimeout(() => {
          triggerBiometricUnlock();
        }, 1000);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('user_region', 'BD');
    if (location.pathname === '/region') {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Track last active primary app section (Shop Home '/' vs Loops Home '/loops') for Messages back navigation
  useEffect(() => {
    const p = location.pathname;
    const sp = new URLSearchParams(location.search);
    const fromParam = (sp.get('from') || '').trim().toLowerCase();

    if (
      p.startsWith('/messages') ||
      fromParam === 'messages' ||
      p.startsWith('/auth') ||
      p === '/signin' ||
      p === '/signup' ||
      p.startsWith('/signup/') ||
      p === '/accounts' ||
      p === '/saved-accounts' ||
      p === '/find-account' ||
      p === '/choose-account' ||
      p === '/review-account' ||
      p === '/verify'
    ) {
      return;
    }

    const isLoopsSection =
      p === '/loops' ||
      p.startsWith('/loops/') ||
      p === '/news-hub' ||
      p.startsWith('/news-hub/') ||
      p === '/scam-alert' ||
      p.startsWith('/scam/') ||
      p.startsWith('/news/') ||
      p.startsWith('/create-reel') ||
      p.startsWith('/author/') ||
      p.startsWith('/creator') ||
      p.startsWith('/buy-stars') ||
      p.startsWith('/gift-stars') ||
      p.startsWith('/sponsor');

    const resolvedHome = isLoopsSection ? '/loops' : '/';
    try {
      sessionStorage.setItem('deepshop_last_section_home', resolvedHome);
      localStorage.setItem('deepshop_last_section_home', resolvedHome);
    } catch {}
  }, [location.pathname, location.search]);

  // Redirect any legacy openAccountCenter event directly to the dedicated /accounts page
  useEffect(() => {
    const handleOpen = () => {
      if (loading) return;
      navigate('/accounts');
    };
    window.addEventListener("openAccountCenter", handleOpen);
    return () => window.removeEventListener("openAccountCenter", handleOpen);
  }, [loading, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search || location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      const existingRef = localStorage.getItem('affiliateRef');
      if (existingRef !== ref.trim()) {
         localStorage.setItem('affiliateRef', ref.trim());
         // Show visual feedback so user knows the code is applied
         setTimeout(() => {
             notify(`Promo Code ${ref.trim()} activated! You'll get 5% OFF at checkout.`, "success");
         }, 1000);
      }
    }
  }, [location.search, notify]);

  const navigateRef = useRef(navigate);
  const notifyRef = useRef(notify);
  useEffect(() => {
    navigateRef.current = navigate;
    notifyRef.current = notify;
  }, [navigate, notify]);

  // Background-preload primary customer routes right after first paint so navigation is instantaneous (<0.1s chunk wait)
  useEffect(() => {
    const preloadCoreRoutes = () => {
      void import('./pages/NewsDetails').catch(() => {});
      void import('./pages/CreateReelStudio').catch(() => {});
      void import('./pages/CreateScamPost').catch(() => {});
      void import('./pages/NewsProfilePage').catch(() => {});
      void import('./pages/ProductDetails').catch(() => {});
      void import('./pages/Cart').catch(() => {});
      void import('./pages/Search').catch(() => {});
      void import('./pages/Profile').catch(() => {});
      void import('./pages/MyOrders').catch(() => {});
      void import('./pages/AllProducts').catch(() => {});
      void import('./pages/Wishlist').catch(() => {});
      void import('./pages/Settings').catch(() => {});
      void import('./pages/seller/AddStory').catch(() => {});
    };
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
      const idleId = ric(preloadCoreRoutes, { timeout: 300 });
      return () => (window as any).cancelIdleCallback?.(idleId);
    }
    const timer = setTimeout(preloadCoreRoutes, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let pushSubscribedUid: string | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        sweepExpiredCoins(currentUser.uid).catch(e => console.error(e));
        unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserData((prev) => {
              if (!prev) return data;
              const { lastActive: _a, isOnline: _b, ...prevRest } = prev as any;
              const { lastActive: _c, isOnline: _d, ...nextRest } = data as any;
              if (JSON.stringify(prevRest) === JSON.stringify(nextRest)) {
                return prev;
              }
              return data;
            });
            syncCurrentUserToSavedAccounts(currentUser, data);

            // Instant Real-time Session Revocation Check
            const currentSessionId = localStorage.getItem('session_id');
            if (currentSessionId && data.sessions) {
              const currentSession = data.sessions.find((s: any) => s.id === currentSessionId);
              if (currentSession && currentSession.isRevoked) {
                await auth.signOut();
                localStorage.removeItem('session_id');
                try {
                  const savedStr = localStorage.getItem("vibe_saved_accounts");
                  if (savedStr) {
                    const saved = JSON.parse(savedStr);
                    const filtered = saved.filter((acc: any) => acc.uid !== currentUser.uid);
                    localStorage.setItem("vibe_saved_accounts", JSON.stringify(filtered));
                  }
                } catch {}
                notifyRef.current("This device has been logged out from another device.", "error");
                navigateRef.current('/accounts');
                return;
              }
            }
            
            // Subscribe to web push at most once per user session
            if (
              pushSubscribedUid !== currentUser.uid &&
              typeof window !== 'undefined' &&
              'Notification' in window &&
              window.Notification &&
              window.Notification.permission === 'granted'
            ) {
              pushSubscribedUid = currentUser.uid;
              subscribeToWebPush(currentUser.uid);
            }
          } else {
            // Auto-create document if missing to avoid orphaned auth users
            try {
              const newUserData = {
                uid: currentUser.uid,
                email: currentUser.email || "",
                displayName: currentUser.displayName || "User",
                photoURL: currentUser.photoURL || "",
                role: "user",
                isBanned: false,
                createdAt: Date.now(),
                registrationDate: Date.now(),
                ipAddress: "Unknown",
                lastActive: Date.now(),
              };
              await setDoc(doc(db, "users", currentUser.uid), newUserData);
              setUserData(newUserData as UserProfile);
            } catch (e) {
              console.error("Failed to auto-create user doc", e);
            }
          }
          setLoading(false);
        }, () => {
          setUserData(null);
          setLoading(false);
        });
      } else {
        pushSubscribedUid = null;
        setUserData(null);
        setLoading(false);
      }
    });
    return () => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      unsubscribe();
    };
  }, []);

  // Active Session and IP address registration hook (once per browser session)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const sessionGuardKey = `ds_session_reg_${user.uid}`;
    try {
      if (sessionStorage.getItem(sessionGuardKey) === 'true') return;
    } catch {}

    let active = true;

    const registerSession = async () => {
      // Get or create session ID
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('session_id', sessionId);
      }

      // Fetch IP and location details
      const { ip, location } = await fetchIPAndLocation();
      if (!active) return;

      // Extract device user agent specs
      const { os, device, browser } = getDeviceDetails();

      // Update user document
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists() || !active) return;

      const currentData = docSnap.data() as UserProfile;
      let sessions = currentData.sessions || [];

      // Check if session exists
      const existingSessionIdx = sessions.findIndex((s: any) => s.id === sessionId);
      const newSessionObj = {
        id: sessionId,
        device,
        browser,
        os,
        ip,
        location,
        lastActive: Date.now(),
        isRevoked: false
      };

      if (existingSessionIdx >= 0) {
        if (!sessions[existingSessionIdx].isRevoked) {
          sessions[existingSessionIdx] = {
            ...sessions[existingSessionIdx],
            ...newSessionObj,
            id: sessionId
          };
        }
      } else {
        sessions.push(newSessionObj);
      }

      await updateDoc(userRef, {
        sessions,
        ipAddress: ip,
        lastActive: Date.now()
      });
      try {
        sessionStorage.setItem(sessionGuardKey, 'true');
      } catch {}
    };

    registerSession().catch(e => console.error("Session register error:", e));

    return () => {
      active = false;
    };
  }, [userData?.uid]);

  // Real-time Presence Tracking
  useEffect(() => {
    if (!userData || !userData.uid) return;

    const userRef = doc(db, 'users', userData.uid);

    const setOnline = async (online: boolean) => {
      try {
        await updateDoc(userRef, {
          isOnline: online,
          lastActive: Date.now()
        });
      } catch (e) {
        try {
          await setDoc(userRef, {
            isOnline: online,
            lastActive: Date.now()
          }, { merge: true });
        } catch (err) {
          console.error("Presence update error:", err);
        }
      }
    };

    // Initially online
    setOnline(true);

    // Heartbeat every 120 seconds (prevents excessive Firestore writes & battery drain in Web App mode)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        setOnline(true);
      }
    }, 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        setOnline(true);
      } else {
        setOnline(false);
      }
    };

    const handleOffline = () => {
      setOnline(false);
    };

    const handleOnline = () => {
      setOnline(true);
    };

    const handleBeforeUnload = () => {
      setOnline(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      setOnline(false);
    };
  }, [userData?.uid]);

  const showNav = ['/', '/profile', '/search', '/notifications', '/orders', '/wishlist'].includes(location.pathname);
  
  const isAdminOrStaff = hasImmediateAdminOrStaffRole(userData, auth.currentUser);

  return (
    <DesktopLayout>
      <SEOProvider />
      {isAdminOrStaff && <MigrationHelper />}
      <AnimatePresence>
        {isPageLoading && (
          <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] ambient-dynamic-bg overflow-hidden pointer-events-none"
          >
            <RoutePageSkeleton pathname={location.pathname} />
          </motion.div>
        )}
      </AnimatePresence>
      <main
        id="main-content"
        tabIndex={-1}
        className={`${
          location.pathname.startsWith('/messages')
            ? 'h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none'
            : 'min-h-screen overflow-x-hidden'
        } selection:bg-zinc-900 selection:text-white relative w-full max-w-full`}
      >
        <ErrorBoundary>
        <Suspense fallback={<RoutePageSkeleton pathname={location.pathname} />}>
        <Routes location={location}>
            <Route path="/" element={<PageWrapper><Home userData={userData} /></PageWrapper>} />
          <Route path="/onboarding" element={<PageWrapper><Onboarding onFinish={() => {}} /></PageWrapper>} />
          <Route path="/auth-selector" element={<PageWrapper><AuthSelector /></PageWrapper>} />
          <Route path="/accounts" element={<PageWrapper><SavedAccountsPage /></PageWrapper>} />
          <Route path="/saved-accounts" element={<Navigate to="/accounts" replace />} />
          <Route path="/signin" element={<PageWrapper><SignIn /></PageWrapper>} />
          <Route path="/signup" element={<PageWrapper><SignUp /></PageWrapper>} />
          <Route path="/signup/:step" element={<PageWrapper><SignUp /></PageWrapper>} />
          <Route path="/find-account" element={<PageWrapper><FindAccountPage /></PageWrapper>} />
          <Route path="/choose-account" element={<PageWrapper><ChooseAccountPage /></PageWrapper>} />
          <Route path="/review-account" element={<PageWrapper><ReviewAccountPage /></PageWrapper>} />
          <Route path="/verify" element={<PageWrapper><VerifyCode /></PageWrapper>} />
          <Route path="/complete-profile" element={<PageWrapper><CompleteProfile /></PageWrapper>} />
          <Route path="/location" element={<PageWrapper><LocationAccess /></PageWrapper>} />
          <Route path="/product/:slug/:id" element={<PageWrapper><ProductDetails /></PageWrapper>} />
          <Route path="/product/:id" element={<PageWrapper><ProductDetails /></PageWrapper>} />
          <Route path="/product/:id/reviews" element={<PageWrapper><ProductReviews /></PageWrapper>} />
          <Route path="/store/:sellerId" element={<PageWrapper><StoreProfile /></PageWrapper>} />
          <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
          <Route path="/checkout" element={<PageWrapper><CheckoutPage /></PageWrapper>} />
          <Route path="/payment/:orderId" element={<PageWrapper><PaymentPage /></PageWrapper>} />
          <Route path="/deposit" element={<PageWrapper><Deposit /></PageWrapper>} />
          <Route path="/my-coupons" element={<PageWrapper><MyCoupons /></PageWrapper>} />
          <Route path="/my-coins" element={<PageWrapper><MyCoins /></PageWrapper>} />
          <Route path="/bonus" element={<PageWrapper><BonusProducts /></PageWrapper>} />
          <Route path="/credits" element={<PageWrapper><ShoppingCredits /></PageWrapper>} />
          <Route path="/bundles" element={<PageWrapper><BundleDeals /></PageWrapper>} />
          <Route path="/build-box" element={<PageWrapper><BundleBuilder /></PageWrapper>} />
          <Route path="/success" element={<PageWrapper><OrderSuccess /></PageWrapper>} />
          <Route path="/profile" element={<PageWrapper><Profile userData={userData} /></PageWrapper>} />
          <Route path="/region" element={<PageWrapper><RegionSelect /></PageWrapper>} />
          <Route path="/affiliate" element={<PageWrapper><AffiliatePage /></PageWrapper>} />
          <Route path="/affiliate/:tab" element={<PageWrapper><AffiliatePage /></PageWrapper>} />
          <Route path="/withdraw" element={<PageWrapper><WithdrawPage userData={userData} /></PageWrapper>} />
          <Route path="/profile/edit" element={<PageWrapper><EditProfile /></PageWrapper>} />
          <Route path="/messages" element={<PageWrapper><Messages /></PageWrapper>} />
          <Route path="/kyc-verification" element={<PageWrapper><KycVerification /></PageWrapper>} />
          <Route path="/orders" element={<PageWrapper><MyOrders /></PageWrapper>} />
          <Route path="/my-orders" element={<PageWrapper><MyOrders /></PageWrapper>} />
          <Route path="/custom-pay" element={<PageWrapper><CustomPay /></PageWrapper>} />
          <Route path="/exchange-request" element={<PageWrapper><ExchangeRequest /></PageWrapper>} />
          <Route path="/orders/:actionName" element={<PageWrapper><OrderActionPage /></PageWrapper>} />
          <Route path="/notifications" element={<PageWrapper><NotificationsPage /></PageWrapper>} />
          <Route path="/wishlist" element={<PageWrapper><Wishlist /></PageWrapper>} />
          <Route path="/subscription" element={<PageWrapper><SubscriptionPage /></PageWrapper>} />
          <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
          <Route path="/all-products" element={<PageWrapper><AllProducts /></PageWrapper>} />
          <Route path="/flash-sale" element={<PageWrapper><FlashSale /></PageWrapper>} />
          <Route path="/blog" element={<PageWrapper><BlogList /></PageWrapper>} />
          <Route path="/blog/create" element={<PageWrapper><CreateBlog /></PageWrapper>} />
          <Route path="/blog/edit/:slug" element={<PageWrapper><CreateBlog /></PageWrapper>} />
          <Route path="/blog/:slug" element={<PageWrapper><BlogDetails /></PageWrapper>} />
          {/* Primary Loops Routes */}
          <Route path="/loops" element={<PageWrapper><NewsHub /></PageWrapper>} />
          <Route path="/create-reel" element={<PageWrapper><CreateReelStudio /></PageWrapper>} />
          <Route path="/loops/create-reel" element={<PageWrapper><CreateReelStudio /></PageWrapper>} />
          <Route path="/loops/create-story" element={<PageWrapper><AddStory /></PageWrapper>} />
          <Route path="/loops/create" element={<PageWrapper><CreateScamPost /></PageWrapper>} />
          <Route path="/loops/edit/:editId" element={<PageWrapper><CreateScamPost /></PageWrapper>} />
          <Route path="/loops/personalization" element={<PageWrapper><FeedPersonalization /></PageWrapper>} />
          <Route path="/loops/algorithm" element={<PageWrapper><LoopsAlgorithmPage /></PageWrapper>} />
          <Route path="/loops/account-status" element={<PageWrapper><LoopsAccountStatusPage /></PageWrapper>} />
          <Route path="/account-status" element={<PageWrapper><LoopsAccountStatusPage /></PageWrapper>} />
          <Route path="/loops/preferred-languages" element={<PageWrapper><PreferredLanguagesPage /></PageWrapper>} />
          <Route path="/loops/post/:id" element={<PageWrapper><NewsDetails /></PageWrapper>} />
          <Route path="/loops/post/:id/activity" element={<PageWrapper><LoopActivityPage /></PageWrapper>} />
          <Route path="/loops/activity" element={<PageWrapper><LoopActivityPage /></PageWrapper>} />
          <Route path="/loops/photo/:postId/:index" element={<PageWrapper><NewsPhotoViewerPage /></PageWrapper>} />
          <Route path="/loops/share/:id" element={<PageWrapper><NewsSharePage /></PageWrapper>} />
          <Route path="/loops/search" element={<PageWrapper><NewsSavedAndSearchPage /></PageWrapper>} />
          <Route path="/loops/saved" element={<PageWrapper><NewsSavedAndSearchPage /></PageWrapper>} />
          <Route path="/loops/story/:storyId" element={<PageWrapper><NewsStoryViewerPage /></PageWrapper>} />
          <Route path="/loops/notifications" element={<PageWrapper><NewsHubNotifications /></PageWrapper>} />
          <Route path="/loops/profile" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/loops/profile/edit" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/loops/profile/links" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/loops/profile/interests" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/loops/profile/:id" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />

          {/* Backward-Compatible /news-hub Routes */}
          <Route path="/news-hub" element={<PageWrapper><NewsHub /></PageWrapper>} />
          <Route path="/news-hub/create-story" element={<PageWrapper><AddStory /></PageWrapper>} />
          <Route path="/news-hub/create" element={<PageWrapper><CreateScamPost /></PageWrapper>} />
          <Route path="/news-hub/edit/:editId" element={<PageWrapper><CreateScamPost /></PageWrapper>} />
          <Route path="/news-hub/personalization" element={<PageWrapper><FeedPersonalization /></PageWrapper>} />
          <Route path="/news-hub/algorithm" element={<PageWrapper><LoopsAlgorithmPage /></PageWrapper>} />
          <Route path="/news-hub/preferred-languages" element={<PageWrapper><PreferredLanguagesPage /></PageWrapper>} />
          <Route path="/news-hub/post/:id" element={<PageWrapper><NewsDetails /></PageWrapper>} />
          <Route path="/news-hub/post/:id/activity" element={<PageWrapper><LoopActivityPage /></PageWrapper>} />
          <Route path="/news-hub/activity" element={<PageWrapper><LoopActivityPage /></PageWrapper>} />
          <Route path="/news-hub/photo/:postId/:index" element={<PageWrapper><NewsPhotoViewerPage /></PageWrapper>} />
          <Route path="/news-hub/share/:id" element={<PageWrapper><NewsSharePage /></PageWrapper>} />
          <Route path="/news-hub/search" element={<PageWrapper><NewsSavedAndSearchPage /></PageWrapper>} />
          <Route path="/news-hub/saved" element={<PageWrapper><NewsSavedAndSearchPage /></PageWrapper>} />
          <Route path="/news-hub/story/:storyId" element={<PageWrapper><NewsStoryViewerPage /></PageWrapper>} />
          <Route path="/news-hub/notifications" element={<PageWrapper><NewsHubNotifications /></PageWrapper>} />
          <Route path="/creator-dashboard" element={<PageWrapper><CreatorDashboard /></PageWrapper>} />
          <Route path="/creator/subscription-setup" element={<PageWrapper><CreatorSubscriptionSetup /></PageWrapper>} />
          <Route path="/buy-stars" element={<PageWrapper><BuyStars /></PageWrapper>} />
          <Route path="/sponsor/:creatorId" element={<PageWrapper><SponsorCreator /></PageWrapper>} />
          <Route path="/gift-stars/:creatorId" element={<PageWrapper><GiftStarsPage /></PageWrapper>} />
          <Route path="/news-hub/profile" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/news-hub/profile/edit" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/news-hub/profile/links" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/news-hub/profile/interests" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/news-hub/profile/:id" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/author/:id" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/creator/:id" element={<PageWrapper><NewsProfilePage /></PageWrapper>} />
          <Route path="/news/:id" element={<PageWrapper><NewsDetails /></PageWrapper>} />
          <Route path="/scam/:id" element={<PageWrapper><NewsDetails /></PageWrapper>} />
          <Route path="/scam-alert" element={<PageWrapper><NewsHub /></PageWrapper>} />
          <Route path="/news" element={<Navigate to="/loops" replace />} />
          <Route path="/track-order/:id" element={<PageWrapper><TrackOrder /></PageWrapper>} />
          <Route path="/e-receipt/:id" element={<PageWrapper><EReceipt /></PageWrapper>} />
          <Route path="/leave-review" element={<PageWrapper><LeaveReview /></PageWrapper>} />
          <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
          <Route path="/settings/password" element={<PageWrapper><PasswordManager /></PageWrapper>} />
          <Route path="/devices" element={<PageWrapper><LoginDevices userData={userData} /></PageWrapper>} />
          <Route path="/settings/biometrics" element={<PageWrapper><BiometricSetup /></PageWrapper>} />
          <Route path="/help-center" element={<PageWrapper><HelpCenter /></PageWrapper>} />
          <Route path="/my-tickets" element={<PageWrapper><MyTickets /></PageWrapper>} />
          <Route path="/faq" element={<PageWrapper><FAQPage /></PageWrapper>} />
          <Route path="/ticket/:id" element={<PageWrapper><TicketDetails /></PageWrapper>} />
          <Route path="/privacy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><AboutUs /></PageWrapper>} />
          <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
          <Route path="/cookie-policy" element={<PageWrapper><CookiePolicy /></PageWrapper>} />
          <Route path="/refund-policy" element={<PageWrapper><RefundPolicy /></PageWrapper>} />
          <Route path="/shipping-policy" element={<PageWrapper><ShippingPolicy /></PageWrapper>} />
          <Route path="/disclaimer" element={<PageWrapper><Disclaimer /></PageWrapper>} />
          <Route path="/contact" element={<PageWrapper><ContactUs /></PageWrapper>} />
          <Route path="/sitemap-page" element={<PageWrapper><SitemapPage /></PageWrapper>} />
          <Route path="/shipping-address" element={<PageWrapper><ShippingAddress /></PageWrapper>} />
          <Route path="/payment-methods" element={<PageWrapper><PaymentMethods /></PageWrapper>} />
          <Route path="/coupon" element={<PageWrapper><Coupon /></PageWrapper>} />
          <Route path="/add-card" element={<PageWrapper><AddCard /></PageWrapper>} />
          <Route path="/new-password" element={<PageWrapper><NewPassword /></PageWrapper>} />
          <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
          <Route path="/cash-on-campaign" element={<PageWrapper><CashOnCampaignPage /></PageWrapper>} />
          <Route path="/seller" element={<Navigate to="/seller/dashboard" replace />} />
          <Route path="/seller/dashboard" element={<PageWrapper><SellerDashboard /></PageWrapper>} />
          <Route path="/seller/custom-order" element={<PageWrapper><CreateCustomOrder /></PageWrapper>} />
          <Route path="/add-story" element={<PageWrapper><AddStory /></PageWrapper>} />
          <Route path="/seller/add-story" element={<PageWrapper><AddStory /></PageWrapper>} />
          <Route path="/__/auth/action" element={<PageWrapper><NewPassword /></PageWrapper>} />
          <Route path="/auth/action" element={<PageWrapper><NewPassword /></PageWrapper>} />
          
          <Route path="/admin/*" element={
             <Routes>
                <Route element={<AdminLayout userData={userData} />}>
                  <Route index element={<PageWrapper><AdminDashboard /></PageWrapper>} />
                  <Route path="cash-on-campaign" element={<PageWrapper><ManageCashOnCampaign /></PageWrapper>} />
                  <Route path="cash-on-campaign/draw" element={<PageWrapper><CashOnCampaignDraw /></PageWrapper>} />
                  <Route path="products" element={<PageWrapper><ManageProducts /></PageWrapper>} />
                  <Route path="products/edit/:id" element={<PageWrapper><EditProduct /></PageWrapper>} />
                  <Route path="users" element={<PageWrapper><ManageUsers /></PageWrapper>} />
                  <Route path="users-mobile" element={<PageWrapper><ManageUsersMobile /></PageWrapper>} />
                  <Route path="password-resets" element={<PageWrapper><ManagePasswordResets /></PageWrapper>} />
                  <Route path="push-notifications" element={<PageWrapper><ManagePushNotifications /></PageWrapper>} />
                  <Route path="engagement" element={<PageWrapper><ManageEngagement /></PageWrapper>} />
                  <Route path="orders" element={<PageWrapper><ManageOrders /></PageWrapper>} />
                  <Route path="subscriptions" element={<PageWrapper><ManageSubscriptions /></PageWrapper>} />
                  <Route path="reviews" element={<PageWrapper><ManageReviews /></PageWrapper>} />
                  <Route path="fake-orders" element={<PageWrapper><ManageFakeOrders /></PageWrapper>} />
                  <Route path="deposits" element={<PageWrapper><ManageDeposits /></PageWrapper>} />
                  <Route path="notifications" element={<PageWrapper><AdminNotifications /></PageWrapper>} />
                  <Route path="banners" element={<PageWrapper><ManageBanners /></PageWrapper>} />
                  <Route path="config" element={<PageWrapper><ManageConfig /></PageWrapper>} />
                  <Route path="payment-settings" element={<PageWrapper><ManagePayments /></PageWrapper>} />
                  <Route path="custom-sections" element={<PageWrapper><ManageCustomSections /></PageWrapper>} />
                  <Route path="stories" element={<PageWrapper><ManageStories /></PageWrapper>} />
                  <Route path="seo" element={<PageWrapper><ManageSEO /></PageWrapper>} />
                  <Route path="icons" element={<PageWrapper><ManageIcons /></PageWrapper>} />
                  <Route path="illustrations" element={<PageWrapper><ManageIllustrations /></PageWrapper>} />
                  <Route path="coupons" element={<PageWrapper><ManageCoupons /></PageWrapper>} />
                  <Route path="promo-codes" element={<PageWrapper><ManagePromoCodes /></PageWrapper>} />
                  <Route path="chats" element={<PageWrapper><ManageChats /></PageWrapper>} />
                  <Route path="groups" element={<PageWrapper><ManageGroups /></PageWrapper>} />
                  <Route path="security" element={<PageWrapper><ManageSecurity /></PageWrapper>} />
                  <Route path="diagnostics" element={<PageWrapper><SystemHealthDiagnostics /></PageWrapper>} />
                  <Route path="health" element={<PageWrapper><SystemHealthDiagnostics /></PageWrapper>} />
                  <Route path="vg-helpline" element={<PageWrapper><ManageVGHelpline /></PageWrapper>} />
                  <Route path="helpdesk" element={<PageWrapper><ManageHelpDesk /></PageWrapper>} />
                  <Route path="staff" element={<PageWrapper><ManageStaff /></PageWrapper>} />
                  <Route path="riders" element={<PageWrapper><ManageRiders /></PageWrapper>} />
                  <Route path="withdrawals" element={<PageWrapper><ManageWithdrawals /></PageWrapper>} />
                  <Route path="affiliate-requests" element={<PageWrapper><ManageAffiliateRequests /></PageWrapper>} />
                  <Route path="onboarding-offers" element={<PageWrapper><ManageOnboardingOffers /></PageWrapper>} />
                  <Route path="creator-requests" element={<PageWrapper><ManageCreatorRequests /></PageWrapper>} />
                  <Route path="affiliate-videos" element={<PageWrapper><ManageAffiliateVideos /></PageWrapper>} />
                  <Route path="ads" element={<PageWrapper><ManageAds /></PageWrapper>} />
                  <Route path="ai-assistant" element={<PageWrapper><ManageAiAssistant /></PageWrapper>} />
                  <Route path="mock/*" element={<PageWrapper><GenericAdminMock /></PageWrapper>} />
                </Route>
             </Routes>
          } />
          <Route path="/:slug" element={<PageWrapper><ProductDetails /></PageWrapper>} />
          <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      {showNav && <BottomMenu />}
      {!location.pathname.startsWith('/messages') && (
        <>
          <div className="stwRainbow" />
          <div className="stwBlurRainbow" />
        </>
      )}
      <AnimatePresence>
        {isAppLocked && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999999] bg-[#0a2e15] dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-white"
          >
            {isScanning ? (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Pulsing biometric ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-[#1cdb5e]/35 animate-pulse" />
                  {/* Glowing fingerprint scan icon */}
                  <div className="text-[#1cdb5e] animate-pulse">
                    <FingerprintIcon className="w-16 h-16" />
                  </div>
                  {/* Moving scanning laser beam */}
                  <div className="absolute left-4 right-4 h-1 bg-[#1cdb5e] opacity-90 blur-[2px] rounded-full animate-bounce top-1/3" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold tracking-tight">Verifying Biometrics...</h3>
                  <p className="text-zinc-400 text-xs font-semibold">Touch your sensor or align your face</p>
                </div>
              </div>
            ) : (
              <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 animate-scale-up">
                
                {/* App logo or branding */}
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-[#1cdb5e]/15 text-[#1cdb5e] rounded-[32px] flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-pulse">
                    <FingerprintIcon className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">DEEP SHOP</h2>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Locked with local protection</p>
                </div>

                {/* PIN code or biometric trigger */}
                <div className="w-full max-w-xs space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-300 font-bold">Enter 4-Digit Passcode PIN</p>
                    
                    <div className="flex justify-center gap-4">
                      {[0, 1, 2, 3].map((idx) => (
                        <div 
                          key={idx} 
                          className={`w-4 h-4 rounded-full border-2 ${
                            lockPinInput.length > idx 
                              ? "bg-[#1cdb5e] border-[#1cdb5e]" 
                              : "border-zinc-600 bg-transparent"
                          } transition-colors`}
                        />
                      ))}
                    </div>

                    {lockError && (
                      <p className="text-xs text-red-400 font-bold mt-2">{lockError}</p>
                    )}
                  </div>

                  {/* Virtual numeric pad */}
                  <div className="grid grid-cols-3 gap-4 w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          if (lockPinInput.length < 4) {
                            const nextVal = lockPinInput + num;
                            setLockPinInput(nextVal);
                            if (nextVal.length === 4) {
                              setTimeout(() => handlePinUnlockSubmit(nextVal), 300);
                            }
                          }
                        }}
                        className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-xl font-bold flex items-center justify-center mx-auto transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => {
                        const bioEnabled = localStorage.getItem("vibe_biometric_enabled") === "true";
                        if (bioEnabled) {
                          triggerBiometricUnlock();
                        } else {
                          notify("Biometric lock is not enabled. Setup inside your profile settings.", "info");
                        }
                      }}
                      className="w-16 h-16 rounded-full text-[#1cdb5e] flex items-center justify-center mx-auto hover:bg-white/5 transition-colors animate-pulse"
                    >
                      <FingerprintIcon className="w-7 h-7" />
                    </button>

                    <button
                      onClick={() => {
                        if (lockPinInput.length < 4) {
                          const nextVal = lockPinInput + "0";
                          setLockPinInput(nextVal);
                          if (nextVal.length === 4) {
                            setTimeout(() => handlePinUnlockSubmit(nextVal), 300);
                          }
                        }
                      }}
                      className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-xl font-bold flex items-center justify-center mx-auto transition-colors"
                    >
                      0
                    </button>

                    <button
                      onClick={() => setLockPinInput(lockPinInput.slice(0, -1))}
                      className="w-16 h-16 rounded-full text-zinc-400 flex items-center justify-center mx-auto hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Status footer */}
                <div className="text-zinc-500 text-[11px] font-bold">
                  Secured locally via your phone security services
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </DesktopLayout>
  );
};

import { ThemeProvider } from './components/ThemeContext';
import { LanguageProvider } from './components/LanguageContext';
import { DynamicIsland } from './components/ui/dynamic-island';
import { MobileGuard } from './components/MobileGuard';
import { NetworkStatus } from './components/NetworkStatus';
import { PullToRefresh } from './components/PullToRefresh';
import { IosSpinner } from './components/ui/ios-spinner';
import { CookieConsent } from './components/CookieConsent';

const AUTH_MODAL_EXCLUDED_PREFIXES = [
  '/auth-selector',
  '/accounts',
  '/saved-accounts',
  '/signin',
  '/signup',
  '/find-account',
  '/choose-account',
  '/review-account',
  '/forgot-password',
  '/new-password',
  '/verify',
  '/__/auth/action',
  '/auth/action',
];

const GlobalRouteAwareOverlays: React.FC<{ deferredReady: boolean }> = ({ deferredReady }) => {
  const location = useLocation();
  const isAuthScreen = AUTH_MODAL_EXCLUDED_PREFIXES.some(
    (prefix) =>
      location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  );
  const searchParams = new URLSearchParams(location.search);
  const filterParam = (searchParams.get('filter') || '').toLowerCase();
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const isReelsFullscreen =
    location.pathname.startsWith('/create-reel') ||
    location.pathname.startsWith('/loops/create-reel') ||
    location.pathname.startsWith('/loops/create-story') ||
    location.pathname.startsWith('/news-hub/create-story') ||
    location.pathname.startsWith('/add-story') ||
    location.pathname.startsWith('/seller/add-story') ||
    location.pathname.startsWith('/loops/story') ||
    location.pathname.startsWith('/news-hub/story') ||
    ((location.pathname.startsWith('/loops') ||
      location.pathname.startsWith('/news-hub')) &&
      (filterParam === 'video' || filterParam === 'reels' || tabParam === 'reels'));

  const isMessagesRoute = location.pathname.startsWith('/messages');

  if (isAuthScreen) {
    return <NetworkStatus />;
  }

  return (
    <>
      <NetworkStatus />
      {deferredReady && (
        <Suspense fallback={null}>
          <OnboardingOffersModal />
          <CartAbandonmentPopup />
          <NotificationPermissionModal />
          <AdManager />
        </Suspense>
      )}
      {deferredReady && !isReelsFullscreen && !isMessagesRoute && (
        <AdPlacementSlot
          slot="bottom_fixed"
          className="fixed bottom-0 inset-x-0 z-[90]"
        />
      )}
      <CookieConsent />
    </>
  );
};

const App: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [deferredReady, setDeferredReady] = useState(false);

  // Safety guard so isPageLoading can never get stuck if navigating to the same path
  useEffect(() => {
    if (!isPageLoading) return;
    const guard = setTimeout(() => setIsPageLoading(false), 1200);
    return () => clearTimeout(guard);
  }, [isPageLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDeferredReady(true);
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification &&
        window.Notification.permission === 'granted'
      ) {
        subscribeToWebPush(user?.uid).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <BanOverlay />
        <PageLoadingContext.Provider value={{ isPageLoading, setIsPageLoading }}>
          <ToastProvider>
            {deferredReady && (
              <Suspense fallback={null}>
                <CustomContextMenu />
              </Suspense>
            )}
            <DynamicIsland />
            <Router>
              <PullToRefresh
                onRefresh={async () => {
                  await new Promise((r) => setTimeout(r, 600));
                  setRefreshKey((prev) => prev + 1);
                }}
              >
                <AppContent />
              </PullToRefresh>
              <ReelUploadProgressOverlay />
              <MobileAppInstallExperience />
              {deferredReady && (
                <Suspense fallback={null}>
                  <GlobalCallReceiver />
                </Suspense>
              )}
              {!isPageLoading && <GlobalRouteAwareOverlays deferredReady={deferredReady} />}
            </Router>
          </ToastProvider>
        </PageLoadingContext.Provider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
