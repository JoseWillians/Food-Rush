import React, { useState } from "react";
import {
  Alert,
  AlertButton,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { useCart } from "@/src/contexts/CartContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useOrders } from "@/src/contexts/OrderContext";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { formatCurrency } from "@/src/utils/currency";
import { PaymentMethod } from "@/src/types";

type Coupon = {
  code: string;
  title: string;
  description: string;
  discount: number;
  isFreeDelivery?: boolean;
};

const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: "FOODRUSH10",
    title: "R$ 10,00 OFF",
    description: "Desconto de R$ 10 em qualquer pedido",
    discount: 10,
  },
  {
    code: "FRETEGRATIS",
    title: "Frete Grátis",
    description: "Desconto integral na taxa de entrega",
    discount: 0,
    isFreeDelivery: true,
  },
  {
    code: "PRIMEIRACOMPRA",
    title: "R$ 15,00 OFF",
    description: "Desconto especial de R$ 15 de boas-vindas",
    discount: 15,
  },
];

export default function CheckoutScreen() {
  const { items, total, subtotal, deliveryFee, clearCart } = useCart();
  const { user, updateUser } = useAuth();
  const { createOrder } = useOrders();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [loading, setLoading] = useState(false);

  const discount = appliedCoupon
    ? appliedCoupon.isFreeDelivery
      ? deliveryFee
      : appliedCoupon.discount
    : 0;
  const finalTotal = Math.max(0, total - discount);

  const paymentOptions: { id: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: "pix", label: "Pix", icon: "flash-outline" },
    { id: "credit", label: "Cartão de crédito", icon: "card-outline" },
    { id: "debit", label: "Cartão de débito", icon: "card-outline" },
    { id: "cash", label: "Dinheiro", icon: "cash-outline" },
  ];

  const handleFinishOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Carrinho vazio", "Adicione produtos antes de finalizar.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const restId = items[0]?.product.restaurantId || "1";
      const restaurant =
        mockRestaurants.find((r) => r.id === restId) || mockRestaurants[0];

      createOrder({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image,
        items: [...items],
        subtotal,
        deliveryFee,
        total: finalTotal,
        deliveryAddress: user?.address || "Rua das Flores, 123 - Santa Inês - MA",
        paymentMethod,
      });

      clearCart();
      setLoading(false);
      router.replace("/order/tracking");
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Finalizar Pedido" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Endereço de Entrega */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Endereço de Entrega</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alterar endereço de entrega"
              onPress={() => {
                const addrs = user?.addresses || [];
                if (addrs.length > 1) {
                  const buttons: AlertButton[] = addrs.map((a) => ({
                    text: `${a.label}: ${a.street}, ${a.number}`,
                    onPress: () => {
                      const formatted = `${a.street}, ${a.number} - ${a.neighborhood}, ${a.city}`;
                      updateUser({
                        address: formatted,
                        addresses: addrs.map((item) => ({
                          ...item,
                          isDefault: item.id === a.id,
                        })),
                      });
                    },
                  }));

                  buttons.push({
                    text: "Gerenciar Endereços",
                    onPress: () => router.push("/(tabs)/profile"),
                  });
                  buttons.push({ text: "Cancelar", style: "cancel" });

                  Alert.alert(
                    "Selecione o Endereço",
                    "Escolha para onde deseja enviar este pedido:",
                    buttons
                  );
                } else {
                  router.push("/(tabs)/profile");
                }
              }}
            >
              <Text style={styles.actionText}>Alterar</Text>
            </Pressable>
          </View>
          <Text style={styles.addressLine}>
            {user?.address || "Rua das Flores, 123"}
          </Text>
          <Text style={styles.addressCity}>Santa Inês - MA</Text>
        </View>

        {/* Formas de Pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forma de Pagamento</Text>
          <View style={styles.paymentList}>
            {paymentOptions.map((opt) => {
              const isSelected = paymentMethod === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.paymentOption,
                    isSelected && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setPaymentMethod(opt.id)}
                >
                  <View style={styles.paymentLeft}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentLabel,
                        isSelected && styles.paymentLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cupom */}
        <View style={styles.card}>
          <View style={styles.couponRow}>
            <View style={styles.couponLeft}>
              <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              <View style={styles.couponTexts}>
                <Text style={styles.couponTitle}>Cupom</Text>
                <Text style={styles.couponSubtitle}>
                  {appliedCoupon
                    ? `Cupom ${appliedCoupon.code} aplicado (-${formatCurrency(discount)})`
                    : "3 cupons disponíveis para usar nesta loja"}
                </Text>
              </View>
            </View>
            {appliedCoupon ? (
              <Pressable
                onPress={() => setAppliedCoupon(null)}
                style={styles.couponButton}
                accessibilityRole="button"
                accessibilityLabel="Remover cupom"
              >
                <Text style={styles.couponButtonText}>Remover</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setShowCouponModal(true)}
                style={styles.couponButton}
                accessibilityRole="button"
                accessibilityLabel="Adicionar cupom"
              >
                <Text style={styles.couponButtonText}>Adicionar</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Resumo Final */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo da Compra</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxa de entrega</Text>
            <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
          </View>

          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>
                Desconto ({appliedCoupon.code})
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                -{formatCurrency(discount)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(finalTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Botão Final */}
      <View style={styles.footer}>
        <AppButton
          title="Finalizar Pedido"
          onPress={handleFinishOrder}
          loading={loading}
          size="lg"
        />
      </View>

      {/* Modal de Cupons */}
      <Modal
        visible={showCouponModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCouponModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cupons de Desconto</Text>
              <Pressable
                onPress={() => setShowCouponModal(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Campo para digitar código */}
              <View style={styles.couponInputRow}>
                <AppInput
                  placeholder="Código (ex: FOODRUSH10)"
                  value={couponInput}
                  onChangeText={(t) => setCouponInput(t.toUpperCase())}
                  autoCapitalize="characters"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <AppButton
                  title="Aplicar"
                  size="sm"
                  onPress={() => {
                    const match = AVAILABLE_COUPONS.find(
                      (c) => c.code === couponInput.trim()
                    );
                    if (match) {
                      setAppliedCoupon(match);
                      setCouponInput("");
                      setShowCouponModal(false);
                      Alert.alert("Sucesso", `Cupom ${match.code} aplicado!`);
                    } else {
                      Alert.alert(
                        "Cupom inválido",
                        "Tente utilizar FOODRUSH10, FRETEGRATIS ou PRIMEIRACOMPRA."
                      );
                    }
                  }}
                  style={{ marginLeft: spacing.sm, height: 48 }}
                />
              </View>

              <Text style={styles.availableCouponsTitle}>
                Cupons disponíveis para você:
              </Text>

              {AVAILABLE_COUPONS.map((coupon) => (
                <View key={coupon.code} style={styles.couponOptionCard}>
                  <View style={styles.couponOptionInfo}>
                    <View style={styles.couponBadgeRow}>
                      <Text style={styles.couponCodeText}>{coupon.code}</Text>
                      <View style={styles.couponTag}>
                        <Text style={styles.couponTagText}>{coupon.title}</Text>
                      </View>
                    </View>
                    <Text style={styles.couponDescText}>
                      {coupon.description}
                    </Text>
                  </View>

                  <AppButton
                    title="Usar"
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      setAppliedCoupon(coupon);
                      setShowCouponModal(false);
                      Alert.alert("Sucesso", `Cupom ${coupon.code} ativado!`);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  actionText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  addressLine: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
    marginTop: 4,
  },
  addressCity: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
  },
  paymentLabelSelected: {
    color: colors.primary,
    fontFamily: typography.bold,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  couponRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  couponTexts: {
    gap: 2,
  },
  couponTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  couponSubtitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  couponButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  couponButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.lg,
    fontFamily: typography.extraBold,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  couponInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  availableCouponsTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  couponOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  couponOptionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  couponBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  couponCodeText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  couponTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  couponTagText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  couponDescText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
});

