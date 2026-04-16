import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CutList Pro",
  description: "Cotizaciones y despiece para taller",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
