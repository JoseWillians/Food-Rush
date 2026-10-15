import React, { createContext, useContext, useEffect, useState } from "react";
import { CartItem, Product } from "@/src/types";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";

type CartContextData = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    async function loadCart() {
      const stored = await storageGet<CartItem[]>(STORAGE_KEYS.CART, []);
      setItems(stored);
    }
    loadCart();
  }, []);

  const updateItems = (updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      storageSet(STORAGE_KEYS.CART, next);
      return next;
    });
  };

  const addItem = (product: Product) => {
    updateItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          product,
          quantity: 1,
        },
      ];
    });
  };

  const removeItem = (productId: string) => {
    updateItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const increaseQuantity = (productId: string) => {
    updateItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (productId: string) => {
    updateItems((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;
      if (item.quantity <= 1) {
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const clearCart = () => {
    updateItems(() => []);
  };

  const subtotal = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const deliveryFee = items.length > 0 ? 5.99 : 0;
  const total = subtotal + deliveryFee;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        subtotal,
        deliveryFee,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser utilizado dentro de um CartProvider");
  }
  return context;
}
