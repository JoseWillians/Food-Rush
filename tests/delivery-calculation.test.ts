import test from "node:test";
import assert from "node:assert/strict";

/**
 * Funções puras de cálculo de entrega para validação de regras de negócio.
 * Regras:
 * - Motoboy autônomo: taxa base de R$ 6,00.
 * - Adicional por zona: Central (R$ 0,00), Periférica (+ R$ 2,00), Rural (+ R$ 5,00).
 * - Repasse ao entregador: 85% do total.
 * - Taxa da plataforma: 15% do total.
 * - Loja com entregador próprio: taxa definida por bairro.
 */

type Zone = "central" | "periferica" | "rural";

function calculateAutonomousFee(zone: Zone = "central") {
  const base = 6.0;
  const zoneExtra = zone === "rural" ? 5.0 : zone === "periferica" ? 2.0 : 0.0;
  const totalFee = base + zoneExtra;
  const courierPayout = Math.round(totalFee * 0.85 * 100) / 100;
  const platformFee = Math.round((totalFee - courierPayout) * 100) / 100;

  return { totalFee, courierPayout, platformFee };
}

test("motoboy autônomo na zona central cobra taxa base de R$ 6,00", () => {
  const { totalFee, courierPayout, platformFee } = calculateAutonomousFee("central");
  assert.equal(totalFee, 6.0);
  assert.equal(courierPayout, 5.1);
  assert.equal(platformFee, 0.9);
  assert.equal(courierPayout + platformFee, 6.0);
});

test("motoboy autônomo na zona periférica adiciona R$ 2,00 na taxa", () => {
  const { totalFee, courierPayout, platformFee } = calculateAutonomousFee("periferica");
  assert.equal(totalFee, 8.0);
  assert.equal(courierPayout, 6.8);
  assert.equal(platformFee, 1.2);
  assert.equal(courierPayout + platformFee, 8.0);
});

test("motoboy autônomo na zona rural adiciona R$ 5,00 na taxa", () => {
  const { totalFee, courierPayout, platformFee } = calculateAutonomousFee("rural");
  assert.equal(totalFee, 11.0);
  assert.equal(courierPayout, 9.35);
  assert.equal(platformFee, 1.65);
  assert.equal(courierPayout + platformFee, 11.0);
});

test("repasse do entregador é sempre 85% e soma exata da taxa", () => {
  for (const zone of ["central", "periferica", "rural"] as Zone[]) {
    const { totalFee, courierPayout, platformFee } = calculateAutonomousFee(zone);
    assert.equal(Math.round((courierPayout + platformFee) * 100) / 100, totalFee);
    assert.ok(courierPayout > platformFee);
  }
});
