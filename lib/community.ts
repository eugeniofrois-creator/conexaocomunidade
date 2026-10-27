import { env } from 'cloudflare:workers';
import { z } from 'zod';
export function database(): D1Database { const db=(env as unknown as {DB?:D1Database}).DB; if(!db)throw new Error('Database unavailable'); return db; }
export function bucket(): R2Bucket {const b=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!b)throw new Error('Bucket unavailable');return b;}
export const profileSchema=z.object({name:z.string().trim().min(2).max(100),neighborhood:z.string().trim().min(2).max(120)});
export const entrySchema=z.object({kind:z.enum(['service','place','problem']),title:z.string().trim().min(3).max(120),category:z.string().trim().min(2).max(50),description:z.string().trim().min(10).max(2000),address:z.string().trim().min(3).max(180),hours:z.string().trim().max(200),contact:z.string().trim().max(100),products:z.string().trim().max(1000).default(''),gallery:z.array(z.string().uuid()).max(6).default([]),lat:z.number().min(-90).max(90).nullable(),lng:z.number().min(-180).max(180).nullable(),photo:z.string().uuid().nullable()}).refine(v=>(v.lat===null)===(v.lng===null),'Informe latitude e longitude juntas.');
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
