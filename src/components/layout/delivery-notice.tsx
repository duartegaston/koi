import { deliveriesPausedNotice } from "@/lib/site";

export function DeliveryNotice() {
  return (
    <p role="status" className="bg-ink px-6 py-3 text-center font-label text-sm leading-snug text-paper">
      {deliveriesPausedNotice}
    </p>
  );
}
