// Regenerable con `npm run cf-typegen`.
interface CloudflareEnv {
  APP_URL: string;
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  WHATSAPP_NUMBER: string;
  STORE_PICKUP_ADDRESS?: string;
  STORE_TRANSFER_ALIAS?: string;
  STORE_ORIGIN_LATITUDE?: string;
  STORE_ORIGIN_LONGITUDE?: string;
  MERCADOPAGO_ACCESS_TOKEN?: string;
  MERCADOPAGO_WEBHOOK_SECRET?: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  ADMIN_SESSION_SECRET: string;
  PRODUCT_IMAGES: R2Bucket;
}
