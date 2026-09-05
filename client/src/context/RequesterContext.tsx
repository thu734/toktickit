import React, { createContext, useContext, useState } from "react";
import { DevelopmentRequester } from "../api.js";

interface RequesterContextType {
  activeRequester: DevelopmentRequester | null;
  setActiveRequester: (requester: DevelopmentRequester | null) => void;
  showSelectorModal: boolean;
  setShowSelectorModal: (show: boolean) => void;
}

const RequesterContext = createContext<RequesterContextType>({
  activeRequester: null,
  setActiveRequester: () => {},
  showSelectorModal: true,
  setShowSelectorModal: () => {},
});

export const RequesterProvider: React.FC<{
  children: React.ReactNode;
  initialRequester?: DevelopmentRequester | null;
}> = ({ children, initialRequester = null }) => {
  const [activeRequester, setActiveRequester] =
    useState<DevelopmentRequester | null>(initialRequester);
  const [showSelectorModal, setShowSelectorModal] = useState<boolean>(
    !initialRequester
  );

  return (
    <RequesterContext.Provider
      value={{
        activeRequester,
        setActiveRequester: (req) => {
          setActiveRequester(req);
          if (req) {
            setShowSelectorModal(false);
          }
        },
        showSelectorModal,
        setShowSelectorModal,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export const useRequester = () => useContext(RequesterContext);
