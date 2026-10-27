import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LiquidGlassPopup } from "./ui/liquid-glass-popup";

export const CartAbandonmentPopup: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);

  useEffect(() => {
    if (prevPath === "/checkout" && location.pathname !== "/checkout") {
      const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
      if (cart.length > 0) {
        setShowPopup(true);
      }
    }
    setPrevPath(location.pathname);
  }, [location.pathname, prevPath]);

  const handleComplete = () => {
    setShowPopup(false);
    navigate("/checkout");
  };

  const handleDismiss = () => {
    setShowPopup(false);
  };

  return (
    <LiquidGlassPopup
      open={showPopup}
      onClose={handleDismiss}
      zIndexClass="z-[100000]"
      title="You left items in your cart!"
      description="Do you want to complete your purchase now or continue shopping for more items?"
      primaryText="Complete checkout"
      onPrimary={handleComplete}
      secondaryText="Continue shopping"
      onSecondary={handleDismiss}
    />
  );
};
