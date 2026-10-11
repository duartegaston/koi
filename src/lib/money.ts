const CENTS = 100;

export function toCents(amount: string): number {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new Error(`Importe inválido: ${amount}`);
  }
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fraction = Number((match[3] ?? "").padEnd(2, "0"));
  return sign * (whole * CENTS + fraction);
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / CENTS);
  const fraction = String(absolute % CENTS).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

export function addAmounts(left: string, right: string): string {
  return fromCents(toCents(left) + toCents(right));
}

export function multiplyAmount(unitPrice: string, quantity: number): string {
  return fromCents(toCents(unitPrice) * quantity);
}
