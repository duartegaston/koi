import { cn } from "@/lib/utils";

export function Marquee({ items, tone = "paper" }: { items: string[]; tone?: "paper" | "ink" }) {
  const phrase = `${items.join("   ·   ")}   ·   `;
  const line = phrase.repeat(4);

  return (
    <div
      className={cn(
        "overflow-hidden border-y py-4",
        tone === "ink" ? "border-ink bg-ink text-paper" : "border-line bg-background text-foreground",
      )}
    >
      <p className="sr-only">{items.join(". ")}</p>
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <p key={copy} aria-hidden="true" className="pr-8 font-label text-sm tracking-wide">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
