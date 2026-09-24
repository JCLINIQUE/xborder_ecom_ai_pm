"use client";
import { useRef, useState } from "react";
import { ImagePlus, Scan, Hand, Minus, Plus, Download, MousePointer2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/ops/workspace-context";
import { normalizedRegion, type ImageRegion } from "@/lib/ops/image-canvas";
import { download } from "@/lib/ops/export";
import { OperationFeedback, useInteraction, useOperation } from "./shared";

export function CoCreation() {
  const {w,ops,update}=useInteraction(),op=useOperation();
  const [fileId,setFileId]=useState(""),[zoom,setZoom]=useState(1),[tool,setTool]=useState<"select"|"hand">("select"),[region,setRegion]=useState<ImageRegion|null>(null),[instruction,setInstruction]=useState(""),[feedback,setFeedback]=useState(""),[imageError,setImageError]=useState(false);
  const input=useRef<HTMLInputElement>(null),stage=useRef<HTMLDivElement>(null),start=useRef<{x:number;y:number}|null>(null),pan=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const canvas=w.interaction.canvas;
  const assets=[...canvas.assets,...w.sources.filter(s=>s.kind==="image"&&s.fileId&&!canvas.assets.some(a=>a.fileId===s.fileId)).map(s=>({fileId:s.fileId!,name:s.name,width:760,height:760}))];
  const active=assets.find(a=>a.fileId===fileId)||assets[0];
  const notes=canvas.requests.filter(r=>r.fileId===active?.fileId);
  function choose(id:string){setFileId(id);setRegion(null);setInstruction("");setImageError(false);setFeedback("");}
  async function upload(file:File,signal:AbortSignal){
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>10*1024*1024)throw new Error("请选择 10 MB 以内的 PNG、JPG 或 WebP 图片。");
    if(assets.length>=20)throw new Error("当前画布最多保留 20 张图片。");
    const bitmap=await createImageBitmap(file),width=bitmap.width,height=bitmap.height;bitmap.close();
    if(width*height>40000000)throw new Error("图片分辨率过高，请缩小至 4000 万像素以内。");
    await ops.flush();signal.throwIfAborted();
    const data=new FormData();data.set("file",file);data.set("workspaceId",w.id);
    const result=await apiRequest<{fileId:string}>("/api/files",{method:"POST",body:data,signal});signal.throwIfAborted();
    update(l=>({...l,canvas:{...l.canvas,assets:l.canvas.assets.some(a=>a.fileId===result.fileId)?l.canvas.assets:[...l.canvas.assets,{fileId:result.fileId,name:file.name.slice(0,200),width,height}]}}));
    await ops.flush();choose(result.fileId);
  }
  function point(e:React.PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
  function saveNote(){if(!active||!instruction.trim())return;if(canvas.requests.length>=30){setFeedback("已达到 30 条修改要求，请先删除不需要的记录。");return;}update(l=>({...l,canvas:{...l.canvas,requests:[...l.canvas.requests,{id:crypto.randomUUID(),fileId:active.fileId,region,instruction:instruction.trim(),createdAt:new Date().toISOString()}]}}));void ops.flush().then(()=>setFeedback("修改要求已保存，原图未改变。")).catch(ops.notifyError);}
  function exportNotes(){download("图片修改清单.md",["# 图片修改清单",...canvas.requests.map((r,i)=>`\n## ${i+1}. ${assets.find(a=>a.fileId===r.fileId)?.name||"图片"}\n范围：${r.region?`从左 ${Math.round(r.region.x*100)}%、从上 ${Math.round(r.region.y*100)}%；宽 ${Math.round(r.region.width*100)}%、高 ${Math.round(r.region.height*100)}%`:"整张图片"}\n要求：${r.instruction}\n状态：待接入图片编辑模型`)].join("\n"),"text/markdown;charset=utf-8");}
  return <div className="visual-studio"><header className="visual-toolbar"><div><strong>Design canvas</strong><span>{active?.name||"新的作品"}</span></div><div><Button variant="outline" size="sm" onClick={()=>input.current?.click()} disabled={op.working}><ImagePlus size={15}/>添加图片</Button><Button variant="outline" size="sm" disabled={!canvas.requests.length} onClick={exportNotes}><Download size={14}/>下载修改清单</Button></div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="上传共创图片" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void op.run(signal=>upload(file,signal));e.currentTarget.value="";}}/></header>
    <div className="visual-layout"><section className="visual-canvas-area"><div className="visual-tools"><button aria-label="框选区域" title="框选区域" data-active={tool==="select"} onClick={()=>setTool("select")}><Scan size={20}/></button><button aria-label="平移画布" title="平移画布" data-active={tool==="hand"} onClick={()=>setTool("hand")}><Hand size={20}/></button><button aria-label="添加图片" title="添加图片" onClick={()=>input.current?.click()}><ImagePlus size={20}/></button></div>
      <div ref={stage} className="visual-stage" data-tool={tool} onPointerDown={e=>{if(tool!=="hand")return;const el=e.currentTarget;pan.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop};el.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const p=pan.current;if(p){e.currentTarget.scrollLeft=p.left-(e.clientX-p.x);e.currentTarget.scrollTop=p.top-(e.clientY-p.y);}}} onPointerUp={()=>{pan.current=null;}} onPointerCancel={()=>{pan.current=null;}}>
        {active?<div className="visual-artboard-space"><div className="visual-artboard-label">{active.name}<span>原图</span></div><div className="visual-image" style={{width:Math.min(760,active.width)*zoom}} onPointerDown={e=>{if(tool!=="select"||imageError)return;e.stopPropagation();start.current=point(e);setRegion(null);setFeedback("");e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(start.current)setRegion(normalizedRegion(start.current,point(e)));}} onPointerUp={e=>{if(start.current){setRegion(normalizedRegion(start.current,point(e)));start.current=null;}}} onPointerCancel={()=>{start.current=null;setRegion(null);}}>
          {/* Authenticated raster-only preview; original files stay unchanged. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${encodeURIComponent(active.fileId)}?preview=1`} alt={active.name} draggable={false} onError={()=>setImageError(true)}/>
          {region&&<div className="visual-region" style={{left:`${region.x*100}%`,top:`${region.y*100}%`,width:`${region.width*100}%`,height:`${region.height*100}%`}}><span>选区</span><i/><i/><i/><i/></div>}
          {imageError&&<div className="visual-image-error">图片无法预览，请重新上传 PNG、JPG 或 WebP 文件。</div>}
        </div><p className="visual-artboard-hint">在图片上拖动，框选想修改的区域</p></div>:<div className="visual-empty"><MousePointer2 size={32}/><h2>从一张图片开始</h2><p>上传商品图，框选要调整的地方，留下具体修改要求。</p><Button onClick={()=>input.current?.click()}><ImagePlus size={16}/>上传图片</Button><small>PNG / JPG / WebP · 10 MB 以内</small></div>}
      </div><div className="visual-zoom"><button aria-label="缩小图片" onClick={()=>setZoom(z=>Math.max(.3,z-.1))}><Minus size={15}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="放大图片" onClick={()=>setZoom(z=>Math.min(2,z+.1))}><Plus size={15}/></button><button onClick={()=>setZoom(active?Math.min(1,Math.max(.3,((stage.current?.clientWidth||900)-160)/Math.min(760,active.width))):1)}>适应</button></div>
      {assets.length>0&&<div className="visual-filmstrip">{assets.map(a=><button key={a.fileId} data-active={active.fileId===a.fileId} onClick={()=>choose(a.fileId)}>{a.name}</button>)}</div>}
    </section><aside className="visual-chat"><div className="visual-chat-heading"><span>✳</span><strong>一起修改这张图</strong></div><p>选中一个区域，告诉我你希望它怎么变。</p><div className="visual-current-target"><Scan size={15}/>{region?`选区 · 宽 ${Math.round(region.width*100)}% × 高 ${Math.round(region.height*100)}%`:"当前范围：整张图片"}{region&&<button aria-label="取消图片选区" onClick={()=>setRegion(null)}><X size={14}/></button>}</div>
      <div className="visual-note-list">{notes.map((n,i)=><div key={n.id}><button onClick={()=>{setRegion(n.region);setInstruction(n.instruction);}}><small>{n.region?"区域修改":"整图修改"} / {i+1}</small><p>{n.instruction}</p><span>已保存 · 待图片模型接入</span></button><button className="visual-remove-note" aria-label={`删除修改要求${i+1}`} onClick={()=>update(l=>({...l,canvas:{...l.canvas,requests:l.canvas.requests.filter(r=>r.id!==n.id)}}))}><X size={12}/></button></div>)}</div>
      <div className="visual-compose"><Textarea aria-label="图片修改要求" value={instruction} maxLength={4000} onChange={e=>setInstruction(e.target.value)} placeholder="例如：把框选的背景改成浅灰色，保留商品形状和阴影…"/><Button disabled={!active||!instruction.trim()||op.working||imageError} onClick={saveNote}>保存修改要求 ↑</Button></div>
      {feedback&&<p role="status">{feedback}</p>}<OperationFeedback operation={op}/><div className="visual-model-status"><span/>图片编辑模型待接入<br/><small>当前保存图片、选区和要求，不会生成或修改图片。</small></div>
    </aside></div></div>;
}
