import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import { AuthLayout, AuthSeparator } from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Lock, Eye, EyeOff, Loader2, User, Phone, Store, CreditCard, Home, Mail } from "lucide-react";
import { AuthInputs } from "../components/AuthInputs";
import { VibeMascot, MascotState } from "../components/ui/VibeMascot";
import { PasswordStrength } from "../components/ui/PasswordStrength";
import SEO from "../components/SEO";
import { validateInput } from "../lib/utils";

const SignUp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();

  const queryParams = new URLSearchParams(location.search);
  const role = queryParams.get("role") || "customer";

  const [name, setName] = useState("");
  const [authType, setAuthType] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mascotFocus, setMascotFocus] = useState<'idle' | 'name' | 'email' | 'password' | 'success' | 'error'>('idle');

  // Seller specific fields
  const [shopName, setShopName] = useState("");
  const [nidName, setNidName] = useState("");
  const [shopNumber, setShopNumber] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic store selection states
  const [storeType, setStoreType] = useState<"physical" | "online">("physical");
  const [mallName, setMallName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedShopNum, setSelectedShopNum] = useState("");

  useEffect(() => {
    if (storeType === "online") {
      setShopNumber("Online Presence");
    } else {
      const parts = [
        selectedShopNum.trim(),
        selectedBlock.trim(),
        selectedLevel.trim(),
        mallName.trim()
      ].filter(Boolean);
      setShopNumber(parts.join(", "));
    }
  }, [storeType, selectedLevel, selectedBlock, selectedShopNum, mallName]);

  let mascotState: MascotState = 'idle';
  if (mascotFocus === 'name') mascotState = name.length > 0 ? 'name-typed' : 'name-empty';
  else if (mascotFocus === 'email') mascotState = 'email';
  else if (mascotFocus === 'password') mascotState = 'password';
  else if (mascotFocus === 'success') mascotState = 'success';
  else if (mascotFocus === 'error') mascotState = 'error';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate Limiting to prevent spam accounts
    const lastSignUp = localStorage.getItem("vibe_last_signup");
    const now = Date.now();
    if (lastSignUp && now - parseInt(lastSignUp) < 1000 * 60 * 5) { // 5 minutes limit
       setMascotFocus("error");
       return notify("You are doing this too often. Please try again later.", "error");
    }

    if (role === "customer") {
      if (!name.trim()) return notify("Please enter your name", "error");
      const nameError = validateInput(name, 'name');
      if (nameError) return notify(nameError, 'error');
    } else {
      // Seller validation
      if (!shopName.trim()) return notify("Please enter your Shop Name", "error");
      if (!nidName.trim()) return notify("Please enter your name as per NID", "error");
      if (!shopNumber.trim()) return notify("Please enter your Shop Number", "error");
      if (!altPhone.trim()) return notify("Please enter your Alternative Personal Number", "error");
      if (!phoneNumber.trim()) return notify("Please enter your Seller mobile number", "error");
      if (!email.trim()) return notify("Please enter your email", "error");
      if (password !== confirmPassword) return notify("Passwords do not match", "error");
    }

    if (!agree)
      return notify("Please agree to the Terms & Conditions", "error");

    if (role === "customer") {
      if (authType === "email" && email !== "admin@deep.shop") {
        const error = validateInput(email, 'email');
        if (error) return notify(error, "error");
      } else if (authType === "phone") {
        const error = validateInput(phoneNumber, 'phone');
        if (error) return notify(error, "error");
      }
    } else {
      // For seller, always validate email & seller phone
      const emailError = validateInput(email, 'email');
      if (emailError) return notify(emailError, "error");
      const phoneError = validateInput(phoneNumber, 'phone');
      if (phoneError) return notify(phoneError, "error");
    }

    const passError = validateInput(password, 'password');
    if (passError) return notify(passError, 'error');

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (password.length < 8 || !hasLower || !hasUpper || !hasNumber || !hasSpecial) {
       return notify("Please ensure your password meets all strength requirements.", "error");
    }

    setLoading(true);
    
    const getAuthEmail = () => {
      if (role === "customer" && authType === "phone") {
         const cleanPhone = phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber;
         return `${countryCode.replace('+', '')}${cleanPhone}@phone.deepshop.top`;
      }
      return email;
    };

    try {
        const authEmail = getAuthEmail();
        const displayName = role === "seller" ? nidName : name;
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, password);
        const user = userCred.user;
        await updateProfile(user, { displayName: displayName });

        try {
            const accountsStr = localStorage.getItem("vibe_saved_accounts");
            let accounts = accountsStr ? JSON.parse(accountsStr) : [];
            accounts = accounts.filter((a: any) => a.uid !== user.uid);
            accounts.push({
                uid: user.uid,
                email: authEmail,
                password: password,
                displayName: displayName,
                photoURL: "",
                lastPasswordChange: null,
            });
            localStorage.setItem("vibe_saved_accounts", JSON.stringify(accounts));
        } catch (e) {}

        const userData: any = {
          uid: user.uid,
          email: authEmail,
          displayName: displayName,
          role: role,
          isBanned: false,
          createdAt: Date.now(),
          registrationDate: Date.now(),
          lastActive: Date.now(),
        };

        if (role === "seller") {
          userData.shopName = shopName;
          userData.nidOwnerName = nidName;
          userData.shopNumber = shopNumber;
          userData.alternativePhone = altPhone;
          userData.phoneNumber = phoneNumber;
        }

        await setDoc(doc(db, "users", user.uid), userData, { merge: true });

        localStorage.setItem("vibe_last_signup", Date.now().toString());
        setMascotFocus("success");
        notify("Account created successfully!", "success");

        // Check if there is a pending guest order to automatically link
        const searchParams = new URLSearchParams(location.search);
        const redirectParam = searchParams.get("redirect");
        const pendingGuestOrder = searchParams.get("guestOrder") || localStorage.getItem("pending_guest_order_id");
        if (pendingGuestOrder && user?.uid) {
          try {
            await updateDoc(doc(db, "orders", pendingGuestOrder), {
              userId: user.uid,
              customerEmail: user.email || ""
            });
            localStorage.removeItem("pending_guest_order_id");
            localStorage.removeItem("pending_guest_order_phone");
          } catch (ordErr) {
            console.error("Auto linking order to new account failed:", ordErr);
          }
        }
        
        setTimeout(() => {
          if (role === "seller") {
            navigate("/seller/dashboard");
          } else if (redirectParam) {
            navigate(redirectParam);
          } else if (pendingGuestOrder) {
            navigate("/my-orders");
          } else {
            navigate("/");
          }
        }, 1000);
    } catch (err: any) {
      console.error("SignUp Error:", err);
      setMascotFocus("error");
      notify(getFriendlyErrorMessage(err) + " (" + err.code + ")", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={role === "seller" ? "Seller Registration" : "Create Account"}
      subtitle={role === "seller" ? "Become a DEEP SHOP Merchant Partner" : "Start exploring premium phones & devices today."}
    >
      <SEO 
        title="Sign Up" 
        description="Create your DEEP SHOP account in Bangladesh and discover premium products." 
        canonical="/signup"
      />
      <VibeMascot state={mascotState} showPassword={showPassword} />
      <form onSubmit={handleSignUp} className="space-y-4 relative z-20">
        <div className="space-y-4">
          
          {role === "customer" ? (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Full Name
                </label>
                <div className="relative h-max">
                  <Input
                    placeholder="e.g. John Doe"
                    className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setMascotFocus('name')}
                    onBlur={() => setMascotFocus('idle')}
                    required
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-disabled:opacity-50">
                    <User className="size-4" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div onFocus={() => setMascotFocus('email')} onBlur={() => setMascotFocus('idle')} tabIndex={-1}>
                <AuthInputs 
                  authType={authType}
                  setAuthType={setAuthType}
                  email={email}
                  setEmail={setEmail}
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                />
              </div>
            </>
          ) : (
            // Seller registration fields
            <>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Shop Name
                </label>
                <div className="relative h-max">
                  <Input
                    placeholder="e.g. Dhaka Gadget House"
                    className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                    <Store className="size-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Owner Name (as per NID)
                </label>
                <div className="relative h-max">
                  <Input
                    placeholder="e.g. Md. Rahman"
                    className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    type="text"
                    value={nidName}
                    onChange={(e) => setNidName(e.target.value)}
                    required
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                    <CreditCard className="size-4" />
                  </div>
                </div>
              </div>

              {/* Store Outlet Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Store Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStoreType("physical")}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${storeType === "physical" ? "bg-white dark:bg-zinc-900 text-[#EF8020] shadow-sm font-bold" : "text-zinc-500"}`}
                  >
                    <Store className="w-3.5 h-3.5" /> Physical Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreType("online")}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${storeType === "online" ? "bg-white dark:bg-zinc-900 text-[#EF8020] shadow-sm font-bold" : "text-zinc-500"}`}
                  >
                    <Home className="w-3.5 h-3.5" /> Online Store
                  </button>
                </div>
              </div>

              {/* Shop Number selection based on type */}
              {storeType === "physical" ? (
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Market / Mall / Area Name</label>
                    <Input
                      placeholder="e.g. Jamuna Future Park / Banani"
                      className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
                      type="text"
                      value={mallName}
                      onChange={(e) => setMallName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Level / Floor</label>
                      <Input
                        placeholder="e.g. Level 4"
                        className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
                        type="text"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Block / Zone</label>
                      <Input
                        placeholder="e.g. Block A"
                        className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
                        type="text"
                        value={selectedBlock}
                        onChange={(e) => setSelectedBlock(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Shop / Stall</label>
                      <Input
                        placeholder="e.g. Shop 24"
                        className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
                        type="text"
                        value={selectedShopNum}
                        onChange={(e) => setSelectedShopNum(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="pt-1.5 border-t border-zinc-150/40 dark:border-zinc-800/40 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Generated Store Address:</span>
                    <span className="font-bold text-[#EF8020] truncate max-w-[200px]">{shopNumber}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Shop Number
                  </label>
                  <div className="h-12 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-150 dark:border-zinc-800/60 rounded-xl flex items-center px-4 gap-3 text-xs font-bold text-zinc-500">
                    <Home className="w-4 h-4 text-[#EF8020]" />
                    <span>Online Presence (No physical outlet)</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Seller Mobile Number
                </label>
                <div className="relative h-max">
                  <Input
                    placeholder="e.g. 01712345678"
                    className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                    <Phone className="size-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Personal Alternative Number
                </label>
                <div className="relative h-max">
                  <Input
                    placeholder="e.g. 01912345678"
                    className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    type="text"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    required
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                    <Phone className="size-4 text-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <div className="relative h-max">
                  <Input
                    placeholder="e.g. merchant@deepshop.com"
                    className="peer ps-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                    <Mail className="size-4" />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <div className="relative h-max">
              <Input
                placeholder="At least 8 characters"
                className="peer ps-10 pe-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setMascotFocus('password')}
                onBlur={() => setMascotFocus('idle')}
                minLength={8}
                required
              />
              <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-disabled:opacity-50">
                <Lock className="size-4" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                onFocus={() => setMascotFocus('password')}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            
            {(password.length > 0 || mascotFocus === 'password') && (
               <PasswordStrength password={password} />
            )}
          </div>

          {role === "seller" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Confirm Password
              </label>
              <div className="relative h-max">
                <Input
                  placeholder="Repeat your password exactly"
                  className="peer ps-10 pe-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5">
                  <Lock className="size-4 text-emerald-500" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <Checkbox id="terms" checked={agree} onCheckedChange={(c) => setAgree(!!c)} />
          <label
            htmlFor="terms"
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer"
          >
            I agree to the{" "}
            <Link to="/terms" className="text-zinc-900 dark:text-zinc-100 font-semibold underline underline-offset-2">
              Terms & Conditions
            </Link>
          </label>
        </div>

        <Button
          disabled={loading}
          className="w-full h-12 mt-6 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-semibold shadow-lg shadow-black/20 dark:shadow-white/10"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating account..." : (role === "seller" ? "Register as Seller" : "Sign Up")}
        </Button>
      </form>

      <AuthSeparator text="ALREADY HAVE AN ACCOUNT?" />
      
      <Button 
        type="button" 
        variant="outline"
        className="w-full h-12 font-semibold border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-xl"
        onClick={() => navigate("/signin")}
      >
        Sign In Instead
      </Button>
    </AuthLayout>
  );
};

export default SignUp;
