import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { useOrders } from "@/src/contexts/OrderContext";

export default function OrderTrackingScreen() {
  const { activeOrder, updateOrderStatus } = useOrders();

  // Estados de localização e mapa
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"night" | "satellite">("night");
  const [focusTarget, setFocusTarget] = useState<"courier" | "destination">("courier");

  // Animações de pulso para radar e status
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(0.7)).current;
  const courierProgress = useRef(new Animated.Value(0)).current;

  // Solicita permissão e obtém a localização real do celular
  const requestLocation = async (isManual = false) => {
    try {
      setIsFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setHasLocationPermission(false);
        if (isManual) {
          Alert.alert(
            "Permissão de Localização",
            "A autorização de GPS é necessária para exibir a sua localização exata e traçar a rota com precisão até a sua casa.",
            [{ text: "Entendido" }]
          );
        }
        return;
      }

      setHasLocationPermission(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setDeviceCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Geocodificação reversa para obter nome da rua/bairro
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const street = address.street || address.name || "Rua Atual";
        const number = address.streetNumber ? `, ${address.streetNumber}` : "";
        const district = address.district || address.subregion || "";
        const city = address.city || "Santa Inês";
        const fullAddr = `${street}${number} - ${district ? `${district}, ` : ""}${city}`;
        setDetectedAddress(fullAddr);
      }
    } catch (error) {
      console.warn("Erro ao obter localização do dispositivo:", error);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    // Inicia solicitação de localização na montagem
    requestLocation(false);

    // Loop de pulso do ponto de status
    const statusPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    // Loop de onda de radar no pino do entregador
    const radarWave = Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, {
          toValue: 2.2,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(radarOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    // Movimento dinâmico suave do entregador na rota
    const courierMove = Animated.loop(
      Animated.sequence([
        Animated.timing(courierProgress, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(courierProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    statusPulse.start();
    radarWave.start();
    courierMove.start();

    return () => {
      statusPulse.stop();
      radarWave.stop();
      courierMove.stop();
    };
  }, [pulseAnim, radarScale, radarOpacity, courierProgress]);

  // Abre aplicativo de mapas nativo (Google Maps / Apple Maps / Waze)
  const handleOpenExternalMap = () => {
    const dest = encodeURIComponent(
      detectedAddress || activeOrder?.deliveryAddress || "Santa Inês - MA"
    );
    const origin = encodeURIComponent(activeOrder?.restaurantName || "Restaurante");
    const url = Platform.select({
      ios: `maps://app?saddr=${origin}&daddr=${dest}`,
      android: `google.navigation:q=${dest}`,
      default: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
          );
        }
      })
      .catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
        );
      });
  };

  const handleCallCourier = () => {
    Alert.alert(
      "Ligar para o Entregador",
      `Deseja iniciar uma chamada para ${activeOrder?.courierName || "Policarpo de Sousa"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Ligar",
          onPress: () => Linking.openURL("tel:98987654321").catch(() => {}),
        },
      ]
    );
  };

  const handleConfirmDelivery = () => {
    if (activeOrder) {
      updateOrderStatus(activeOrder.id, "delivered");
    }
    router.replace("/order/success");
  };

  // Se o cliente for novo ou não possuir nenhum pedido ativo:
  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Header title="Acompanhar Pedido" />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bicycle-outline" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum pedido em andamento</Text>
          <Text style={styles.emptySubtitle}>
            Quando você realizar um pedido, poderá acompanhar em tempo real todo o trajeto do entregador com mapa e radar GPS nesta tela.
          </Text>
          <AppButton
            title="Explorar Restaurantes"
            onPress={() => router.replace("/(tabs)")}
            style={{ marginTop: spacing.xl, width: "80%" }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Interpolação do movimento da moto na tela do mapa
  const courierTranslateX = courierProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const courierTranslateY = courierProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  const steps = [
    { title: "Pedido realizado", status: "completed" },
    { title: "Em preparo", status: "completed" },
    { title: "Saiu para entrega", status: "current" },
    { title: "Chegando", status: "upcoming" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header title="Acompanhar Pedido" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================= MAPA INTERATIVO ELEVADO ================= */}
        <View
          style={[
            styles.mapSimulation,
            mapMode === "satellite" && styles.mapSatellite,
          ]}
        >
          {/* Malha Viária / Vias da Cidade */}
          <View style={styles.mapGridLine1} />
          <View style={styles.mapGridLine2} />
          <View style={styles.mapGridLineDiagonal} />
          <View style={styles.routeLine} />

          {/* Pino 1: Restaurante Parceiro */}
          <View style={[styles.mapPin, styles.restaurantPin]}>
            <Ionicons name="restaurant" size={15} color={colors.white} />
            <View style={styles.pinLabelBox}>
              <Text style={styles.pinLabelText} numberOfLines={1}>
                {activeOrder.restaurantName}
              </Text>
            </View>
          </View>

          {/* Pino 2: Entregador (Moto) com radar pulsante dinâmico */}
          <Animated.View
            style={[
              styles.mapPin,
              styles.courierPin,
              {
                transform: [
                  { translateX: courierTranslateX },
                  { translateY: courierTranslateY },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.radarCircle,
                {
                  transform: [{ scale: radarScale }],
                  opacity: radarOpacity,
                },
              ]}
            />
            <Ionicons name="bicycle" size={17} color={colors.white} />
          </Animated.View>

          {/* Pino 3: Destino (Cliente) com pulso GPS */}
          <View style={[styles.mapPin, styles.destinationPin]}>
            <Animated.View
              style={[
                styles.radarCircle,
                {
                  backgroundColor: colors.success,
                  transform: [{ scale: pulseAnim }],
                  opacity: 0.4,
                },
              ]}
            />
            <Ionicons name="location" size={17} color={colors.white} />
            <View style={styles.pinLabelBoxDestination}>
              <Text style={styles.pinLabelTextDestination}>Você aqui</Text>
            </View>
          </View>

          {/* Controles Flutuantes do Mapa (Superior Direito) */}
          <View style={styles.mapControlsRight}>
            <Pressable
              style={styles.mapControlButton}
              onPress={() => setMapMode(mapMode === "night" ? "satellite" : "night")}
              accessibilityRole="button"
              accessibilityLabel="Alternar visual do mapa"
            >
              <Ionicons
                name={mapMode === "night" ? "earth" : "moon"}
                size={18}
                color={colors.white}
              />
            </Pressable>

            <Pressable
              style={styles.mapControlButton}
              onPress={() => requestLocation(true)}
              accessibilityRole="button"
              accessibilityLabel="Atualizar sinal de GPS do aparelho"
            >
              {isFetchingLocation ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="locate" size={18} color={colors.white} />
              )}
            </Pressable>

            <Pressable
              style={[styles.mapControlButton, styles.mapControlPrimary]}
              onPress={handleOpenExternalMap}
              accessibilityRole="button"
              accessibilityLabel="Abrir rota no Google Maps ou Waze"
            >
              <Ionicons name="navigate" size={18} color={colors.white} />
            </Pressable>
          </View>

          {/* Badge de Telemetria Inferior */}
          <View style={styles.mapBadge}>
            <View style={styles.gpsSignalDot} />
            <Text style={styles.mapBadgeText}>
              {deviceCoords
                ? `GPS Ativo • ~${activeOrder.estimatedTime || "15-25 min"} • 1.4 km`
                : `Tempo estimado: ${activeOrder.estimatedTime || "15-25 min"}`}
            </Text>
          </View>
        </View>

        {/* Card Informativo de Permissão / Sinal de GPS */}
        {hasLocationPermission === false ? (
          <Pressable
            style={styles.permissionAlertCard}
            onPress={() => requestLocation(true)}
            accessibilityRole="button"
            accessibilityLabel="Ativar localização para melhor acompanhamento"
          >
            <Ionicons name="location-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionAlertTitle}>Localização desativada</Text>
              <Text style={styles.permissionAlertSub}>
                Toque aqui para autorizar o GPS e acompanhar o entregador com precisão máxima.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </Pressable>
        ) : null}

        {/* Card de Status do Pedido */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Animated.View
              style={[
                styles.pulseDot,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Text style={styles.statusTitle}>Seu pedido está a caminho!</Text>
          </View>
          <Text style={styles.statusDesc}>
            O entregador já retirou o pedido em{" "}
            <Text style={styles.boldText}>
              {activeOrder.restaurantName || "Restaurante Parceiro"}
            </Text>
            . Fique atento ao interfone ou telefone.
          </Text>

          {/* Endereço de Entrega */}
          <View style={styles.addressBox}>
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Destino da entrega:</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {detectedAddress || activeOrder.deliveryAddress || "Endereço cadastrado"}
              </Text>
            </View>
            <Pressable
              style={styles.openExternalMapPill}
              onPress={handleOpenExternalMap}
              accessibilityRole="button"
              accessibilityLabel="Ver rota no GPS"
            >
              <Text style={styles.openExternalMapPillText}>Ver no Maps</Text>
            </Pressable>
          </View>

          {/* Entregador */}
          <View style={styles.courierCard}>
            <View style={styles.courierAvatar}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.courierInfo}>
              <Text style={styles.courierName}>
                {activeOrder.courierName || "Policarpo de Sousa"}
              </Text>
              <Text style={styles.courierRole}>Entregador Parceiro Especializado</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.ratingText}>
                  {activeOrder.courierRating?.toFixed(1) || "4.9"}
                </Text>
                <Text style={styles.ratingDeliveries}>• 342 entregas</Text>
              </View>
            </View>

            <View style={styles.courierActions}>
              <Pressable
                style={styles.actionIconButton}
                accessibilityRole="button"
                accessibilityLabel="Ligar para o entregador"
                hitSlop={8}
                onPress={handleCallCourier}
              >
                <Ionicons name="call" size={18} color={colors.primary} />
              </Pressable>

              <Pressable
                style={styles.actionIconButton}
                accessibilityRole="button"
                accessibilityLabel="Abrir chat com a loja ou entregador"
                hitSlop={8}
                onPress={() => router.push("/order/chat")}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Itens do Pedido */}
          {activeOrder && activeOrder.items.length > 0 ? (
            <View style={styles.orderItemsBox}>
              <Text style={styles.orderItemsBoxTitle}>Itens neste pedido:</Text>
              <Text style={styles.orderItemsBoxText}>
                {activeOrder.items
                  .map((item) => `${item.quantity}x ${item.product.name}`)
                  .join(" • ")}
              </Text>
            </View>
          ) : null}

          {/* Linha do Tempo de Rastreamento */}
          <View style={styles.timeline}>
            {steps.map((step, idx) => {
              const isCompleted = step.status === "completed";
              const isCurrent = step.status === "current";

              return (
                <View key={idx} style={styles.timelineRow}>
                  <View style={styles.timelineIndicatorColumn}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotCompleted,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={12} color={colors.white} />
                      ) : null}
                    </View>
                    {idx < steps.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.timelineText,
                      isCurrent && styles.timelineTextCurrent,
                      isCompleted && styles.timelineTextCompleted,
                    ]}
                  >
                    {step.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Botão Confirmar Entrega */}
      <View style={styles.footer}>
        <AppButton
          title="Confirmar Entrega"
          onPress={handleConfirmDelivery}
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    marginTop: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  mapSimulation: {
    height: 250,
    backgroundColor: "#16161F",
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  mapSatellite: {
    backgroundColor: "#0F1A1C",
  },
  mapGridLine1: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#252636",
  },
  mapGridLine2: {
    position: "absolute",
    left: 140,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#252636",
  },
  mapGridLineDiagonal: {
    position: "absolute",
    top: 130,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: "#1F202D",
    transform: [{ rotate: "-15deg" }],
  },
  routeLine: {
    position: "absolute",
    top: 75,
    left: 55,
    width: 240,
    height: 80,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.primary,
    borderBottomRightRadius: 40,
    borderStyle: "solid",
  },
  mapPin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  restaurantPin: {
    top: 55,
    left: 45,
    backgroundColor: "#2D2D42",
    borderWidth: 2,
    borderColor: colors.white,
  },
  courierPin: {
    top: 110,
    left: 170,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 10,
  },
  radarCircle: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
  },
  destinationPin: {
    top: 140,
    left: 280,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  pinLabelBox: {
    position: "absolute",
    top: -24,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 70,
  },
  pinLabelText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.semiBold,
    textAlign: "center",
  },
  pinLabelBoxDestination: {
    position: "absolute",
    bottom: -22,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinLabelTextDestination: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.bold,
  },
  mapControlsRight: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
    zIndex: 20,
  },
  mapControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(30, 30, 45, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mapBadge: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(10, 10, 20, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  gpsSignalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  mapBadgeText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
  },
  permissionAlertCard: {
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
  permissionAlertTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: "#92400E",
  },
  permissionAlertSub: {
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
  openExternalMapPill: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  openExternalMapPillText: {
    fontSize: fontSizes.xs - 1,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  orderItemsBox: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemsBoxTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  orderItemsBoxText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.text,
    lineHeight: 20,
  },
  courierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  courierAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  courierInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courierName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  courierRole: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
  },
  ratingDeliveries: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.gray400,
  },
  courierActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timeline: {
    paddingVertical: spacing.sm,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 44,
  },
  timelineIndicatorColumn: {
    alignItems: "center",
    width: 24,
    marginRight: spacing.md,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotCompleted: {
    backgroundColor: colors.success,
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray300,
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: colors.success,
  },
  timelineText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.gray400,
    paddingTop: 1,
  },
  timelineTextCurrent: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  timelineTextCompleted: {
    fontFamily: typography.medium,
    color: colors.text,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
