import { Linking, Platform } from "react-native";

/**
 * Abre a rota no app de mapas do celular (Apple Maps no iPhone,
 * Google Maps no Android) ou no Google Maps do navegador.
 */
export function openRouteInMaps(originName: string, destinationAddress: string) {
  const origin = encodeURIComponent(originName);
  const dest = encodeURIComponent(destinationAddress);
  const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
  const url = Platform.select({
    ios: `maps://app?saddr=${origin}&daddr=${dest}`,
    android: `google.navigation:q=${dest}`,
    default: webUrl,
  });

  Linking.canOpenURL(url)
    .then((supported) => Linking.openURL(supported ? url : webUrl))
    .catch(() => Linking.openURL(webUrl));
}
