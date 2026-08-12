import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { salonSettings } from "../db/schema";

export type PublicSettings = {
  salonName: string;
  logoUrl: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  cancellationHours: number;
  depositPercent: number;
  toleranceMinutes: number;
  rescheduleAllowed: boolean;
  cancellationPolicy: string;
  privacyPolicy: string;
  homepageHeadline: string | null;
  homepageDescription: string | null;
  bannerImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
};

export const defaultPublicSettings: PublicSettings = {
  salonName: "Jaqueline Justino Beauty Studio",
  logoUrl: null,
  address: null,
  whatsapp: null,
  instagram: null,
  cancellationHours: 24,
  depositPercent: 0,
  toleranceMinutes: 15,
  rescheduleAllowed: true,
  cancellationPolicy:
    "Cancelamentos e reagendamentos devem ser solicitados com pelo menos 24 horas de antecedência.",
  privacyPolicy:
    "Seus dados são utilizados apenas para atendimento, agendamento e comunicação autorizada com o studio.",
  homepageHeadline: null,
  homepageDescription: null,
  bannerImageUrl: null,
  primaryColor: "#0B0B0B",
  accentColor: "#D4AF37",
};

export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const db = await getDb();
    const [settings] = await db
      .select({
        salonName: salonSettings.salonName,
        logoUrl: salonSettings.logoUrl,
        address: salonSettings.address,
        whatsapp: salonSettings.whatsapp,
        instagram: salonSettings.instagram,
        cancellationHours: salonSettings.cancellationHours,
        depositPercent: salonSettings.depositPercent,
      toleranceMinutes: salonSettings.toleranceMinutes,
      rescheduleAllowed: salonSettings.rescheduleAllowed,
        cancellationPolicy: salonSettings.cancellationPolicy,
        privacyPolicy: salonSettings.privacyPolicy,
        homepageHeadline: salonSettings.homepageHeadline,
        homepageDescription: salonSettings.homepageDescription,
        bannerImageUrl: salonSettings.bannerImageUrl,
        primaryColor: salonSettings.primaryColor,
        accentColor: salonSettings.accentColor,
      })
      .from(salonSettings)
      .where(eq(salonSettings.id, "studio"))
      .limit(1);
    return { ...defaultPublicSettings, ...(settings ?? {}) };
  } catch {
    return defaultPublicSettings;
  }
}
