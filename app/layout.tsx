import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jaqueline Beauty Studio | Jaqueline Justino | Beleza com intenção",
  description: "O Jaqueline Justino Beauty Studio, em Fortaleza, une cuidado, técnica e um olhar que enxerga você.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
