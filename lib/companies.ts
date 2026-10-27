import { env } from "cloudflare:workers";
import { z } from "zod";
export function masterKey() {
  const key = (env as unknown as { COMPANY_MASTER_KEY_V1?: string }).COMPANY_MASTER_KEY_V1;
  if (!key) throw Error("Encryption unavailable");
  return key;
}
export const companySchema = z
  .object({
    listingType: z.enum(["business", "autonomous", "community-place"]).default("business"),
    name: z.string().trim().min(2).max(120),
    provider: z.string().trim().max(100).default(""),
    facade: z.string().uuid().nullable().default(null),
    services: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(120),
          price: z.number().finite().min(0).max(1000000).nullable().default(null),
          unit: z.string().trim().max(80),
        }),
      )
      .max(30)
      .default([]),
    slogan: z.string().trim().max(160),
    category: z.string().trim().max(80),
    products: z.string().trim().max(1500),
    description: z.string().trim().max(2000),
    address: z.string().trim().max(250),
    hours: z.string().trim().max(200),
    contact: z.string().trim().max(120),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    logo: z.string().uuid().nullable(),
    gallery: z.array(z.string().uuid()).max(10),
    privateNote: z.string().trim().max(1000),
    published: z.boolean(),
  })
  .refine(
    (v) => v.gallery.length + (v.facade ? 1 : 0) <= 10,
    "Use no máximo 10 fotos, incluindo a fachada.",
  )
  .refine(
    (v) => new Set(v.gallery).size === v.gallery.length && !v.gallery.includes(v.facade || ""),
    "Não repita fotos na galeria ou na fachada.",
  )
  .refine((v) => (v.lat === null) === (v.lng === null), "Informe as duas coordenadas.");
export function publicCompany(id: string, data: any, mine: boolean) {
  const { privateNote, published, ...publicData } = data;
  if (!mine)
    publicData.services = (publicData.services || []).map(({ name, unit }: any) => ({
      name,
      unit,
    }));
  return { id, ...publicData, mine, ...(mine ? { privateNote, published } : {}) };
}
