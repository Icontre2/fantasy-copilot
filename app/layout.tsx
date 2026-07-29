import type { Metadata } from "next";
import "./globals.css";
import "./laliga-mobile-fix.css";

export const metadata: Metadata = {
  title: "Fantasy Copilot — Decide mejor. Suma más.",
  description:
    "Asistente móvil para tomar mejores decisiones de plantilla y mercado en LALIGA Fantasy.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
