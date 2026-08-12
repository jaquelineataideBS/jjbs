import type { Metadata } from "next";
import "./globals.css";
import PwaInstallInvitation from "./pwa-install-invitation";
import { PublicSettingsProvider } from "./public-settings";
import { getPublicSettings } from "../lib/public-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const description =
    settings.homepageDescription ||
    `${settings.salonName}: beleza, cuidado e transformação em cada detalhe.`;
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ??
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://127.0.0.1:3030"),
    ),
    applicationName: settings.salonName,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/pwa-icon-192.png", apple: "/apple-touch-icon.png" },
    openGraph: {
      title: settings.salonName,
      description,
      type: "website",
      locale: "pt_BR",
      images: [settings.bannerImageUrl || "/proprietaria-jaqueline-studio.png"],
    },
    robots: { index: true, follow: true },
    title: `${settings.salonName} | Beleza com intenção`,
    description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: settings.salonName,
    image: settings.bannerImageUrl || "/proprietaria-jaqueline-studio.png",
    address: settings.address || undefined,
    telephone: settings.whatsapp || undefined,
    sameAs: settings.instagram ? [settings.instagram] : undefined,
    priceRange: "$$",
  };
  return (
    <html lang="pt-BR">
      <body>
        <PublicSettingsProvider initial={settings}>
          {children}
          <PwaInstallInvitation />
        </PublicSettingsProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
