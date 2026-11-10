import React, { useCallback, useState } from "react";
import {
  Image,
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
import { useOrders } from "@/src/contexts/OrderContext";
import { useCart } from "@/src/contexts/CartContext";
import { formatCurrency } from "@/src/utils/currency";
import { Order } from "@/src/types";
import { AppButton } from "@/src/components/ui/AppButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { confirmDialog } from "@/src/utils/dialog";
import { OrderStatus } from "@/src/types";

// Texto mostrado em cada pedido conforme o status
const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Aguardando a loja",
  preparing: "Em preparo",
  out_for_delivery: "A caminho da entrega",
  arriving: "Chegando",
  delivered: "Concluído",
};

type OrdersTab = "active" | "history";

/**
 * Aba Pedidos: pedidos em andamento e histórico do usuário.
 * Permite acompanhar, avaliar e pedir de novo.
 */
export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrdersTab>("active");
  const { orders, setActiveOrder, reloadOrders } = useOrders();

  // Relê os pedidos ao abrir a aba (a loja pode ter atualizado algum status)
  useFocusEffect(
    useCallback(() => {
      reloadOrders();
    }, [reloadOrders])
  );
  const { items: cartItems, addItem, clearCart } = useCart();

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "active") {
      return order.status !== "delivered";
    }
    return order.status === "delivered";
  });

  // Coloca os itens de um pedido antigo de volta na sacola
  const handleReorder = async (order: Order) => {
    // O carrinho só aceita uma loja por vez
    const outraLoja =
      cartItems.length > 0 && cartItems[0].product.restaurantId !== order.restaurantId;

    const adicionar = await confirmDialog(
      "Pedir novamente",
      `Adicionar os itens de ${order.restaurantName} à sua sacola?` +
        (outraLoja ? " Os itens de outra loja que estão na sacola serão removidos." : ""),
      "Adicionar"
    );
    if (!adicionar) return;

    if (outraLoja) clearCart();
    order.items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        addItem(item.product);
      }
    });

    const irParaSacola = await confirmDialog(
      "Itens adicionados!",
      "Os produtos deste pedido estão na sua sacola. Deseja ir para a sacola agora?",
      "Ir para a sacola"
    );
    if (irParaSacola) router.push("/cart");
  };

  const handleReview = (order: Order) => {
    setActiveOrder(order);
    router.push("/order/review");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Pedidos</Text>
      </View>

      {/* Subabas: Em andamento | Histórico */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === "active" && styles.activeTabButton]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[styles.tabText, activeTab === "active" && styles.activeTabText]}
          >
            Em andamento
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === "history" && styles.activeTabButton]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[styles.tabText, activeTab === "history" && styles.activeTabText]}
          >
            Histórico
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={activeTab === "active" ? "bicycle-outline" : "receipt-outline"}
            accentIcon={activeTab === "active" ? "time" : "document-text"}
            title={activeTab === "active" ? "Nenhum pedido em andamento" : "Nenhum pedido no histórico"}
            message={
              activeTab === "active"
                ? "Quando você fizer um pedido, poderá acompanhá-lo por aqui."
                : "Os pedidos entregues ficam guardados aqui para você pedir de novo."
            }
            actionLabel="Explorar restaurantes"
            onAction={() => router.push("/(tabs)")}
          />
        ) : (
          filteredOrders.map((order) => {
            const isDelivered = order.status === "delivered";

            return (
              <View key={order.id} style={styles.orderCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pedido em ${order.restaurantName}, total ${formatCurrency(order.total)}`}
                  onPress={() => {
                    setActiveOrder(order);
                    router.push(isDelivered ? "/order/review" : "/order/tracking");
                  }}
                >
                  <View style={styles.orderTopRow}>
                    <Image
                      source={{ uri: order.restaurantImage }}
                      style={styles.restaurantThumb}
                    />
                    <View style={styles.orderInfo}>
                      <Text style={styles.restaurantName}>
                        {order.restaurantName}
                      </Text>
                      <Text style={styles.orderDate}>{order.createdAt}</Text>
                      <Text style={styles.orderItemsSummary}>
                        {order.items
                          .map((i) => `${i.quantity}x ${i.product.name}`)
                          .join(", ")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.gray400}
                    />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.orderBottomRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        isDelivered && styles.statusBadgeDelivered,
                      ]}
                    >
                      <Ionicons
                        name={isDelivered ? "checkmark-circle" : "bicycle"}
                        size={14}
                        color={isDelivered ? colors.success : colors.primary}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isDelivered && styles.statusTextDelivered,
                        ]}
                      >
                        {STATUS_LABEL[order.status]}
                      </Text>
                    </View>
                    <Text style={styles.orderTotal}>
                      {formatCurrency(order.total)}
                    </Text>
                  </View>
                </Pressable>

                {/* Botões de Ação do Card */}
                <View style={styles.cardActionsRow}>
                  {isDelivered ? (
                    <>
                      <Pressable
                        style={styles.reorderButton}
                        accessibilityRole="button"
                        accessibilityLabel="Pedir novamente os itens deste pedido"
                        onPress={() => handleReorder(order)}
                      >
                        <Ionicons name="repeat" size={16} color={colors.primary} />
                        <Text style={styles.reorderButtonText}>
                          Pedir novamente
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.reviewQuickButton}
                        accessibilityRole="button"
                        accessibilityLabel={order.reviewed ? "Pedido já avaliado" : "Avaliar este pedido"}
                        onPress={() => handleReview(order)}
                        disabled={order.reviewed}
                      >
                        <Ionicons
                          name={order.reviewed ? "star" : "star-outline"}
                          size={16}
                          color={order.reviewed ? colors.warning : colors.textSecondary}
                        />
                        <Text style={styles.reviewQuickButtonText}>
                          {order.reviewed ? "Avaliado" : "Avaliar"}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={styles.trackingActiveButton}
                      accessibilityRole="button"
                      accessibilityLabel="Acompanhar entrega em tempo real"
                      onPress={() => {
                        setActiveOrder(order);
                        router.push("/order/tracking");
                      }}
                    >
                      <Ionicons name="map" size={16} color={colors.white} />
                      <Text style={styles.trackingActiveButtonText}>
                        Acompanhar em tempo real
                      </Text>
                    </Pressable>
                  )}
                </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.md,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gray100,
  },
  orderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  restaurantName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  orderDate: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderItemsSummary: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  orderBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadgeDelivered: {
    backgroundColor: "#E8F8EE",
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.primary,
  },
  statusTextDelivered: {
    color: colors.success,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  reorderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  reorderButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  reviewQuickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  reviewQuickButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  trackingActiveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  trackingActiveButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.white,
  },
  orderTotal: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 3,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});

