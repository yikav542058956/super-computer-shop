import React, { createContext, useContext, useState } from "react";

interface LoginDialogContextType {
  isOpen: boolean;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
}

const LoginDialogContext = createContext<LoginDialogContextType>({
  isOpen: false,
  openLoginDialog: () => {},
  closeLoginDialog: () => {},
});

export const useLoginDialog = () => useContext(LoginDialogContext);

export const LoginDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <LoginDialogContext.Provider
      value={{
        isOpen,
        openLoginDialog: () => setIsOpen(true),
        closeLoginDialog: () => setIsOpen(false),
      }}
    >
      {children}
    </LoginDialogContext.Provider>
  );
};
