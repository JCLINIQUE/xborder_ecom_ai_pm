import { z } from "zod";
export const imageRegionSchema=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)}).refine(r=>r.x+r.width<=1.00001&&r.y+r.height<=1.00001,"选区不能超出图片");
export type ImageRegion=z.infer<typeof imageRegionSchema>;
export const imageCanvasSchema=z.object({
  assets:z.array(z.object({fileId:z.string(),name:z.string().max(200),width:z.number().positive(),height:z.number().positive()})).max(20).default([]),
  requests:z.array(z.object({id:z.string(),fileId:z.string(),region:imageRegionSchema.nullable(),instruction:z.string().min(1).max(4000),createdAt:z.string()})).max(30).default([]),
}).default({});
export function normalizedRegion(a:{x:number;y:number},b:{x:number;y:number}):ImageRegion|null{
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));
  const x=Math.min(clamp(a.x),clamp(b.x)),y=Math.min(clamp(a.y),clamp(b.y));
  const width=Math.abs(clamp(a.x)-clamp(b.x)),height=Math.abs(clamp(a.y)-clamp(b.y));
  return width<.005||height<.005?null:{x,y,width,height};
}
