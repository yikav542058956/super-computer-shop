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

/** Normalize any phone format to 10 digits (strip leading 91 / +91) */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Check if a phone number is an admin: either whitelisted in adminPhones, or has role "admin" on its user record */
async function checkPhoneAdmin(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const rawDigits = phone.replace(/\D/g, "");
  try {
    const [whitelistSnap, whitelistSnap2, userSnap] = await Promise.all([
      get(ref(db, `adminPhones/${normalized}`)),
      get(ref(db, `adminPhones/${rawDigits}`)),
      get(ref(db, `users/phone_${normalized}`)),
    ]);
    if (whitelistSnap.exists() || whitelistSnap2.exists()) return true;
    if (userSnap.exists() && userSnap.val()?.role === "admin") return true;
    return false;
  } catch {
    return false;
  }
}

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
  const [extUserIsAdmin, setExtUserIsAdmin] = useState(false);
  const [firebaseAuthLoading, setFirebaseAuthLoading] = useState(true);
  const [extAdminLoading, setExtAdminLoading] = useState(false);

  // Firebase Auth users
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await get(ref(db, `users/${user.uid}`));
          setUserData(snap.exists() ? { uid: user.uid, ...snap.val() } as UserData : null);
        } catch {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setFirebaseAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Check if extUser phone is admin (runs on mount for already-stored extUser, and on change)
  useEffect(() => {
    if (!extUser?.phone) {
      setExtUserIsAdmin(false);
      setExtAdminLoading(false);
      return;
    }
    setExtAdminLoading(true);
    checkPhoneAdmin(extUser.phone).then((result) => {
      setExtUserIsAdmin(result);
      setExtAdminLoading(false);
    });
  }, [extUser?.phone]);

  const setExtUser = (u: ExtUser | null) => {
    setExtUserState(u);
    if (u) {
      localStorage.setItem(EXT_USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(EXT_USER_KEY);
      setExtUserIsAdmin(false);
    }
  };

  const logout = async () => {
    setExtUser(null);
    try { await auth.signOut(); } catch { /* ignore */ }
  };

  const isLoggedIn = !!currentUser || !!extUser;
  const isAdmin = userData?.role === "admin" || extUserIsAdmin;

  // Overall loading: wait for Firebase Auth AND extUser admin check (if extUser present)
  const loading = firebaseAuthLoading || (!!extUser && extAdminLoading);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        extUser,
        loading,
        isAdmin,
        isLoggedIn,
        setExtUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
