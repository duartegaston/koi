import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/",
  onInk = false,
  withTagline = false,
  priority = false,
  className = "",
}: {
  href?: string;
  onInk?: boolean;
  withTagline?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={withTagline ? "Koi, unidos x el chocolate" : "Koi"}
      className={cn("inline-flex min-h-11 items-center gap-3", className)}
    >
      <Image
        src="/brand/wordmark.png"
        alt=""
        width={800}
        height={706}
        priority={priority}
        className="w-auto"
        style={{ width: "auto", height: "3.5rem" }}
      />
      {withTagline ? (
        <span className={cn("font-label hidden text-sm lg:inline", onInk ? "text-sand" : "text-muted")}>
          – unidos x el chocolate –
        </span>
      ) : null}
    </Link>
  );
}
