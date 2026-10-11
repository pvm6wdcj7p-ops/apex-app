(function init(){
if(typeof window.esp!=="function"||typeof window.setMode!=="function"){return setTimeout(init,200)}
const r2=n=>Math.round(n*100)/100,msg=(id,t)=>{const x=$("#"+id);if(x)x.textContent=t};
window.EMP=[];window.LST=[];window.MI={};
const _load=window.load;
window.load=async function(){await _load();
if(ME.rol==="admin"){
const[c,l,p]=await Promise.all([sb.from("clientes").select("*").order("nombre"),sb.from("listas").select("*").order("id"),sb.from("perfiles").select("*")]);
EMP=(c.data||[]).map(x=>({...x,us:(p.data||[]).filter(y=>y.cliente_id===x.id)}));LST=l.data||[];
const ps=EMP.filter(e=>e.logo_path).map(e=>e.logo_path);
if(ps.length){const{data:u}=await sb.storage.from("logos").createSignedUrls(ps,3600);(u||[]).forEach(s=>{const e=EMP.find(z=>z.logo_path===s.path);if(e)e.logo=s.signedUrl})}
}else{
const[c,l]=await Promise.all([sb.from("clientes").select("*").eq("id",ME.cliente_id).maybeSingle(),sb.from("listas").select("*")]);
const e=c.data||{},d=Number(((l.data||[]).find(x=>x.id===e.lista_id)||{}).descuento||0);
CAT=CAT.map(x=>x[3]==="Especial"?x:[x[0],x[1],r2(x[2]*(1-d/100)),x[3],x[4]]);
if(e.logo_path){const{data:u}=await sb.storage.from("logos").createSignedUrl(e.logo_path,3600);e.logo=u&&u.signedUrl}
MI=e}};
window.emp=function(){return `<h2 style="margin-top:0">Empresas (${EMP.length})</h2>`+EMP.map(e=>`<div class="card">
${e.logo?`<img src="${e.logo}" alt="Logo" style="height:46px;max-width:100%;object-fit:contain;margin-bottom:8px">`:""}
<b>${esc(e.nombre)}</b><div class="m">Usado ${mx(+e.usado)} · Disponible ${mx(+e.limite-+e.usado)}</div>
<div class="m">${e.us.map(u=>esc(u.nombre)+" ("+u.rol+")").join(", ")||"Sin usuarios"}</div>
<label for="rz${e.id}">Razón social</label><input id="rz${e.id}" value="${esc(e.razon_social||"")}">
<label for="rf${e.id}">RFC</label><input id="rf${e.id}" value="${esc(e.rfc||"")}">
<label for="lm${e.id}">Crédito autorizado</label><input id="lm${e.id}" type="number" min="0" value="${+e.limite}" inputmode="decimal">
<label for="ls${e.id}">Lista de precios</label><select id="ls${e.id}">${LST.map(l=>`<option value="${l.id}" ${l.id===e.lista_id?"selected":""}>${esc(l.nombre)} (${+l.descuento}%)</option>`).join("")}</select>
<label for="ab${e.id}">Registrar abono (baja lo usado)</label><input id="ab${e.id}" type="number" min="0" inputmode="decimal" placeholder="0">
<label class="b o" for="lg${e.id}" style="margin-top:12px">Subir logo</label><input class="vh" id="lg${e.id}" type="file" accept="image/*" onchange="subeLogo('${e.id}',this)">
<div class="row"><button class="b" onclick="guardaE('${e.id}')">Guardar</button></div>
<h2 style="font-size:19px">Asignar usuario</h2>
<label for="ue${e.id}">Correo (ya creado en Supabase)</label><input id="ue${e.id}" type="email"><label for="un${e.id}">Nombre</label><input id="un${e.id}">
<label for="ur${e.id}">Rol</label><select id="ur${e.id}"><option value="dueno">Dueño</option><option value="mecanico">Mecánico</option></select>
<div class="row"><button class="b o" onclick="asigna('${e.id}')">Asignar</button></div><div class="msg" id="em${e.id}"></div></div>`).join("")+
`<div class="card"><h2 style="margin-top:0">Nueva empresa</h2><label for="nn">Nombre</label><input id="nn"><div class="row"><button class="b" onclick="nuevaE()">Crear empresa</button></div><div class="msg" id="nm"></div></div>
<h2>Listas de precios</h2>`+LST.map(l=>`<div class="card"><b>${esc(l.nombre)}</b><label for="ds${l.id}">Descuento sobre el precio público (%)</label><input id="ds${l.id}" type="number" min="0" max="100" value="${+l.descuento}" inputmode="decimal"><div class="row"><button class="b o" onclick="guardaL(${l.id})">Guardar</button></div></div>`).join("")};
window.nuevaE=async function(){const n=$("#nn").value.trim();if(!n){msg("nm","Escribe el nombre.");return}
const{error}=await sb.from("clientes").insert({nombre:n,limite:0,lista_id:1});if(error){msg("nm","No se pudo crear.");return}await load();draw()};
window.guardaE=async function(id){const ab=parseFloat($("#ab"+id).value)||0;
const{error}=await sb.from("clientes").update({razon_social:$("#rz"+id).value.trim(),rfc:$("#rf"+id).value.trim().toUpperCase(),limite:parseFloat($("#lm"+id).value)||0,lista_id:+$("#ls"+id).value}).eq("id",id);
if(error){msg("em"+id,"No se pudo guardar.");return}
if(ab>0){const r=await sb.rpc("registrar_abono",{p_cliente:id,p_monto:ab});if(r.error){msg("em"+id,"Se guardó, pero no el abono.");return}}
await load();draw()};
window.guardaL=async function(id){const{error}=await sb.from("listas").update({descuento:parseFloat($("#ds"+id).value)||0}).eq("id",id);if(error)return;await load();draw()};
window.subeLogo=async function(id,inp){const f=inp.files[0];if(!f)return;msg("em"+id,"Subiendo logo…");const p=id+"/logo.png";
const up=await sb.storage.from("logos").upload(p,f,{upsert:true,contentType:f.type});if(up.error){msg("em"+id,"No se pudo subir el logo.");return}
const r=await sb.from("clientes").update({logo_path:p}).eq("id",id);if(r.error){msg("em"+id,"No se pudo guardar el logo.");return}await load();draw()};
window.asigna=async function(id){const em=$("#ue"+id).value.trim(),nm=$("#un"+id).value.trim();if(!em||!nm){msg("em"+id,"Pon el correo y el nombre.");return}
const{error}=await sb.rpc("asignar_usuario",{p_email:em,p_cliente:id,p_rol:$("#ur"+id).value,p_nombre:nm});
if(error){msg("em"+id,error.message.includes("no existe")?"Ese correo no existe. Créalo primero en Supabase.":error.message.includes("duplicate")?"Esa empresa ya tiene ese rol.":"No se pudo asignar.");return}await load();draw()};
const _oc=window.oc;
window.oc=function(id){_oc(id);const b=$("#ocb");if(!b)return;const m=MI||{},im=b.querySelector("img");
if(m.logo&&im){im.src=m.logo;im.alt=m.razon_social||m.nombre||""}
b.innerHTML=b.innerHTML.replace("cuenta AGR-077",esc((m.razon_social||m.nombre||"")+(m.rfc?" · RFC "+m.rfc:""))+" · Proveedor: APEX")};
TR.admin=[["emp","Empresas"],["esp","Especiales"],["cat","Catálogo"]];
window.draw=function(){const n=S.reqs.filter(r=>r.st==="pendiente").length,k=S.reqs.filter(r=>r.st==="por_identificar").length,V={cat:window.cat,enc:window.enc,due:window.due,esp:window.esp,emp:window.emp};
$("#v").innerHTML=V[S.tab]()+`<div class="row"><button class="b o" onclick="out()">Salir (${esc(ME.nombre)})</button></div>`;
$("nav").innerHTML=TR[ME.rol].map(([t,l])=>{const c=t==="due"?n:t==="esp"?k:0;return `<button role="tab" aria-selected="${t===S.tab}" onclick="S.tab='${t}';S.err='';S.ok='';draw();scrollTo(0,0)">${l}${c?`<b class="n">${c}</b>`:""}</button>`}).join("")};
if(ME){if(ME.rol==="admin")S.tab="emp";load().then(draw).catch(()=>{})}
})();
