import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LigaLab — Tu liga, bajo control.",
  description:
    "Tu liga, patrimonio, mercado y onces probables en una experiencia móvil clara.",
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
