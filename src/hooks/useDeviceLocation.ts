import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { showMessage } from "@/src/utils/dialog";

export type DeviceCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

/**
 * Hook que pede permissão de GPS e lê a localização do celular.
 * Também converte as coordenadas em endereço (rua, bairro, cidade).
 *
 * Uso: const { coords, address, hasPermission, loading, requestLocation } = useDeviceLocation();
 */
export function useDeviceLocation(askOnMount = true) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<DeviceCoords | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  // isManual = true quando o usuário tocou no botão (aí explicamos se ele negar)
  const requestLocation = useCallback(async (isManual = false) => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setHasPermission(false);
        if (isManual) {
          showMessage(
            "Permissão de Localização",
            "A autorização de GPS é necessária para exibir a sua localização exata e traçar a rota até a sua casa."
          );
        }
        return;
      }

      setHasPermission(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Geocodificação reversa: coordenadas -> nome da rua e bairro
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geo) {
        const street = geo.street || geo.name || "Rua Atual";
        const number = geo.streetNumber ? `, ${geo.streetNumber}` : "";
        const district = geo.district || geo.subregion || "";
        const city = geo.city || "Santa Inês";
        setAddress(`${street}${number} - ${district ? `${district}, ` : ""}${city}`);
      }
    } catch (error) {
      console.warn("Erro ao obter localização do dispositivo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (askOnMount) requestLocation(false);
  }, [askOnMount, requestLocation]);

  return { coords, address, hasPermission, loading, requestLocation };
}
