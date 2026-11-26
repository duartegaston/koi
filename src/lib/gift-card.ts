import { z } from "zod";
import { fromCents, toCents } from "@/lib/money";

/** Piso para que alcance a un producto del catálogo. Techo por encima del más caro. */
const MIN_CENTS = 1_000_000;
const MAX_CENTS = 20_000_000;

export const giftCardMinAmount = fromCents(MIN_CENTS);
export const giftCardMaxAmount = fromCents(MAX_CENTS);

export const giftCardPresets = ["15000.00", "25000.00", "40000.00", "60000.00", "100000.00"] as const;

export type GiftCardDetails = {
  amount: string;
  recipientName: string;
  recipientContact: string;
  message: string | null;
};

const emailSchema = z.email();

export function formatGiftAmount(amount: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toCents(amount) / 100);
}

export function giftAmountRangeLabel(): string {
  return `Entre ${formatGiftAmount(giftCardMinAmount)} y ${formatGiftAmount(giftCardMaxAmount)}.`;
}

export function isAllowedGiftAmount(amount: string): boolean {
  try {
    const cents = toCents(amount);
    return cents >= MIN_CENTS && cents <= MAX_CENTS && cents % 100 === 0;
  } catch {
    return false;
  }
}

/** Acepta `25000`, `25.000` o `25000,00`. Solo pesos enteros. */
export function parseGiftAmount(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/[.,]00$/, "");
  const thousands = /^\d{1,3}(\.\d{3})+$/;
  const digits = /^\d+$/;
  const pesos = thousands.test(trimmed) ? trimmed.replaceAll(".", "") : digits.test(trimmed) ? trimmed : null;
  if (!pesos) return null;
  const cents = Number(pesos) * 100;
  if (!Number.isSafeInteger(cents) || cents < MIN_CENTS || cents > MAX_CENTS) return null;
  return fromCents(cents);
}

export function parseGiftCardDetails(input: {
  amount: string;
  recipientName: string;
  recipientContact: string;
  giftMessage: string;
}): { ok: true; value: GiftCardDetails } | { ok: false; message: string } {
  const amount = parseGiftAmount(input.amount);
  if (!amount) {
    return { ok: false, message: `Elegí un monto entre ${formatGiftAmount(giftCardMinAmount)} y ${formatGiftAmount(giftCardMaxAmount)}.` };
  }

  const recipientName = input.recipientName.trim().replace(/\s+/g, " ");
  if (recipientName.length < 2 || recipientName.length > 120) {
    return { ok: false, message: "Ingresá el nombre de quien recibe la gift card." };
  }

  const recipientContact = parseGiftContact(input.recipientContact);
  if (!recipientContact) {
    return { ok: false, message: "Ingresá un email o un WhatsApp válido, con código de área." };
  }

  const message = input.giftMessage.trim();
  if (message.length > 500) {
    return { ok: false, message: "El mensaje puede tener hasta 500 caracteres." };
  }

  return {
    ok: true,
    value: {
      amount,
      recipientName,
      recipientContact,
      message: message.length === 0 ? null : message,
    },
  };
}

function parseGiftContact(raw: string): string | null {
  const trimmed = raw.trim();
  if (emailSchema.safeParse(trimmed).success && trimmed.length <= 254) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (/^[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}
