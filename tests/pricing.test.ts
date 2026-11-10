// Testes dos cálculos de preço e cupom.
// Para rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AVAILABLE_COUPONS,
  calculateDiscount,
  calculateSubtotal,
  calculateTotal,
  findCoupon,
} from "../src/utils/pricing.ts";

test("subtotal soma preço x quantidade", () => {
  const itens = [
    { price: 28.9, quantity: 2 },
    { price: 6.5, quantity: 1 },
  ];
  assert.equal(calculateSubtotal(itens), 64.3);
});

test("subtotal de carrinho vazio é zero", () => {
  assert.equal(calculateSubtotal([]), 0);
});

test("subtotal não sofre erro de arredondamento", () => {
  // 0.1 + 0.2 em JavaScript dá 0.30000000000000004
  assert.equal(calculateSubtotal([{ price: 0.1, quantity: 1 }, { price: 0.2, quantity: 1 }]), 0.3);
});

test("total = subtotal + taxa de entrega", () => {
  assert.equal(calculateTotal(49.9, 7.5), 57.4);
});

test("cupom de valor fixo desconta R$ 10", () => {
  const cupom = findCoupon("FOODRUSH10");
  assert.equal(calculateDiscount(cupom, 50, 5.99), 10);
  assert.equal(calculateTotal(50, 5.99, 10), 45.99);
});

test("cupom de valor fixo não passa do valor da comida", () => {
  const cupom = findCoupon("PRIMEIRACOMPRA"); // R$ 15
  assert.equal(calculateDiscount(cupom, 6.5, 5.99), 6.5);
  // Paga só a entrega
  assert.equal(calculateTotal(6.5, 5.99, 6.5), 5.99);
});

test("cupom de frete grátis desconta só a taxa de entrega", () => {
  const cupom = findCoupon("FRETEGRATIS");
  assert.equal(calculateDiscount(cupom, 40, 7.5), 7.5);
  assert.equal(calculateTotal(40, 7.5, 7.5), 40);
});

test("código do cupom aceita minúsculas e espaços", () => {
  assert.equal(findCoupon("  foodrush10 ")?.code, "FOODRUSH10");
});

test("cupom inexistente não é encontrado e não dá desconto", () => {
  const cupom = findCoupon("QUALQUERCOISA");
  assert.equal(cupom, null);
  assert.equal(calculateDiscount(cupom, 50, 5), 0);
});

test("carrinho vazio não recebe desconto", () => {
  assert.equal(calculateDiscount(AVAILABLE_COUPONS[0], 0, 0), 0);
});

test("total nunca fica negativo", () => {
  assert.equal(calculateTotal(5, 0, 20), 0);
});
