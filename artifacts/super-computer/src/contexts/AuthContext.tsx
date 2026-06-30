import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "@/lib/firebase";

const EXT_USER_KEY = "sc_ext_user";

export interface ExtUser {
  userid: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  is_paid_user: string;
  username: string;
  state: string;
}

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: "user" | "admin";
  photoURL?: string;
  phone?: string;
  wishlist?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  extUser: ExtUser | null;
  loading: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  setExtUser: (u: ExtUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  extUser: null,
  loading: true,
  isAdmin: false,
  isLoggedIn: false,
  setExtUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [extUser, setExtUserState] = useState<ExtUser | null>(() => {
    try {
      const raw = localStorage.getItem(EXT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            setUserData({ uid: user.uid, ...snapshot.val() } as UserData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const setExtUser = (u: ExtUser | null) => {
    setExtUserState(u);
    if (u) {
      localStorage.setItem(EXT_USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(EXT_USER_KEY);
    }
  };

  const logout = async () => {
    setExtUser(null);
    try { await auth.signOut(); } catch { /* ignore */ }
  };

  const isLoggedIn = !!currentUser || !!extUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        extUser,
        loading,
        isAdmin: userData?.role === "admin",
        isLoggedIn,
        setExtUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
