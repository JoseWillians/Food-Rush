import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";

export type RatingStarsProps = {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  activeColor?: string;
  inactiveColor?: string;
};

/**
 * Estrelas de avaliação (de 0 a 5, com meia estrela).
 */
export function RatingStars({
  rating,
  maxStars = 5,
  size = 18,
  interactive = false,
  onRatingChange,
  showValue = false,
  activeColor = colors.warning,
  inactiveColor = colors.gray300,
}: RatingStarsProps) {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {stars.map((star) => {
          const isFilled = star <= Math.round(rating);
          return (
            <Pressable
              key={star}
              disabled={!interactive}
              onPress={() => onRatingChange?.(star)}
              style={interactive ? styles.interactivePadding : undefined}
            >
              <Ionicons
                name={isFilled ? "star" : "star-outline"}
                size={size}
                color={isFilled ? activeColor : inactiveColor}
              />
            </Pressable>
          );
        })}
      </View>
      {showValue ? (
        <Text style={styles.valueText}>{rating.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  interactivePadding: {
    paddingHorizontal: spacing.xs,
  },
  valueText: {
    marginLeft: spacing.xs,
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
});

