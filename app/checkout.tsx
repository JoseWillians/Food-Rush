import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { useCart } from "@/src/contexts/CartContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useOrders } from "@/src/contexts/OrderContext";
import { showMessage } from "@/src/utils/dialog";
import { api } from "@/src/services/api";
import { courierPayoutFor } from "@/src/utils/deliveryFee";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { AddressCard } from "@/src/components/checkout/AddressCard";
import { PaymentSelector } from "@/src/components/checkout/PaymentSelector";
import { CouponSection } from "@/src/components/checkout/CouponSection";
import { OrderSummary } from "@/src/components/checkout/OrderSummary";
import { PaymentMethod } from "@/src/types";
import { Coupon, calculateDiscount, calculateTotal } from "@/src/utils/pricing";

/**
 * Tela de finalização do pedido.
 * Cada parte da tela é um componente em src/components/checkout/:
 * endereço, forma de pagamento, cupom e resumo de valores.
 */
export default function CheckoutScreen() {
  const { items, subtotal, deliveryFee, deliveryZone, clearCart } = useCart();
  const { user } = useAuth();
  const { createOrder } = useOrders();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);

  // Contas de desconto e total (testadas em tests/pricing.test.ts)
  const discount = calculateDiscount(appliedCoupon, subtotal, deliveryFee);
  const finalTotal = calculateTotal(subtotal, deliveryFee, discount);

  const handleFinishOrder = async () => {
    if (items.length === 0) {
      showMessage("Carrinho vazio", "Adicione produtos antes de finalizar.");
      return;
    }
    if (!user?.address) {
      showMessage("Endereço", "Cadastre um endereço de entrega no seu perfil.");
      return;
    }

    setLoading(true);
    try {
      // Busca a loja dos itens do carrinho pela API. Ela procura tanto nas lojas
      // padrão quanto nas criadas pelo empreendedor, então o pedido sai com o
      // nome e a imagem corretos.
      const restaurant = await api.getRestaurantById(items[0].product.restaurantId);

      if (!restaurant) {
        showMessage(
          "Loja indisponível",
          "Não encontramos a loja deste pedido. Esvazie o carrinho e tente novamente."
        );
        return;
      }

      // Não deixa finalizar se a loja fechou enquanto o cliente montava o carrinho
      if (restaurant.isOpen === false) {
        showMessage(
          "Loja fechada",
          `${restaurant.name} não está recebendo pedidos agora. Tente mais tarde.`
        );
        return;
      }

      createOrder({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image,
        items: [...items],
        subtotal,
        deliveryFee,
        // Quanto o entregador da rede ganha: R$ 6,50 por rota + R$ 1,50 por km (estimado pelo bairro)
        courierFee: courierPayoutFor(deliveryZone),
        total: finalTotal,
        deliveryAddress: user.address,
        paymentMethod,
      });

      clearCart();
      router.replace("/order/tracking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Finalizar Pedido" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AddressCard />
        <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />
        <CouponSection
          appliedCoupon={appliedCoupon}
          discount={discount}
          onApply={setAppliedCoupon}
          onRemove={() => setAppliedCoupon(null)}
        />
        <OrderSummary
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          discount={discount}
          couponCode={appliedCoupon?.code}
          total={finalTotal}
        />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton title="Finalizar Pedido" onPress={handleFinishOrder} loading={loading} size="lg" />
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
