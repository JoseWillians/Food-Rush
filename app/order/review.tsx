import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { RatingStars } from "@/src/components/ui/RatingStars";
import { useOrders } from "@/src/contexts/OrderContext";
import { formatCurrency } from "@/src/utils/currency";

const COMPLIMENT_TAGS = [
  "Comida quentinha",
  "Entrega super rápida",
  "Muito saboroso",
  "Embalagem perfeita",
  "Ótimo custo-benefício",
  "Entregador educado",
];

export default function OrderReviewScreen() {
  const { activeOrder, orders } = useOrders();

  // Pega o pedido atual ou o mais recente entregue
  const targetOrder =
    activeOrder ||
    orders.find((o) => o.status === "delivered") ||
    orders[0];

  const [restaurantRating, setRestaurantRating] = useState(5);
  const [courierRating, setCourierRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Comida quentinha",
    "Entrega super rápida",
  ]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="heart-circle" size={88} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Obrigado pela sua avaliação!</Text>
          <Text style={styles.successSubtitle}>
            Sua opinião nos ajuda a manter a melhor experiência gastronômica e entrega ultra rápida no Food Rush!
          </Text>
        </View>

        <View style={styles.footerButtons}>
          <AppButton
            title="Voltar ao início"
            onPress={() => router.replace("/(tabs)")}
            size="lg"
            style={{ marginBottom: spacing.sm }}
          />
          <AppButton
            title="Ver meus pedidos"
            variant="outline"
            onPress={() => router.replace("/(tabs)/orders")}
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Avalie seu pedido" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card do Pedido com Dados Reais */}
          <View style={styles.orderSummaryCard}>
            <Text style={styles.restaurantName}>
              {targetOrder?.restaurantName || "Burger House"}
            </Text>
            <Text style={styles.orderValue}>
              Total do pedido:{" "}
              {targetOrder ? formatCurrency(targetOrder.total) : "R$ 0,00"}
            </Text>
          </View>

          {/* Avaliação do Restaurante */}
          <View style={styles.ratingCard}>
            <Text style={styles.ratingSectionTitle}>O que achou da comida?</Text>
            <RatingStars
              rating={restaurantRating}
              size={36}
              interactive
              onRatingChange={setRestaurantRating}
              activeColor={colors.primary}
            />
          </View>

          {/* Avaliação do Entregador */}
          <View style={styles.ratingCard}>
            <Text style={styles.ratingSectionTitle}>
              Como foi a entrega com {targetOrder?.courierName || "Policarpo"}?
            </Text>
            <RatingStars
              rating={courierRating}
              size={32}
              interactive
              onRatingChange={setCourierRating}
              activeColor={colors.warning}
            />
          </View>

          {/* Tags de Elogio */}
          <View style={styles.tagsSection}>
            <Text style={styles.commentLabel}>O que você mais gostou?</Text>
            <View style={styles.tagsContainer}>
              {COMPLIMENT_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                    accessibilityRole="button"
                    accessibilityLabel={`Elogio ${tag}`}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark" : "add"}
                      size={14}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.tagText,
                        isSelected && styles.tagTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Comentário Opcional */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>
              Deixe um comentário (opcional)
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Conte como foi sua experiência com este pedido..."
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={400}
              value={comment}
              onChangeText={setComment}
            />
            <Text style={styles.charCount}>{comment.length}/400</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            title="Enviar Avaliação"
            onPress={handleSubmit}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  orderSummaryCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restaurantName: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  orderValue: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  ratingSectionTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  tagsSection: {
    marginBottom: spacing.lg,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
  },
  tagChipSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FFF8F8",
  },
  tagText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  tagTextSelected: {
    color: colors.primary,
    fontFamily: typography.bold,
  },
  commentSection: {
    width: "100%",
  },
  commentLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  footerButtons: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
});
