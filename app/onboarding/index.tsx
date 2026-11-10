import React, { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { AppButton } from "@/src/components/ui/AppButton";
import { STORAGE_KEYS, storageSet } from "@/src/utils/storage";

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    title: "Entrega rápida e segura",
    description: "Peça seus pratos favoritos e acompanhe em tempo real",
    icon: "flash-outline",
  },
  {
    id: "2",
    title: "Variedade de restaurantes",
    description: "Pratos incríveis de sua preferência, as melhores comidas da região, é aqui",
    icon: "restaurant-outline",
  },
  {
    id: "3",
    title: "Com tudo na palma da sua mão",
    description: "Com praticidade e variedades",
    icon: "phone-portrait-outline",
  },
  {
    id: "4",
    title: "Acompanhe seu pedido",
    description: "Veja seu pedido em tempo real, do preparo até a entrega",
    icon: "location-outline",
  },
];

/**
 * Telas de boas-vindas mostradas na primeira vez que o app abre.
 */
export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const handleFinish = async () => {
    await storageSet(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    router.replace("/auth/login");
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      // Rola até o próximo slide pela posição (largura da tela × número do slide)
      // e já atualiza o slide atual. Antes o índice só mudava quando o usuário
      // arrastava com o dedo, por isso o botão "Próximo" parecia não fazer nada.
      flatListRef.current?.scrollToOffset({ offset: next * width, animated: true });
      setCurrentIndex(next);
    } else {
      handleFinish();
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {currentIndex < SLIDES.length - 1 ? (
          <Pressable onPress={handleFinish} hitSlop={10}>
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        // Na web o "fim do arrasto" não é avisado, então também acompanha a rolagem
        onScroll={Platform.OS === "web" ? onScroll : undefined}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={68} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <AppButton
          title={currentIndex === SLIDES.length - 1 ? "Começar" : "Próximo"}
          onPress={handleNext}
          size="lg"
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "flex-end",
    height: 48,
  },
  skipText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  headerSpacer: {
    height: 20,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSizes.md,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.primary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: colors.gray300,
  },
  actionButton: {
    width: "100%",
  },
});

