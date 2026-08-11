import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://127.0.0.1:3030")),
  applicationName: "Jaqueline Beauty Studio",
  manifest: "/manifest.webmanifest",
  openGraph: { title: "Jaqueline Justino Beauty Studio", description: "Beleza, cuidado e transformação em cada detalhe.", type: "website", locale: "pt_BR", images: ["/proprietaria-jaqueline-studio.png"] },
  robots: { index: true, follow: true },
  title: "Jaqueline Beauty Studio | Jaqueline Justino | Beleza com intenção",
  description: "O Jaqueline Justino Beauty Studio, em Fortaleza, une cuidado, técnica e um olhar que enxerga você.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BeautySalon", name: "Jaqueline Justino Beauty Studio", image: "/proprietaria-jaqueline-studio.png", areaServed: "Fortaleza, CE", priceRange: "$$" }) }} /></body>
    </html>
  );
}
