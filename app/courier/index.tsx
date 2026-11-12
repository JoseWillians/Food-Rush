import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
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
import { CourierProfile, Order } from "@/src/types";
import { formatCurrency } from "@/src/utils/currency";
import { showMessage } from "@/src/utils/dialog";
import { courierPayoutFor } from "@/src/utils/deliveryFee";
import * as ImagePicker from "expo-image-picker";

/**
 * Painel Exclusivo do Entregador / Motoboy (Autônomo ou Parceiro de Loja).
 * Fornece controle de disponibilidade (online/offline), visualização de corridas,
 * cálculo dinâmico de taxa, aceitação/conclusão de entregas e upload de avatar.
 */
// Quanto o entregador recebe pela corrida: o valor gravado no pedido ou a regra
// mínimo por rota (R$ 6,50) + R$ 1,50 por km, com a distância média urbana
const payoutOf = (order: Order) => order.courierFee ?? courierPayoutFor(undefined);

export default function CourierDashboardScreen() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<CourierProfile | null>(
    user?.courierProfile ?? user?.courier ?? null
  );
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  // Corridas aceitas por este entregador (somem da lista de disponíveis depois de aceitas)
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isCourier = user?.role === "courier";

  // Perfil atual, lido pela atualização automática sem recriar o intervalo
  const profileRef = useRef(profile);
  profileRef.current = profile;
  // Corridas em andamento na última atualização e as que o próprio entregador concluiu,
  // para avisar quando o cliente confirmar a entrega
  const lastActiveRef = useRef<Order[]>([]);
  const completedHereRef = useRef<Set<string>>(new Set());

  // withProfile: busca o perfil de novo (só ao abrir a tela; a cada 3 s atualiza só as corridas)
  const loadData = useCallback(async (withProfile = true) => {
    if (!user) return;
    setLoading(true);
    try {
      let p = profileRef.current;
      if (withProfile || !p) {
        const fresh = await api.getCourierProfile(user.id, user.courierProfile ?? user.courier ?? null);
        if (fresh) {
          p = fresh;
          setProfile(fresh);
        }
      }
      const [orders, mine, summary] = await Promise.all([
        api.getAvailableDeliveries("cid-santaines"),
        p ? api.getCourierActiveOrders(p.id) : Promise.resolve([] as Order[]),
        p ? api.getCourierSummary(p.id) : Promise.resolve(null),
      ]);
      setAvailableOrders(orders);
      setMyOrders(mine);

      // Ganhos vindos do servidor (contam também as entregas confirmadas pelo cliente)
      if (summary) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                totalDeliveries: summary.totalDeliveries,
                totalEarnings: summary.totalEarnings,
                completedDeliveries: summary.todayDeliveries,
                todayEarnings: summary.todayEarnings,
              }
            : prev
        );
      }

      // Corrida que sumiu sem o entregador concluir: o cliente confirmou o recebimento
      const confirmedByCustomer = lastActiveRef.current.filter(
        (o) => !mine.some((m) => m.id === o.id) && !completedHereRef.current.has(o.id)
      );
      if (summary && confirmedByCustomer.length > 0) {
        const o = confirmedByCustomer[0];
        showMessage(
          "Entrega confirmada pelo cliente",
          `O pedido de ${o.restaurantName} foi confirmado. ${formatCurrency(payoutOf(o))} entrou nos seus ganhos.`
        );
      }
      lastActiveRef.current = mine;
    } catch (err: any) {
      console.warn("Erro ao carregar dados do entregador:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const intervalId = setInterval(() => {
        loadData(false);
      }, 3000);
      return () => clearInterval(intervalId);
    }, [loadData])
  );

  if (!isCourier) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Painel do Entregador"
          onBackPress={() => router.replace("/(tabs)/profile")}
        />
        <EmptyState
          icon="bicycle-outline"
          accentIcon="alert-circle"
          title="Acesso restrito"
          message="Esta área é reservada para entregadores cadastrados no Food Rush."
          actionLabel="Ir para o perfil"
          onAction={() => router.replace("/(tabs)/profile")}
        />
      </SafeAreaView>
    );
  }

  const isOnline = profile?.isOnline === true;
  const vehicleLabel =
    profile?.vehicleType === "moto"
      ? "Motocicleta"
      : profile?.vehicleType === "bicicleta"
      ? "Bicicleta"
      : "Carro";

  const modeLabel =
    profile?.mode === "independent" ? "Motoboy Autônomo" : "Entregador Parceiro de Loja";

  // Alternar Online / Offline
  const handleToggleStatus = async () => {
    if (!profile) return;
    const nextStatus = isOnline ? "offline" : "online";
    try {
      const updated = await api.setCourierStatus(profile.id, nextStatus);
      setProfile(updated);
      await updateUser({ courierProfile: updated });
      showMessage(
        nextStatus === "online" ? "Você está Online!" : "Você está Offline",
        nextStatus === "online"
          ? "Agora você receberá pedidos de entrega disponíveis em Santa Inês."
          : "Você não receberá novos chamados até ficar online novamente."
      );
    } catch (err: any) {
      showMessage("Erro", err.message || "Não foi possível alterar o status.");
    }
  };

  // Upload da foto de perfil
  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage("Permissão necessária", "Permita acesso à galeria para atualizar sua foto de perfil.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingAvatar(true);
        try {
          let avatarUrl = asset.uri;
          if (asset.base64) {
            const uploaded = await api.uploadImage({
              base64: `data:image/jpeg;base64,${asset.base64}`,
              fileName: `courier-${user.id}-${Date.now()}.jpg`,
              folder: "couriers",
            });
            avatarUrl = uploaded.url;
          }
          await updateUser({ avatar: avatarUrl });
          showMessage("Foto atualizada", "Sua foto de perfil foi salva com sucesso!");
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (err: any) {
      setUploadingAvatar(false);
      showMessage("Erro no upload", err.message || "Tente novamente.");
    }
  };

  // Aceitar Corrida
  const handleAcceptDelivery = async (orderId: string) => {
    if (!profile) return;
    setAcceptingId(orderId);
    try {
      await api.acceptDelivery(orderId, profile.id, profile.name || user.name);
      showMessage("Corrida Aceita!", "Dirija-se ao restaurante para retirar o pedido do cliente.");
      await loadData();
    } catch (err: any) {
      showMessage("Não foi possível aceitar", err.message || "Outro entregador pode ter aceitado antes.");
    } finally {
      setAcceptingId(null);
    }
  };

  // Concluir Corrida
  const handleCompleteDelivery = async (order: Order) => {
    if (!profile) return;
    setCompletingId(order.id);
    completedHereRef.current.add(order.id);
    try {
      await api.completeDelivery(order.id, profile.id, payoutOf(order));
      // Guarda os ganhos também na conta, para aparecerem em outro aparelho
      const updatedProfile = await api.getCourierProfile(user.id, profile);
      if (updatedProfile) {
        setProfile(updatedProfile);
        await updateUser({ courierProfile: updatedProfile });
      }
      showMessage("Entrega Concluída!", "Parabéns! O valor da entrega foi adicionado aos seus ganhos de hoje.");
      await loadData();
    } catch (err: any) {
      showMessage("Erro ao finalizar", err.message || "Tente novamente.");
    } finally {
      setCompletingId(null);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // Separar pedido ativo e pedidos disponíveis (apenas pedidos prontos para entrega sem entregador)
  const activeOrder = myOrders[0];
  const pendingOrders = availableOrders.filter(
    (o) => !o.courierId && !o.courierName && o.status === "ready"
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Painel do Entregador"
        onBackPress={() => router.replace("/(tabs)/profile")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ===== Cartão de Identificação do Entregador ===== */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    user.avatar ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
                }}
                style={styles.avatarImage}
              />
              <Pressable
                style={styles.avatarCameraBtn}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                accessibilityRole="button"
                accessibilityLabel="Mudar foto de perfil"
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="camera" size={14} color={colors.white} />
                )}
              </Pressable>
            </View>

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.courierName}>{user.name}</Text>
              <Text style={styles.courierMode}>{modeLabel}</Text>
              <View style={styles.vehicleRow}>
                <Ionicons
                  name={
                    profile?.vehicleType === "moto"
                      ? "bicycle"
                      : profile?.vehicleType === "bicicleta"
                      ? "bicycle-outline"
                      : "car-outline"
                  }
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.vehicleText}>
                  {vehicleLabel} {profile?.plate ? `· Placa: ${profile.plate}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Toggle de Disponibilidade */}
          <Pressable
            style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
            onPress={handleToggleStatus}
            accessibilityRole="switch"
            accessibilityState={{ checked: isOnline }}
          >
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.gray400 }]} />
            <Text style={[styles.statusToggleText, { color: isOnline ? colors.success : colors.textSecondary }]}>
              {isOnline ? "Disponível para Entregas (Online)" : "Indisponível (Offline) · Toque para conectar"}
            </Text>
          </Pressable>
        </View>

        {/* ===== Métricas do Dia ===== */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatCurrency(profile?.todayEarnings ?? 0)}
            </Text>
            <Text style={styles.metricLabel}>Ganhos de Hoje</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{profile?.completedDeliveries ?? 0}</Text>
            <Text style={styles.metricLabel}>Entregas Feitas</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Ionicons name="star" size={16} color={colors.primary} />
              <Text style={styles.metricValue}>
                {(profile?.rating ?? 5.0).toFixed(1)}
              </Text>
            </View>
            <Text style={styles.metricLabel}>Avaliação</Text>
          </View>
        </View>

        {/* ===== Regras de Cálculo da Taxa (Transparência) ===== */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Cálculo de Repasse (Santa Inês - MA)</Text>
            <Text style={styles.infoBannerDesc}>
              Mínimo garantido de R$ 6,50 por rota + R$ 1,50 por km rodado (distância estimada pelo bairro), mais bônus em promoções.
            </Text>
          </View>
        </View>

        {/* ===== Entrega Ativa em Andamento ===== */}
        {activeOrder && (
          <View style={styles.activeOrderCard}>
            <View style={styles.activeHeader}>
              <View style={styles.activeBadge}>
                <Ionicons name="navigate" size={14} color={colors.white} />
                <Text style={styles.activeBadgeText}>EM ANDAMENTO</Text>
              </View>
              <Text style={styles.activePayout}>
                Você recebe: {formatCurrency(payoutOf(activeOrder))}
              </Text>
            </View>

            <Text style={styles.activeStoreName}>Coleta: {activeOrder.restaurantName}</Text>
            <Text style={styles.activeAddress}>
              Entrega: {activeOrder.deliveryAddress}
            </Text>
            <Text style={styles.activeOrderTotal}>
              Valor do pedido: {formatCurrency(activeOrder.total)} ({activeOrder.items.length} itens)
            </Text>

            <AppButton
              title="Confirmar Entrega Realizada"
              onPress={() => handleCompleteDelivery(activeOrder)}
              loading={completingId === activeOrder.id}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        {/* ===== Chamados Disponíveis em Santa Inês ===== */}
        <Text style={styles.sectionTitle}>
          Chamados Disponíveis ({isOnline ? pendingOrders.length : "Offline"})
        </Text>

        {!isOnline ? (
          <View style={styles.offlineNotice}>
            <Ionicons name="moon-outline" size={36} color={colors.gray400} />
            <Text style={styles.offlineNoticeTitle}>Você está desconectado</Text>
            <Text style={styles.offlineNoticeText}>
              Ative o status "Online" no topo para começar a visualizar as entregas disponíveis na sua região.
            </Text>
            <AppButton
              title="Ficar Online Agora"
              onPress={handleToggleStatus}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : pendingOrders.length === 0 ? (
          <View style={styles.emptyOrdersCard}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.success} />
            <Text style={styles.emptyOrdersTitle}>Nenhuma entrega pendente</Text>
            <Text style={styles.emptyOrdersText}>
              Fique atento! Novas corridas de lojas de Santa Inês aparecerão automaticamente aqui.
            </Text>
          </View>
        ) : (
          pendingOrders.map((order) => {
            const courierPayout = payoutOf(order);
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderStore}>{order.restaurantName}</Text>
                    <Text style={styles.orderDest}>Destino: {order.deliveryAddress}</Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutLabel}>Repasse</Text>
                    <Text style={styles.payoutValue}>{formatCurrency(courierPayout)}</Text>
                  </View>
                </View>

                <View style={styles.orderMetaRow}>
                  <Text style={styles.orderMeta}>
                    Taxa total: {formatCurrency(order.deliveryFee)} · Itens: {order.items.length}
                  </Text>
                </View>

                <AppButton
                  title="Aceitar Corrida"
                  onPress={() => handleAcceptDelivery(order.id)}
                  loading={acceptingId === order.id}
                  style={{ marginTop: spacing.sm }}
                />
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
  },
  avatarCameraBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  courierName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  courierMode: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: colors.success + "15",
    borderColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.gray100,
    borderColor: colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusToggleText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  metricValue: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  infoBannerTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
  },
  infoBannerDesc: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  activeOrderCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.lg,
  },
  activeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: colors.white,
  },
  activePayout: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  activeStoreName: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  activeAddress: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeOrderTotal: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.text,
    marginTop: 4,
  },
  offlineNotice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.gray100 + "40",
  },
  offlineNoticeTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  offlineNoticeText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  emptyOrdersCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyOrdersTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyOrdersText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderStore: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  orderDest: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  payoutBadge: {
    alignItems: "flex-end",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  payoutLabel: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.primary,
  },
  payoutValue: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  orderMetaRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  orderMeta: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
});
