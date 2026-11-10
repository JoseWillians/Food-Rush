// Cálculos de valores do carrinho e dos cupons.
// Ficam separados das telas para poderem ser testados (veja a pasta tests/).
// Este arquivo não importa nada do app de propósito: assim o Node consegue rodar os testes direto.

export type PricedItem = {
  price: number;
  quantity: number;
};

export type Coupon = {
  code: string;
  title: string;
  description: string;
  discount: number; // valor em reais
  isFreeDelivery?: boolean; // true = zera a taxa de entrega
};

export const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: "FOODRUSH10",
    title: "R$ 10,00 OFF",
    description: "Desconto de R$ 10 em qualquer pedido",
    discount: 10,
  },
  {
    code: "FRETEGRATIS",
    title: "Frete Grátis",
    description: "Desconto integral na taxa de entrega",
    discount: 0,
    isFreeDelivery: true,
  },
  {
    code: "PRIMEIRACOMPRA",
    title: "R$ 15,00 OFF",
    description: "Desconto especial de R$ 15 de boas-vindas",
    discount: 15,
  },
];

/** Arredonda para centavos, evitando erros como 0.1 + 0.2 = 0.30000000000000004 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Soma preço × quantidade de cada item. */
export function calculateSubtotal(items: PricedItem[]): number {
  return roundMoney(items.reduce((acc, item) => acc + item.price * item.quantity, 0));
}

/** Procura o cupom pelo código, sem diferenciar maiúsculas e minúsculas. */
export function findCoupon(code: string, coupons: Coupon[] = AVAILABLE_COUPONS): Coupon | null {
  const clean = code.trim().toUpperCase();
  return coupons.find((c) => c.code === clean) ?? null;
}

/**
 * Quanto o cupom desconta.
 * - Frete grátis: desconta a taxa de entrega.
 * - Valor fixo: desconta o valor, mas nunca mais que o subtotal (a comida não fica negativa).
 */
export function calculateDiscount(
  coupon: Coupon | null,
  subtotal: number,
  deliveryFee: number
): number {
  if (!coupon || subtotal <= 0) return 0;
  if (coupon.isFreeDelivery) return roundMoney(deliveryFee);
  return roundMoney(Math.min(coupon.discount, subtotal));
}

/** Total final do pedido: subtotal + taxa - desconto (nunca negativo). */
export function calculateTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  return roundMoney(Math.max(0, subtotal + deliveryFee - discount));
}
