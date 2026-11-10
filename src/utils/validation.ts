// Funções de validação usadas nos formulários (login, cadastro, loja e pratos).

export const MIN_PASSWORD_LENGTH = 6;

/** Confere se o texto tem formato de e-mail: algo@dominio.com */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Deixa só os números do texto. */
export function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}

/**
 * Máscara de telefone enquanto o usuário digita:
 * "98987654321" vira "(98) 98765-4321".
 */
export function formatPhone(text: string): string {
  const digits = onlyDigits(text).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  // Celular tem 9 dígitos depois do DDD, fixo tem 8
  const split = rest.length > 8 ? 5 : 4;
  if (rest.length <= split) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Telefone válido: DDD + 8 ou 9 dígitos. */
export function isValidPhone(phone: string): boolean {
  const length = onlyDigits(phone).length;
  return length === 10 || length === 11;
}

/**
 * Converte o preço digitado ("34,90" ou "34.90") em número.
 * Devolve null se não for um número válido.
 */
export function parsePrice(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}
