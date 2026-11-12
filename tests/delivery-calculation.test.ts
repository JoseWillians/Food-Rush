import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCourierFee,
  courierPayoutFor,
  estimateDistanceKm,
  neighborhoodFromAddress,
  resolveDeliveryFee,
} from "../src/utils/deliveryFee.ts";

// Regras (as mesmas do server.js), no modelo do iFood:
// - O entregador recebe um mínimo garantido de R$ 6,50 por rota + R$ 1,50 por km rodado.
// - Em promoções, ganha um bônus por corrida, pago pela plataforma.
// - A distância é estimada pela zona do bairro: central 2 km, urbana 3, periférica 5, rural 8.
// - Taxa cadastrada pela loja para o bairro do cliente tem prioridade.

test("rota na zona central: R$ 6,50 + 2 km × R$ 1,50 = R$ 9,50", () => {
  const r = calculateCourierFee("central");
  assert.equal(r.distanceKm, 2);
  assert.equal(r.routeFee, 9.5);
  assert.equal(r.courierPayout, 9.5);
});

test("quanto mais longe o bairro, maior o valor da rota", () => {
  assert.equal(calculateCourierFee("urbana").routeFee, 11);
  assert.equal(calculateCourierFee("periferica").routeFee, 14);
  assert.equal(calculateCourierFee("rural").routeFee, 18.5);
});

test("o mínimo garantido vale mesmo em rotas curtas", () => {
  assert.equal(calculateCourierFee(0).routeFee, 6.5);
  assert.equal(calculateCourierFee(0.4).routeFee, 7.1);
});

test("bônus de promoção vai para o entregador, mas não aumenta a taxa do cliente", () => {
  const r = calculateCourierFee("central", { minPerRoute: 6.5, perKm: 1.5, promoBonus: 2 });
  assert.equal(r.totalFee, 9.5);
  assert.equal(r.courierPayout, 11.5);
});

test("bairro sem zona conhecida usa a distância média urbana", () => {
  assert.equal(estimateDistanceKm(undefined), 3);
  assert.equal(estimateDistanceKm("zona-nova"), 3);
  assert.equal(courierPayoutFor(undefined), 11);
});

test("taxa cadastrada para o bairro tem prioridade sobre a taxa da loja", () => {
  const result = resolveDeliveryFee({
    store: { deliveryFee: 5.99, deliveryMode: "own_courier" },
    neighborhoodId: "b-canaa",
    rates: [{ bairroId: "b-canaa", deliveryFee: 9 }],
  });
  assert.deepEqual(result, { deliveryFee: 9, source: "neighborhood" });
});

test("sem taxa para o bairro, vale a taxa única da loja", () => {
  const result = resolveDeliveryFee({
    store: { deliveryFee: 5.99, deliveryMode: "own_courier" },
    neighborhoodId: "b-centro",
    rates: [{ bairroId: "b-canaa", deliveryFee: 9 }],
  });
  assert.deepEqual(result, { deliveryFee: 5.99, source: "store" });
});

test("loja que só usa a rede de entregadores cobra o valor da rota", () => {
  const result = resolveDeliveryFee({
    store: { deliveryFee: 0, deliveryMode: "independent_couriers" },
    neighborhoodId: "b-x",
    zone: "rural",
  });
  assert.deepEqual(result, { deliveryFee: 18.5, source: "courier_network" });
});

test("o bairro é lido do endereço formatado", () => {
  assert.equal(neighborhoodFromAddress("Rua das Flores, 123 - Centro, Santa Inês - MA"), "Centro");
  assert.equal(neighborhoodFromAddress("Endereço a cadastrar"), null);
});
