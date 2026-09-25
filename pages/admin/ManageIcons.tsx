import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import Icon from "../../components/Icon";

interface IconConfig {
  key: string;
  name: string;
  description: string;
  category: "navigation" | "profile" | "commerce" | "dashboard" | "chat" | "social" | "custom";
}

const PREDEFINED_ICONS: IconConfig[] = [
  // Navigation & General UI
  { key: "home", name: "Home Navigation", description: "Bottom tab and main redirect redirects", category: "navigation" },
  { key: "search", name: "Global Search", description: "Header search and search panel navigations", category: "navigation" },
  { key: "bars", name: "Menu Bars / Drawer", description: "Header sidebar toggles & hamburger menu icons", category: "navigation" },
  { key: "times", name: "Close / Dismiss", description: "Modal closing and input clearing cross icons", category: "navigation" },
  { key: "arrow-left", name: "Back Arrow", description: "Navigation back button on headers and panels", category: "navigation" },
  { key: "arrow-right", name: "Forward / Next Arrow", description: "Proceeding arrows and carousel sliders", category: "navigation" },
  { key: "chevron-down", name: "Chevron Down", description: "Used in dropdown menus & collapsibles", category: "navigation" },
  { key: "chevron-up", name: "Chevron Up", description: "Used in collapsing sections", category: "navigation" },
  { key: "chevron-left", name: "Chevron Left", description: "Back arrow inside compact layouts", category: "navigation" },
  { key: "chevron-right", name: "Chevron Right", description: "Next arrow inside compact layouts", category: "navigation" },
  { key: "ellipsis-h", name: "More / Options", description: "Three-dot menu for additional action links", category: "navigation" },
  { key: "history", name: "History Logs", description: "Recent search logs and timeline trackers", category: "navigation" },
  { key: "clock", name: "Clock / Time", description: "Pending status, timing, and scheduled tasks", category: "navigation" },
  { key: "spinner", name: "Loading Spinner", description: "Spinning loader for network queries", category: "navigation" },
  { key: "sync-alt", name: "Refresh / Sync", description: "Data reload, synchronize, and swap currencies", category: "navigation" },
  { key: "help-circle", name: "Help & FAQ", description: "Help circle inside headers and dialog overlays", category: "navigation" },
  { key: "info", name: "Info Indicator", description: "Information banner details", category: "navigation" },
  { key: "info-circle", name: "Info Circle Badge", description: "Information popups and status guidelines", category: "navigation" },
  { key: "plus", name: "Plus Sign", description: "Generic add / increase quantity buttons", category: "navigation" },
  { key: "minus", name: "Minus Sign", description: "Generic remove / decrease quantity buttons", category: "navigation" },
  { key: "sun", name: "Light Mode (Sun)", description: "Sun icon used for Light Mode controls and indicators", category: "navigation" },
  { key: "moon", name: "Dark Mode (Moon)", description: "Moon icon used for Dark Mode controls and indicators", category: "navigation" },
  { key: "monitor", name: "System Mode (Monitor)", description: "Monitor icon used for System Theme controls and indicators", category: "navigation" },

  // Profile & User Management
  { key: "user", name: "User Account Profile", description: "Bottom profiles tab and user accounts panel", category: "profile" },
  { key: "users", name: "All Users / Customers", description: "Manage users and community directory views", category: "profile" },
  { key: "user-shield", name: "Admin Role Shield", description: "Admin roles, permissions, and security indicators", category: "profile" },
  { key: "id-badge", name: "KYC / ID Verification", description: "KYC verification panels and user badges", category: "profile" },
  { key: "medal", name: "Medal / Achiever", description: "Top performing users, tiers and rankings", category: "profile" },
  { key: "award", name: "Seller Award", description: "Top seller awards and trusted badge outlines", category: "profile" },
  { key: "crown", name: "VIP Crown", description: "Admin indicator and premium subscribers", category: "profile" },
  { key: "shield-check", name: "Verified Account", description: "Trust indicators, verified users & sellers", category: "profile" },
  { key: "sign-out-alt", name: "Sign Out", description: "Logout button inside navigation drawers", category: "profile" },
  { key: "log-out", name: "Log Out Account", description: "System exit session triggers on headers and sliders", category: "profile" },
  { key: "lock", name: "Password Security", description: "Login credentials fields and restricted locks", category: "profile" },
  { key: "unlock", name: "Access Unlocked", description: "Passwords matched or unrestricted access", category: "profile" },
  { key: "profile-order-pay", name: "Profile: To Pay Status", description: "Icon for 'To Pay' state in orders summary", category: "profile" },
  { key: "profile-order-ship", name: "Profile: To Ship Status", description: "Icon for 'To Ship' state in orders summary", category: "profile" },
  { key: "profile-order-receive", name: "Profile: To Receive Status", description: "Icon for 'To Receive' state in orders summary", category: "profile" },
  { key: "profile-order-review", name: "Profile: To Review Status", description: "Icon for 'To Review' state in orders summary", category: "profile" },
  { key: "profile-affiliate", name: "Profile: Affiliate Dashboard", description: "Icon link to Affiliate Dashboard in account center", category: "profile" },
  { key: "profile-creator-hub", name: "Profile: Creator Hub", description: "Icon link to Creator Hub in account center", category: "profile" },
  { key: "profile-small-creators", name: "Profile: Small Creators", description: "Icon link to Small Creators Hub in account center", category: "profile" },
  { key: "profile-admin-panel", name: "Profile: Admin Panel Link", description: "Icon for Admin Panel link in tools", category: "profile" },
  { key: "profile-seller-dashboard", name: "Profile: Seller Dashboard", description: "Icon link to Seller Dashboard in tools", category: "profile" },
  { key: "profile-kyc", name: "Profile: KYC Status Icon", description: "Badge and link for verified vendor status", category: "profile" },
  { key: "profile-messages", name: "Profile: Messages Inbox", description: "Inbox link icon inside tools and hub", category: "profile" },
  { key: "profile-affiliate-dashboard-payment", name: "Profile: Affiliate Payment", description: "Payment status icon inside Affiliate portal", category: "profile" },

  // Shop & Commerce
  { key: "shopping-bag", name: "Shopping Bag", description: "Cart, top products & header shop indicators", category: "commerce" },
  { key: "shopping-cart", name: "Cart Icon", description: "Add to cart, shopping basket summaries", category: "commerce" },
  { key: "box", name: "Product Package", description: "All products card, product details & stock lists", category: "commerce" },
  { key: "box-open", name: "Opened Product", description: "Product catalog unbox and active inventory", category: "commerce" },
  { key: "box-check", name: "Order Delivered", description: "Delivered package statuses inside order trackers", category: "commerce" },
  { key: "boxes", name: "Bulk Stock", description: "Categories and bulk store stock controls", category: "commerce" },
  { key: "tag", name: "Price Tag", description: "Price overlays and discount indicators", category: "commerce" },
  { key: "percent", name: "Percent Coupon", description: "Discount formulas, percentage promos", category: "commerce" },
  { key: "ticket", name: "Coupon Code / Voucher", description: "Special coupons inside checkout screens", category: "commerce" },
  { key: "gift", name: "Reward Gift", description: "Presents, onboarding offers and bonuses", category: "commerce" },
  { key: "heart", name: "Wishlist Favorite", description: "Heart button on products list and detail views", category: "commerce" },
  { key: "star", name: "Rating Star", description: "Reviews star ratings, feedbacks, and ratings totals", category: "commerce" },
  { key: "credit-card", name: "Credit Cards / Payment", description: "Payment page methods, wallets & checkouts", category: "commerce" },
  { key: "money-bill-wave", name: "Cash / Direct Money", description: "Cash on delivery payment indicators", category: "commerce" },
  { key: "coins", name: "Coins Balance", description: "Cashback, reward tokens, affiliate commissions", category: "commerce" },
  { key: "receipt", name: "Order Receipt", description: "Bills, transaction invoice summaries", category: "commerce" },
  { key: "truck", name: "Shipping Truck", description: "Standard deliveries and transit indicators", category: "commerce" },
  { key: "truck-fast", name: "Express Delivery", description: "Priority / immediate transit details", category: "commerce" },
  { key: "map-marker", name: "Location Pin", description: "Shipping address fields, GPS trackers", category: "commerce" },
  { key: "shield-alt", name: "Protection Shield", description: "Extended protection, secure guarantee warranties", category: "commerce" },
  { key: "undo", name: "Return / Undo", description: "Refund or easy replacement guarantee badges", category: "commerce" },
  { key: "check-circle", name: "Verified Buyer Badge", description: "Verified customer reviews and feedback loops", category: "commerce" },
  { key: "share-alt", name: "Product Share", description: "Product link export and recommendation share sheet", category: "commerce" },

  // Dashboard & Analytics
  { key: "chart-line", name: "Dashboard Analytics", description: "Stats graph, charts, and financial reports", category: "dashboard" },
  { key: "trend-up", name: "Sales Trend Growth", description: "Growth statistics, performance improvements", category: "dashboard" },
  { key: "bolt", name: "Power boost / Zap", description: "High-voltage performance and action plans", category: "dashboard" },
  { key: "sliders-h", name: "Filters Vertical", description: "Product filters and search configurations", category: "dashboard" },
  { key: "cog", name: "System Settings", description: "Admin and vendor profile configuration parameters", category: "dashboard" },
  { key: "copy", name: "Copy Link", description: "Referral links and promo code copy buttons", category: "dashboard" },
  { key: "rocket", name: "Affiliate Campaign Launch", description: "Campaign boosts, launches, and affiliate stats", category: "dashboard" },
  { key: "bar-chart", name: "Analytics Bar Chart", description: "Category sales and performance histogram charts", category: "dashboard" },
  { key: "layout", name: "Interactive Layout/Grid", description: "Category management and visual structure settings", category: "dashboard" },
  { key: "store", name: "Seller Store Profiles", description: "Store pages and seller detail setups", category: "dashboard" },
  { key: "list-plus", name: "Bulk Import", description: "Adding multiple listings or inventories", category: "dashboard" },
  { key: "loader-2", name: "Process Spinner", description: "Loading/rendering indicator inside analytics", category: "dashboard" },

  // Communication & Chat
  { key: "envelope", name: "Direct Message / Email", description: "Support inbox, general messaging, emails", category: "chat" },
  { key: "comment-dots", name: "Chat Bubbles", description: "Instant messenger threads and live supports", category: "chat" },
  { key: "comment-alt-lines", name: "Live Chat Box", description: "Customer services, support widgets", category: "chat" },
  { key: "paper-plane", name: "Send Action", description: "Send button on messaging and chats", category: "chat" },
  { key: "microphone", name: "Voice Recorder", description: "Voice note attachments and speech queries", category: "chat" },
  { key: "video", name: "Video / Stream", description: "Video reviews and live seller streams", category: "chat" },
  { key: "headset", name: "Help Desk Support", description: "Dedicated supports, seller query centers", category: "chat" },
  { key: "bell", name: "Notifications Alerts", description: "System notifications, status bells, update alarms", category: "chat" },
  { key: "bell-slash", name: "Mute Alerts", description: "Disable announcements or alerts", category: "chat" },
  { key: "bullhorn", name: "Broadcast Announcement", description: "Marketing push alerts, admin banners", category: "chat" },
  { key: "phone", name: "Audio Call Action", description: "Voice call buttons inside messenger and helpdesks", category: "chat" },
  { key: "phone-off", name: "End Voice Call", description: "Disconnect ongoing calls indicator", category: "chat" },
  { key: "video-off", name: "Stop Video Feed", description: "Video camera feed muted / disabled banner", category: "chat" },
  { key: "paperclip", name: "File Clipper Attachment", description: "Add media, image files or invoices to chats", category: "chat" },
  { key: "send", name: "Publish Chat", description: "Standard paperplane button for message post", category: "chat" },
  { key: "check-double", name: "Message Read Status", description: "Double-check read confirmations", category: "chat" },
  { key: "alert-circle", name: "Warning Callout", description: "Call warning and moderator flag alerts", category: "chat" },
  { key: "message-square-share", name: "Forward Conversation", description: "Share dialogue thread to channels", category: "chat" },
  { key: "message-square", name: "General Chat Threads", description: "Standard text message feed indicator", category: "chat" },
  { key: "sparkles", name: "AI Assistant Logo", description: "AI help desk or smart auto-responders", category: "chat" },
  { key: "pin", name: "Pin Conversation", description: "Anchor dialogue to channel priority feed", category: "chat" },
  { key: "pin-off", name: "Unpin Dialog", description: "Release dialog from pinned position", category: "chat" },
  { key: "volume-mute", name: "Muted Line", description: "Sound disabled icon for conversations", category: "chat" },
  { key: "volume-x", name: "Disable Speaker Sound", description: "General muting speaker toggle", category: "chat" },
  { key: "forward", name: "Redirect Message", description: "Arrow forwarding chats across contacts", category: "chat" },
  { key: "more-vertical", name: "More Options Vertical", description: "Vertical three dots settings inside messages", category: "chat" },
  { key: "user-plus", name: "Enroll Subscriber", description: "Add new member to the chat community", category: "chat" },
  { key: "user-minus", name: "Unsubscribe Member", description: "Remove member from the community", category: "chat" },
  { key: "user-x", name: "Ban Account", description: "Banish account from active messaging systems", category: "chat" },
  { key: "radio", name: "Broadcast Signal", description: "Live streaming audio/video signal towers", category: "chat" },
  { key: "minimize-2", name: "Collapse Window", description: "Minimize screen window for live overlays", category: "chat" },
  { key: "maximize-2", name: "Expand Window", description: "Enlarge full screen layouts", category: "chat" },
  { key: "hash", name: "Channel Prefix Tag", description: "Identify text/media channels inside chats", category: "chat" },
  { key: "volume-2", name: "Speaker Volume On", description: "Audible talk streams active indicators", category: "chat" },
  { key: "mic", name: "Audio Transmission Mic", description: "Active sound wave capture indicator", category: "chat" },
  { key: "mic-off", name: "Microphone Silent State", description: "Muted sound feed inside helpdesk calls", category: "chat" },
  { key: "shield", name: "Group Rules Protection", description: "Group moderator settings rules", category: "chat" },
  { key: "activity", name: "Channel Sync Tracker", description: "System performance or network sync status", category: "chat" },

  // Social & Platform Utilities
  { key: "facebook", name: "Facebook Link", description: "Social links, customer sync options", category: "social" },
  { key: "instagram", name: "Instagram Handle", description: "Image link channels", category: "social" },
  { key: "whatsapp", name: "WhatsApp Contact", description: "Instant contact and supports", category: "social" },
  { key: "twitter", name: "Twitter Profile", description: "Feed updates, news overlays", category: "social" },
  { key: "google", name: "Google Accounts", description: "Google signup or sync credentials", category: "social" },
  { key: "image", name: "Image Attachment", description: "Product gallery attachments, photos", category: "social" },
  { key: "images", name: "Multiple Images", description: "Multi-photo slider fields, attachments", category: "social" },
  { key: "cloud-upload", name: "Upload To Cloud", description: "Drag and drop upload files controls", category: "social" },
  { key: "link", name: "Direct Link URL", description: "Embeds, videos links, external resources", category: "social" },
  { key: "trash", name: "Delete Trash", description: "Remove product, dismiss order, delete items", category: "social" },
  { key: "edit", name: "Edit Pen", description: "Modify fields, update profiles and listings", category: "social" },
  { key: "save", name: "Save Controls", description: "Save form inputs, submit system values", category: "social" },
  { key: "ban", name: "Banish / Block User", description: "Suspend account, ban sellers, fraud restrictions", category: "social" },
];

const ManageIcons: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<IconConfig["category"] | "all">("all");
  const [autoConvertColors, setAutoConvertColors] = useState(true);

  // New Custom Key Registration
  const [newCustomKey, setNewCustomKey] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomDesc, setNewCustomDesc] = useState("");

  // Saved icons map from Firestore { "home": "<svg...", ... }
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  // Keeps track of custom-registered dynamic keys
  const [dynamicKeys, setDynamicKeys] = useState<IconConfig[]>([]);

  useEffect(() => {
    const fetchIcons = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "settings", "custom_icons"));
        if (snap.exists()) {
          const data = snap.data();
          const rawIcons = data?.icons || data || {};
          const iconsData: Record<string, string> = {};
          Object.keys(rawIcons).forEach((key) => {
            if (typeof rawIcons[key] === "string" && key !== "icons") {
              iconsData[key.toLowerCase()] = rawIcons[key];
            }
          });
          setCustomIcons(iconsData);
          setInputs(iconsData);

          // Build dynamic keys that are NOT in PREDEFINED_ICONS but exist in Firestore
          const predefinedKeys = new Set(PREDEFINED_ICONS.map((i) => i.key));
          const loadedDynamics: IconConfig[] = [];
          
          Object.keys(iconsData).forEach((key) => {
            if (!predefinedKeys.has(key)) {
              // Create readable title
              const formattedName = key
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");

              loadedDynamics.push({
                key,
                name: formattedName + " (Custom)",
                description: `Independently mapped dynamic override for <Icon name="${key}" />`,
                category: "custom",
              });
            }
          });
          setDynamicKeys(loadedDynamics);
        }
      } catch (err) {
        console.error("Error loading custom icons", err);
        notify("Failed to load icon settings", "error");
      }
      setLoading(false);
    };
    fetchIcons();
  }, []);

  const handleRegisterCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newCustomKey.trim().toLowerCase().replace(/\s+/g, "-");
    
    if (!cleanKey) {
      notify("Please provide a valid key.", "error");
      return;
    }

    // Check duplicate
    const allExisting = [...PREDEFINED_ICONS, ...dynamicKeys];
    if (allExisting.some((i) => i.key === cleanKey)) {
      notify(`The key "${cleanKey}" already exists in overrides.`, "error");
      return;
    }

    const newIcon: IconConfig = {
      key: cleanKey,
      name: (newCustomName.trim() || cleanKey.toUpperCase()) + " (Custom)",
      description: newCustomDesc.trim() || `Custom dynamic override for "${cleanKey}"`,
      category: "custom",
    };

    setDynamicKeys((prev) => [newIcon, ...prev]);
    // Initialize blank state inside inputs
    setInputs((prev) => ({ ...prev, [cleanKey]: "" }));
    
    // Auto-switch tab to view custom icon immediately
    setActiveTab("custom");
    setSearchQuery("");
    
    // Clear registration form fields
    setNewCustomKey("");
    setNewCustomName("");
    setNewCustomDesc("");
    
    notify(`Successfully registered Custom Override Key: "${cleanKey}"! Paste its SVG below.`, "success");
  };

  const handleSaveIcon = async (key: string) => {
    setSaving(key);
    let code = (inputs[key] || "").trim();

    if (code) {
      // Validate SVG code block
      if (!code.toLowerCase().includes("<svg") || !code.toLowerCase().includes("</svg>")) {
        notify("Invalid SVG. Please paste a complete, valid SVG snippet starting with '<svg>'.", "error");
        setSaving(null);
        return;
      }

      if (autoConvertColors) {
        // Strip strict width & height parameters to support fluid resizing
        code = code.replace(/\bwidth="[^"]*"/g, "");
        code = code.replace(/\bheight="[^"]*"/g, "");
        // Strip inline style attributes which override CSS classes
        code = code.replace(/\bstyle="[^"]*"/g, "");
        // Strip nested style blocks
        code = code.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
        // Remap stroke to currentColor
        code = code.replace(/stroke="[^"]*"/g, 'stroke="currentColor"');
        // Remap solid fills to currentColor, while maintaining fill="none"
        code = code.replace(/fill="[^"]*"/g, (match) => {
          if (match.includes("none")) return match;
          return 'fill="currentColor"';
        });
      }
    }

    try {
      const updatedIcons = { ...customIcons };
      if (code) {
        updatedIcons[key] = code;
      } else {
        delete updatedIcons[key];
      }

      await setDoc(doc(db, "settings", "custom_icons"), { icons: updatedIcons });
      try {
        localStorage.setItem("custom_icons_cache", JSON.stringify(updatedIcons));
      } catch (e) {}
      
      setCustomIcons(updatedIcons);
      setInputs((prev) => ({ ...prev, [key]: code }));
      notify(`Icon override for "${key}" updated successfully!`, "success");
    } catch (err) {
      console.error(err);
      notify("Failed to save icon override", "error");
    }
    setSaving(null);
  };

  const handleResetIcon = async (key: string) => {
    if (!window.confirm(`Are you sure you want to revert the "${key}" icon back to its original site default?`)) return;
    
    setSaving(key);
    try {
      const updatedIcons = { ...customIcons };
      delete updatedIcons[key];

      await setDoc(doc(db, "settings", "custom_icons"), { icons: updatedIcons });
      try {
        localStorage.setItem("custom_icons_cache", JSON.stringify(updatedIcons));
      } catch (e) {}
      
      setCustomIcons(updatedIcons);
      setInputs((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      // If it was a dynamically registered custom key, remove from UI if empty
      const isPredefined = PREDEFINED_ICONS.some((p) => p.key === key);
      if (!isPredefined) {
        setDynamicKeys((prev) => prev.filter((d) => d.key !== key));
      }

      notify(`Reset "${key}" icon override successfully.`, "success");
    } catch (err) {
      console.error(err);
      notify("Failed to reset icon override", "error");
    }
    setSaving(null);
  };

  const handleResetAll = async () => {
    if (!window.confirm("WARNING: This will delete ALL custom icon overrides on the entire website, returning everything back to default Lucide styles. Do you wish to proceed?")) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "custom_icons"), { icons: {} });
      try {
        localStorage.removeItem("custom_icons_cache");
      } catch (e) {}
      setCustomIcons({});
      setInputs({});
      setDynamicKeys([]);
      notify("All icon overrides cleared!", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to clear overrides", "error");
    }
    setLoading(false);
  };

  // Combine predefined with dynamically added ones
  const allAvailableIcons = [...PREDEFINED_ICONS, ...dynamicKeys];

  const filteredIcons = allAvailableIcons.filter((icon) => {
    const matchesSearch =
      icon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      icon.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      icon.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === "all" || icon.category === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const categories = [
    { id: "all", label: "All Overrides" },
    { id: "navigation", label: "Navigation" },
    { id: "profile", label: "Profile" },
    { id: "commerce", label: "Commerce" },
    { id: "dashboard", label: "Dashboards" },
    { id: "chat", label: "Chat & Alerts" },
    { id: "social", label: "Social & Files" },
    { id: "custom", label: `My Custom Keys (${dynamicKeys.length})` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Icon name="spinner" className="animate-spin text-zinc-900 dark:text-zinc-100 text-3xl mb-2 mx-auto" />
          <p className="text-xs text-zinc-500 font-semibold">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 min-h-screen bg-zinc-50 dark:bg-zinc-950/20 pb-32">
      {/* Back & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 mb-2 transition-colors"
          >
            <Icon name="arrow-left" className="w-3.5 h-3.5" />
            Back to Admin Panel
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Universal SVG Icon Override Manager
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-semibold mt-1">
            Replace, override, and customize absolutely ANY icon across the home layout, bottom bar, profile, support chats, seller dashboards, affiliate screens, and catalogs.
          </p>
        </div>
        
        <button
          onClick={handleResetAll}
          className="px-4 py-2.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl transition-all shadow-sm shrink-0 self-start sm:self-center"
        >
          Reset All Overrides
        </button>
      </div>

      {/* Guide Card */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-100 dark:border-indigo-900/50 p-5 rounded-2xl mb-8 shadow-sm">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shrink-0">
            <Icon name="info-circle" className="text-xl" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">
              Real-time SVG Injection Guide
            </h3>
            <p className="text-xs text-indigo-800 dark:text-indigo-400/90 font-medium leading-relaxed mb-3">
              Copy any SVG code block (e.g. from Boxicons, Lucide, Heroicons, or custom premium kits) and paste it into the boxes below. The changes take effect instantly for all active site visitors in real-time.
            </p>
            <ul className="list-disc pl-4 text-[11px] text-indigo-700 dark:text-indigo-400/80 space-y-1.5 font-medium">
              <li>Ensure the snippet includes valid <code className="bg-indigo-100/50 dark:bg-indigo-900/40 px-1 py-0.5 rounded">&lt;svg&gt;</code> wrappers.</li>
              <li><b>Auto-Convert Colors</b> automatically injects <code className="bg-indigo-100/50 dark:bg-indigo-900/40 px-1 py-0.5 rounded">currentColor</code> so icons respect both Dark/Light theme modes seamlessly!</li>
              <li>You can type and register custom keys dynamically to replace unlisted or complex nested page icons instantly!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dynamic Key Registration Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 flex items-center gap-2">
          <Icon name="plus" className="w-4 h-4 text-indigo-500" />
          Register Custom / Dynamic Icon Key
        </h2>
        <p className="text-xs text-zinc-400 font-medium mb-4">
          If there is an icon used inside pages like the Affiliate Dashboard, Message Page, Profile Options, or Settings page that is not in the list below, type its key here. Once registered, it will appear as an overridable box instantly!
        </p>

        <form onSubmit={handleRegisterCustomKey} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Icon Name Key (e.g. affiliate, payout-wallet) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. affiliate"
              value={newCustomKey}
              onChange={(e) => setNewCustomKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Readable Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Affiliate Star"
              value={newCustomName}
              onChange={(e) => setNewCustomName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              Register Key Override
            </button>
          </div>
        </form>
      </div>

      {/* Categories Tabs & Filters */}
      <div className="space-y-4">
        {/* Responsive Scrolling Tab Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-200 dark:border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as any)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === cat.id
                  ? "bg-zinc-900 text-white dark:bg-indigo-600 dark:text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search controls */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search icons by identifier or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold placeholder:text-zinc-400"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer self-start sm:self-auto select-none">
            <input
              type="checkbox"
              checked={autoConvertColors}
              onChange={(e) => setAutoConvertColors(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Auto-Convert Hardcoded SVG Colors (Supports Dark/Light)
            </span>
          </label>
        </div>
      </div>

      {/* Overrides List */}
      {filteredIcons.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl mt-6">
          <Icon name="search" className="text-4xl text-zinc-300 dark:text-zinc-700 mb-2.5 mx-auto" />
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">No customizable icons found matching current filters.</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Try registering a custom key override at the top of the dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {filteredIcons.map((icon) => {
            const hasOverride = !!customIcons[icon.key];
            const isSavingThis = saving === icon.key;

            return (
              <div
                key={icon.key}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                        {icon.name}
                        {hasOverride && (
                          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {icon.category === "custom" && (
                          <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            User Created
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-bold font-mono">
                        Key: {icon.key}
                      </p>
                    </div>

                    {/* Preview box */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[9px] font-bold text-zinc-400 mb-1">Preview</span>
                      <div className="w-10 h-10 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                        <Icon name={icon.key} className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-4">
                    {icon.description}
                  </p>

                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    SVG Code / Content
                  </label>
                  <textarea
                    rows={4}
                    value={inputs[icon.key] || ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [icon.key]: e.target.value }))}
                    placeholder={`Paste <svg> code here to override the default ${icon.name}`}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-[11px] font-mono text-zinc-800 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-400/70 leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 mt-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                  <button
                    onClick={() => handleSaveIcon(icon.key)}
                    disabled={isSavingThis}
                    className="flex-1 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                  >
                    {isSavingThis ? (
                      <>
                        <Icon name="spinner" className="animate-spin w-3.5 h-3.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon name="save" className="w-3.5 h-3.5" />
                        Save Icon Override
                      </>
                    )}
                  </button>

                  {hasOverride && (
                    <button
                      onClick={() => handleResetIcon(icon.key)}
                      disabled={isSavingThis}
                      className="px-3.5 py-2 text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/50 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageIcons;
