/* Handwriting layer - ported from microqbank (INK v2). Same mechanism: strokes are anchored to text, drawn on windowed canvases, kept in IndexedDB. Stylus or mouse draws; a finger always scrolls. */
/* ===== L. INK v2: stylus handwriting layer. Strokes are ANCHORED TO THE TEXT (they follow words when the layout reflows) and drawn on
   viewport-windowed canvases at (devicePixelRatio x pinch-zoom) resolution, so they stay crisp at any zoom. IndexedDB persistence. ===== */
(()=>{
const P={pen:'<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6a2 2 0 0 1-.9.5l-2.900.8a.5.5 0 0 1-.6-.6l.8-2.900a2 2 0 0 1 .5-.9z"/>',hl:'<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.600 4.600a2 2 0 0 1-2.800 0l-5.200-5.200a2 2 0 0 1 0-2.800L14 4"/>',eras:'<path d="m7 21-4.300-4.300c-1-1-1-2.500 0-3.400l9.600-9.600c1-1 2.500-1 3.400 0l5.600 5.600c1 1 1 2.500 0 3.400L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',lasso:'<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.300 14A6.800 6.800 0 0 1 2 10c0-4.400 4.500-8 10-8s10 3.600 10 8-4.500 8-10 8a12 12 0 0 1-5-1"/><circle cx="5" cy="16" r="2"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.500a5.500 5.500 0 0 1 0 11H11"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.500a5.500 5.500 0 0 0 0 11H13"/>',trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',more:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'},I=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+P[n]+'</svg>';
const INK={},H=[],R=[],DIRTY=new Set(),GEO={},PEN=['#171719','#241A24','#A65D45','#747A61','#B8A6AD','#E5DED2','#F2EBDD'],HLC=['#B8A6AD','#A65D45','#747A61','#E5DED2'];
let ink=false,cur=null,SEL=null,OFF=null,penT=0,penDown=false,swallow=false,db=null,MORE=false,raf=0,st,swr=0;
const DK=document.documentElement.getAttribute('data-theme')==='dark';
let U={tool:'pen',pc:DK?'#F2EBDD':'#171719',hc:'#B8A6AD',size:5,x:null,y:null};
try{Object.assign(U,JSON.parse(localStorage.getItem('psmink-ui')||'{}'))}catch(e){}
const uiSave=()=>{try{localStorage.setItem('psmink-ui',JSON.stringify(U))}catch(e){}},uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6),now=()=>performance.now();
/* ---- persistence: IndexedDB per question, localStorage fallback, flushed on hide ---- */
const dbp=new Promise(r=>{try{const q=indexedDB.open('psm-ink',1);q.onupgradeneeded=()=>q.result.createObjectStore('s');q.onsuccess=()=>{db=q.result;r()};q.onerror=q.onblocked=()=>r()}catch(e){r()}});
async function load(){await dbp;if(!db){try{return JSON.parse(localStorage.getItem('psmink')||'{}')}catch(e){return{}}}return new Promise(res=>{const o={};try{const c=db.transaction('s').objectStore('s').openCursor();c.onsuccess=()=>{const x=c.result;if(x){o[x.key]=x.value;x.continue()}else res(o)};c.onerror=()=>res(o)}catch(e){res(o)}})}
function flush(){clearTimeout(st);if(!DIRTY.size)return;if(db){try{const s=db.transaction('s','readwrite').objectStore('s');DIRTY.forEach(k=>INK[k]&&INK[k].length?s.put(INK[k],k):s.delete(k))}catch(e){}}else try{localStorage.setItem('psmink',JSON.stringify(INK))}catch(e){}DIRTY.clear()}
const persist=q=>{DIRTY.add(String(q));clearTimeout(st);st=setTimeout(flush,350)};
addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>document.hidden&&flush());
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
/* ---- import validation: accept only well-formed strokes (audit 1.6) ---- */
const isNum=v=>typeof v==='number'&&isFinite(v);
function okStroke(s){
  if(!s||typeof s!=='object'||Array.isArray(s))return false;
  if(typeof s.id!=='string'||(s.t!=='p'&&s.t!=='h')||typeof s.c!=='string'||!isNum(s.w)||!Array.isArray(s.p)||!s.p.every(isNum))return false;
  if(s.v===2)return Array.isArray(s.k)&&s.k.every(x=>typeof x==='string')&&s.p.length%6===0;
  return s.v===undefined&&s.p.length%3===0; /* legacy proportional stroke */}
function cleanInk(d){ /* -> {ink:{questionId:[strokes]},ok,skipped} or null when d is not an object */
  if(!d||typeof d!=='object'||Array.isArray(d))return null;
  const ink={};let ok=0,skipped=0;
  Object.keys(d).forEach(k=>{if(k==='__proto__'||k==='constructor'||k==='prototype'){skipped++;return}
    if(!Array.isArray(d[k])){skipped++;return}
    const g=d[k].filter(okStroke);skipped+=d[k].length-g.length;ok+=g.length;ink[k]=g});
  return{ink,ok,skipped}}
/* ---- helpers ---- */
const art=q=>document.querySelector('#main .inkc[data-id="'+q+'"]'),cssc=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#A65D45',color=t=>t==='h'?U.hc:U.pc;
const dseg=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=dx||dy?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy))):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy)};
/* geometry: the overlay occupies the card's PADDING box, so all card-space maths uses that same box (not the border box) */
const box=a=>{const r=a.getBoundingClientRect();return{left:r.left+a.clientLeft,top:r.top+a.clientTop,width:a.clientWidth||r.width,height:a.clientHeight||r.height}};
const unitPx=()=>parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
const vp=()=>{const v=window.visualViewport;return v?{x:v.offsetLeft,y:v.offsetTop,w:v.width,h:v.height,s:v.scale||1}:{x:0,y:0,w:innerWidth,h:innerHeight,s:1}};
let HLA=.5;const theme=()=>{HLA=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mbi-hla'))||.5};
const OPQ='pre,code,th,blockquote,.tag,.q-num,.btn,.readbox,.flagbtn,.pg';
function opaque(a){const b=box(a);return[...a.querySelectorAll(OPQ)].map(e=>{const r=e.getBoundingClientRect();return r.width&&r.height?[r.left-b.left,r.top-b.top,r.width,r.height]:null}).filter(Boolean)}
const clipTo=(x,rs)=>{x.save();x.beginPath();rs.forEach(r=>x.rect(r[0],r[1],r[2],r[3]));x.clip()};
/* ---- text anchoring ----
   Every stroke point is stored as: (block key, character offset in that block, dx, dy from that character's centre in root-font units).
   Block keys are class/tag paths (not DOM indices), so they survive collapsing/expanding, <mark> search highlights and card re-renders. */
const BLK='p,li,td,th,h1,h2,h3,h4,h5,h6,pre,blockquote,summary,dt,dd,figcaption,button,label,.q-num,.tag,.pg-dir,.pg-label,.pg-title,.btn,.hint,.ctx-line span,.q-pos',FLAG=/^(on|o|dn|c|open|active|sel)$/;
const sigC=e=>e.tagName+'.'+[...e.classList].filter(c=>!FLAG.test(c)).join('.');
function blkKey(a,e){const p=[];for(;e&&e!==a;e=e.parentElement){const s=sigC(e);let i=0;for(let x=e.previousElementSibling;x;x=x.previousElementSibling)if(sigC(x)===s)i++;p.push(s+'#'+i)}return p.reverse().join('>')}
function frags(a){const b=box(a),items=[],map=new Map(),blocks=new Map(),w=document.createTreeWalker(a,NodeFilter.SHOW_TEXT),rg=document.createRange();let n;
  while(n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('canvas,textarea,script,style'))continue;
    let o=p.closest(BLK);if(!o||o===a||!a.contains(o))o=a;
    let bi=blocks.get(o);if(!bi){bi={k:o===a?'':blkKey(a,o),off:0};blocks.set(o,bi)}
    const t=n.data;for(let i=0;i<t.length;i++){const ch=t.charCodeAt(i);if(ch<=32||ch===160)continue;rg.setStart(n,i);rg.setEnd(n,i+1);const r=rg.getClientRects()[0];if(!r||(!r.width&&!r.height))continue;
      const it={k:bi.k,o:bi.off+i,l:r.left-b.left,t:r.top-b.top,r:r.right-b.left,b:r.bottom-b.top};it.cx=(it.l+it.r)/2;it.cy=(it.t+it.b)/2;items.push(it);map.set(it.k+'|'+it.o,it)}
    bi.off+=t.length}
  return{items,map}}
function nearest(F,x,y){let best=null,bd=1e18;for(const it of F.items){const dx=x<it.l?it.l-x:x>it.r?x-it.r:0,dy=y<it.t?it.t-y:y>it.b?y-it.b:0,d=dx*dx+dy*dy+((x-it.cx)**2+(y-it.cy)**2)*1e-4;if(d<bd){bd=d;best=it}}return best}
const sigOf=(a,u)=>a.clientWidth+'x'+a.clientHeight+'@'+u+'#'+(a._mv|0);
function geo(a,q){const u=unitPx(),s=sigOf(a,u);let G=GEO[q];if(G&&G.a===a&&G.sig===s)return G;return GEO[q]={a,sig:s,u,W:a.clientWidth,H:a.clientHeight,_F:null,wm:new WeakMap()}}
const getF=G=>G._F||(G._F=frags(G.a)),inv=a=>{a._mv=(a._mv|0)+1};
const look=(G,k,o)=>{const m=getF(G).map;for(const d of[0,-1,1,-2,2]){const it=m.get(k+'|'+(o+d));if(it)return it}return null};
/* resolve a stroke to card-space runs. A run breaks where the text wrapped differently and the neighbouring anchors moved apart. */
function runsOf(G,s){let r=G.wm.get(s);if(r)return r;r=[];
  if(s.v===2){const p=s.p,u=G.u;let run=null,pv=null;for(let i=0;i+5<p.length;i+=6){const it=look(G,s.k[p[i]],p[i+1]);if(!it){run=null;pv=null;continue}
      const x=it.cx+p[i+2]*u,y=it.cy+p[i+3]*u;if(pv&&Math.hypot(x-pv[0],y-pv[1])>(4*p[i+5]+2.5)*u)run=null;if(!run){run=[];r.push(run)}const pt=[x,y,p[i+4]];run.push(pt);pv=pt}}
  else{const k=G.W/1000,p=s.p,run=[];for(let i=0;i+2<p.length;i+=3)run.push([p[i]*k,p[i+1]*k,p[i+2]]);r.push(run)} /* legacy proportional stroke */
  G.wm.set(s,r);return r}
const wpx=(G,s)=>s.v===2?s.w*G.u:s.w*G.W/1000;
/* RIGID BLOCKS (diagrams = <pre>): their characters never re-wrap, so a mark on/around one must move as ONE unit with it.
   Anchoring every point to "the nearest character anywhere in the card" tore such marks apart when the paragraphs around the diagram re-wrapped
   (the part over the paragraph followed the paragraph, the rest stayed on the diagram). A stroke belongs to a diagram when that diagram covers at least
   half of the stroke's bounding box (grown by 1.5rem) - true for marks on, under or AROUND it - and then every point is anchored to the diagram's own characters. */
const RIGID='pre';
function rigidKey(a,pts,u){if(!pts.length)return null;const b=box(a),m=1.5*u;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  pts.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]});x0-=m;y0-=m;x1+=m;y1+=m;const S=(x1-x0)*(y1-y0);let best=null,bo=0;
  a.querySelectorAll(RIGID).forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
    const ow=Math.min(x1,r.right-b.left)-Math.max(x0,r.left-b.left),oh=Math.min(y1,r.bottom-b.top)-Math.max(y0,r.top-b.top);if(ow<=0||oh<=0)return;const o=ow*oh;if(o>bo){bo=o;best=e}});
  return best&&bo*2>=S?blkKey(a,best):null}
/* A handwritten mark (small / free-form) is anchored as ONE rigid unit to the character nearest its centre, so rotating or re-wrapping can only move it, never tear it
   apart. Only long flat marks (underline, strike-through, highlighter swipe) keep per-point anchoring, so they still follow text that wraps. */
function oneAnchor(F,pts,u){if(!pts.length)return null;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]});
  return y1-y0<.75*u&&x1-x0>4*u?null:nearest(F,(x0+x1)/2,(y0+y1)/2)}
function mkStroke(a,q,t,c,w,pts,id){const G=geo(a,q),F=getF(G),u=G.u;id=id||uid();
  if(!F.items.length){const k=1000/(G.W||1);return{id,t,c,w:+(w*k).toFixed(2),p:pts.flatMap(p=>[+(p[0]*k).toFixed(1),+(p[1]*k).toFixed(1),+(p[2]||.5).toFixed(2)])}}
  const keys=[],kx=new Map(),p=[];let pv=null;
  const rk=rigidKey(a,pts,u),RI=rk!=null?F.items.filter(x=>x.k===rk):[],AF=RI.length?{items:RI}:F,A1=RI.length?null:oneAnchor(F,pts,u);
  pts.forEach(pt=>{const it=A1||nearest(AF,pt[0],pt[1]);let i=kx.get(it.k);if(i==null){i=keys.length;kx.set(it.k,i);keys.push(it.k)}
    const l=pv?Math.hypot(pt[0]-pv[0],pt[1]-pv[1])/u:0;pv=pt;p.push(i,it.o,+((pt[0]-it.cx)/u).toFixed(2),+((pt[1]-it.cy)/u).toFixed(2),+(pt[2]||.5).toFixed(2),+l.toFixed(2))});
  return{id,v:2,t,c,w:+(w/u).toFixed(3),k:keys,p}}
/* ---- ultra-HD windowed canvases: only the visible part of a card (plus a margin) is rasterised, at dpr x pinch-zoom ---- */
const MAXPX=1e7,MAXSIDE=8192;
function target(a){const b=box(a),v=vp(),d0=Math.min(Math.max((devicePixelRatio||1)*v.s,1),12),vx=v.x-b.left,vy=v.y-b.top,mx=v.w*.6,my=v.h*.8;
  const rect=f=>{const x0=Math.max(0,vx-mx*f),y0=Math.max(0,vy-my*f),x1=Math.min(b.width,vx+v.w+mx*f),y1=Math.min(b.height,vy+v.h+my*f);return x1>x0&&y1>y0?{x:x0,y:y0,w:x1-x0,h:y1-y0}:null};
  let Rr=null,d=d0,last=null;
  for(const f of[1,.5,.25,0]){const r=rect(f);if(!r)continue;last=r;if(r.w*d0<=MAXSIDE&&r.h*d0<=MAXSIDE&&r.w*r.h*d0*d0<=MAXPX){Rr=r;break}}
  if(!Rr){if(!last)return null;Rr=last;d=Math.max(.5,Math.min(d0,MAXSIDE/Rr.w,MAXSIDE/Rr.h,Math.sqrt(MAXPX/(Rr.w*Rr.h))))}
  const x0=Math.floor(Rr.x*d)/d,y0=Math.floor(Rr.y*d)/d,x1=Math.ceil((Rr.x+Rr.w)*d)/d,y1=Math.ceil((Rr.y+Rr.h)*d)/d;
  return{x:x0,y:y0,w:x1-x0,h:y1-y0,d,W:Math.round((x1-x0)*d),H:Math.round((y1-y0)*d),need:rect(.25)}}
const covers=(w,T)=>{const n=T.need;return!n||(w.x<=n.x+.5&&w.y<=n.y+.5&&w.x+w.w>=n.x+n.w-.5&&w.y+w.h>=n.y+n.h-.5)};
function layer(a,cls,T){const sel='mbi-'+cls;let c=a.querySelector(':scope>canvas.'+sel);if(!c){c=document.createElement('canvas');c.className='mbi '+sel;c.setAttribute('aria-hidden','true');a.appendChild(c)}
  const w=c._w;if(!w||w.x!==T.x||w.y!==T.y||w.w!==T.w||w.h!==T.h||w.d!==T.d||c.width!==T.W||c.height!==T.H){c.width=T.W;c.height=T.H;const s=c.style;s.left=T.x+'px';s.top=T.y+'px';s.width=T.w+'px';s.height=T.h+'px'}
  c._w={x:T.x,y:T.y,w:T.w,h:T.h,d:T.d};return c}
function clr(x,c){const w=c._w;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,c.width,c.height);x.setTransform(w.d,0,0,w.d,-w.x*w.d,-w.y*w.d)}
const drop=a=>a.querySelectorAll(':scope>canvas.mbi-base,:scope>canvas.mbi-hl,:scope>canvas.mbi-hlx').forEach(n=>n.remove());
/* one stroke run -> canvas. run = [[x,y,pressure],...] in card px; w = nominal width px. */
function drawRun(c,s,run,w,dx,dy,T){const n=run.length;if(!n)return;
  if(T){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<n;i++){const X=run[i][0]+dx,Y=run[i][1]+dy;if(X<x0)x0=X;if(X>x1)x1=X;if(Y<y0)y0=Y;if(Y>y1)y1=Y}const m=w*1.2+2;if(x1+m<T.x||x0-m>T.x+T.w||y1+m<T.y||y0-m>T.y+T.h)return}
  const X=i=>run[i][0]+dx,Y=i=>run[i][1]+dy;c.strokeStyle=c.fillStyle=s.c;c.lineCap=c.lineJoin='round';
  if(s.t==='h'){c.globalAlpha=HLA;c.lineWidth=w;c.beginPath();c.moveTo(X(0),Y(0));
    if(n<3){c.lineTo(n==1?X(0)+.01:X(1),n==1?Y(0):Y(1))}else{for(let i=1;i<n-1;i++)c.quadraticCurveTo(X(i),Y(i),(X(i)+X(i+1))/2,(Y(i)+Y(i+1))/2);c.lineTo(X(n-1),Y(n-1))} /* one smoothed path = one uniform tint, no darker overlaps inside a stroke */
    c.stroke();c.globalAlpha=1;return}
  const W=i=>w*(.4+.9*(run[i][2]||.5));
  if(n==1){c.beginPath();c.arc(X(0),Y(0),W(0)/2,0,7);c.fill();return}
  let mx=X(0),my=Y(0);for(let i=1;i<n;i++){const ex=i==n-1?X(i):(X(i)+X(i+1))/2,ey=i==n-1?Y(i):(Y(i)+Y(i+1))/2;c.lineWidth=W(i);c.beginPath();c.moveTo(mx,my);c.quadraticCurveTo(X(i),Y(i),ex,ey);c.stroke();mx=ex;my=ey}}
function bboxSel(q){const a=art(q);if(!SEL||SEL.q!=q||!a)return null;const G=geo(a,q),o=OFF&&OFF.q==q?OFF:{dx:0,dy:0};let b=null;
  (INK[q]||[]).forEach(s=>{if(!SEL.ids.has(s.id))return;const r=wpx(G,s)/2;runsOf(G,s).forEach(run=>run.forEach(p=>{const X=p[0]+o.dx,Y=p[1]+o.dy;b=b?[Math.min(b[0],X-r),Math.min(b[1],Y-r),Math.max(b[2],X+r),Math.max(b[3],Y+r)]:[X-r,Y-r,X+r,Y+r]}))});return b}
/* Strokes saved before the rigid anchor was introduced are anchored point-by-point. If (and only if) the layout on screen right now reproduces their ORIGINAL geometry exactly
   - every resolved segment is as long as the segment length stored when it was drawn - the stroke is re-anchored as one rigid unit, freezing the exact shape that was drawn.
   In any other layout (e.g. already rotated, where such a stroke looks torn) nothing is touched, so it heals and is upgraded the next time it is seen in the layout it was drawn in. */
function rigid(a,q){if(cur||OFF)return;const L=INK[q];if(!L||!L.length)return;const G=geo(a,q);let ch=false,F;
  const out=L.map(s=>{if(s.v!==2||s.p.length<12||s.k.every(k=>/(^|>)PRE\./.test(k)))return s;
    const p=s.p;let one=true;for(let i=6;i<p.length;i+=6)if(p[i]!==p[0]||p[i+1]!==p[1]){one=false;break}if(one)return s;
    const runs=runsOf(G,s);if(runs.length!==1||runs[0].length!==p.length/6)return s;
    const r=runs[0];F=F||getF(G);if(!F.items.length||oneAnchor(F,r,G.u)===null)return s;
    for(let i=1;i<r.length;i++){const d=Math.hypot(r[i][0]-r[i-1][0],r[i][1]-r[i-1][1]),l=p[i*6+5]*G.u;if(Math.abs(d-l)>.15*l+1.5)return s}
    ch=true;return mkStroke(a,q,s.t,s.c,wpx(G,s),r,s.id)});
  if(ch){INK[q]=out;persist(q)}}
function redraw(q){const a=art(q);if(!a)return;rigid(a,q);const L=INK[q]||[],has=!!a.querySelector(':scope>canvas.mbi-base');if(!L.length){has&&drop(a);return}
  theme();const T=target(a);if(!T){has&&drop(a);return}paint(a,q,T,L)}
function paint(a,q,T,L){const G=geo(a,q),o=OFF&&OFF.q==q?OFF:null;RO&&RO.observe(a);
  const bc=layer(a,'base',T),bx=bc.getContext('2d');clr(bx,bc);
  const drw=(cx,S)=>S.forEach(s=>{const m=o&&o.ids.has(s.id),w=wpx(G,s);runsOf(G,s).forEach(run=>drawRun(cx,s,run,w,m?o.dx:0,m?o.dy:0,T))}),HL=L.filter(s=>s.t==='h');
  drw(bx,L.filter(s=>s.t!=='h')); /* pen strokes: above the content */
  if(HL.length){const hc=layer(a,'hl',T),hx=hc.getContext('2d'),rs=opaque(a);clr(hx,hc);drw(hx,HL);
    if(rs.length){const fc=layer(a,'hlx',T),fx=fc.getContext('2d');clr(fx,fc);clipTo(fx,rs);drw(fx,HL);fx.restore()}else a.querySelectorAll(':scope>canvas.mbi-hlx').forEach(n=>n.remove())} /* highlights: BEHIND the content (+ blended copy over opaque blocks only) */
  else a.querySelectorAll(':scope>canvas.mbi-hl,:scope>canvas.mbi-hlx').forEach(n=>n.remove());
  if(SEL&&SEL.q==q){const b=bboxSel(q);if(b){bx.save();bx.setLineDash([6,5]);bx.lineWidth=1.5;bx.strokeStyle=cssc('--copper');bx.strokeRect(b[0]-6,b[1]-6,b[2]-b[0]+12,b[3]-b[1]+12);bx.restore()}}}
/* keep the raster window + resolution matched to what is on screen (scroll, pinch-zoom, rotate) and drop far-away cards */
function sweep(force){if(cur)return;const u=unitPx();Object.keys(INK).forEach(q=>{if(!INK[q]||!INK[q].length)return;const a=art(q);if(!a)return;const c=a.querySelector(':scope>canvas.mbi-base'),T=target(a);
    if(!T){c&&drop(a);return}const G=GEO[q];
    if(force||!c||!c._w||!covers(c._w,T)||c._w.d<T.d*.85||c._w.d>T.d*1.7||!G||G.a!==a||G.sig!==sigOf(a,u))redraw(q)})}
const sweepSoon=()=>{if(!swr)swr=requestAnimationFrame(()=>{swr=0;sweep()})};
const RO=window.ResizeObserver?new ResizeObserver(es=>es.forEach(e=>{const a=e.target;if(a.dataset&&a.dataset.id)redraw(a.dataset.id)})):null;
function sync(){document.documentElement.classList.toggle('hasq',!!document.querySelector('#main .inkc'));document.querySelectorAll('#main .inkc').forEach(a=>{const L=INK[a.dataset.id];if(L&&L.length){RO&&RO.observe(a);if(!a.querySelector(':scope>canvas.mbi-base'))redraw(a.dataset.id)}})}
new MutationObserver(ms=>{const cs=new Set();let ch=false;ms.forEach(m=>{if(m.type==='childList'){const ns=[...m.addedNodes,...m.removedNodes];if(ns.length&&ns.every(n=>n.nodeName==='CANVAS'))return}ch=true;const t=m.target.nodeType===1?m.target:m.target.parentElement,c=t&&t.closest&&t.closest('.inkc');if(c)cs.add(c)});
  if(!ch)return;cs.forEach(c=>{inv(c);const q=c.dataset.id;if(INK[q]&&INK[q].length&&c.querySelector(':scope>canvas.mbi-base'))redraw(q)});sync()}).observe(document.getElementById('main'),{childList:true,subtree:true,characterData:true});
addEventListener('scroll',e=>{const t=e.target;if(t&&t.nodeType===1&&t.closest){const c=t.closest('.inkc');if(c)inv(c)}sweepSoon()},{passive:true,capture:true});
if(window.visualViewport){let tm=0;visualViewport.addEventListener('resize',()=>{clearTimeout(tm);tm=setTimeout(sweep,110)});visualViewport.addEventListener('scroll',sweepSoon)}
try{document.fonts&&document.fonts.addEventListener('loadingdone',()=>{Object.keys(GEO).forEach(k=>delete GEO[k]);sweep(1)})}catch(e){}
/* ---- history ---- */
const push=o=>{H.push(o);if(H.length>200)H.shift();R.length=0};
function run(o,undo){const q=o.q;INK[q]=INK[q]||[];
  if(o.k==='rep'){const rm=new Set((undo?o.n:o.o).map(s=>s.id));INK[q]=INK[q].filter(s=>!rm.has(s.id));INK[q].push(...(undo?o.o:o.n))}
  else if((o.k==='add')===!undo)INK[q].push(...o.s);else{const ids=new Set(o.s.map(s=>s.id));INK[q]=INK[q].filter(s=>!ids.has(s.id))}SEL=null;redraw(q);persist(q)}
const undo=()=>{const o=H.pop();if(o){run(o,true);R.push(o)}tb()},redo=()=>{const o=R.pop();if(o){run(o,false);H.push(o)}tb()};
function delSel(){if(!SEL)return;const q=SEL.q,s=(INK[q]||[]).filter(x=>SEL.ids.has(x.id));INK[q]=INK[q].filter(x=>!SEL.ids.has(x.id));push({k:'del',q,s});SEL=null;redraw(q);persist(q);tb()}
function select(q,poly){SEL=null;const a=art(q);if(poly.length<3||!a)return;const G=geo(a,q),inside=(x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const A=poly[i],B=poly[j];if((A[1]>y)!==(B[1]>y)&&x<(B[0]-A[0])*(y-A[1])/(B[1]-A[1])+A[0])c=!c}return c};
  const ids=new Set((INK[q]||[]).filter(s=>{let n=0,t=0;runsOf(G,s).forEach(run=>run.forEach(p=>{t++;if(inside(p[0],p[1]))n++}));return t&&n/t>=.5}).map(s=>s.id));if(ids.size)SEL={q,ids}}
/* ---- pointer input: pen/mouse draw, finger never draws (scroll/tap stay native) ---- */
const pt=(e,r)=>[e.clientX-r.left,e.clientY-r.top,e.pressure||.5];
function erase(p){const G=cur.G,L=INK[cur.q]||[],rm=L.filter(s=>{const w=cur.w+wpx(G,s)/2;return runsOf(G,s).some(run=>{for(let i=0;i<run.length;i++){const d=i+1<run.length?dseg(p[0],p[1],run[i][0],run[i][1],run[i+1][0],run[i+1][1]):Math.hypot(p[0]-run[i][0],p[1]-run[i][1]);if(d<w)return true}return false})});
  if(rm.length){INK[cur.q]=L.filter(s=>!rm.includes(s));cur.del.push(...rm);redraw(cur.q)}}
function begin(e,a){theme();const r=box(a),q=a.dataset.id,er=(e.buttons&32)||e.button===5,tool=er?'eraser':U.tool,px=tool==='h'?10+U.size*3:tool==='eraser'?8+U.size*3:.6+U.size*.55,p0=pt(e,r);
  cur={id:e.pointerId,a,q,r,tool,w:px,pts:[p0],pred:[],del:[],G:geo(a,q),db:null};
  if(tool==='lasso'){if(SEL&&SEL.q==q){const b=bboxSel(q);if(b&&p0[0]>b[0]-8&&p0[0]<b[2]+8&&p0[1]>b[1]-8&&p0[1]<b[3]+8){cur.mode='move';cur.o=p0;OFF={q,ids:SEL.ids,dx:0,dy:0}}}if(cur.mode!=='move'){const s=SEL;SEL=null;s&&redraw(s.q);tb()}}
  if(tool==='eraser'){SEL=null;erase(p0)}
  try{a.setPointerCapture(e.pointerId)}catch(x){}
  if(tool!=='eraser'&&cur.mode!=='move'){const T=target(a)||{x:0,y:0,w:r.width,h:Math.min(r.height,4000),d:1,W:Math.round(r.width),H:Math.round(Math.min(r.height,4000))};
    if(tool==='h'){cur.lc=layer(a,'hlive',T);cur.lx=cur.lc.getContext('2d');cur.lf=layer(a,'hlivex',T);cur.lfx=cur.lf.getContext('2d');cur.rs=opaque(a);clr(cur.lfx,cur.lf)}else{cur.lc=layer(a,'live',T);cur.lx=cur.lc.getContext('2d') /* NOT desynchronized:true - on Android Chrome that low-latency path bypasses compositing, so the transparent live canvas paints as an opaque black rectangle over the card */}clr(cur.lx,cur.lc)}
  sched()}
const sched=()=>{if(!raf)raf=requestAnimationFrame(frame)};
function frame(){raf=0;const c=cur;if(!c)return;if(c.mode==='move'){redraw(c.q);return}if(!c.lx)return;const x=c.lx;
  if(c.db){x.clearRect(c.db[0],c.db[1],c.db[2],c.db[3]);c.lfx&&c.lfx.clearRect(c.db[0],c.db[1],c.db[2],c.db[3])} /* clear only the previous dirty box, not the whole canvas */
  const pts=c.tool==='pen'||c.tool==='h'||c.tool==='lasso'?c.pts.concat(c.pred):c.pts;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])});
  const m=(c.tool==='h'?c.w:c.w*1.4)+8;c.db=[x0-m,y0-m,x1-x0+2*m,y1-y0+2*m];
  if(c.tool==='pen'||c.tool==='h'){const S={t:c.tool==='h'?'h':'p',c:color(c.tool)};drawRun(x,S,pts,c.w,0,0,null);if(c.lf&&c.rs.length){clipTo(c.lfx,c.rs);drawRun(c.lfx,S,pts,c.w,0,0,null);c.lfx.restore()}}
  else if(c.tool==='lasso'){x.save();x.setLineDash([5,5]);x.lineWidth=1.5;x.strokeStyle=cssc('--copper');x.beginPath();c.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();x.restore()}}
function finish(e){if(e.pointerType==='pen'){penT=now();penDown=false}if(!cur||e.pointerId!==cur.id)return;const c=cur,q=c.q;cur=null;c.lc&&c.lc.remove();c.lf&&c.lf.remove();
  if(c.tool==='pen'||c.tool==='h'){const s=mkStroke(c.a,q,c.tool==='h'?'h':'p',color(c.tool),c.w,c.pts);(INK[q]=INK[q]||[]).push(s);push({k:'add',q,s:[s]})}
  else if(c.tool==='eraser'){if(c.del.length)push({k:'del',q,s:c.del})}
  else if(c.mode==='move'){const o=OFF;OFF=null;if(o.dx||o.dy){const G=geo(c.a,q),old=[],nw=[];
    INK[q]=(INK[q]||[]).flatMap(s=>{if(!o.ids.has(s.id))return[s];const w=wpx(G,s),out=runsOf(G,s).filter(r=>r.length).map((run,i)=>mkStroke(c.a,q,s.t,s.c,w,run.map(p=>[p[0]+o.dx,p[1]+o.dy,p[2]]),i?uid():s.id));if(!out.length)return[s];old.push(s);nw.push(...out);return out}); /* moved strokes are re-anchored to the text they now sit on */
    push({k:'rep',q,o:old,n:nw});SEL={q,ids:new Set(nw.map(s=>s.id))}}}
  else select(q,c.pts);
  redraw(q);persist(q);tb()}
document.addEventListener('pointerdown',e=>{if(e.pointerType==='pen'){penT=now();penDown=true}
  if(!ink||cur||(e.pointerType!=='pen'&&!(e.pointerType==='mouse'&&e.button===0)))return;
  if(e.target.closest('#ink,#inkmenu,#inkfab,.modal,#aip'))return;const a=e.target.closest('.inkc');if(!a)return;e.preventDefault();begin(e,a)},true);
document.addEventListener('pointermove',e=>{if(e.pointerType==='pen')penT=now();const c=cur;if(!c||e.pointerId!==c.id)return;c.r=box(c.a); /* card may have moved under the pen (scroll / viewport pan): map each move with its CURRENT box */
  (((e.getCoalescedEvents&&e.getCoalescedEvents())||[]).length?e.getCoalescedEvents():[e]).forEach(ev=>{const p=pt(ev,c.r);if(c.tool==='eraser')erase(p);else if(c.mode==='move'){OFF.dx=p[0]-c.o[0];OFF.dy=p[1]-c.o[1]}else{const l=c.pts[c.pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>.3)c.pts.push(p)}});
  c.pred=c.tool==='pen'||c.tool==='h'?(e.getPredictedEvents?e.getPredictedEvents():[]).slice(0,3).map(ev=>pt(ev,c.r)):[];sched()},true);
document.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&cur){swallow=true;setTimeout(()=>swallow=false,60)}finish(e)},true);
document.addEventListener('pointercancel',finish,true);
document.addEventListener('click',e=>{if(swallow){swallow=false;e.stopPropagation();e.preventDefault()}},true);
/* palm rejection: stylus touches never scroll inside cards; finger/palm touches are ignored while the pen is down or hovering */
const tpre=e=>{if(!ink||!e.cancelable)return;const t=e.changedTouches[0],T=e.target.closest?e.target:e.target.parentElement;if(!T||T.closest('#ink,#inkmenu,#inkfab,.modal,#aip'))return;
  if(t&&t.touchType==='stylus'){if(T.closest('.inkc'))e.preventDefault();return}
  if(penDown||now()-penT<1500)e.preventDefault()};
['touchstart','touchmove'].forEach(n=>document.addEventListener(n,tpre,{passive:false,capture:true}));
document.addEventListener('contextmenu',e=>{if(ink&&(penDown||now()-penT<800))e.preventDefault()});
document.addEventListener('keydown',e=>{if(ink&&(e.ctrlKey||e.metaKey)&&/^[zy]$/i.test(e.key)&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();(e.key.toLowerCase()==='y'||e.shiftKey)?redo():undo()}});
/* ---- toolbar ---- */
const el=document.createElement('div'),mn=document.createElement('div'),fab=document.createElement('button');el.id='ink';mn.id='inkmenu';fab.id='inkfab';fab.title=fab.ariaLabel='Annotate with pen or highlighter';fab.innerHTML=I('pen');document.body.append(el,mn,fab);
function tb(){const t=U.tool,col=t==='pen'?U.pc:U.hc,B=(a,ic,lb,on,d)=>`<button class="ik${on?' on':''}" data-i="${a}" title="${lb}" aria-label="${lb}"${d?' disabled':''}>${I(ic)}</button>`;
  el.innerHTML=`<span class="ig" data-drag title="Drag toolbar"></span>${B('pen','pen','Pen',t==='pen')}${B('h','hl','Highlighter',t==='h')}${B('eraser','eras','Eraser',t==='eraser')}${B('lasso','lasso','Lasso select',t==='lasso')}<i class="iv"></i>`+
  (t==='pen'||t==='h'?(t==='pen'?PEN:HLC).map(c=>`<button class="ic${c===col?' on':''}" data-c="${c}" style="--c:${c}" aria-label="Colour ${c}"></button>`).join(''):'')+
  `<input class="is" type="range" min="1" max="10" value="${U.size}" aria-label="Stroke size" style="--p:${(U.size-1)*100/9}%"><i class="iv"></i>${B('undo','undo','Undo',0,!H.length)}${B('redo','redo','Redo',0,!R.length)}${SEL?B('del','trash','Delete selection'):''}${B('more','more','More',MORE)}${B('off','x','Close annotation')}`;
  mn.classList.toggle('on',MORE);if(MORE){const r=el.getBoundingClientRect();mn.innerHTML='<button data-m="x">Export annotations</button><button data-m="i">Import annotations</button><button data-m="c" class="dg">Erase all handwriting</button>';mn.style.left=Math.max(8,Math.min(innerWidth-226,r.right-218))+'px';mn.style.bottom=(innerHeight-r.top+8)+'px'}}
function setInk(v){ink=!!v;document.documentElement.classList.toggle('ink',ink);if(!ink){const s=SEL;SEL=null;MORE=false;s&&redraw(s.q)}tb();place()}
const place=()=>{if(U.x!=null){const r=el.getBoundingClientRect();el.style.cssText+=`;left:${Math.max(4,Math.min(innerWidth-r.width-4,U.x))}px;top:${Math.max(4,Math.min(innerHeight-r.height-4,U.y))}px;bottom:auto;transform:none`}};
fab.onclick=()=>setInk(1);addEventListener('resize',()=>{place();if(MORE){MORE=false;tb()};Object.keys(GEO).forEach(k=>delete GEO[k]);sweep(1)});
el.addEventListener('click',e=>{const b=e.target.closest('[data-i],[data-c]');if(!b)return;
  if(b.dataset.c)U[U.tool==='pen'?'pc':'hc']=b.dataset.c;
  else{const a=b.dataset.i;if(a==='off')return setInk(0);if(a==='undo')return undo();if(a==='redo')return redo();if(a==='del')return delSel();
    if(a==='more')MORE=!MORE;else{MORE=false;U.tool=a;if(a!=='lasso'&&SEL){const s=SEL;SEL=null;redraw(s.q)}}}
  uiSave();tb()});
el.addEventListener('input',e=>{if(e.target.classList.contains('is')){U.size=+e.target.value;e.target.style.setProperty('--p',(U.size-1)*100/9+'%');uiSave()}});
el.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-drag]'))return;e.preventDefault();const r=el.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;el.setPointerCapture(e.pointerId);
  const m=v=>{U.x=v.clientX-ox;U.y=v.clientY-oy;place()},u=()=>{el.removeEventListener('pointermove',m);el.removeEventListener('pointerup',u);uiSave()};el.addEventListener('pointermove',m);el.addEventListener('pointerup',u)});
/* convert pre-update (width-proportional) strokes on the cards currently on screen into text-anchored strokes, using the layout they are displayed in right now */
function fixOld(){let n=0,sk=0;document.querySelectorAll('#main .inkc').forEach(a=>{const q=a.dataset.id,L=INK[q]||[];if(!L.some(s=>s.v!==2))return;const G=geo(a,q);if(!getF(G).items.length)return;let ch=false;
    INK[q]=L.map(s=>{if(s.v===2)return s;const pts=runsOf(G,s).flat();if(!pts.length)return s;if(pts.some(p=>p[0]<-24||p[1]<-24||p[0]>G.W+24||p[1]>G.H+24)){sk++;return s}n++;ch=true;return mkStroke(a,q,s.t,s.c,wpx(G,s),pts,s.id)});
    if(ch){persist(q);redraw(q)}});H.length=R.length=0;return{n,sk}}
mn.addEventListener('click',e=>{const m=e.target.closest('[data-m]');if(!m)return;MORE=false;
  if(m.dataset.m==='x'){flush();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({v:2,ink:INK})],{type:'application/json'}));a.download='psm-annotations.json';a.click()}
  if(m.dataset.m==='i'){const f=document.createElement('input');f.type='file';f.accept='application/json,.json';f.onchange=()=>f.files[0]&&f.files[0].text().then(t=>{try{const raw=JSON.parse(t),r=cleanInk(raw&&raw.ink);if(!r)throw 0;Object.keys(r.ink).forEach(k=>{INK[k]=r.ink[k];persist(k);redraw(k)});sync();if(r.skipped)alert(`Imported ${r.ok} stroke${r.ok==1?'':'s'}. Skipped ${r.skipped} invalid item${r.skipped==1?'':'s'}.`)}catch(x){alert('That file is not an annotation backup.')}});f.click()}
  if(m.dataset.m==='a'&&confirm('Re-attach old handwriting to the text?\n\nThis only affects questions currently on screen. For best results do it in the same orientation / screen size you originally wrote in, with the answers open. Handwriting made after this update already follows the text automatically.')){const r=fixOld();alert(r.n?`Re-attached ${r.n} stroke${r.n>1?'s':''} to the text.`+(r.sk?` ${r.sk} stroke${r.sk>1?'s were':' was'} skipped (outside the visible card — open the answer and try again).`:''):r.sk?`${r.sk} stroke${r.sk>1?'s were':' was'} skipped because the card looks different from when you wrote on it — open the answer in the original layout and try again.`:'No old handwriting found on the questions currently on screen.')}
  if(m.dataset.m==='c'&&confirm('Erase ALL handwriting on every question? This cannot be undone.')){Object.keys(INK).forEach(k=>{INK[k]=[];persist(k);redraw(k)});H.length=R.length=0;SEL=null}
  tb()});
document.addEventListener('click',e=>{if(MORE&&!e.target.closest('#inkmenu,[data-i=more]')){MORE=false;tb()}},true);
{const rp=()=>document.querySelectorAll('#main .inkc>canvas.mbi-base').forEach(c=>redraw(c.parentElement.dataset.id));
try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',rp)}catch(e){}new MutationObserver(rp).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})}
tb();sync();load().then(o=>{Object.keys(o).forEach(k=>{if(!INK[k])INK[k]=o[k]});sync()});
/* minimal hooks for the app-wide backup (audit 1.7): read all ink / merge validated ink (union by stroke id) */
window.PSMINK={
  read(){flush();const o={};Object.keys(INK).forEach(k=>{if(INK[k]&&INK[k].length)o[k]=INK[k]});return JSON.parse(JSON.stringify(o))},
  clean:cleanInk,
  merge(d){let n=0;Object.keys(d||{}).forEach(k=>{const have=INK[k]||[],ids=new Set(have.map(s=>s.id)),add=d[k].filter(s=>!ids.has(s.id));
    if(add.length){INK[k]=have.concat(add);n+=add.length;persist(k);redraw(k)}});sync();return n}};
})();
