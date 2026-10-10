(function(){
const SPEC="Especial",lab={por_identificar:"Identificando la pieza",pendiente:"Esperando firma del dueño",autorizado:"Autorizado",rechazado:"Rechazado"};
let MODE="cat";
const _cat=window.cat,_cards=window.cards,_due=window.due;
const sinEsp=f=>{const a=CAT;CAT=a.filter(c=>c[3]!==SPEC);try{return f()}finally{CAT=a}};
window.cat=()=>sinEsp(_cat);
window.cards=q=>sinEsp(()=>_cards(q));
window.due=()=>_due().replace(/por_identificar/g,"identificando");
window.setMode=m=>{MODE=m;S.err="";S.ok="";draw()};
window.load=async function(){
const[c,pr,so]=await Promise.all([ME.cliente_id?sb.from("clientes").select("*").eq("id",ME.cliente_id).maybeSingle():{data:null},sb.from("productos").select("*").order("nombre"),sb.from("solicitudes").select("*,perfiles(nombre)").order("creado",{ascending:false}).limit(100)]);
const rows=so.data||[],{data:u}=await sb.storage.from("fotos").createSignedUrls(rows.map(r=>r.foto_path),3600),m={};(u||[]).forEach(x=>m[x.path]=x.signedUrl);
CAT=(pr.data||[]).map(p=>[p.sku,p.nombre,Number(p.precio),p.categoria,p.existencia]);
rows.filter(r=>r.tipo==="especial").forEach(r=>CAT.push(["ESP-"+r.id,r.ident||r.descripcion||"Pieza por identificar",Number(r.precio_unit||0),SPEC,0]));
S.limit=Number(c.data?.limite||0);S.used=Number(c.data?.usado||0);
S.reqs=rows.map(r=>({id:r.id,who:(r.perfiles?.nombre||"Mecánico")+" · mecánico",sku:r.tipo==="especial"?"ESP-"+r.id:r.sku,qty:r.cantidad,note:r.nota||"",desc:r.descripcion||"",tipo:r.tipo,foto:m[r.foto_path]||"",st:r.estado,t:new Date(r.creado).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}),firma:r.firma,oc:r.folio,hash:r.huella,fecha:r.resuelto_en?new Date(r.resuelto_en).toLocaleString("es-MX"):""})).filter(r=>item(r.sku))};
const foto=()=>`<div style="font-weight:600;margin:10px 0 4px">Foto de la pieza (obligatoria)</div>
<div class="row" style="margin-top:0"><label class="b" for="ph">Tomar foto</label><label class="b o" for="pf">Elegir de galería</label></div>
${PH?`<img class="pic" src="${PH}" alt="Vista previa" style="margin:10px 0 0;cursor:default">`:`<div class="m" style="margin-top:8px">Aún no hay foto.</div>`}
<input class="vh" id="ph" type="file" accept="image/*" capture="environment" onchange="pick(this)"><input class="vh" id="pf" type="file" accept="image/*" onchange="pick(this)">`;
window.enc=function(){const E=MODE==="esp",mis=S.reqs.filter(r=>r.tipo==="especial").slice(0,5);
return credit()+`<div class="row" style="margin:0 0 12px"><button class="b ${E?"o":""}" onclick="setMode('cat')">Del catálogo</button><button class="b ${E?"":"o"}" onclick="setMode('esp')">Pieza que no encuentro</button></div>
<div class="card"><h2 style="margin-top:0">${E?"Pedir una pieza especial":"Pedir refacción"}</h2>`+
(E?`<label for="ds">¿Qué pieza es? Nombre, marca o número de parte si lo tienes</label><textarea id="ds" rows="3"></textarea>`:
`<label for="sk">Refacción</label><select id="sk">${CAT.filter(c=>c[3]!==SPEC).map(c=>`<option value="${esc(c[0])}">${esc(c[1])} · ${mx(c[2])}</option>`).join("")}</select>`)+
`<label for="qt">Cantidad</label><input id="qt" type="number" min="1" value="1" inputmode="numeric">
<label for="nt">Equipo o parcela donde se usará (obligatorio)</label><input id="nt" placeholder="Ej. Tractor 7, rancho La Noria">${foto()}
<div class="row"><button class="b" onclick="ask()">${E?"Enviar a APEX":"Enviar al dueño"}</button></div>
<div class="msg" id="er">${esc(S.err)}</div><div class="okm">${esc(S.ok)}</div>
<p class="m">${E?"Un encargado de APEX identifica la pieza y manda el precio al dueño para su firma.":"Nada se surte hasta que el dueño vea la foto y autorice."}</p></div>`+
(mis.length?`<h2>Mis piezas especiales</h2>`+mis.map(r=>`<div class="card"><b>${esc(item(r.sku)[1])}</b><div class="m">${r.qty} pza · ${lab[r.st]||r.st}</div></div>`).join(""):"")};
window.ask=async function(){const e=$("#er"),E=MODE==="esp",qty=Math.max(1,parseInt($("#qt").value)||1),note=$("#nt").value.trim(),ds=E?$("#ds").value.trim():"",sku=E?null:$("#sk").value;
if(E&&!ds){e.textContent="Describe la pieza lo mejor que puedas.";return}
if(!note){e.textContent="Escribe para qué equipo o parcela es.";return}
if(!PH){e.textContent="Falta la foto de la pieza. Es obligatoria.";return}
if(!E&&item(sku)[2]*qty>avail()){e.textContent="Excede el crédito disponible ("+mx(avail())+").";return}
e.textContent="Enviando…";const path=`${ME.cliente_id}/${crypto.randomUUID()}.jpg`,blob=await(await fetch(PH)).blob();
const up=await sb.storage.from("fotos").upload(path,blob,{contentType:"image/jpeg"});
if(up.error){e.textContent="No se pudo subir la foto. Intenta de nuevo.";return}
const row={cliente_id:ME.cliente_id,mecanico_id:ME.id,cantidad:qty,nota:note,foto_path:path};
if(E)Object.assign(row,{tipo:"especial",descripcion:ds,estado:"por_identificar"});else row.sku=sku;
const ins=await sb.from("solicitudes").insert(row);
if(ins.error){e.textContent="No se pudo enviar. Intenta de nuevo.";return}
PH=null;S.err="";S.ok=E?"Enviado a APEX. Te avisamos cuando tengamos el precio.":"Enviado. El dueño recibirá el pedido con la foto.";await load();draw()};
window.esp=function(){const l=S.reqs.filter(r=>r.st==="por_identificar");
return `<h2 style="margin-top:0">Por identificar (${l.length})</h2>`+(l.length?l.map(r=>`<div class="card"><img class="pic" src="${r.foto}" alt="Foto" onclick="zoom(${r.id})"><b>${esc(r.desc)}</b>
<div class="m">${esc(r.who)} · ${r.qty} pza · ${r.t}</div><div class="m">Uso: ${esc(r.note)}</div>
<label for="in${r.id}">Nombre de la pieza (como se cotiza)</label><input id="in${r.id}" value="${esc(r.desc)}">
<label for="pu${r.id}">Precio unitario</label><input id="pu${r.id}" type="number" min="0" inputmode="decimal">
<div class="row"><button class="b" onclick="cotiza(${r.id})">Enviar cotización al dueño</button><button class="b o" onclick="noId(${r.id})">No se pudo</button></div><div class="msg" id="ce${r.id}"></div></div>`).join(""):`<p class="m">No hay piezas por identificar.</p>`)};
window.cotiza=async function(id){const n=$("#in"+id).value.trim(),p=parseFloat($("#pu"+id).value);
if(!n||!(p>0)){$("#ce"+id).textContent="Pon el nombre y un precio válido.";return}
const{error}=await sb.from("solicitudes").update({ident:n,precio_unit:p,estado:"pendiente"}).eq("id",id).eq("estado","por_identificar");
if(error){$("#ce"+id).textContent="No se pudo enviar.";return}
await load();draw()};
window.noId=async function(id){await sb.from("solicitudes").update({estado:"rechazado"}).eq("id",id).eq("estado","por_identificar");await load();draw()};
if(!TR.admin.some(t=>t[0]==="esp"))TR.admin.push(["esp","Especiales"]);
window.draw=function(){const n=S.reqs.filter(r=>r.st==="pendiente").length,k=S.reqs.filter(r=>r.st==="por_identificar").length,V={cat:window.cat,enc:window.enc,due:window.due,esp:window.esp};
$("#v").innerHTML=V[S.tab]()+`<div class="row"><button class="b o" onclick="out()">Salir (${esc(ME.nombre)})</button></div>`;
$("nav").innerHTML=TR[ME.rol].map(([t,l])=>{const c=t==="due"?n:t==="esp"?k:0;return `<button role="tab" aria-selected="${t===S.tab}" onclick="S.tab='${t}';S.err='';S.ok='';draw();scrollTo(0,0)">${l}${c?`<b class="n">${c}</b>`:""}</button>`}).join("")};
if(ME)load().then(draw).catch(()=>{});
})();
