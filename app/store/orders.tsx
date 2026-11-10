import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { Order, OrderStatus } from "@/src/types";
import { formatCurrency } from "@/src/utils/currency";

// Texto e cor de cada etapa, e qual é a próxima ação da loja
const STATUS_INFO: Record<
  OrderStatus,
  { label: string; color: string; next?: OrderStatus; action?: string }
> = {
  placed: { label: "Novo pedido", color: colors.primary, next: "preparing", action: "Aceitar pedido" },
  preparing: { label: "Em preparo", color: colors.warning, next: "out_for_delivery", action: "Enviar para entrega" },
  out_for_delivery: { label: "Saiu para entrega", color: colors.success },
  arriving: { label: "Chegando", color: colors.success },
  delivered: { label: "Entregue", color: colors.textSecondary },
};

type Filter = "open" | "done";

/**
 * Pedidos recebidos pela loja do empreendedor.
 * Fluxo: Novo pedido → Aceitar (em preparo) → Enviar (saiu para entrega).
 * Depois o cliente confirma o recebimento na tela de acompanhamento.
 */
export default function StoreOrdersScreen() {
  const { user } = useAuth();
  const storeId = user?.store?.id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!storeId) return;
    try {
      setOrders(await api.getStoreOrders(storeId));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const handleAdvance = async (order: Order) => {
    const next = STATUS_INFO[order.status].next;
    if (!next) return;
    setUpdatingId(order.id);
    try {
      await api.updateStoreOrderStatus(order, next);
      await loadOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  const isDone = (o: Order) => o.status === "out_for_delivery" || o.status === "arriving" || o.status === "delivered";
  const visible = orders.filter((o) => (filter === "open" ? !isDone(o) : isDone(o)));

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Pedidos da Loja" />

      {/* Abas: Em aberto | Enviados */}
      <View style={styles.tabs}>
        {(
          [
            { id: "open", label: `Em aberto (${orders.filter((o) => !isDone(o)).length})` },
            { id: "done", label: "Enviados" },
          ] as { id: Filter; label: string }[]
        ).map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, filter === tab.id && styles.tabActive]}
            onPress={() => setFilter(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === tab.id }}
          >
            <Text style={[styles.tabText, filter === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            accentIcon={filter === "open" ? "time" : "checkmark"}
            title={filter === "open" ? "Nenhum pedido em aberto" : "Nenhum pedido enviado"}
            message={
              filter === "open"
                ? "Quando um cliente pedir na sua loja, o pedido aparece aqui para você aceitar."
                : "Os pedidos que você enviar para entrega ficam listados aqui."
            }
            actionLabel="Voltar ao painel"
            onAction={() => router.back()}
          />
        ) : (
          visible.map((order) => {
            const info = STATUS_INFO[order.status];
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customer}>{order.customerName || "Cliente"}</Text>
                    <Text style={styles.meta}>{order.createdAt}</Text>
                  </View>
                  <View style={[styles.statusTag, { borderColor: info.color }]}>
                    <Text style={[styles.statusTagText, { color: info.color }]}>{info.label}</Text>
                  </View>
                </View>

                {/* Itens com as observações do cliente */}
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemText}>
                      {item.quantity}x {item.product.name}
                    </Text>
                    {item.note ? <Text style={styles.note}>Obs.: {item.note}</Text> : null}
                  </View>
                ))}

                <Text style={styles.address}>Entregar em: {order.deliveryAddress}</Text>
                <Text style={styles.total}>Total: {formatCurrency(order.total)}</Text>

                {info.next && (
                  <AppButton
                    title={info.action ?? "Avançar"}
                    onPress={() => handleAdvance(order)}
                    loading={updatingId === order.id}
                    size="sm"
                    style={{ marginTop: spacing.sm }}
                  />
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: typography.semiBold,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  customer: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  meta: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusTagText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
  },
  itemRow: {
    marginBottom: spacing.xs,
  },
  itemText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
  },
  note: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.primary,
  },
  address: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  total: {
    marginTop: spacing.xs,
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
});
