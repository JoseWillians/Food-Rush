// Regras da taxa de entrega e do ganho do entregador. Funções puras (sem tela e
// sem servidor), testadas em tests/delivery-calculation.test.ts.
// O server.js usa as mesmas regras na rota POST /api/delivery/calculate-fee.

// Sem imports: assim o arquivo roda direto nos testes do Node (npm test).
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type DeliveryZone = "central" | "urbana" | "periferica" | "rural" | string;

/**
 * Modelo inspirado no iFood: o entregador tem um valor mínimo garantido por rota,
 * mais um valor por quilômetro rodado, mais um bônus quando há promoção
 * (ex.: horário de pico ou chuva). O bônus é pago pela plataforma, não pelo cliente.
 */
export type CourierFeeConfig = {
  minPerRoute: number; // valor mínimo garantido por rota (R$)
  perKm: number; // valor por quilômetro rodado (R$)
  promoBonus: number; // bônus de promoção por corrida (R$), 0 quando não há promoção
};

export const DEFAULT_COURIER_CONFIG: CourierFeeConfig = {
  minPerRoute: 6.5,
  perKm: 1.5,
  promoBonus: 0,
};

/**
 * Distância estimada pela zona do bairro. O app ainda não tem as coordenadas
 * da loja e do cliente, então usa uma média por zona de Santa Inês.
 */
export const KM_BY_ZONE: Record<string, number> = {
  central: 2,
  urbana: 3,
  periferica: 5,
  rural: 8,
};

export function estimateDistanceKm(zone?: DeliveryZone): number {
  return KM_BY_ZONE[zone ?? "urbana"] ?? KM_BY_ZONE.urbana;
}

/**
 * Calcula uma corrida da rede de entregadores.
 * - routeFee: valor da rota (mínimo + km), que é a taxa paga pelo cliente.
 * - courierPayout: o que o entregador recebe (rota + bônus de promoção).
 */
export function calculateCourierFee(
  zoneOrKm?: DeliveryZone | number,
  config: CourierFeeConfig = DEFAULT_COURIER_CONFIG
) {
  const distanceKm = typeof zoneOrKm === "number" ? zoneOrKm : estimateDistanceKm(zoneOrKm);
  const routeFee = roundMoney(config.minPerRoute + config.perKm * distanceKm);
  const promoBonus = roundMoney(config.promoBonus || 0);
  return {
    distanceKm,
    routeFee,
    promoBonus,
    courierPayout: roundMoney(routeFee + promoBonus),
    totalFee: routeFee,
  };
}

/** Quanto o entregador recebe por uma corrida na zona informada. */
export function courierPayoutFor(zone?: DeliveryZone, config: CourierFeeConfig = DEFAULT_COURIER_CONFIG): number {
  return calculateCourierFee(zone, config).courierPayout;
}

export type StoreFeeInfo = {
  deliveryFee: number;
  deliveryMode?: "own_courier" | "independent_couriers" | "both" | string;
};

export type NeighborhoodRate = { bairroId?: string; neighborhoodId?: string; deliveryFee: number };

/**
 * Decide a taxa que o cliente paga:
 * 1. Se a loja cadastrou uma taxa para o bairro do cliente, vale essa taxa.
 * 2. Se a loja só usa a rede de entregadores, vale o valor da rota (mínimo + km).
 * 3. Senão, vale a taxa única da loja.
 */
export function resolveDeliveryFee(params: {
  store: StoreFeeInfo;
  neighborhoodId?: string | null;
  zone?: DeliveryZone;
  rates?: NeighborhoodRate[];
  config?: CourierFeeConfig;
}): { deliveryFee: number; source: "neighborhood" | "courier_network" | "store" } {
  const { store, neighborhoodId, zone, rates = [], config } = params;
  if (neighborhoodId) {
    const rate = rates.find((r) => (r.bairroId ?? r.neighborhoodId) === neighborhoodId);
    if (rate && Number.isFinite(rate.deliveryFee) && rate.deliveryFee >= 0) {
      return { deliveryFee: roundMoney(rate.deliveryFee), source: "neighborhood" };
    }
  }
  if (store.deliveryMode === "independent_couriers") {
    return { deliveryFee: calculateCourierFee(zone, config).routeFee, source: "courier_network" };
  }
  return { deliveryFee: roundMoney(store.deliveryFee || 0), source: "store" };
}

/** Pega o bairro de um endereço no formato "Rua X, 10 - Centro, Santa Inês". */
export function neighborhoodFromAddress(address?: string | null): string | null {
  if (!address) return null;
  const m = address.match(/ - ([^,]+),/);
  return m ? m[1].trim() : null;
}
