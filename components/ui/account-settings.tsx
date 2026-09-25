import React, { useEffect, useState } from 'react';
import { cn, validateInput } from '@/lib/utils';
import { auth, db } from '@/firebase';
import { signOut, deleteUser, updateProfile } from 'firebase/auth';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useNotify, useConfirm } from '@/components/Notifications';
import Icon from '../Icon';
import { useTheme } from '@/components/ThemeContext';

export function AccountSettings() {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const { isDark, toggleTheme } = useTheme();

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
  const [userRole, setUserRole] = useState<string>('user');
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [tempPauseReason, setTempPauseReason] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setEmail(user.email || '');
      setName(user.displayName || '');
      
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
            setUserRole(data.role || 'user');
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
        notify("অর্ডার গ্রহণ পুনরায় চালু করা হয়েছে (Orders resumed)", "success");
      }).catch(() => notify("Failed to update setting", "error"));
    } else {
      // Opening modal to enter reason
      setTempPauseReason(pauseReason || "বর্তমানে শপ সাময়িক বিরতিতে থাকায় নতুন অর্ডার নেওয়া হচ্ছে না।");
      setShowPauseModal(true);
    }
  };

  const handleSavePauseReason = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!tempPauseReason.trim()) {
      return notify("অর্ডার বন্ধ করার কারণ উল্লেখ করুন (Reason is required)", "error");
    }
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ordersPaused: true,
        pauseReason: tempPauseReason.trim()
      });
      setOrdersPaused(true);
      setPauseReason(tempPauseReason.trim());
      setShowPauseModal(false);
      notify("অর্ডার গ্রহণ সাময়িকভাবে বন্ধ করা হয়েছে", "success");
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
    await signOut(auth);
    localStorage.removeItem("f_cart");
    navigate("/");
    window.dispatchEvent(new CustomEvent('openAccountCenter'));
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
		<div className="min-h-screen bg-[#F0F2F5] dark:bg-zinc-950 font-sans pb-10 text-zinc-900 dark:text-zinc-100 relative">
      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[28px] p-6 shadow-2xl relative">
              <button onClick={() => setShowEditName(false)} className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                 <Icon name="close" className="w-5 h-5 text-zinc-500" />
              </button>
              <h3 className="text-xl font-bold mb-4">Edit Username</h3>
              <input 
                 autoFocus
                 type="text"
                 className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-4 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#109E92] outline-none transition-all placeholder:text-zinc-400 mb-6"
                 value={editNameValue}
                 placeholder="Enter new username"
                 onChange={e => setEditNameValue(e.target.value)}
              />
              <button 
                 onClick={handleUpdateName}
                 disabled={!editNameValue.trim() || editNameValue.trim() === name}
                 className="w-full bg-gradient-to-r from-[#109E92] to-[#0D8A7D] text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                 Save Changes
              </button>
           </div>
        </div>
      )}

      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[28px] p-6 shadow-2xl relative">
              <button onClick={() => setShowAddContact(false)} className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                 <Icon name="close" className="w-5 h-5 text-zinc-500" />
              </button>
              <h3 className="text-xl font-bold mb-4">Add {contactTypeToAdd === 'email' ? 'Email' : 'Phone'}</h3>
              <input 
                 autoFocus
                 type={contactTypeToAdd === 'email' ? "email" : "tel"}
                 className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-4 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#109E92] outline-none transition-all placeholder:text-zinc-400 mb-6"
                 value={contactInputValue}
                 placeholder={contactTypeToAdd === 'email' ? "Enter your email" : "+8801..."}
                 onChange={e => setContactInputValue(e.target.value)}
              />
              <button 
                 onClick={handleUpdateContact}
                 disabled={!contactInputValue.trim()}
                 className="w-full bg-gradient-to-r from-[#109E92] to-[#0D8A7D] text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                 Add {contactTypeToAdd === 'email' ? 'Email' : 'Phone'}
              </button>
           </div>
        </div>
      )}

      {/* Pause Orders Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[28px] p-6 shadow-2xl relative border border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setShowPauseModal(false)} 
              className="absolute top-4 right-4 p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition"
            >
              <Icon name="close" className="w-5 h-5 text-zinc-500" />
            </button>
            <h3 className="text-xl font-bold mb-1 text-zinc-900 dark:text-white">অর্ডার গ্রহণ বন্ধ রাখুন (Pause Orders)</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              এটি চালু করলে আপনার স্টোরের সব প্রোডাক্টে "Buy Now" ও অর্ডার গ্রহণ বন্ধ থাকবে এবং কাস্টমারদের আপনার দেওয়া কারণ দেখানো হবে।
            </p>
            
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1.5">
              অর্ডার বন্ধ রাখার কারণ (Reason to show buyers) *
            </label>
            <textarea
              rows={3}
              autoFocus
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder:text-zinc-400 mb-5 resize-none text-sm"
              value={tempPauseReason}
              placeholder="যেমন: সাময়িক স্টক আপডেট চলছে / ঈদের ছুটি / ভ্যাকেশনে আছি..."
              onChange={(e) => setTempPauseReason(e.target.value)}
            />

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300"
              >
                বাতিল
              </button>
              <button 
                type="button"
                onClick={handleSavePauseReason}
                disabled={!tempPauseReason.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
              >
                বন্ধ রাখুন (Pause)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-5 pt-6">
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Settings</h1>
      </div>

      <div className="px-5 mt-6 space-y-5 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:items-start">
        
        {/* Main Settings Card */}
        {(() => {
           const isPhoneAccount = email.endsWith('@phone.deepshop.top') || email.endsWith('@phone.vibegadget.com');
           return (
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] overflow-hidden shadow-sm p-2">
            {isPhoneAccount ? (
               <>
                 <SettingItem icon="phone" label="Phone Number" subLabel={"+" + email.split("@")[0]} onClick={() => {}} />
                 <SettingItem 
                    icon="mail" 
                    label="Email" 
                    subLabel={secondaryEmail || "Not set. Add an email to login."} 
                    onClick={() => { if (!secondaryEmail) { setContactTypeToAdd('email'); setContactInputValue(''); setShowAddContact(true); } }} 
                 />
               </>
            ) : (
               <>
                 <SettingItem icon="mail" label="Email" subLabel={email} onClick={() => {}} />
                 <SettingItem 
                    icon="phone" 
                    label="Phone Number" 
                    subLabel={phoneNumber || "Not set. Add a phone number."} 
                    onClick={() => { if (!phoneNumber) { setContactTypeToAdd('phone'); setContactInputValue(''); setShowAddContact(true); } }} 
                 />
               </>
            )}
            <SettingItem icon="user" label="Name" subLabel={name} onClick={() => { setEditNameValue(name); setShowEditName(true); }} />
            <SettingItem icon="user" label="Username" subLabel={username ? `@${username}` : "Not set"} onClick={() => navigate('/profile/edit')} />
            <SettingItem icon="lock" label="Password" onClick={() => navigate('/settings/password')} />
            <SettingItem icon="bell" label="Notifications" onClick={togglePush} rightElement={<Switch isChecked={pushEnabled} />} />
            <SettingItem icon="shield" label="Privacy Policy" onClick={() => navigate('/privacy')} isLast />
        </div>
           );
        })()}

        {/* Seller / Store Settings (for sellers/admins) */}
        {(userRole === 'seller' || userRole === 'admin') && (
          <div className="bg-white dark:bg-zinc-900 rounded-[28px] overflow-hidden shadow-sm p-2 border border-amber-500/20">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-4 py-2 mt-2 mb-1 flex items-center gap-1.5">
              <span>🏪 Seller Store Management</span>
            </h3>
            <SettingItem 
              icon="store" 
              label="Pause All Orders" 
              subLabel={ordersPaused ? `অর্ডার বন্ধ: "${pauseReason || 'কারণ দেওয়া হয়নি'}"` : "Active — accepting orders normally"} 
              onClick={handleToggleOrdersPaused} 
              rightElement={<Switch isChecked={ordersPaused} />} 
            />
            {ordersPaused && (
              <div className="px-4 py-2.5 bg-amber-500/10 rounded-2xl mx-2 mb-2 flex items-center justify-between">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">Edit Reason: {pauseReason}</span>
                <button 
                  onClick={() => { setTempPauseReason(pauseReason); setShowPauseModal(true); }}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Privacy & Safety */}
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] overflow-hidden shadow-sm p-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-4 py-2 mt-2 mb-1">Privacy & Safety</h3>
            <SettingItem 
               icon="shield" 
               label="Hide Email" 
               subLabel="Hide email address from other users" 
               onClick={handleToggleHideEmail} 
               rightElement={<Switch isChecked={hideEmail} />} 
            />
            <SettingItem 
               icon="phone" 
               label="Hide Phone Number" 
               subLabel="Hide phone number from other users" 
               onClick={handleToggleHidePhone} 
               rightElement={<Switch isChecked={hidePhone} />} 
            />
            <SettingItem 
               icon="lock" 
               label="Disable Calls" 
               subLabel="Block incoming voice & video calls" 
               onClick={handleToggleDisableCalls} 
               rightElement={<Switch isChecked={disableCalls} />} 
               isLast
            />
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] overflow-hidden shadow-sm p-2">
            <SettingItem icon="moon" label="Dark Mode" onClick={toggleTheme} rightElement={<Switch isChecked={isDark} />} />
            <SettingItem icon="logout" label="Log Out" onClick={handleLogout} />
            <SettingItem icon="trash" label="Delete Account" onClick={handleDeleteAccount} isLast textColor="text-red-500" />
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
                "flex items-center justify-between p-4 cursor-pointer",
                !isLast && "border-b border-zinc-100 dark:border-zinc-800/50"
            )}
        >
            <div className="flex items-center space-x-4">
                {typeof icon === 'string' ? (
                  <Icon name={icon} className="w-5 h-5 text-zinc-500" />
                ) : (
                  icon
                )}
                <div className="flex flex-col">
                  <span className={cn("font-medium text-[15px]", textColor || "text-zinc-800 dark:text-zinc-200")}>{label}</span>
                  {subLabel && <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{subLabel}</span>}
                </div>
            </div>
            {rightElement || <Icon name="chevron-right" className="w-5 h-5 text-zinc-400" />}
        </div>
    )
}

function Switch({ isChecked }: { isChecked: boolean }) {
    return (
        <div className={cn(
            "w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300",
            isChecked ? "bg-[#109E92]" : "bg-zinc-300 dark:bg-zinc-700"
        )}>
            <div className={cn(
                "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                isChecked ? "translate-x-4" : "translate-x-0"
            )} />
        </div>
    )
}
