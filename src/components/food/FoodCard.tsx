import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { Product } from "@/src/types";
import { formatCurrency } from "@/src/utils/currency";

type FoodCardProps = {
  product: Product;
  onAdd?: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
  isClosed?: boolean;
  onPress?: () => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  isOwner?: boolean;
};

/**
 * Card de Alimentos / Pratos do Food Rush.
 * Arquitetura sem aninhamento de botões (compatível 100% com Web e Mobile).
 * Espaçoso, imagem destacada (104x104), tipografia hierárquica e botão de adicionar generoso (44x44dp).
 */
export function FoodCard({
  product,
  onAdd,
  isFavorite = false,
  onToggleFavorite,
  isClosed = false,
  onPress,
  onEdit,
  onDelete,
  isOwner = false,
}: FoodCardProps) {
  return (
    <View style={styles.card}>
      {/* Área Principal de Informações Textuais */}
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          {onPress ? (
            <Pressable
              onPress={onPress}
              style={({ pressed }) => [styles.titlePressable, pressed && styles.pressedText]}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${product.name}`}
            >
              <Text style={styles.title} numberOfLines={2}>
                {product.name}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.title} numberOfLines={2}>
              {product.name}
            </Text>
          )}

          {onToggleFavorite && (
            <Pressable
              onPress={() => onToggleFavorite(product)}
              hitSlop={12}
              style={styles.favoriteButton}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite
                  ? `Remover ${product.name} dos favoritos`
                  : `Favoritar ${product.name}`
              }
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? colors.primary : colors.gray400}
              />
            </Pressable>
          )}
        </View>

        {Boolean(product.description) && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={styles.footerRow}>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>

          {isOwner && (
            <View style={styles.ownerActionsRow}>
              {onEdit && (
                <Pressable
                  onPress={() => onEdit(product)}
                  style={styles.actionIconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${product.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                </Pressable>
              )}
              {onDelete && (
                <Pressable
                  onPress={() => onDelete(product)}
                  style={[styles.actionIconBtn, styles.deleteIconBtn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${product.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Imagem do Alimento em Destaque + Botão de Adicionar */}
      <View style={styles.imageWrapper}>
        {onPress ? (
          <Pressable onPress={onPress} style={styles.imagePressable}>
            <Image
              source={{ uri: product.image }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>
        ) : (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {onAdd && (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              isClosed && styles.addButtonDisabled,
              pressed && !isClosed && styles.addButtonPressed,
            ]}
            onPress={() => {
              if (!isClosed) {
                onAdd(product);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${product.name} ao carrinho`}
            accessibilityState={{ disabled: isClosed }}
            hitSlop={8}
          >
            <Ionicons
              name={isClosed ? "lock-closed" : "add"}
              size={22}
              color={colors.white}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  detailsContainer: {
    flex: 1,
    paddingRight: spacing.md,
    justifyContent: "space-between",
    minHeight: 104,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  titlePressable: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    lineHeight: 20,
    flex: 1,
  },
  pressedText: {
    opacity: 0.7,
  },
  favoriteButton: {
    padding: 4,
    marginLeft: spacing.xs,
  },
  description: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  price: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  ownerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  deleteIconBtn: {
    backgroundColor: colors.error + "15",
  },
  imageWrapper: {
    position: "relative",
    width: 104,
    height: 104,
  },
  imagePressable: {
    width: 104,
    height: 104,
  },
  image: {
    width: 104,
    height: 104,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  addButton: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: colors.white,
  },
  addButtonDisabled: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: colors.primaryDark,
  },
});
