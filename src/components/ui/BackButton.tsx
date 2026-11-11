import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius } from "@/src/theme/spacing";

export type BackButtonProps = {
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botão de voltar para a tela anterior.
 */
export function BackButton({ onPress, color = colors.text, style }: BackButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      router.replace("/(tabs)");
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray100,
  },
  pressed: {
    opacity: 0.7,
  },
});

