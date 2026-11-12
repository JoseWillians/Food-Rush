import React, { createContext, useContext, useEffect, useState } from "react";
import { CartItem, Product, Restaurant } from "@/src/types";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { api } from "@/src/services/api";
import { calculateSubtotal, calculateTotal } from "@/src/utils/pricing";
import { neighborhoodFromAddress, resolveDeliveryFee } from "@/src/utils/deliveryFee";
import { useAuth } from "@/src/contexts/AuthContext";

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
  // De onde veio a taxa: bairro do cliente, rede de entregadores ou taxa única da loja
  deliveryFeeSource: "neighborhood" | "courier_network" | "store";
  // Zona do bairro do cliente (central, urbana, periférica, rural), usada no ganho do entregador
  deliveryZone?: string;
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
  const [feeInfo, setFeeInfo] = useState<ReturnType<typeof resolveDeliveryFee> | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<string | undefined>(undefined);
  const { user } = useAuth();

  // Bairro do endereço de entrega (o endereço padrão do perfil)
  const neighborhoodName =
    user?.addresses?.find((a) => a.isDefault)?.neighborhood ?? neighborhoodFromAddress(user?.address);

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

  // Taxa de entrega: usa a taxa que a loja cadastrou para o bairro do cliente;
  // se não houver, a taxa da rede de entregadores ou a taxa única da loja
  useEffect(() => {
    if (!cartRestaurant) {
      setFeeInfo(null);
      return;
    }
    let ativo = true;
    (async () => {
      const [neighborhoods, rates] = await Promise.all([
        api.getNeighborhoods(cartRestaurant.cityId || "cid-santaines"),
        api.getStoreDeliveryRates(cartRestaurant.id),
      ]);
      const bairro = neighborhoodName
        ? neighborhoods.find((n) => n.name.toLowerCase() === neighborhoodName.toLowerCase())
        : undefined;
      const result = resolveDeliveryFee({
        store: cartRestaurant,
        neighborhoodId: bairro?.id,
        zone: bairro?.zone,
        rates,
      });
      if (ativo) {
        setFeeInfo(result);
        setDeliveryZone(bairro?.zone);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [cartRestaurant, neighborhoodName]);

  const deliveryFee = items.length > 0 ? feeInfo?.deliveryFee ?? cartRestaurant?.deliveryFee ?? 0 : 0;
  const deliveryFeeSource = feeInfo?.source ?? "store";
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
        deliveryFeeSource,
        deliveryZone,
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
