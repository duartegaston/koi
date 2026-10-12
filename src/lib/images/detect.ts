export const maxImageBytes = 2_000_000;
export const maxImagesPerProduct = 6;

const jpeg = [0xff, 0xd8, 0xff];
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type DetectedImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes.byteLength === 0 || bytes.byteLength > maxImageBytes) return null;
  if (startsWith(bytes, jpeg)) return { contentType: "image/jpeg" };
  if (startsWith(bytes, png)) return { contentType: "image/png" };
  if (isWebp(bytes)) return { contentType: "image/webp" };
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.byteLength < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}
