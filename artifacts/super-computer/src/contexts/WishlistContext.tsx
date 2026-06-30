import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  brand: string;
  addedAt: number;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  isWishlisted: () => false,
  toggleWishlist: () => {},
  wishlistCount: 0,
});

export const useWishlist = () => useContext(WishlistContext);

const LOCAL_KEY = "sc_wishlist";

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const sync = async () => {
      if (currentUser) {
        const snap = await get(ref(db, `users/${currentUser.uid}/wishlist`));
        const local = localStorage.getItem(LOCAL_KEY);
        const localItems: WishlistItem[] = local ? JSON.parse(local) : [];

        if (snap.exists()) {
          const remote: WishlistItem[] = Object.values(snap.val());
          const merged = [...remote];
          localItems.forEach(li => {
            if (!merged.find(r => r.productId === li.productId)) merged.push(li);
          });
          setWishlist(merged);
          await set(ref(db, `users/${currentUser.uid}/wishlist`), Object.fromEntries(merged.map(i => [i.productId, i])));
          localStorage.removeItem(LOCAL_KEY);
        } else if (localItems.length > 0) {
          setWishlist(localItems);
          await set(ref(db, `users/${currentUser.uid}/wishlist`), Object.fromEntries(localItems.map(i => [i.productId, i])));
          localStorage.removeItem(LOCAL_KEY);
        }
      }
    };
    sync();
  }, [currentUser]);

  const save = async (items: WishlistItem[]) => {
    setWishlist(items);
    if (currentUser) {
      await set(ref(db, `users/${currentUser.uid}/wishlist`), Object.fromEntries(items.map(i => [i.productId, i])));
    } else {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    }
  };

  const addToWishlist = (item: WishlistItem) => {
    if (!wishlist.find(w => w.productId === item.productId)) {
      save([...wishlist, { ...item, addedAt: Date.now() }]);
    }
  };

  const removeFromWishlist = (productId: string) => {
    save(wishlist.filter(w => w.productId !== productId));
  };

  const isWishlisted = (productId: string) => wishlist.some(w => w.productId === productId);

  const toggleWishlist = (item: WishlistItem) => {
    if (isWishlisted(item.productId)) removeFromWishlist(item.productId);
    else addToWishlist(item);
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isWishlisted,
      toggleWishlist,
      wishlistCount: wishlist.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};
