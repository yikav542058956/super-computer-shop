import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  clearCart: () => {},
  cartCount: 0,
  cartTotal: 0,
});

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("guest_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchUserCart = async () => {
      if (currentUser) {
        const cartRef = ref(db, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        if (snapshot.exists()) {
          const userCart = snapshot.val() as CartItem[];
          
          // Merge guest cart with user cart
          const guestCartStr = localStorage.getItem("guest_cart");
          if (guestCartStr) {
            const guestCart = JSON.parse(guestCartStr) as CartItem[];
            const mergedCart = [...userCart];
            
            guestCart.forEach(gItem => {
              const existing = mergedCart.find(i => i.productId === gItem.productId);
              if (existing) existing.qty += gItem.qty;
              else mergedCart.push(gItem);
            });
            
            setCart(mergedCart);
            await set(ref(db, `users/${currentUser.uid}/cart`), mergedCart);
            localStorage.removeItem("guest_cart");
          } else {
            setCart(userCart);
          }
        } else {
          // Sync guest cart to user if it exists
          const guestCartStr = localStorage.getItem("guest_cart");
          if (guestCartStr) {
            const guestCart = JSON.parse(guestCartStr) as CartItem[];
            setCart(guestCart);
            await set(ref(db, `users/${currentUser.uid}/cart`), guestCart);
            localStorage.removeItem("guest_cart");
          }
        }
      }
    };
    
    fetchUserCart();
  }, [currentUser]);

  const saveCart = async (newCart: CartItem[]) => {
    setCart(newCart);
    if (currentUser) {
      await set(ref(db, `users/${currentUser.uid}/cart`), newCart);
    } else {
      localStorage.setItem("guest_cart", JSON.stringify(newCart));
    }
  };

  const addToCart = (item: CartItem) => {
    const existing = cart.find((i) => i.productId === item.productId);
    let newCart;
    if (existing) {
      newCart = cart.map((i) =>
        i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i
      );
    } else {
      newCart = [...cart, item];
    }
    saveCart(newCart);
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter((i) => i.productId !== productId);
    saveCart(newCart);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const newCart = cart.map((i) =>
      i.productId === productId ? { ...i, qty } : i
    );
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};