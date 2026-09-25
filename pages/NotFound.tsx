import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import { useIllustrations } from "../lib/useIllustrations";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const illustrations = useIllustrations();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 dark:bg-white p-10 sm:p-14 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800"
      >
        <div className="flex justify-center mb-10">
          <Logo scale={1.2} centerOrigin />
        </div>

        {illustrations.notFound ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-48 h-48 mx-auto mb-8 rounded-[20px] overflow-hidden"
            >
              <img src={illustrations.notFound} alt="Not Found" className="w-full h-full object-cover" />
            </motion.div>
        ) : (
            <motion.div
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-24 h-24 mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-8 shadow-inner"
            >
              <Icon name="search" className="text-lg text-zinc-400" />
            </motion.div>
        )}

        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
          Page Not Found
        </h1>

        <p className="text-sm text-zinc-500 font-medium mb-10 leading-relaxed">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        </motion.div>
    </div>
  );
};

export default NotFound;
