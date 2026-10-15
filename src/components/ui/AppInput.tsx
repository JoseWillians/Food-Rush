import React, { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";

export type AppInputProps = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function AppInput({
  label,
  error,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  inputStyle,
  secureTextEntry,
  ...rest
}: AppInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const effectiveSecure = isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
        ]}
      >
        {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.gray400}
          secureTextEntry={effectiveSecure}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ocultar senha" : "Exibir senha"}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.gray400}
            />
          </Pressable>
        ) : (
          rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    width: "100%",
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: typography.regular,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
  },
  eyeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

