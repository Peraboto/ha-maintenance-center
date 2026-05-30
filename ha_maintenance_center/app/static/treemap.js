function fmt(bytes){ if(!bytes) return '0 B'; const u=['B','KB','MB','GB','TB']; let i=0,n=bytes; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(n>=10?1:2)} ${u[i]}`; }
function pct(n){ return `${Math.round(n)}%`; }
function esc(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function statusClass(p){ return p>90?'status-danger':p>75?'status-warn':'status-ok'; }

let treeRoot=null, currentNode=null;

async function load(){
  const [summary, tree] = await Promise.all([fetch('/api/summary').then(r=>r.json()), fetch('/api/treemap').then(r=>r.json())]);
  treeRoot=tree; currentNode=tree;
  renderSummary(summary); renderTree(currentNode);
}

document.getElementById('refresh').onclick = load;

function renderSummary(s){
  const cards=document.getElementById('cards'); const m=s.system.memory, sw=s.system.swap;
  cards.innerHTML=`
  <div class="card"><h3>CPU</h3><div class="value">${s.system.cpu_percent}%</div></div>
  <div class="card"><h3>RAM</h3><div class="value ${statusClass(m.percent)}">${m.percent}%</div><small>${fmt(m.available)} verfügbar</small></div>
  <div class="card"><h3>SWAP</h3><div class="value ${statusClass(sw.percent)}">${sw.percent}%</div><small>${fmt(sw.used)} / ${fmt(sw.total)}</small></div>
  <div class="card"><h3>Backups</h3><div class="value">${s.backups.length}</div><small>${fmt(s.backups.reduce((a,b)=>a+b.size,0))}</small></div>
  <div class="card"><h3>Datenbank</h3><div class="value">${fmt(s.database.reduce((a,b)=>a+b.size,0))}</div></div>`;

  document.getElementById('backups').innerHTML = table(['Name','Größe','Alter'], s.backups.slice(0,30).map(b=>[b.name, fmt(b.size), b.age_days+' Tage']));
  document.getElementById('database').innerHTML = table(['Name','Größe','Pfad'], s.database.map(d=>[d.name, fmt(d.size), d.path]));
  renderUsb(s.usb);
  renderContainers(s.containers);
}

function table(headers, rows){
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderUsb(u){
  let html='<h3>lsusb</h3>' + table(['Gerät'], u.lsusb.map(x=>[(x.is_busch_jaeger_knx?'KNX: ':'')+(x.is_realtek_rtl2832u?'RTL2832U: ':'')+x.raw]));
  html += '<h3>hidraw</h3>' + table(['Dev','Name','VID:PID','Hinweis'], u.hidraw.map(h=>[h.dev,h.name,`${h.vid}:${h.pid}`, h.is_busch_jaeger_knx?'Busch-Jaeger KNX':'' ]));
  document.getElementById('usb').innerHTML=html;
}
function renderContainers(c){
  if(!c.available){ document.getElementById('containers').innerHTML=`<p>Docker nicht verfügbar: ${esc(c.error||'')}</p>`; return; }
  document.getElementById('containers').innerHTML=table(['Container','CPU','RAM','RAM %'], c.rows.map(r=>[r.name,r.cpu,r.memory,r.mem_percent]));
}

function color(type){ return {backup:'#7c3aed',database:'#dc2626',log:'#f97316',hacs:'#2563eb',media:'#059669',folder:'#334155',other:'#475569',error:'#991b1b'}[type] || '#475569'; }
function layout(items,x,y,w,h){
  const total=items.reduce((a,b)=>a+(b.value||0),0)||1; let out=[]; let offset=0; const horizontal=w>=h;
  for(const item of items){ const frac=(item.value||0)/total; if(horizontal){ const iw=w*frac; out.push({item,x:x+offset,y,w:iw,h}); offset+=iw; } else { const ih=h*frac; out.push({item,x,y:y+offset,w,h:ih}); offset+=ih; } }
  return out;
}
function renderTree(node){
  currentNode=node; document.getElementById('breadcrumb').textContent=node.path||node.name;
  const el=document.getElementById('treemap'); el.innerHTML='';
  const items=(node.children||[]).filter(c=>c.value>0).slice(0,120);
  const boxes=layout(items,0,0,el.clientWidth,el.clientHeight);
  for(const b of boxes){
    if(b.w<3||b.h<3) continue;
    const d=document.createElement('div'); d.className='tile'; d.style.left=b.x+'px'; d.style.top=b.y+'px'; d.style.width=b.w+'px'; d.style.height=b.h+'px'; d.style.background=color(b.item.type);
    d.title=`${b.item.path}\n${fmt(b.item.value)}`;
    d.innerHTML=`<strong>${esc(b.item.name)}</strong><small>${fmt(b.item.value)}</small>`;
    d.onclick=()=>{ if(b.item.children){ renderTree(b.item); } };
    el.appendChild(d);
  }
  if(node!==treeRoot){ const up=document.createElement('button'); up.textContent='Eine Ebene zurück'; up.style.position='absolute'; up.style.right='10px'; up.style.top='10px'; up.onclick=()=>renderTree(treeRoot); el.appendChild(up); }
}

load();
