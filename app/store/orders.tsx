import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { Order, OrderStatus, StoreCourier } from "@/src/types";
import { formatCurrency } from "@/src/utils/currency";
import { showMessage } from "@/src/utils/dialog";

// Texto e cor de cada etapa, e qual é a próxima ação da loja
const STATUS_INFO: Record<
  OrderStatus,
  { label: string; color: string; next?: OrderStatus; action?: string }
> = {
  placed: { label: "Novo pedido", color: colors.primary, next: "preparing", action: "Aceitar e Preparar" },
  preparing: { label: "Em preparo", color: colors.warning, next: "ready", action: "Marcar como Pronto" },
  ready: { label: "Pronto para entrega", color: colors.success, next: "out_for_delivery", action: "Despachar" },
  out_for_delivery: { label: "Saiu para entrega", color: colors.success },
  on_the_way: { label: "Em rota de entrega", color: colors.success },
  arriving: { label: "Chegando ao cliente", color: colors.success },
  delivered: { label: "Entregue", color: colors.textSecondary },
  cancelled: { label: "Cancelado", color: colors.error },
};

type Filter = "open" | "done";

export default function StoreOrdersScreen() {
  const { user } = useAuth();
  const storeId = user?.store?.id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [storeCouriers, setStoreCouriers] = useState<StoreCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal para escolher qual motoboy próprio vai fazer a entrega
  const [selectedOrderForCourier, setSelectedOrderForCourier] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    if (!storeId) return;
    try {
      const [ords, cours] = await Promise.all([
        api.getStoreOrders(storeId),
        api.getStoreCouriers(storeId),
      ]);
      setOrders(ords);
      setStoreCouriers(cours);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      const intervalId = setInterval(() => {
        loadOrders();
      }, 3000);
      return () => clearInterval(intervalId);
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

  // Envia o pedido para entregadores autônomos da rede Food Rush
  const handleRequestNetworkCourier = async (order: Order) => {
    setUpdatingId(order.id);
    try {
      await api.requestCourierForOrder(order);
      showMessage(
        "Chamado Enviado!",
        "O pedido foi enviado aos entregadores parceiros disponíveis em Santa Inês. Assim que um motoboy aceitar, a tela atualizará automaticamente."
      );
      await loadOrders();
    } catch (err: any) {
      showMessage("Erro", err?.message || "Não foi possível chamar entregador.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Despacha o pedido com motoboy próprio
  const handleAssignOwnCourier = async (order: Order, courier: StoreCourier) => {
    setUpdatingId(order.id);
    setSelectedOrderForCourier(null);
    try {
      await api.assignStoreCourierToOrder(order, courier);
      showMessage(
        "Pedido Despachado!",
        `O pedido foi atribuído ao seu entregador ${courier.name}.`
      );
      await loadOrders();
    } catch (err: any) {
      showMessage("Erro", err?.message || "Não foi possível despachar o pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  const isDone = (o: Order) => o.status === "out_for_delivery" || o.status === "arriving" || o.status === "delivered";
  const visible = orders.filter((o) => (filter === "open" ? !isDone(o) : isDone(o)));

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Pedidos da Loja"
        onBackPress={() => router.replace("/store")}
      />

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

                {/* Status do entregador vinculado ou aguardando */}
                {order.courierName ? (
                  <View style={styles.courierAssignedCard}>
                    <Ionicons name="bicycle" size={16} color={colors.primary} />
                    <Text style={styles.courierAssignedText}>
                      Entregador: <Text style={{ fontFamily: typography.bold }}>{order.courierName}</Text>
                      {order.vehicle ? ` (${order.vehicle})` : ""}
                    </Text>
                  </View>
                ) : order.courierRequested ? (
                  <View style={styles.courierWaitingCard}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.courierWaitingText}>
                      Chamado enviado à Rede! Aguardando entregador autônomo aceitar...
                    </Text>
                  </View>
                ) : null}

                {/* Ações dinâmicas de despacho */}
                {order.status === "placed" && (
                  <AppButton
                    title="Aceitar e Iniciar Preparo"
                    onPress={() => handleAdvance(order)}
                    loading={updatingId === order.id}
                    size="sm"
                    style={{ marginTop: spacing.sm }}
                  />
                )}

                {order.status === "preparing" && (
                  <View style={styles.actionButtonGroup}>
                    <AppButton
                      title="Marcar como Pronto"
                      variant="outline"
                      onPress={() => handleAdvance(order)}
                      loading={updatingId === order.id}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <AppButton
                      title="Mandar para Entregador"
                      onPress={() => handleRequestNetworkCourier(order)}
                      loading={updatingId === order.id}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                )}

                {order.status === "ready" && (
                  <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                    {!order.courierRequested && (
                      <AppButton
                        title="Chamar Entregador do App (Rede)"
                        onPress={() => handleRequestNetworkCourier(order)}
                        loading={updatingId === order.id}
                        size="sm"
                      />
                    )}
                    {storeCouriers.length > 0 && (
                      <AppButton
                        title="Despachar com Motoboy Próprio"
                        variant="outline"
                        onPress={() => setSelectedOrderForCourier(order)}
                        size="sm"
                      />
                    )}
                    {storeCouriers.length === 0 && !order.courierRequested && (
                      <AppButton
                        title="Despachar Pedido Direto"
                        variant="outline"
                        onPress={() => handleAdvance(order)}
                        loading={updatingId === order.id}
                        size="sm"
                      />
                    )}
                  </View>
                )}

                {(order.status === "out_for_delivery" || order.status === "arriving") && (
                  <AppButton
                    title="Marcar como Entregue ao Cliente"
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

      {/* Modal para escolher motoboy próprio */}
      <Modal
        visible={Boolean(selectedOrderForCourier)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderForCourier(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedOrderForCourier(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Despachar com Motoboy Próprio</Text>
            <Text style={styles.modalSubtitle}>
              Selecione qual motoboy cadastrado da sua loja fará esta entrega:
            </Text>
            {storeCouriers.map((c) => (
              <Pressable
                key={c.id}
                style={styles.modalCourierItem}
                onPress={() => selectedOrderForCourier && handleAssignOwnCourier(selectedOrderForCourier, c)}
              >
                <View style={styles.modalCourierIcon}>
                  <Ionicons name="bicycle" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCourierName}>{c.name}</Text>
                  <Text style={styles.modalCourierMeta}>
                    {c.vehicle} {c.plate ? `• Placa: ${c.plate}` : ""} {c.phone ? `• Tel: ${c.phone}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
              </Pressable>
            ))}
            <AppButton
              title="Cancelar"
              variant="outline"
              onPress={() => setSelectedOrderForCourier(null)}
              style={{ marginTop: spacing.md }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  courierAssignedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  courierAssignedText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.text,
  },
  courierWaitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.gray100,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  courierWaitingText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.primary,
  },
  actionButtonGroup: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalCourierItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.gray100,
  },
  modalCourierIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  modalCourierName: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  modalCourierMeta: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
});
