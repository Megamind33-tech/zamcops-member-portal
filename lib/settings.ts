import { prisma } from "@/lib/db";
import { PARAM_DEFAULTS } from "@/lib/parameters";

export async function getSetting<T extends Record<string, unknown>>(key: string, fallback: T): Promise<T> {
  const row = await prisma.adminSetting.findUnique({ where: { key } });
  return { ...fallback, ...((row?.value as Record<string, unknown>) ?? {}) } as T;
}

export async function putSetting(key: string, value: Record<string, unknown>): Promise<void> {
  await prisma.adminSetting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });
}

// WIPO Connect Parameters, with the values staff have saved over WIPO's defaults.
export const getParameters = () => getSetting("parameters", PARAM_DEFAULTS as Record<string, unknown>);

export type Connection = { baseUrl: string; username: string; secret: string };
export type TechnicalSettings = { shared: Connection; ipi: Connection; iswc: Connection; openIpn: Connection; workValidation: string };

// Base URLs and user names are the ones WIPO Connect has for ZAMCOPS; the
// keys are never stored here until staff type them in.
export const TECH_DEFAULTS: TechnicalSettings = {
  shared: { baseUrl: "https://backend.wipoconnect-shared.copyright.prd.web1.wipo.int/wipo-connect-shared-integration", username: "zamcops", secret: "" },
  ipi: { baseUrl: "https://api.wipoconnect.copyright.prd.web1.wipo.int/api/interestedparty", username: "zamcops", secret: "" },
  iswc: { baseUrl: "https://api.wipoconnect.copyright.prd.web1.wipo.int/api/work", username: "zamcops", secret: "" },
  openIpn: { baseUrl: "", username: "admin", secret: "" },
  workValidation: "{code:1}",
};
