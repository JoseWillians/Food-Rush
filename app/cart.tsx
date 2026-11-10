import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { useCart } from "@/src/contexts/CartContext";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { formatCurrency } from "@/src/utils/currency";

/**
 * Carrinho (sacola): itens, quantidade, observação de cada item e resumo de valores.
 * A taxa de entrega é a da loja dos itens (CartContext).
 */
export default function CartScreen() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    updateNote,
    removeItem,
    clearCart,
    subtotal,
    deliveryFee,
    total,
  } = useCart();

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Meu Carrinho"
        rightAction={
          items.length > 0 ? (
            <Pressable onPress={clearCart} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={64} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptySubtitle}>
            Adicione pratos deliciosos ao seu carrinho para fazer um pedido!
          </Text>
          <AppButton
            title="Explorar Restaurantes"
            onPress={() => router.replace("/(tabs)")}
            style={styles.exploreButton}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {items.map((item) => (
              <View key={item.id} style={styles.cartCard}>
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${item.product.name} do carrinho`}
                      onPress={() => removeItem(item.product.id)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.product.price)}
                  </Text>

                  <View style={styles.quantityControls}>
                    <Pressable
                      style={styles.quantityBtn}
                      accessibilityRole="button"
                      accessibilityLabel={item.quantity === 1 ? `Remover item ${item.product.name}` : `Diminuir quantidade de ${item.product.name}`}
                      onPress={() => decreaseQuantity(item.product.id)}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={item.quantity === 1 ? "trash-outline" : "remove"}
                        size={16}
                        color={colors.text}
                      />
                    </Pressable>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <Pressable
                      style={styles.quantityBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Aumentar quantidade de ${item.product.name}`}
                      onPress={() => increaseQuantity(item.product.id)}
                      hitSlop={6}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </Pressable>
                  </View>

                  {/* Observação do item, enviada para a loja junto com o pedido */}
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Observação (ex.: sem cebola)"
                    placeholderTextColor={colors.gray400}
                    value={item.note ?? ""}
                    onChangeText={(text) => updateNote(item.product.id, text)}
                    maxLength={120}
                    accessibilityLabel={`Observação para ${item.product.name}`}
                  />
                </View>
              </View>
            ))}

            {/* Resumo de Valores */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo dos valores</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxa de entrega</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(deliveryFee)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Botão de Finalizar */}
          <View style={styles.footer}>
            <AppButton
              title="Continuar para o pagamento"
              onPress={() => router.push("/checkout")}
              size="lg"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  scrollList: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  itemImage: {
    width: 75,
    height: 75,
    borderRadius: borderRadius.sm,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quantityBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    paddingHorizontal: spacing.sm,
  },
  noteInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
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
  summaryDivider: {
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  exploreButton: {
    width: "80%",
  },
});

