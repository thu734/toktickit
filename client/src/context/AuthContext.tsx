import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, loginApi, logoutApi, fetchCurrentUser } from "../api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultDevRequester: User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@toktickit.local",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const u = await fetchCurrentUser();
      if (u) {
        setUser(u);
        return u;
      }
      setUser(defaultDevRequester);
      return defaultDevRequester;
    } catch {
      setUser(defaultDevRequester);
      return defaultDevRequester;
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await loginApi(email, password);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
