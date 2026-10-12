const encoder = new TextEncoder();

export async function verifyMercadoPagoSignature(input: {
  secret: string;
  signatureHeader: string;
  requestId: string;
  dataId: string;
}): Promise<boolean> {
  const { ts, hash } = readSignature(input.signatureHeader);
  if (!ts || !hash) return false;

  const dataId = input.dataId.toLowerCase();
  const parts = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (input.requestId) parts.push(`request-id:${input.requestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(";")};`;

  const computed = await hmacSha256Hex(input.secret, manifest);
  return safeEqual(computed, hash);
}

function readSignature(header: string): { ts?: string; hash?: string } {
  let ts: string | undefined;
  let hash: string | undefined;
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") hash = value;
  }
  return { ts, hash };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
