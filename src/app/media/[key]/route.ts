import { readProductImage } from "@/lib/images/r2";

const objectKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MediaRouteProps = {
  params: Promise<{ key: string }>;
};

export async function GET(_request: Request, { params }: MediaRouteProps) {
  const { key } = await params;
  if (!objectKeyPattern.test(key)) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await readProductImage(key);
  if (!object) return new Response("Not Found", { status: 404 });

  const contentType = object.httpMetadata?.contentType ?? "";
  if (!contentType.startsWith("image/")) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
