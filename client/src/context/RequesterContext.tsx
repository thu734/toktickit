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

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeRequester, setActiveRequester] =
    useState<DevelopmentRequester | null>(null);
  const [showSelectorModal, setShowSelectorModal] = useState<boolean>(
    !activeRequester
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
