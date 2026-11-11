import React, { useState } from "react";
import {
  Platform,
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

/**
 * Campo de texto padrão do app, com rótulo, ícones, mostrar/ocultar senha
 * e mensagem de erro embaixo do campo.
 */
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
          style={[
            styles.input,
            Platform.OS === "web" &&
              ({
                outlineStyle: "none",
                outline: "none",
                outlineWidth: 0,
                outlineColor: "transparent",
              } as any),
            inputStyle,
          ]}
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
    // "stretch" ocupa a largura toda numa coluna, mas respeita o flex quando
    // dois campos ficam lado a lado (com width: "100%" eles se sobrepunham)
    alignSelf: "stretch",
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
    // Na web a caixa de texto tem largura mínima própria (~200px) e não encolhia,
    // então dois campos lado a lado ficavam um por cima do outro
    minWidth: 0,
    fontSize: fontSizes.md,
    fontFamily: typography.regular,
    color: colors.text,
    paddingVertical: spacing.sm,
    // Remove o contorno preto nativo do navegador ao focar
    ...(Platform.OS === "web"
      ? ({
          outlineStyle: "none",
          outline: "none",
          outlineWidth: 0,
          outlineColor: "transparent",
        } as any)
      : {}),
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

