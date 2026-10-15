import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BackButton } from "./BackButton";

export type HeaderProps = {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
};

export function Header({
  title,
  showBack = true,
  onBackPress,
  rightAction,
}: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? <BackButton onPress={onBackPress} /> : null}
      </View>
      <View style={styles.center}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
      </View>
      <View style={styles.right}>
        {rightAction || null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  left: {
    width: 44,
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  right: {
    width: 44,
    alignItems: "flex-end",
  },
  title: {
    fontSize: fontSizes.lg,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
});

