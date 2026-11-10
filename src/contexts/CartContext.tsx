import React, { createContext, useContext, useEffect, useState } from "react";
import { CartItem, Product, Restaurant } from "@/src/types";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { api } from "@/src/services/api";
import { calculateSubtotal, calculateTotal } from "@/src/utils/pricing";

type CartContextData = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  updateNote: (productId: string, note: string) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  // Loja dos itens que estão no carrinho (null se o carrinho estiver vazio)
  cartRestaurant: Restaurant | null;
  // true se o produto é de outra loja diferente da que já está no carrinho
  isFromAnotherStore: (product: Product) => boolean;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextData>({} as CartContextData);

/**
 * Contexto do carrinho: itens, quantidades, observações, loja do carrinho,
 * taxa de entrega e totais. O carrinho fica salvo no aparelho.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartRestaurant, setCartRestaurant] = useState<Restaurant | null>(null);

  // O carrinho só tem itens de uma loja, então ela é a loja do primeiro item
  const cartRestaurantId = items[0]?.product.restaurantId ?? null;

  useEffect(() => {
    async function loadCart() {
      const stored = await storageGet<CartItem[]>(STORAGE_KEYS.CART, []);
      setItems(stored);
    }
    loadCart();
  }, []);

  // Quando a loja do carrinho muda, busca os dados dela (principalmente a taxa de entrega)
  useEffect(() => {
    if (!cartRestaurantId) {
      setCartRestaurant(null);
      return;
    }
    let ativo = true;
    // Mostra logo os dados locais e depois confirma pela API (que também conhece as lojas novas)
    setCartRestaurant(mockRestaurants.find((r) => r.id === cartRestaurantId) ?? null);
    api.getRestaurantById(cartRestaurantId).then((found) => {
      if (ativo && found) setCartRestaurant(found);
    });
    return () => {
      ativo = false;
    };
  }, [cartRestaurantId]);

  const isFromAnotherStore = (product: Product) =>
    cartRestaurantId !== null && product.restaurantId !== cartRestaurantId;

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

  // Observação do cliente para um item (ex.: "sem cebola")
  const updateNote = (productId: string, note: string) => {
    updateItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, note: note.slice(0, 120) } : i))
    );
  };

  const clearCart = () => {
    updateItems(() => []);
  };

  const subtotal = calculateSubtotal(
    items.map((item) => ({ price: item.product.price, quantity: item.quantity }))
  );

  // Taxa de entrega da loja do carrinho (cada loja tem a sua)
  const deliveryFee = items.length > 0 ? cartRestaurant?.deliveryFee ?? 0 : 0;
  const total = calculateTotal(subtotal, deliveryFee);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        increaseQuantity,
        decreaseQuantity,
        updateNote,
        clearCart,
        subtotal,
        deliveryFee,
        cartRestaurant,
        isFromAnotherStore,
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
