import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jaqueline Beauty Studio | Beleza com intenção",
  description: "Um studio de beleza em Fortaleza para viver o cuidado com calma, técnica e um olhar que enxerga você.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
