import React from "react";
import SavedAccountsPage from "./SavedAccountsPage";
import SignIn from "./SignIn";
import { getSavedAccounts } from "../lib/savedAccounts";

const AuthSelector: React.FC = () => {
  const savedAccounts = getSavedAccounts();

  if (savedAccounts.length > 0) {
    return <SavedAccountsPage />;
  }

  return <SignIn />;
};

export default AuthSelector;
