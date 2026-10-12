import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { default: "Administración", template: "%s | Administración" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
