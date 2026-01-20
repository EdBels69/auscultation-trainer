import{r as c,j as e,bD as $,bl as N,S as _,c2 as I,c3 as B,T as D,bw as E}from"./index-B21Ni9ER.js";import{T as H}from"./TheoryEditor-DY8tgqfi.js";import{r as M,E as k,u as L}from"./IconPicker-B-jK_xU8.js";import{g as q,e as C,f as K}from"./UpOutlined-Di7GCP9D.js";import"./SendOutlined-DGCY3D4W.js";function U({content:y}){const h=c.useRef(null);return c.useEffect(()=>{if(!h.current||!y)return;h.current.querySelectorAll("[data-audio-block]").forEach(r=>{if(r.dataset.processed)return;const f=r.dataset.soundName||"Аудио",m=r.dataset.audioUrl,g=r.dataset.imageUrl,j=r.dataset.float||"none";if(!m)return;j==="left"?(r.style.float="left",r.style.marginRight="16px",r.style.marginBottom="8px"):j==="right"?(r.style.float="right",r.style.marginLeft="16px",r.style.marginBottom="8px"):(r.style.display="inline-block",r.style.margin="8px 0");const v=`audio-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;r.innerHTML=`
                <div id="${v}" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    padding: 8px 12px;
                    color: white;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
                ">
                    ${g&&g!=="null"?`
                        <img src="${g}" alt="" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;" />
                    `:`
                        <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            🔊
                        </div>
                    `}
                    <span style="font-weight: 600; font-size: 13px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${f}
                    </span>
                    <div style="display: flex; gap: 4px;">
                        <button class="play-btn" style="
                            width: 28px; height: 28px; border-radius: 50%; border: none;
                            background: #52c41a; color: #fff; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; font-size: 12px;
                        " title="Воспроизвести">▶</button>
                        <button class="stop-btn" style="
                            width: 28px; height: 28px; border-radius: 50%; border: none;
                            background: rgba(255,255,255,0.2); color: #fff; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; font-size: 12px;
                        " title="Стоп">⏹</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 14px;">🔈</span>
                        <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.8" 
                            style="width: 50px; height: 4px; cursor: pointer;" />
                    </div>
                    <audio src="${m}" preload="metadata"></audio>
                </div>
            `;const d=r.querySelector(`#${v}`),l=d.querySelector("audio"),a=d.querySelector(".play-btn"),S=d.querySelector(".stop-btn"),w=d.querySelector(".volume-slider");let p=!1;l.volume=.8,a.addEventListener("click",()=>{p?(l.pause(),a.innerHTML="▶",a.style.background="#52c41a",p=!1):(l.play(),a.innerHTML="⏸",a.style.background="#faad14",p=!0)}),S.addEventListener("click",()=>{l.pause(),l.currentTime=0,a.innerHTML="▶",a.style.background="#52c41a",p=!1}),w.addEventListener("input",b=>{l.volume=parseFloat(b.target.value)}),l.addEventListener("ended",()=>{a.innerHTML="▶",a.style.background="#52c41a",p=!1}),r.dataset.processed="true"})},[y]),y?e.jsx("div",{ref:h,className:"theory-viewer",dangerouslySetInnerHTML:{__html:y},style:{overflow:"hidden"}}):e.jsx("div",{className:"theory-viewer theory-empty",children:e.jsx("p",{children:"Содержимое не найдено"})})}const{Sider:A,Content:P}=I,{Title:F,Paragraph:V}=D;function X(){const[y,h]=c.useState([]),[T,r]=c.useState(!0),[f,m]=c.useState(null),[g,j]=c.useState([]),[v,d]=c.useState([]),[l,a]=c.useState([]);c.useEffect(()=>{S()},[]);const S=async()=>{try{const o=await $(),s=w(o);h(s),j(b(s));const t=s.map(i=>i.id);d(t)}catch(o){console.error(o),N.error("Ошибка загрузки теории.")}finally{r(!1)}},w=o=>{const s=[],t={},i=[...o].sort((n,x)=>(n.sort_order||0)-(x.sort_order||0));i.forEach(n=>t[n.id]={...n,children:[]}),i.forEach(n=>{n.parent_id&&t[n.parent_id]?t[n.parent_id].children.push(t[n.id]):s.push(t[n.id])});const u=n=>{n.sort((x,R)=>(x.sort_order||0)-(R.sort_order||0)),n.forEach(x=>{x.children?.length>0&&u(x.children)})};return u(s),s},p=o=>{const s={fontSize:16};return o==="cardiac"?e.jsx(C,{style:{...s,color:"#ff4d4f"}}):o==="pulmonary"?e.jsx(K,{style:{...s,color:"#1890ff"}}):e.jsx(L,{style:{...s,color:"#8c8c8c"}})},b=(o,s=0)=>o.map(t=>{let i;const u={fontSize:16};t.icon?i=M(t.icon,{...u,color:t.category==="cardiac"?"#ff4d4f":t.category==="pulmonary"?"#1890ff":"#667eea"}):t.category?i=p(t.category):t.is_folder?i=e.jsx(L,{style:{...u,color:s===0?"#722ed1":"#8c8c8c"}}):i=e.jsx(E,{style:{...u,color:"#52c41a"}});const n=t.sidebar_title||t.title;return{key:t.id,title:e.jsxs("span",{style:{fontSize:14},title:t.title,children:[i," ",e.jsx("span",{style:{marginLeft:8},children:n})]}),children:t.children.length>0?b(t.children,s+1):void 0,nodeData:t}}),z=(o,s)=>{o.length>0&&s.node.nodeData&&(a(o),m(s.node.nodeData))};return T?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"calc(100vh - 64px)"},children:e.jsx(_,{size:"large"})}):e.jsxs(I,{style:{background:"linear-gradient(to bottom, #f0f2f5, #ffffff)",minHeight:"calc(100vh - 64px)"},children:[e.jsxs(A,{width:320,style:{background:"#fff",borderRight:"1px solid #e8e8e8",boxShadow:"2px 0 8px rgba(0,0,0,0.05)"},children:[e.jsxs("div",{style:{padding:"24px 16px",borderBottom:"1px solid #f0f0f0",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",color:"#fff"},children:[e.jsx(B,{style:{fontSize:24,marginRight:12}}),e.jsx("span",{style:{fontSize:18,fontWeight:600},children:"База знаний"})]}),e.jsx("div",{style:{height:"calc(100% - 72px)",overflow:"auto",padding:"16px 8px"},children:e.jsx(H,{showLine:{showLeafIcon:!1},switcherIcon:e.jsx(q,{}),treeData:g,expandedKeys:v,onExpand:d,selectedKeys:l,onSelect:z,blockNode:!0,style:{fontSize:14}})})]}),e.jsx(P,{style:{padding:"32px 48px",overflow:"auto"},children:f?e.jsxs("div",{style:{background:"#fff",borderRadius:12,padding:"32px 40px",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.06)"},children:[e.jsx(F,{level:2,style:{marginBottom:24,color:"#1a1a2e"},children:f.title}),f.content?e.jsx(U,{content:f.content}):e.jsxs("div",{style:{textAlign:"center",padding:"60px 20px",color:"#8c8c8c"},children:[e.jsx(E,{style:{fontSize:48,marginBottom:16,opacity:.5}}),e.jsxs(V,{type:"secondary",children:["Содержимое ещё не добавлено.",e.jsx("br",{}),"Используйте панель управления для редактирования."]})]})]}):e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",minHeight:400},children:e.jsx(k,{description:e.jsx("span",{style:{color:"#8c8c8c"},children:"Выберите раздел из меню слева"})})})})]})}export{X as default};
