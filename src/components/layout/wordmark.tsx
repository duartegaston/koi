import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/",
  onInk = false,
  withTagline = false,
  taglineBelow = false,
  taglineTone = "auto",
  taglineFromLg = true,
  priority = false,
  className = "",
  logoHeight = "3.5rem",
}: {
  href?: string;
  onInk?: boolean;
  withTagline?: boolean;
  taglineBelow?: boolean;
  taglineTone?: "auto" | "primary";
  taglineFromLg?: boolean;
  priority?: boolean;
  className?: string;
  logoHeight?: string;
}) {
  const taglineColor = taglineTone === "primary" ? "text-primary" : onInk ? "text-sand" : "text-muted";

  return (
    <Link
      href={href}
      aria-label={withTagline ? "Koi, unidos x el chocolate" : "Koi"}
      className={cn(
        "inline-flex min-h-11",
        taglineBelow ? "flex-col items-center gap-1" : "items-center gap-3",
        className,
      )}
    >
      <Image
        src="/brand/wordmark.png"
        alt=""
        width={800}
        height={706}
        priority={priority}
        className="w-auto"
        style={{ width: "auto", height: logoHeight }}
      />
      {withTagline ? (
        <span
          className={cn(
            "text-center font-label",
            taglineTone === "primary" ? "text-xl font-bold" : "text-sm",
            taglineFromLg && "hidden lg:block",
            taglineColor,
          )}
        >
          – unidos x el chocolate –
        </span>
      ) : null}
    </Link>
  );
}
