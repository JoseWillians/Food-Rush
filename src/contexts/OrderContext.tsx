import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CartItem, Order, OrderStatus, PaymentMethod } from "@/src/types";
import { mockOrders } from "@/src/mocks/orders";
import { mockUser } from "@/src/mocks/user";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { api } from "@/src/services/api";
import { useAuth } from "@/src/contexts/AuthContext";

type CreateOrderInput = {
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
};

type OrderContextData = {
  orders: Order[];
  activeOrder: Order | null;
  createOrder: (input: CreateOrderInput) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  markOrderAsReviewed: (orderId: string) => void;
  setActiveOrder: (order: Order | null) => void;
  // Lê de novo os pedidos salvos (a loja pode ter mudado o status de um pedido)
  reloadOrders: () => Promise<void>;
};

// Lojas criadas por empreendedores têm id "store-...". Os pedidos para elas
// esperam a loja aceitar; as lojas de exemplo simulam o pedido já a caminho.
const isPartnerStore = (restaurantId: string) => restaurantId.startsWith("store-");

const OrderContext = createContext<OrderContextData>({} as OrderContextData);

/**
 * Contexto de pedidos: cria pedidos, muda o status, marca como avaliado
 * e guarda o pedido em andamento (activeOrder).
 */
export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEYS.ORDERS}_${user.id}` : STORAGE_KEYS.ORDERS;
  };

  const loadOrders = useCallback(async () => {
    // Se não há usuário logado, zera o estado
    if (!user) {
      setOrders([]);
      setActiveOrder(null);
      return;
    }

    const key = `${STORAGE_KEYS.ORDERS}_${user.id}`;
    const stored = await storageGet<Order[] | null>(key, null);

    if (stored !== null) {
      setOrders(stored);
      const inProgress = stored.find((o) => o.status !== "delivered");
      // Se já havia um pedido aberto na tela, mantém ele (com o status atualizado)
      setActiveOrder((prev) => stored.find((o) => o.id === prev?.id) ?? inProgress ?? null);
    } else {
      // Se for o usuário demo, oferece os pedidos de exemplo.
      // Compara com mockUser.id em vez de escrever o id à mão (antes estava "u-1" e o id real é "u1").
      if (user.id === mockUser.id) {
        setOrders(mockOrders);
        const inProgress = mockOrders.find((o) => o.status !== "delivered");
        setActiveOrder(inProgress || null);
        await storageSet(key, mockOrders);
      } else {
        // Novo cliente / novo usuário: abre 100% ZERADO (sem pedidos em andamento ou histórico)
        setOrders([]);
        setActiveOrder(null);
        await storageSet(key, []);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const createOrder = (input: CreateOrderInput): Order => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} às ${now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      restaurantImage: input.restaurantImage,
      items: input.items,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.total,
      createdAt: formattedDate,
      status: isPartnerStore(input.restaurantId) ? "placed" : "out_for_delivery",
      deliveryAddress: input.deliveryAddress,
      paymentMethod: input.paymentMethod,
      courierName: "Policarpo de Sousa",
      courierRating: 4.9,
      estimatedTime: "20-30 min",
      customerId: user?.id,
      customerName: user ? `${user.name} ${user.lastName ?? ""}`.trim() : "Cliente",
    };

    const key = getStorageKey();

    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      storageSet(key, updated);
      return updated;
    });

    setActiveOrder(newOrder);

    // Pedido para loja de empreendedor: vai para o painel de pedidos da loja
    if (isPartnerStore(newOrder.restaurantId)) {
      api.saveStoreOrder(newOrder);
    }

    // Sincroniza em background com o mock server (se ativo) sem travar a UI
    api.createOrder(newOrder).catch(() => {});

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const key = getStorageKey();

    setOrders((prev) => {
      const updated = prev.map((ord) =>
        ord.id === orderId ? { ...ord, status } : ord
      );
      storageSet(key, updated);
      return updated;
    });

    setActiveOrder((prev) =>
      prev && prev.id === orderId ? { ...prev, status } : prev
    );

    // Sincroniza status em background com o mock server
    api.updateOrderStatus(orderId, status).catch(() => {});
  };

  // Marca o pedido como avaliado, para o botão "Avaliar" não aparecer de novo
  const markOrderAsReviewed = (orderId: string) => {
    const key = getStorageKey();

    setOrders((prev) => {
      const updated = prev.map((ord) =>
        ord.id === orderId ? { ...ord, reviewed: true } : ord
      );
      storageSet(key, updated);
      return updated;
    });

    setActiveOrder((prev) =>
      prev && prev.id === orderId ? { ...prev, reviewed: true } : prev
    );
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeOrder,
        createOrder,
        updateOrderStatus,
        markOrderAsReviewed,
        setActiveOrder,
        reloadOrders: loadOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders(): OrderContextData {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders deve ser utilizado dentro de um OrderProvider");
  }
  return context;
}

