import React, { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { uploadToImgbb } from "../services/imgbb";
import { useCharacterLimit } from "../components/hooks/use-character-limit";
import { useImageUpload } from "../components/hooks/use-image-upload";
import {
  Check,
  ImagePlus,
  X,
  ChevronLeft,
  Camera,
  Globe,
  MapPin,
  AtSign,
  User as UserIcon,
} from "lucide-react";
import { ProfileSettingsPageSkeleton } from "../components/PageSkeletons";

const InstagramSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TikTokSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function EditProfile() {
  const navigate = useNavigate();
  const notify = useNotify();
  const id = useId();
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  const [defaultAvatar, setDefaultAvatar] = useState("");
  const [defaultBg, setDefaultBg] = useState("");
  const [hideDefaultBg, setHideDefaultBg] = useState(false);

  const maxLength = 180;
  const {
    value: bio,
    characterCount,
    handleChange: handleBioChange,
    maxLength: limit,
  } = useCharacterLimit({
    maxLength,
    initialValue: "",
  });

  const {
    previewUrl: bgPreview,
    fileInputRef: bgInputRef,
    handleThumbnailClick: handleBgClick,
    handleFileChange: handleBgChange,
    handleRemove: handleBgRemove,
  } = useImageUpload();

  const {
    previewUrl: avatarPreview,
    fileInputRef: avatarInputRef,
    handleThumbnailClick: handleAvatarClick,
    handleFileChange: handleAvatarChange,
  } = useImageUpload();

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const d = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (d.exists()) {
          const data = d.data();
          const nameParts = (data.displayName || "").split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setUsername(data.username || "");
          setWebsite(data.website || "");
          setAddress(data.address || "");
          setFacebookUrl(data.facebookUrl || "");
          setTiktokUrl(data.tiktokUrl || "");
          setInstagramUrl(data.instagramUrl || "");
          handleBioChange({ target: { value: data.bio || "" } } as any);
          setDefaultAvatar(data.photoURL || "");
          setDefaultBg(
            data.profileBg ||
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
          );
        }
      } else {
        navigate("/");
      }
      setLoading(false);
    };
    fetchUserData();
  }, [navigate]);

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!auth.currentUser) return;
    setUpdating(true);

    try {
      let finalAvatarUrl = defaultAvatar;
      let finalBgUrl = defaultBg;

      if (avatarInputRef.current?.files?.[0]) {
        notify("Uploading profile photo...", "info");
        finalAvatarUrl = await uploadToImgbb(avatarInputRef.current.files[0]);
      }

      if (bgInputRef.current?.files?.[0]) {
        notify("Uploading cover image...", "info");
        finalBgUrl = await uploadToImgbb(bgInputRef.current.files[0]);
      } else if (!bgPreview && !defaultBg) {
        finalBgUrl = "";
      }

      const newDisplayName = `${firstName} ${lastName}`.trim();

      await updateProfile(auth.currentUser, {
        displayName: newDisplayName,
        photoURL: finalAvatarUrl,
      });

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        displayName: newDisplayName,
        username: username.replace(/^@+/, "").trim(),
        website: website.trim(),
        bio: bio.trim(),
        photoURL: finalAvatarUrl,
        profileBg: finalBgUrl,
        address: address.trim(),
        facebookUrl: facebookUrl.trim(),
        tiktokUrl: tiktokUrl.trim(),
        instagramUrl: instagramUrl.trim(),
      });

      notify("Profile updated successfully!", "success");
      navigate("/profile");
    } catch {
      notify("Failed to update profile", "error");
    } finally {
      setUpdating(false);
    }
  };

  const currentBgImage = bgPreview || (!hideDefaultBg ? defaultBg : null);

  const onBgRemove = () => {
    handleBgRemove();
    setHideDefaultBg(true);
    setDefaultBg("");
  };

  const fullNamePreview =
    `${firstName} ${lastName}`.trim() || "Community Member";
  const cleanUsernamePreview = username.replace(/^@+/, "").trim();
  const currentAvatarImage = avatarPreview || defaultAvatar || "";

  if (loading) {
    return <ProfileSettingsPageSkeleton />;
  }

  return (
    <div className="min-h-screen loops-surface text-[#0f0f0f] dark:text-zinc-100 font-sans pb-28">
      {/* Sticky Minimal Top Bar */}
      <header className="sticky top-0 z-30 loops-surface/90 backdrop-blur-xl border-b loops-divider">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#0f0f0f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition cursor-pointer shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.1]" />
            </button>
            <h1 className="text-[17px] sm:text-[18px] font-bold tracking-tight truncate">
              Edit profile
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={updating}
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-full text-[13.5px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleUpdate()}
              disabled={updating}
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[13.5px] font-semibold hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {updating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleUpdate}
        className="max-w-4xl mx-auto px-4 sm:px-6 pt-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Studio Preview & Media Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-22 space-y-4">
            <div className="loops-about-card rounded-[28px] overflow-hidden border loops-divider">
              {/* Cover Banner Area */}
              <div className="relative h-40 sm:h-44 w-full bg-zinc-200/80 dark:bg-zinc-800/80 overflow-hidden">
                {currentBgImage ? (
                  <img
                    src={currentBgImage}
                    alt="Profile cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 pointer-events-none" />

                {/* Always-accessible tactile Cover Controls */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBgClick}
                    className="h-9 px-3.5 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur-md text-white text-[12px] font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Cover</span>
                  </button>
                  {currentBgImage && (
                    <button
                      type="button"
                      onClick={onBgRemove}
                      className="w-9 h-9 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer"
                      aria-label="Remove cover image"
                      title="Remove cover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={bgInputRef}
                  onChange={handleBgChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              {/* Avatar + Live Identity Summary */}
              <div className="px-5 pb-6">
                <div className="-mt-12 flex items-end justify-between gap-3 mb-4 relative z-10">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-[#181818] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center cursor-pointer group"
                      aria-label="Change profile photo"
                    >
                      {currentAvatarImage ? (
                        <img
                          src={currentAvatarImage}
                          alt={fullNamePreview}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-10 h-10 text-zinc-400" />
                      )}
                      <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera className="w-5 h-5" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] ring-2 ring-white dark:ring-[#181818] flex items-center justify-center cursor-pointer active:scale-95 transition"
                      aria-label="Upload new avatar"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="h-9 px-3.5 rounded-full loops-gray-pill text-[12.5px] font-semibold text-[#0f0f0f] dark:text-white hover:opacity-85 transition cursor-pointer"
                  >
                    Change photo
                  </button>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-[19px] font-bold tracking-tight text-[#0f0f0f] dark:text-white truncate">
                    {fullNamePreview}
                  </h2>
                  <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate">
                    {cleanUsernamePreview
                      ? `@${cleanUsernamePreview}`
                      : "Set a public @username"}
                  </p>
                  {bio.trim() ? (
                    <p className="text-[14px] leading-snug text-zinc-700 dark:text-zinc-300 pt-1 line-clamp-3 break-words">
                      {bio}
                    </p>
                  ) : (
                    <p className="text-[13.5px] text-zinc-400 dark:text-zinc-500 pt-1">
                      Your short bio will appear here across Deep Shop and Loops.
                    </p>
                  )}

                  {(address.trim() || website.trim()) && (
                    <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                      {address.trim() && (
                        <span className="inline-flex items-center gap-1 truncate max-w-full">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{address.trim()}</span>
                        </span>
                      )}
                      {website.trim() && (
                        <span className="inline-flex items-center gap-1 text-[#0095F6] truncate max-w-full">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {website
                              .replace(/^https?:\/\//i, "")
                              .replace(/\/+$/, "")}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Structured Form Fields */}
          <div className="lg:col-span-7 space-y-5">
            {/* Section 1: Personal Identity */}
            <section className="loops-about-card rounded-[28px] p-5 sm:p-6 border loops-divider space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
                  Personal details
                </h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                  Your public name, handle, and biography.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${id}-first-name`}
                    className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    First name
                  </label>
                  <input
                    id={`${id}-first-name`}
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`${id}-last-name`}
                    className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Last name
                  </label>
                  <input
                    id={`${id}-last-name`}
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-username`}
                  className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Username
                </label>
                <div className="relative flex items-center">
                  <AtSign className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id={`${id}-username`}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full h-11 pl-9 pr-10 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                  {cleanUsernamePreview.length > 2 && (
                    <span className="absolute right-3.5 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center pointer-events-none">
                      <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`${id}-bio`}
                    className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Biography
                  </label>
                  <span className="text-[12px] text-zinc-400 tabular-nums">
                    {characterCount}/{limit}
                  </span>
                </div>
                <textarea
                  id={`${id}-bio`}
                  rows={3}
                  maxLength={maxLength}
                  value={bio}
                  onChange={handleBioChange}
                  placeholder="Write a short introduction about yourself..."
                  className="w-full p-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] leading-relaxed font-normal text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none resize-none transition"
                />
              </div>
            </section>

            {/* Section 2: Location & Website */}
            <section className="loops-about-card rounded-[28px] p-5 sm:p-6 border loops-divider space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
                  Location & website
                </h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                  Help shoppers and community members find where you are based.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor={`${id}-address`}
                  className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Location / Address
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id={`${id}-address`}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-website`}
                  className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Website
                </label>
                <div className="relative flex items-center">
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id={`${id}-website`}
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="yourwebsite.com"
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Connected Social Profiles */}
            <section className="loops-about-card rounded-[28px] p-5 sm:p-6 border loops-divider space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
                  Social accounts
                </h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                  Link your active social handles to display on your profile.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${id}-instagram`}
                    className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Instagram username
                  </label>
                  <div className="relative flex items-center">
                    <InstagramSvg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 pointer-events-none" />
                    <input
                      id={`${id}-instagram`}
                      type="text"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="instagram_username"
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`${id}-facebook`}
                    className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Facebook username or link
                  </label>
                  <div className="relative flex items-center">
                    <FacebookSvg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 pointer-events-none" />
                    <input
                      id={`${id}-facebook`}
                      type="text"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="facebook.com/yourprofile"
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`${id}-tiktok`}
                    className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    TikTok username
                  </label>
                  <div className="relative flex items-center">
                    <TikTokSvg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 pointer-events-none" />
                    <input
                      id={`${id}-tiktok`}
                      type="text"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="tiktok_username"
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Mobile & Desktop Footer Submit Row */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={updating}
                className="flex-1 sm:flex-none h-12 px-6 rounded-full loops-gray-pill text-[14.5px] font-semibold text-[#0f0f0f] dark:text-white hover:opacity-85 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="flex-1 sm:flex-none h-12 px-8 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[14.5px] font-semibold hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {updating ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
