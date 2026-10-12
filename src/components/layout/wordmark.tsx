import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-display text-3xl leading-none italic ${className}`}>
      Koi
    </Link>
  );
}
