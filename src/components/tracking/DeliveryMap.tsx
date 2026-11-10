import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";

type DeliveryMapProps = {
  restaurantName: string;
  estimatedTime?: string;
  gpsActive: boolean; // true quando já temos a localização do celular
  locating: boolean; // true enquanto busca a localização
  onLocate: () => void;
  onOpenExternalMap: () => void;
};

/**
 * Mapa simulado do acompanhamento: ruas desenhadas com Views, pino da loja,
 * moto do entregador andando pela rota e pino "Você aqui".
 * As animações usam a API Animated do React Native.
 */
export function DeliveryMap({
  restaurantName,
  estimatedTime = "15-25 min",
  gpsActive,
  locating,
  onLocate,
  onOpenExternalMap,
}: DeliveryMapProps) {
  const [mapMode, setMapMode] = useState<"night" | "satellite">("night");

  // Valores animados: pulso do destino, onda de radar e posição da moto (0 a 1)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(0.7)).current;
  const courierProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const radar = Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, { toValue: 2.2, duration: 1800, useNativeDriver: true }),
        Animated.timing(radarOpacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    // A moto anda pela rota em 12 segundos e volta ao início
    const courierMove = Animated.loop(
      Animated.sequence([
        Animated.timing(courierProgress, { toValue: 1, duration: 12000, useNativeDriver: true }),
        Animated.timing(courierProgress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    pulse.start();
    radar.start();
    courierMove.start();
    // Para as animações quando a tela fecha
    return () => {
      pulse.stop();
      radar.stop();
      courierMove.stop();
    };
  }, [pulseAnim, radarScale, radarOpacity, courierProgress]);

  // Converte o progresso (0 a 1) em deslocamento na tela
  const courierX = courierProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const courierY = courierProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });

  return (
    <View style={[styles.map, mapMode === "satellite" && styles.mapSatellite]}>
      {/* Ruas da cidade e rota */}
      <View style={styles.gridLine1} />
      <View style={styles.gridLine2} />
      <View style={styles.gridLineDiagonal} />
      <View style={styles.routeLine} />

      {/* Pino da loja */}
      <View style={[styles.pin, styles.restaurantPin]}>
        <Ionicons name="restaurant" size={15} color={colors.white} />
        <View style={styles.pinLabelBox}>
          <Text style={styles.pinLabelText} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
      </View>

      {/* Pino do entregador, com radar pulsando */}
      <Animated.View
        style={[
          styles.pin,
          styles.courierPin,
          { transform: [{ translateX: courierX }, { translateY: courierY }] },
        ]}
      >
        <Animated.View
          style={[styles.radarCircle, { transform: [{ scale: radarScale }], opacity: radarOpacity }]}
        />
        <Ionicons name="bicycle" size={17} color={colors.white} />
      </Animated.View>

      {/* Pino do cliente */}
      <View style={[styles.pin, styles.destinationPin]}>
        <Animated.View
          style={[
            styles.radarCircle,
            { backgroundColor: colors.success, transform: [{ scale: pulseAnim }], opacity: 0.4 },
          ]}
        />
        <Ionicons name="location" size={17} color={colors.white} />
        <View style={styles.pinLabelBoxDestination}>
          <Text style={styles.pinLabelTextDestination}>Você aqui</Text>
        </View>
      </View>

      {/* Botões do mapa */}
      <View style={styles.controls}>
        <Pressable
          style={styles.controlButton}
          onPress={() => setMapMode(mapMode === "night" ? "satellite" : "night")}
          accessibilityRole="button"
          accessibilityLabel="Alternar visual do mapa"
        >
          <Ionicons name={mapMode === "night" ? "earth" : "moon"} size={18} color={colors.white} />
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={onLocate}
          accessibilityRole="button"
          accessibilityLabel="Atualizar sinal de GPS do aparelho"
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="locate" size={18} color={colors.white} />
          )}
        </Pressable>
        <Pressable
          style={[styles.controlButton, styles.controlPrimary]}
          onPress={onOpenExternalMap}
          accessibilityRole="button"
          accessibilityLabel="Abrir rota no Google Maps ou Waze"
        >
          <Ionicons name="navigate" size={18} color={colors.white} />
        </Pressable>
      </View>

      {/* Tempo estimado */}
      <View style={styles.badge}>
        <View style={styles.gpsDot} />
        <Text style={styles.badgeText}>
          {gpsActive
            ? `GPS Ativo • ~${estimatedTime} • 1.4 km`
            : `Tempo estimado: ${estimatedTime}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
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
  gridLine1: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#252636",
  },
  gridLine2: {
    position: "absolute",
    left: 140,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#252636",
  },
  gridLineDiagonal: {
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
  },
  pin: {
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
  controls: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
    zIndex: 20,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(30, 30, 45, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  badge: {
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
  gpsDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
  },
});
