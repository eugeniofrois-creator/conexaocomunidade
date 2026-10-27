import { decode64 } from "@/lib/vault";
import { imageType } from "@/lib/images";
import { z } from "zod";
import { getTestUser } from "@/lib/test-auth";
import { json, sameOrigin } from "@/lib/community";
import { readJsonBody } from "@/lib/request-body";
import { read, list, write, ready, failed, uuid, Conflict } from "@/lib/json-store";
import { digest, consumeAttempt } from "@/lib/local-auth";
const schema = z.object({
  images: z
    .array(
      z.object({
        type: z.enum(["image/jpeg", "image/png", "image/webp"]),
        body: z.string().max(800000),
      }),
    )
    .max(3)
    .default([]),
  anonymous: z.boolean(),
  name: z.string().trim().max(100).default(""),
  contact: z.string().trim().max(150).default(""),
  title: z.string().trim().min(3).max(120),
  address: z.string().trim().min(3).max(250),
  description: z.string().trim().min(10).max(3000),
  location: z
    .object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
      accuracy: z.number().finite().min(0).max(1000000),
      capturedAt: z.number().finite().positive(),
    })
    .nullable()
    .optional(),
});
async function admin() {
  const u = await getTestUser();
  return u && ["owner", "company-admin"].includes(u.role) ? u : null;
}
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
    const b = await readJsonBody(req, 2500000);
    const v = schema.safeParse(b);
    if (!v.success)
      return json(
        { error: "Informe assunto, local e uma descrição de pelo menos 10 caracteres." },
        400,
      );
    const d = v.data;
    for (const photo of d.images) {
      let bytes: Uint8Array;
      try {
        bytes = decode64(photo.body);
      } catch {
        return json({ error: "Foto inválida." }, 400);
      }
      if (bytes.length > 600000 || imageType(bytes) !== photo.type)
        return json({ error: "Foto inválida ou muito grande." }, 400);
    }
    if (!d.anonymous && d.name.length < 2)
      return json({ error: "Informe seu nome ou escolha envio anônimo." }, 400);
    await ready();
    if (
      !(await consumeAttempt(
        await digest("report:" + (req.headers.get("cf-connecting-ip") || "unknown")),
        5,
      ))
    )
      return json({ error: "Muitos envios. Aguarde 15 minutos para relatar novamente." }, 429);
    const id = crypto.randomUUID();
    await write(
      "reports",
      id,
      {
        ...d,
        name: d.anonymous ? "" : d.name,
        contact: d.anonymous ? "" : d.contact,
        status: "Aguardando aprovação",
        approval: "pending",
        created_at: Date.now(),
        read_at: null,
      },
      null,
    );
    return json({ ok: true, id }, 201);
  } catch (e) {
    return failed(e, "Não foi possível enviar. A descrição foi preservada.");
  }
}
export async function GET(req: Request) {
  try {
    const viewer = await getTestUser();
    if (!viewer || !["owner", "company-admin", "coordination"].includes(viewer.role)) return json({error:"Acesso restrito."},403);
    await ready();
    const url = new URL(req.url);
    if (url.searchParams.has("id")) {
      const id = url.searchParams.get("id"),
        index = Number(url.searchParams.get("photo"));
      if (!uuid(id) || !Number.isInteger(index) || index < 0 || index > 2)
        return json({ error: "Foto inválida." }, 400);
      const row = await read("reports", id);
      const photo = row?.data.images?.[index];
      if (!photo) return json({ error: "Foto não encontrada." }, 404);
      return new Response(decode64(photo.body) as unknown as BodyInit, {
        headers: {
          "Content-Type": photo.type,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const rows = (await list("reports")).sort((a, b) => b.data.created_at - a.data.created_at);
    return json({
      readOnly: false,
      unread: rows.filter((r) => !r.data.read_at).length,
      reports: rows.map((r) => {
        const { images, ...data } = r.data;
        return { id: r.id, ...data, photoCount: images?.length || 0, revision: r.revision };
      }),
    });
  } catch (e) {
    return failed(e, "Relatos indisponíveis.");
  }
}
export async function PATCH(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
    const reviewer = await getTestUser();
    if (!reviewer || !["owner", "company-admin", "coordination"].includes(reviewer.role)) return json({error:"Acesso restrito à equipe."},403);
    const b = await readJsonBody(req, 1000);
    if (
      !uuid(b.id) ||
      !["Lido", "Em acompanhamento", "Resolvido", "Rejeitado", "Aprovado"].includes(b.status)
    )
      return json({ error: "Dados inválidos." }, 400);
    await ready();
    const row = await read("reports", b.id);
    if (!row) return json({ error: "Relato não encontrado." }, 404);
    if (row.revision !== b.revision)
      throw new Conflict("O relato mudou. Atualize a caixa de entrada.");
    await write(
      "reports",
      b.id,
      {
        ...row.data,
        status: b.status,
        reviewed_by: reviewer.userId,
        ...(["Aprovado", "Rejeitado"].includes(b.status)
          ? { approval: b.status === "Aprovado" ? "approved" : "rejected", reviewed_at: Date.now() }
          : {}),
        read_at: row.data.read_at || Date.now(),
      },
      row.revision,
    );
    return json({ ok: true });
  } catch (e) {
    return failed(e, "Não foi possível atualizar o relato.");
  }
}
