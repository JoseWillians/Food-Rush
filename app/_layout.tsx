import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { CartProvider } from "@/src/contexts/CartContext";
import { FavoritesProvider } from "@/src/contexts/FavoritesContext";
import { OrderProvider } from "@/src/contexts/OrderContext";
import { colors } from "@/src/theme/colors";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn("Erro ao carregar fontes Poppins:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <OrderProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.white },
                  animation: "slide_from_right",
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding/index" />
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="restaurant/[id]" />
                <Stack.Screen name="cart" />
                <Stack.Screen name="checkout" />
                <Stack.Screen name="order/tracking" />
                <Stack.Screen name="order/chat" />
                <Stack.Screen name="order/success" />
                <Stack.Screen name="order/review" />
              </Stack>
            </OrderProvider>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
