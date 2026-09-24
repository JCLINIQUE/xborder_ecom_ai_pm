"use client";
import { useRef, useState } from "react";
import { Plus, Play, Trash2, ZoomIn, ZoomOut, Unplug, GripVertical, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Choice } from "../primitives";
import { blankGraph, graphNodeSchema, nodeKinds, validateGraph, type GraphNode, type WorkflowGraph } from "@/lib/ops/workflow-graph";
import { stepSchema, type InteractionRun } from "@/lib/ops/interactions";
import { useInteraction } from "./shared";
import { RunView, useExecution } from "./execution";

export function Workflow() {
  const ex=useExecution("workflow"), { w,update,op,start,run,ops }=ex;
  const { consent }=useInteraction();
  const graph=w.interaction.workflow.graph || blankGraph();
  const [selected,setSelected]=useState("start"), [zoom,setZoom]=useState(.85), [error,setError]=useState(""), [trace,setTrace]=useState(false);
  const [connecting,setConnecting]=useState<{from:string;port:"next"|"yes"|"no"}|null>(null);
  const board=useRef<HTMLDivElement>(null), drag=useRef<{id:string;x:number;y:number;cx:number;cy:number}|null>(null);
  const active=graph.nodes.find(n=>n.id===selected);
  function save(next:WorkflowGraph) { update(l=>({...l,workflow:{...l.workflow,graph:next}})); setError(""); }
  function patch(id:string,p:Partial<GraphNode>) { save({...graph,nodes:graph.nodes.map(n=>n.id===id?{...n,...p}:n)}); }
  function add(kind:GraphNode["kind"],x?:number,y?:number) {
    if(op.working) return;
    if(graph.nodes.length>=16) { setError("一个流程最多 16 个节点。"); return; }
    const spec=nodeKinds.find(n=>n.kind===kind)!;
    const node=graphNodeSchema.parse({id:crypto.randomUUID(),kind,title:spec.title,x:Math.max(0,Math.min(4000,x??(board.current?.scrollLeft||0)/zoom+330)),y:Math.max(0,Math.min(2500,y??100+graph.nodes.length*65)),instruction:kind==="review"?"检查上游正文中的事实、来源和缺失信息，输出简短核对清单。":""});
    save({...graph,nodes:[...graph.nodes,node]}); setSelected(node.id);
  }
  function connect(to:string, pending=connecting) {
    if(!pending || op.working) return;
    if(pending.from===to || graph.nodes.find(n=>n.id===to)?.kind==="source") { setError("这个输入端口不能连接，请选择其他节点。"); return; }
    const edges=[...graph.edges.filter(e=>!(e.from===pending.from && e.port===pending.port)),{id:crypto.randomUUID(),from:pending.from,to,port:pending.port}];
    save({...graph,edges}); setConnecting(null);
  }
  function execute() {
    const issues=validateGraph(graph); if(issues.length) { setError(issues.join("\n")); return; }
    const source=graph.nodes.find(n=>n.kind==="source")!.source;
    if(!w.sources.some(s=>s.confirmed && (source!=="mcp" || s.mcp))) { setError("没有符合条件的已确认资料，请先从顶部「资料」导入。"); return; }
    const next:InteractionRun={id:crypto.randomUUID(),source,retryOnce:w.interaction.workflow.onError==="retry-once",goal:"按照用户编排的节点与连接执行。",steps:graph.nodes.map(n=>stepSchema.parse({...n,id:n.id})),graph:structuredClone(graph),status:"planned",artifact:"",review:"",base:w.report,dataVersion:w.dataVersion,error:""};
    setTrace(true); void start(next,next.retryOnce);
  }
  return <div className="flow-studio">
    <div className="flow-toolbar"><div><strong>未命名工作流</strong><span>{graph.nodes.length} 个节点 · {graph.edges.length} 条连接</span></div><div><Button variant="outline" size="sm" onClick={()=>setTrace(!trace)}>运行记录{run?" · 1":""}</Button><Button disabled={!consent||ops.busy||op.working||!!ops.connectionIssue} onClick={execute}><Play size={14}/>试运行</Button></div></div>
    <div className="flow-layout">
      <aside className="flow-palette"><h3><Plus size={16}/>添加节点</h3><p>拖到画布，或点击添加</p>{nodeKinds.map(n=><button key={n.kind} draggable={!op.working} disabled={op.working} aria-label={`添加${n.title}节点`} onDragStart={e=>e.dataTransfer.setData("application/day09-node",n.kind)} onClick={()=>add(n.kind)}><span style={{background:n.color}}>{n.icon}</span><div><strong>{n.title}</strong><small>{n.description}</small></div></button>)}<div className="flow-palette-note">连接右侧输出点与左侧输入点。条件节点分别连接「满足」和「不满足」出口。</div></aside>
      <section className="flow-center"><div className="flow-canvas" ref={board} aria-label="流程画布" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}} onDrop={e=>{e.preventDefault();const kind=e.dataTransfer.getData("application/day09-node");if(!nodeKinds.some(n=>n.kind===kind))return;const rect=e.currentTarget.getBoundingClientRect();add(kind as GraphNode["kind"],(e.clientX-rect.left+e.currentTarget.scrollLeft)/zoom,(e.clientY-rect.top+e.currentTarget.scrollTop)/zoom);}}>
        <div className="flow-world" style={{width:Math.max(1500,...graph.nodes.map(n=>n.x+340))*zoom,height:Math.max(850,...graph.nodes.map(n=>n.y+240))*zoom}}><div style={{position:"absolute",width:"100%",height:"100%",transform:`scale(${zoom})`,transformOrigin:"0 0"}}>
          <svg className="flow-edges" width="5000" height="3000" aria-hidden="true"><defs><marker id="flow-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#a59ad9"/></marker></defs>{graph.edges.map(edge=>{const from=graph.nodes.find(n=>n.id===edge.from),to=graph.nodes.find(n=>n.id===edge.to);if(!from||!to)return null;const x=from.x+220,y=from.y+(edge.port==="no"?100:62),tx=to.x,ty=to.y+62;return <path key={edge.id} d={`M ${x} ${y} C ${x+80} ${y}, ${tx-80} ${ty}, ${tx} ${ty}`} fill="none" stroke="#a59ad9" strokeWidth="2" markerEnd="url(#flow-arrow)"/>;})}</svg>
          {graph.nodes.map(node=>{const spec=nodeKinds.find(n=>n.kind===node.kind)!;const status=run?.graph?.nodes.find(n=>n.id===node.id)&&run.steps.find(s=>s.id===node.id)?.status;return <article key={node.id} className="flow-node" data-selected={selected===node.id} data-state={status} style={{left:node.x,top:node.y}} onClick={()=>setSelected(node.id)}>
            <div className="flow-node-grip" role="button" tabIndex={0} aria-label={`移动${node.title}节点`} onKeyDown={e=>{const delta:{[key:string]:[number,number]}={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(delta[e.key]&&!op.working){e.preventDefault();patch(node.id,{x:Math.max(0,Math.min(4000,node.x+delta[e.key][0])),y:Math.max(0,Math.min(2500,node.y+delta[e.key][1]))});}}} onPointerDown={e=>{if(op.working)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:node.id,x:node.x,y:node.y,cx:e.clientX,cy:e.clientY};setSelected(node.id);}} onPointerMove={e=>{const d=drag.current;if(d?.id===node.id&&e.buttons)patch(node.id,{x:Math.max(0,Math.min(4000,d.x+(e.clientX-d.cx)/zoom)),y:Math.max(0,Math.min(2500,d.y+(e.clientY-d.cy)/zoom))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><span style={{background:spec.color}}>{spec.icon}</span><strong>{node.title}</strong><GripVertical size={14}/></div>
            <p>{node.kind==="source"?(node.source==="mcp"?"已导入 MCP 资料":"已确认资料"):node.kind==="condition"?(node.condition==="contains"?`包含「${node.value||"待填写"}」`:node.condition==="warnings"?"存在导入提醒":"上游正文不为空"):node.kind==="deliver"?"输出候选成果，人工验收":node.instruction||"点击配置指令"}</p>
            {node.kind!=="source"&&<button className="flow-port flow-port-in" data-node-input={node.id} aria-label={`连接到${node.title}`} disabled={op.working} onClick={e=>{e.stopPropagation();connect(node.id);}}/>}
            {(node.kind==="condition"?["yes","no"]:node.kind==="deliver"?[]:["next"]).map(port=><button key={port} className={`flow-port flow-port-out flow-port-${port}`} aria-label={`${node.title}${port==="yes"?"满足":port==="no"?"不满足":"输出"}端口`} disabled={op.working} onPointerDown={e=>{e.stopPropagation();setConnecting({from:node.id,port:port as "next"|"yes"|"no"});e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-node-input]")?.dataset.nodeInput;if(target)connect(target,{from:node.id,port:port as "next"|"yes"|"no"});}} onClick={e=>{e.stopPropagation();setConnecting({from:node.id,port:port as "next"|"yes"|"no"});}}>{port==="next"?null:<span>{port==="yes"?"满足":"不满足"}</span>}</button>)}
            {status&&<small className="flow-node-status">{{done:"完成",running:op.working?"运行中":"已中断",error:"失败",pending:"待执行",skipped:"未经过",interrupted:"已停止"}[status]}</small>}
          </article>;})}
        </div></div>
      </div><div className="flow-canvas-controls"><Button variant="outline" size="sm" onClick={()=>setZoom(z=>Math.max(.45,z-.1))} aria-label="缩小画布"><ZoomOut size={14}/></Button><span>{Math.round(zoom*100)}%</span><Button variant="outline" size="sm" onClick={()=>setZoom(z=>Math.min(1.4,z+.1))} aria-label="放大画布"><ZoomIn size={14}/></Button>{connecting&&<Button variant="outline" size="sm" onClick={()=>setConnecting(null)}>正在连线 · 取消</Button>}</div>{error&&<p className="flow-validation" role="alert">{error}</p>}</section>
      <aside className="flow-inspector"><h3><Settings2 size={16}/>节点配置</h3>{active?<><label>节点名称<Input aria-label="节点名称" maxLength={100} value={active.title} disabled={op.working} onChange={e=>patch(active.id,{title:e.target.value||"未命名节点"})}/></label>
        {active.kind==="source"&&<><label>数据来源<Choice label="节点数据来源" value={active.source} disabled={op.working} onChange={v=>patch(active.id,{source:v as GraphNode["source"]})} options={[{value:"confirmed",label:"全部已确认资料"},{value:"mcp",label:"已导入的 MCP 资料"}]}/></label><p>外部取数需先在资料页连接与导入。</p></>}
        {["write","review"].includes(active.kind)&&<label>模型指令<Textarea aria-label="节点模型指令" maxLength={4000} value={active.instruction} disabled={op.working} onChange={e=>patch(active.id,{instruction:e.target.value})} placeholder="上游正文将作为输入，描述本节点要做的处理。"/></label>}
        {active.kind==="condition"&&<><label>判断条件<Choice label="节点判断条件" value={active.condition} disabled={op.working} onChange={v=>patch(active.id,{condition:v as GraphNode["condition"]})} options={[{value:"nonempty",label:"上游正文不为空"},{value:"contains",label:"上游正文包含指定文字"},{value:"warnings",label:"资料存在导入提醒"}]}/></label>{active.condition==="contains"&&<Input aria-label="条件匹配文字" maxLength={200} value={active.value} disabled={op.working} onChange={e=>patch(active.id,{value:e.target.value})}/>}</>}
        {(active.kind==="condition"?["yes","no"]:active.kind==="deliver"?[]:["next"]).map(port=><label key={port}>{port==="yes"?"满足时连接":port==="no"?"不满足时连接":"下一步"}<Choice label={`连接${port}`} disabled={op.working} value={graph.edges.find(e=>e.from===active.id&&e.port===port)?.to||""} onChange={to=>to?connect(to,{from:active.id,port:port as "next"|"yes"|"no"}):save({...graph,edges:graph.edges.filter(e=>!(e.from===active.id&&e.port===port))})} options={[{value:"",label:"未连接"},...graph.nodes.filter(n=>n.id!==active.id&&n.kind!=="source").map(n=>({value:n.id,label:`${n.title} · ${n.id.slice(0,4)}`}))]}/></label>)}
        <div className="flow-inspector-actions"><Button variant="outline" size="sm" disabled={op.working} onClick={()=>save({...graph,edges:graph.edges.filter(e=>e.from!==active.id&&e.to!==active.id)})}><Unplug size={14}/>断开连接</Button><Button variant="outline" size="sm" disabled={op.working} onClick={()=>{save({nodes:graph.nodes.filter(n=>n.id!==active.id),edges:graph.edges.filter(e=>e.from!==active.id&&e.to!==active.id)});setSelected("");}}><Trash2 size={14}/>删除节点</Button></div></>:<p>点击画布上的节点进行配置。</p>}
        <hr/><label>运行出错时<Choice label="流程出错处理" value={w.interaction.workflow.onError} disabled={op.working} onChange={v=>update(l=>({...l,workflow:{...l.workflow,onError:v as "stop"|"retry-once"}}))} options={[{value:"stop",label:"停止，等待处理"},{value:"retry-once",label:"自动重试一次"}]}/></label><p>画布只在点击试运行后执行；离开页面会中止等待。</p>
      </aside>
    </div>
    {trace&&<section className="flow-run-drawer"><header><strong>本次运行 · 按运行时的连线快照执行</strong><Button variant="ghost" size="sm" onClick={()=>setTrace(false)}>收起</Button></header>{run?<RunView execution={ex}/>:<p>尚无运行记录。连接节点并点击试运行。</p>}</section>}
  </div>;
}
