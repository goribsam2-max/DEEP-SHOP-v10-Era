import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const notify = useNotify();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("medium");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        triggerHaptic("success");
        notify("Logged in successfully!", "success");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          displayName: name,
          role: "user",
          isBanned: false,
          createdAt: Date.now(),
        }, { merge: true });
        triggerHaptic("success");
        notify("Account created successfully!", "success");
      }
      navigate("/");
    } catch (error: any) {
      triggerHaptic("error");
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="ds-apple-surface w-full max-w-md rounded-[28px] p-6 sm:p-8"
      >
        <div className="mb-8 text-center">
          <h1 className="ds-apple-display text-[26px] font-semibold tracking-[-0.025em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="ds-apple-muted text-[14.5px]">
            Experience premium border cross phones &amp; devices
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                className="ds-apple-input w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="ds-apple-input w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none"
              placeholder="example@mail.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="ds-apple-input w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ds-apple-btn-primary w-full min-h-[50px] px-5 mt-2 rounded-full text-[16px] font-semibold whitespace-nowrap active:scale-[0.98] transition-transform disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-[14px] ds-apple-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setIsLogin(!isLogin);
              }}
              className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline cursor-pointer"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
