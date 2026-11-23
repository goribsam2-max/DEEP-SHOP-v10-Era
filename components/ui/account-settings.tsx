import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn, validateInput } from '@/lib/utils';
import { auth, db } from '@/firebase';
import { signOut, deleteUser, updateProfile } from 'firebase/auth';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useNotify, useConfirm } from '@/components/Notifications';
import Icon from '../Icon';
import { useTheme } from '@/components/ThemeContext';
import { canAccessSellerDashboard } from '@/lib/admin';
import { syncCurrentUserToSavedAccounts } from '@/lib/savedAccounts';
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from '@/lib/shoppingRoute';
import { triggerHaptic } from '@/lib/haptics';

export function AccountSettings() {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const { isDark, toggleTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactTypeToAdd, setContactTypeToAdd] = useState<'email' | 'phone'>('email');
  const [contactInputValue, setContactInputValue] = useState('');

  const [hideEmail, setHideEmail] = useState(false);
  const [hidePhone, setHidePhone] = useState(false);
  const [disableCalls, setDisableCalls] = useState(false);
  const [canManageStore, setCanManageStore] = useState(false);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [tempPauseReason, setTempPauseReason] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setEmail(user.email || '');
      setName(user.displayName || '');
      setCanManageStore(canAccessSellerDashboard(null, user));
      
      // Fetch username & seller settings from DB
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db, "users", user.uid)).then((d) => {
          if (d.exists()) {
            const data = d.data();
            setUsername(data.username || '');
            setPhoneNumber(data.phoneNumber || '');
            setSecondaryEmail(data.secondaryEmail || '');
            setHideEmail(data.hideEmail || false);
            setHidePhone(data.hidePhone || false);
            setDisableCalls(data.disableCalls || false);
            setCanManageStore(canAccessSellerDashboard(data, user));
            setOrdersPaused(!!data.ordersPaused);
            setPauseReason(data.pauseReason || '');
            setTempPauseReason(data.pauseReason || '');
          }
        });
      });
    }
    const isGranted = typeof window !== "undefined" && 'Notification' in window && !!window.Notification && window.Notification.permission === 'granted';
    const isEnabled = isGranted && localStorage.getItem("vibe_push_enabled") !== "false";
    setPushEnabled(isEnabled);
  }, []);

  const handleToggleHideEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const newVal = !hideEmail;
      await updateDoc(doc(db, "users", user.uid), { hideEmail: newVal });
      setHideEmail(newVal);
      notify(newVal ? "Email hidden from other users" : "Email visible to other users", "success");
    } catch (e) {
      notify("Failed to update privacy setting", "error");
    }
  };

  const handleToggleHidePhone = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const newVal = !hidePhone;
      await updateDoc(doc(db, "users", user.uid), { hidePhone: newVal });
      setHidePhone(newVal);
      notify(newVal ? "Phone number hidden from other users" : "Phone number visible to other users", "success");
    } catch (e) {
      notify("Failed to update privacy setting", "error");
    }
  };

  const handleToggleDisableCalls = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const newVal = !disableCalls;
      await updateDoc(doc(db, "users", user.uid), { disableCalls: newVal });
      setDisableCalls(newVal);
      notify(newVal ? "Voice/Video calls disabled" : "Voice/Video calls enabled", "success");
    } catch (e) {
      notify("Failed to update call setting", "error");
    }
  };

  const handleToggleOrdersPaused = () => {
    if (ordersPaused) {
      // Unpausing
      const user = auth.currentUser;
      if (!user) return;
      updateDoc(doc(db, "users", user.uid), {
        ordersPaused: false,
        pauseReason: ""
      }).then(() => {
        setOrdersPaused(false);
        setPauseReason("");
        notify("Orders resumed", "success");
      }).catch(() => notify("Failed to update setting", "error"));
    } else {
      // Opening modal to enter reason
      setTempPauseReason(pauseReason || "Our shop is temporarily on break and not accepting new orders right now.");
      setShowPauseModal(true);
    }
  };

  const handleSavePauseReason = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!tempPauseReason.trim()) {
      return notify("Please enter a reason for pausing orders", "error");
    }
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ordersPaused: true,
        pauseReason: tempPauseReason.trim()
      });
      setOrdersPaused(true);
      setPauseReason(tempPauseReason.trim());
      setShowPauseModal(false);
      notify("Order acceptance temporarily paused", "success");
    } catch (e) {
      notify("Failed to save setting", "error");
    }
  };

  const handleUpdateContact = async () => {
      if (!contactInputValue) return;
      const user = auth.currentUser;
      if (!user) return;
      
      const validationError = validateInput(contactInputValue, contactTypeToAdd);
      if (validationError) {
         return notify(validationError, "error");
      }

      if (contactTypeToAdd === 'email') {
         try {
            const res = await fetch('/api/lookup-auth-email', {
               method: 'POST',
               headers: {'Content-Type':'application/json'},
               body: JSON.stringify({ identifier: contactInputValue })
            });
            const data = await res.json();
            if (data.authEmail) {
               return notify("This email is already in use by another account.", "error");
            }
         } catch(e){}
         
         try {
            await updateDoc(doc(db, "users", user.uid), { secondaryEmail: contactInputValue });
            setSecondaryEmail(contactInputValue);
            setShowAddContact(false);
            setContactInputValue('');
            notify("Email added successfully", "success");
         } catch(e) {
            notify("Failed to add email", "error");
         }
      } else {
         // phone
         const clean = contactInputValue.replace(/[-.\s]/g, '');
         let possiblePhone = clean;
         if (!clean.startsWith('+')) {
            possiblePhone = clean.startsWith('880') ? `+${clean}` : (clean.startsWith('01') ? `+880${clean.substring(1)}` : `+${clean}`);
         }
         
         try {
            const res = await fetch('/api/lookup-auth-email', {
               method: 'POST',
               headers: {'Content-Type':'application/json'},
               body: JSON.stringify({ identifier: possiblePhone })
            });
            const data = await res.json();
            if (data.authEmail) {
               return notify("This phone number is already registered.", "error");
            }
         } catch(e){}

         try {
            await updateDoc(doc(db, "users", user.uid), { phoneNumber: possiblePhone });
            setPhoneNumber(possiblePhone);
            setShowAddContact(false);
            setContactInputValue('');
            notify("Phone added successfully", "success");
         } catch(e) {
            notify("Failed to add phone", "error");
         }
      }
  };

  const handleUpdateName = async () => {
    if (!editNameValue || editNameValue.trim() === name) return;
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateProfile(user, { displayName: editNameValue.trim() });
      await updateDoc(doc(db, "users", user.uid), { displayName: editNameValue.trim() });
      setName(editNameValue.trim());
      setShowEditName(false);
      notify("Username updated successfully", "success");
    } catch (e: any) {
      notify(e.message || "Failed to update name", "error");
    }
  };

  const togglePush = async () => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      notify("Push notifications not supported on this browser", "info");
      return;
    }

    if (!pushEnabled) {
      const { subscribeToWebPush } = await import('@/lib/push');
      const result: any = await subscribeToWebPush();
      if ((result && !result.error) || (typeof window !== "undefined" && 'Notification' in window && !!window.Notification && window.Notification.permission === 'granted')) {
         localStorage.setItem("vibe_push_enabled", "true");
         setPushEnabled(true);
         notify("Push notifications enabled", "success");
      } else {
         notify(result?.error || "Permission denied. Try opening in a new tab.", "error");
      }
    } else {
      const { unsubscribeFromWebPush } = await import('@/lib/push');
      await unsubscribeFromWebPush();
      localStorage.setItem("vibe_push_enabled", "false");
      setPushEnabled(false);
      notify("Push notifications disabled", "info");
    }
  };

  const handleLogout = async () => {
    syncCurrentUserToSavedAccounts(auth.currentUser, {
      displayName: name || undefined,
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
    });
    await signOut(auth);
    localStorage.removeItem("f_cart");
    navigate("/accounts");
  };

  const handleDeleteAccount = () => {
    confirm({
      title: "Wait, are you sure?",
      message: "Deleting your account is permanent. All your order history and profile data will be erased from our database.",
      confirmText: "Permanently Delete",
      cancelText: "Keep Account",
      onConfirm: async () => {
        const user = auth.currentUser;
        if (!user) return;

        setIsDeleting(true);
        try {
          await deleteDoc(doc(db, "users", user.uid));
          await deleteUser(user);
          notify("Account permanently deleted", "info");
          navigate("/auth-selector");
        } catch (err: any) {
          if (err.code === "auth/requires-recent-login") {
            notify("Session expired. Please re-login to delete account.", "error");
            await auth.signOut();
            navigate("/signin");
          } else {
            notify("Process failed", "error");
          }
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

	return (
		<div className="ds-apple-shop-canvas min-h-screen pb-16 relative">
      {/* Portaled Modals with .ds-apple-portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showEditName && (
            <div className="ds-apple-portal fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={() => setShowEditName(false)}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="ds-apple-backdrop fixed inset-0"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
                onClick={(e) => e.stopPropagation()}
                className="ds-apple-modal relative z-10 w-full max-w-[368px] rounded-[26px] px-6 pt-7 pb-6 text-left"
              >
                <h3 className="text-[19px] font-semibold leading-[1.28] tracking-[-0.02em]">Edit Display Name</h3>
                <p className="ds-apple-muted text-[14.5px] mt-1.5 mb-4">Choose how your display name appears across DEEP SHOP.</p>
                <input 
                  autoFocus
                  type="text"
                  className="ds-apple-input w-full rounded-2xl px-4 py-3.5 text-[15px] font-medium outline-none"
                  value={editNameValue}
                  placeholder="Enter new name"
                  onChange={e => setEditNameValue(e.target.value)}
                />
                <div className="mt-6 flex flex-col gap-2.5">
                  <button 
                    type="button"
                    onClick={() => { triggerHaptic(); handleUpdateName(); }}
                    disabled={!editNameValue.trim() || editNameValue.trim() === name}
                    className="ds-apple-btn-primary w-full min-h-[48px] px-5 rounded-full text-[15.5px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); setShowEditName(false); }}
                    className="ds-apple-btn-secondary w-full min-h-[48px] px-5 rounded-full text-[15.5px] font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showAddContact && (
            <div className="ds-apple-portal fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={() => setShowAddContact(false)}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="ds-apple-backdrop fixed inset-0"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
                onClick={(e) => e.stopPropagation()}
                className="ds-apple-modal relative z-10 w-full max-w-[368px] rounded-[26px] px-6 pt-7 pb-6 text-left"
              >
                <h3 className="text-[19px] font-semibold leading-[1.28] tracking-[-0.02em]">Add {contactTypeToAdd === 'email' ? 'Email Address' : 'Phone Number'}</h3>
                <p className="ds-apple-muted text-[14.5px] mt-1.5 mb-4">Link your {contactTypeToAdd === 'email' ? 'email' : 'phone'} to keep your account up to date.</p>
                <input 
                  autoFocus
                  type={contactTypeToAdd === 'email' ? "email" : "tel"}
                  className="ds-apple-input w-full rounded-2xl px-4 py-3.5 text-[15px] font-medium outline-none tabular-nums"
                  value={contactInputValue}
                  placeholder={contactTypeToAdd === 'email' ? "Enter your email" : "+8801..."}
                  onChange={e => setContactInputValue(e.target.value)}
                />
                <div className="mt-6 flex flex-col gap-2.5">
                  <button 
                    type="button"
                    onClick={() => { triggerHaptic(); handleUpdateContact(); }}
                    disabled={!contactInputValue.trim()}
                    className="ds-apple-btn-primary w-full min-h-[48px] px-5 rounded-full text-[15.5px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Save {contactTypeToAdd === 'email' ? 'Email' : 'Phone'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); setShowAddContact(false); }}
                    className="ds-apple-btn-secondary w-full min-h-[48px] px-5 rounded-full text-[15.5px] font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showPauseModal && (
            <div className="ds-apple-portal fixed inset-0 z-[100] flex items-center justify-center p-5" onClick={() => setShowPauseModal(false)}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="ds-apple-backdrop fixed inset-0"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
                onClick={(e) => e.stopPropagation()}
                className="ds-apple-modal relative z-10 w-full max-w-[390px] rounded-[26px] px-6 pt-7 pb-6 text-left"
              >
                <h3 className="text-[19px] font-semibold leading-[1.28] tracking-[-0.02em]">Pause Order Acceptance</h3>
                <p className="ds-apple-muted text-[14px] mt-2 mb-4 leading-[1.44]">
                  When enabled, &quot;Buy Now&quot; and new orders will be paused across all products in your store, and customers will see the reason you enter below.
                </p>
                
                <label className="text-xs font-semibold ds-apple-muted block mb-1.5">
                  Reason to show buyers *
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  className="ds-apple-input w-full rounded-2xl p-3.5 font-medium outline-none resize-none text-sm"
                  value={tempPauseReason}
                  placeholder="e.g., Temporary inventory update / Holiday break / Away on vacation..."
                  onChange={(e) => setTempPauseReason(e.target.value)}
                />

                <div className="mt-6 flex flex-col gap-2.5">
                  <button 
                    type="button"
                    onClick={() => { triggerHaptic("warning"); handleSavePauseReason(); }}
                    disabled={!tempPauseReason.trim()}
                    className="ds-apple-btn-primary w-full min-h-[48px] px-5 rounded-full text-[15.5px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Pause Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); setShowPauseModal(false); }}
                    className="ds-apple-btn-secondary w-full min-h-[48px] px-5 rounded-full text-[15.5px] font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-5 pt-6">
        <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-semibold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
          Settings
        </h1>
      </div>

      <div className="px-4 sm:px-5 mt-5 space-y-5 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:items-start">
        
        {/* Main Settings Card */}
        {(() => {
           const isPhoneAccount = email.endsWith('@phone.deepshop.top') || email.endsWith('@phone.vibegadget.com');
           return (
        <div className="ds-apple-surface rounded-[22px] overflow-hidden p-1.5">
            {isPhoneAccount ? (
               <>
                 <SettingItem icon="phone" label="Phone Number" subLabel={"+" + email.split("@")[0]} onClick={() => {}} />
                 <SettingItem 
                    icon="mail" 
                    label="Email" 
                    subLabel={secondaryEmail || "Not set. Add an email to login."} 
                    onClick={() => { if (!secondaryEmail) { triggerHaptic(); setContactTypeToAdd('email'); setContactInputValue(''); setShowAddContact(true); } }} 
                 />
               </>
            ) : (
               <>
                 <SettingItem icon="mail" label="Email" subLabel={email} onClick={() => {}} />
                 <SettingItem 
                    icon="phone" 
                    label="Phone Number" 
                    subLabel={phoneNumber || "Not set. Add a phone number."} 
                    onClick={() => { if (!phoneNumber) { triggerHaptic(); setContactTypeToAdd('phone'); setContactInputValue(''); setShowAddContact(true); } }} 
                 />
               </>
            )}
            <SettingItem icon="user" label="Name" subLabel={name} onClick={() => { triggerHaptic(); setEditNameValue(name); setShowEditName(true); }} />
            <SettingItem icon="user" label="Username" subLabel={username ? `@${username}` : "Not set"} onClick={() => { triggerHaptic(); navigate('/profile/edit'); }} />
            <SettingItem icon="lock" label="Password" onClick={() => { triggerHaptic(); navigate('/settings/password'); }} />
            <SettingItem icon="bell" label="Notifications" onClick={() => { triggerHaptic(); togglePush(); }} rightElement={<Switch isChecked={pushEnabled} />} />
            <SettingItem icon="shield" label="Privacy Policy" onClick={() => { triggerHaptic(); navigate('/privacy'); }} isLast />
        </div>
           );
        })()}

        {/* Seller / Store Settings (for verified sellers/admins) */}
        {canManageStore && (
          <div className="ds-apple-surface rounded-[22px] overflow-hidden p-1.5 border border-[#FF9500]/25">
            <h3 className="ds-apple-eyebrow text-[#C93400] dark:text-[#FF9F0A] px-4 py-2 mt-1 mb-0.5 flex items-center gap-1.5">
              <span>Seller Store Management</span>
            </h3>
            <SettingItem 
              icon="store" 
              label="Pause All Orders" 
              subLabel={ordersPaused ? `Paused: "${pauseReason || 'No reason provided'}"` : "Active — accepting orders normally"} 
              onClick={() => { triggerHaptic(); handleToggleOrdersPaused(); }} 
              rightElement={<Switch isChecked={ordersPaused} />} 
              isLast={!ordersPaused}
            />
            {ordersPaused && (
              <div className="px-4 py-2.5 bg-[#FF9500]/10 rounded-2xl mx-2 mb-2 flex items-center justify-between">
                <span className="text-xs text-[#C93400] dark:text-[#FF9F0A] font-medium">Edit Reason: {pauseReason}</span>
                <button 
                  type="button"
                  onClick={() => { triggerHaptic(); setTempPauseReason(pauseReason); setShowPauseModal(true); }}
                  className="text-xs font-semibold ds-apple-accent-text hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Privacy & Safety */}
        <div className="ds-apple-surface rounded-[22px] overflow-hidden p-1.5">
            <h3 className="ds-apple-eyebrow ds-apple-muted px-4 py-2 mt-1 mb-0.5">Privacy &amp; Safety</h3>
            <SettingItem 
               icon="shield" 
               label="Hide Email" 
               subLabel="Hide email address from other users" 
               onClick={() => { triggerHaptic(); handleToggleHideEmail(); }} 
               rightElement={<Switch isChecked={hideEmail} />} 
            />
            <SettingItem 
               icon="phone" 
               label="Hide Phone Number" 
               subLabel="Hide phone number from other users" 
               onClick={() => { triggerHaptic(); handleToggleHidePhone(); }} 
               rightElement={<Switch isChecked={hidePhone} />} 
            />
            <SettingItem 
               icon="lock" 
               label="Disable Calls" 
               subLabel="Block incoming voice & video calls" 
               onClick={() => { triggerHaptic(); handleToggleDisableCalls(); }} 
               rightElement={<Switch isChecked={disableCalls} />} 
               isLast
            />
        </div>

        {/* Preferences */}
        <div className="ds-apple-surface rounded-[22px] overflow-hidden p-1.5">
            <SettingItem icon="moon" label="Dark Mode" onClick={() => { triggerHaptic(); toggleTheme(); }} rightElement={<Switch isChecked={isDark} />} />
            <SettingItem icon="logout" label="Log Out" onClick={() => { triggerHaptic(); handleLogout(); }} />
            <SettingItem icon="trash" label={isDeleting ? "Deleting..." : "Delete Account"} onClick={() => { triggerHaptic("warning"); handleDeleteAccount(); }} isLast textColor="text-[#FF3B30] dark:text-[#FF453A]" />
        </div>

      </div>
		</div>
	);
}

function SettingItem({ icon, label, subLabel, onClick, isLast = false, rightElement, textColor }: { icon: React.ReactNode | string, label: string, subLabel?: string, onClick: (e?: React.MouseEvent) => void, isLast?: boolean, rightElement?: React.ReactNode, textColor?: string }) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-center justify-between px-4 py-3.5 cursor-pointer rounded-2xl hover:bg-black/[0.025] dark:hover:bg-white/[0.04] active:bg-black/[0.045] transition-colors",
                !isLast && "border-b border-black/[0.06] dark:border-white/[0.08]"
            )}
        >
            <div className="flex items-center space-x-3.5 min-w-0">
                {typeof icon === 'string' ? (
                  <Icon name={icon} className="w-5 h-5 ds-apple-muted shrink-0" />
                ) : (
                  icon
                )}
                <div className="flex flex-col min-w-0">
                  <span className={cn("font-medium text-[15px] tracking-[-0.01em]", textColor)}>{label}</span>
                  {subLabel && <span className="text-xs ds-apple-muted font-medium truncate">{subLabel}</span>}
                </div>
            </div>
            {rightElement || <Icon name="chevron-right" className="w-5 h-5 ds-apple-muted shrink-0" />}
        </div>
    )
}

function Switch({ isChecked }: { isChecked: boolean }) {
    return (
        <div className={cn(
            "w-12 h-7 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0",
            isChecked ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-[#E5E5EA] dark:bg-[#3A3A3C]"
        )}>
            <motion.div
              layout
              transition={APPLE_SPRING_SNAPPY}
              className={cn(
                "w-6 h-6 rounded-full bg-white shadow-sm",
                isChecked ? "ml-auto" : "mr-auto"
              )}
            />
        </div>
    )
}
