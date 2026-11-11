import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

/**
 * Barra de abas inferior (Início, Pedidos, Favoritos e Perfil).
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Em celulares com barra de navegação virtual do sistema (Android 3 botões ou barra de gestos),
  // insets.bottom possui a altura exata da barra do sistema.
  // Somamos o inset para elevar o TabBar e evitar que a barra do sistema fique na frente do app.
  const bottomInset = insets.bottom;
  const paddingBottom = bottomInset > 0 ? bottomInset + 4 : (Platform.OS === "android" ? 10 : 8);
  const tabHeight = 60 + bottomInset + (bottomInset === 0 && Platform.OS === "android" ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: typography.medium,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={typeof color === "string" ? color : (focused ? colors.primary : colors.textSecondary)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={24}
              color={typeof color === "string" ? color : (focused ? colors.primary : colors.textSecondary)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={24}
              color={typeof color === "string" ? color : (focused ? colors.primary : colors.textSecondary)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={typeof color === "string" ? color : (focused ? colors.primary : colors.textSecondary)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
