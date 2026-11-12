import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { DeliveryMap } from "@/src/components/tracking/DeliveryMap";
import { CourierCard } from "@/src/components/tracking/CourierCard";
import { OrderTimeline } from "@/src/components/tracking/OrderTimeline";
import { useOrders } from "@/src/contexts/OrderContext";
import { useDeviceLocation } from "@/src/hooks/useDeviceLocation";
import { confirmDialog } from "@/src/utils/dialog";
import { openRouteInMaps } from "@/src/utils/maps";
import { OrderStatus } from "@/src/types";

// Título e explicação mostrados para cada status do pedido
const STATUS_TEXT: Record<OrderStatus, { title: string; desc: string }> = {
  placed: {
    title: "Aguardando a loja aceitar",
    desc: "Seu pedido foi enviado. Assim que a loja aceitar, ele entra em preparo.",
  },
  preparing: {
    title: "Seu pedido está sendo preparado",
    desc: "A loja aceitou o pedido e já está preparando tudo.",
  },
  ready: {
    title: "Pedido pronto para coleta",
    desc: "Aguardando o entregador retirar na loja.",
  },
  out_for_delivery: {
    title: "Seu pedido está a caminho!",
    desc: "O entregador já retirou o pedido. Fique atento ao interfone ou telefone.",
  },
  on_the_way: {
    title: "Seu pedido está a caminho!",
    desc: "O entregador já está em trânsito com seu pedido.",
  },
  arriving: {
    title: "O entregador está chegando!",
    desc: "Prepare-se para receber o pedido.",
  },
  delivered: {
    title: "Pedido entregue",
    desc: "Bom apetite! Não esqueça de avaliar a loja.",
  },
  cancelled: {
    title: "Pedido cancelado",
    desc: "Este pedido foi cancelado.",
  },
};

/**
 * Tela de acompanhamento do pedido.
 * Partes: mapa (DeliveryMap), entregador (CourierCard) e linha do tempo (OrderTimeline),
 * todas em src/components/tracking/. O GPS fica no hook useDeviceLocation.
 */
export default function OrderTrackingScreen() {
  const { activeOrder, updateOrderStatus, reloadOrders } = useOrders();
  const location = useDeviceLocation();
  const [refreshing, setRefreshing] = useState(false);

  // Sempre que a tela aparece, relê os pedidos: a loja pode ter mudado o status
  useFocusEffect(
    useCallback(() => {
      reloadOrders();
    }, [reloadOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadOrders();
    } finally {
      setRefreshing(false);
    }
  }, [reloadOrders]);

  // Polling em tempo real do estágio de entrega enquanto o pedido estiver ativo
  useEffect(() => {
    if (!activeOrder) return;
    const isOngoing =
      activeOrder.status === "placed" ||
      activeOrder.status === "preparing" ||
      activeOrder.status === "ready" ||
      activeOrder.status === "out_for_delivery" ||
      activeOrder.status === "on_the_way" ||
      activeOrder.status === "arriving";

    if (!isOngoing) return;

    const intervalId = setInterval(() => {
      reloadOrders();
    }, 2500);

    return () => clearInterval(intervalId);
  }, [activeOrder?.status, reloadOrders]);

  // Bolinha pulsando ao lado do título do status
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Cliente sem pedido em andamento
  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Header
          title="Acompanhar Pedido"
          onBackPress={() => router.replace("/(tabs)/orders")}
        />
        <EmptyState
          icon="bicycle-outline"
          accentIcon="location"
          title="Nenhum pedido em andamento"
          message="Quando você fizer um pedido, poderá acompanhar o caminho do entregador nesta tela."
          actionLabel="Explorar restaurantes"
          onAction={() => router.replace("/(tabs)")}
        />
      </SafeAreaView>
    );
  }

  const statusText = STATUS_TEXT[activeOrder.status];
  const deliveryAddress = location.address || activeOrder.deliveryAddress;
  // O entregador só existe depois que a loja envia o pedido
  const isOnTheWay = activeOrder.status === "out_for_delivery" || activeOrder.status === "arriving";
  const courierName = activeOrder.courierName || "Entregador Food Rush";

  const handleCallCourier = async () => {
    const ligar = await confirmDialog(
      "Ligar para o Entregador",
      `Deseja iniciar uma chamada para ${courierName}?`,
      "Ligar"
    );
    if (ligar) Linking.openURL("tel:98987654321").catch(() => {});
  };

  const handleConfirmDelivery = () => {
    updateOrderStatus(activeOrder.id, "delivered");
    router.replace("/order/success");
  };

  const openMaps = () => openRouteInMaps(activeOrder.restaurantName, deliveryAddress);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header
        title="Acompanhar Pedido"
        onBackPress={() => router.replace("/(tabs)/orders")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <DeliveryMap
          restaurantName={activeOrder.restaurantName}
          estimatedTime={activeOrder.estimatedTime}
          gpsActive={Boolean(location.coords)}
          locating={location.loading}
          onLocate={() => location.requestLocation(true)}
          onOpenExternalMap={openMaps}
        />

        {/* Aviso quando o GPS foi negado */}
        {location.hasPermission === false ? (
          <Pressable
            style={styles.permissionCard}
            onPress={() => location.requestLocation(true)}
            accessibilityRole="button"
            accessibilityLabel="Ativar localização para melhor acompanhamento"
          >
            <Ionicons name="location-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionTitle}>Localização desativada</Text>
              <Text style={styles.permissionSub}>
                Toque aqui para autorizar o GPS e acompanhar o entregador com mais precisão.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </Pressable>
        ) : null}

        <View style={styles.statusCard}>
          {/* Status atual */}
          <View style={styles.statusHeader}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.statusTitle}>{statusText.title}</Text>
          </View>
          <Text style={styles.statusDesc}>
            <Text style={styles.boldText}>{activeOrder.restaurantName}</Text>
            {": "}
            {statusText.desc}
          </Text>

          {/* Endereço de entrega */}
          <View style={styles.addressBox}>
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Destino da entrega:</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {deliveryAddress}
              </Text>
            </View>
            <Pressable
              style={styles.mapsPill}
              onPress={openMaps}
              accessibilityRole="button"
              accessibilityLabel="Ver rota no GPS"
            >
              <Text style={styles.mapsPillText}>Ver no Maps</Text>
            </Pressable>
          </View>

          {isOnTheWay && (
            <CourierCard
              name={courierName}
              rating={activeOrder.courierRating ?? 4.9}
              onCall={handleCallCourier}
              onChat={() => router.push("/order/chat")}
            />
          )}

          {/* Itens do pedido */}
          <View style={styles.itemsBox}>
            <Text style={styles.itemsTitle}>Itens neste pedido:</Text>
            <Text style={styles.itemsText}>
              {activeOrder.items.map((item) => `${item.quantity}x ${item.product.name}`).join(" • ")}
            </Text>
          </View>

          <OrderTimeline status={activeOrder.status} />
        </View>
      </ScrollView>

      {/* Só dá para confirmar a entrega depois que o pedido saiu da loja */}
      <View style={styles.footer}>
        <AppButton
          title={isOnTheWay ? "Confirmar Entrega" : "Aguardando a loja"}
          onPress={handleConfirmDelivery}
          disabled={!isOnTheWay}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  permissionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  permissionTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: "#92400E",
  },
  permissionSub: {
    fontSize: fontSizes.xs - 1,
    fontFamily: typography.regular,
    color: "#B45309",
    marginTop: 2,
  },
  statusCard: {
    padding: spacing.lg,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  statusTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  statusDesc: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  boldText: {
    fontFamily: typography.bold,
    color: colors.text,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressLabel: {
    fontSize: fontSizes.xs - 2,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  mapsPill: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  mapsPillText: {
    fontSize: fontSizes.xs - 1,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  itemsBox: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemsTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  itemsText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
