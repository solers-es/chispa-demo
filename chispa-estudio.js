/* =====================================================================
   Chispa · Estudio de publicaciones
   - «Crear imagen con IA»: imagen distinta en cada tarjeta, según el texto
     (paella → paella, cócteles → cócteles…), con movimiento (Ken Burns,
     luz, texto que entra) y exportable como vídeo vertical.
   - «Subir foto o vídeo»: cámara en el móvil, sin FileReader (iPhone).
   - Edición al tocar: texto, hashtags, botones con su enlace, imagen, fecha.
   - «Publicar»: elegir redes, vista previa realista de cada una y envío real
     (compartir del móvil, wa.me, Facebook, página de subida de cada red).
   Se carga DESPUÉS del script de index.html y sustituye sus funciones.

   GENERADOR DE IMÁGENES = MOTOR INTERCAMBIABLE (ver «MOTOR DE IMAGEN» abajo)
   Hoy: fotos libres de Unsplash elegidas por palabras del texto. Mañana:
   nuestro propio servidor de IA, poniendo antes de este script
     window.CHISPA_MOTOR={proveedor:"servidor",url:"https://…/imagen"}
   Hay un servidor de ejemplo en conectores/imagen-ia-worker.js. La clave del
   modelo NUNCA va en este fichero: la guarda el servidor.

   PUBLICAR DIRECTO (sin herramientas puente de pago)
   Con las APIs oficiales (Meta Graph, TikTok Content Posting, YouTube Data)
   a través de nuestro servidor: window.CHISPA_PUBLICADOR={url:"https://…/publicar",
   conectada:function(red){…}}. Sin eso, se abre la red con el contenido listo.
   ===================================================================== */
(function(){
"use strict";
window.CHISPA_IA_URL = window.CHISPA_IA_URL || "";

/* ---------- tipografías ---------- */
(function(){var l=document.createElement("link");l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,600&family=Inter:wght@600;700;800&display=swap";
  document.head.appendChild(l);})();

/* ---------- banco de fotos (Unsplash, licencia libre) ---------- */
var F={
 paella:[["1650964807311-970cb88d347c","Colin + Meg"],["1623961990059-28356e226a77","Douglas Lopez"],["1630175860333-5131bda75071","Sandra Wei"],["1534080564583-6be75777b70a","VK bro"],["1694685367640-05d6624e57f1","Rook of Arts"],["1682988771291-da784f151ef7","Joyce Romero"],["1650964802649-ef992b574b8c","Colin + Meg"],["1604543519952-12b7038886c0","Antonio Castellano"]],
 coctel:[["1702725365144-6e8584ea54e4","Francesco Liotti"],["1598994671512-395d7a6147e0","Frames For Your Heart"],["1569924995007-e591d333f882","Alex Voulgaris"],["1596463989140-3b600dab72e5","kofookoo.de"],["1617524455617-ce1e266aa810","Laure Noverraz"],["1653542772393-71ffa417b1c4","kimia kazemi"],["1513558161293-cdaf765ed2fd","Melissa Walker Horn"],["1551538827-9c037cb4f32a","Mae Mu"],["1615830783066-26a99bc9d959","Dennis Schmidt"]],
 plato:[["1414235077428-338989a2e8c0","Jay Wennington"],["1467003909585-2f8a72700288","Casey Lee"],["1533143708019-ea5cfa80213e","Eric McNew"],["1588168333986-5078d3ae3976","Justus Menke"],["1546964124-0cce460f38ef","Loija Nguyen"],["1558030006-450675393462","Emerson Vieira"],["1594041680534-e8c8cdebd659","iman zaker"]],
 evento:[["1510577956525-69bd3c29339e","Steve Harvey"],["1537763251863-4ef771ed9677","Hari Nandakumar"],["1568581595119-c6ebbf5c75c0","Jon Tyson"],["1625957454212-6831a9bf582a","Chase Baker"],["1579027989536-b7b1f875659b","Siyuan"],["1527253862047-63b8b10f38e5","Fredrik Öhlander"],["1569924995012-c4c706bfcd51","Alex Voulgaris"]],
 terraza:[["1665758564802-f611df512d8d","Lisette Harzing"],["1679394900352-05fd1ed3ed48","Ries Bosch"],["1634736794027-3297ad344057","Andrew Pons"],["1559339352-11d035aa65de","Albert"]],
 brunch:[["1621523132966-19f711d565d1","Colin Michel"],["1592999771970-8628e51433c4","Jasmine Huang"],["1528699633788-424224dc89b5","João Marcelo Martins"],["1504630083234-14187a9df0f5","Emre"],["1551727609-1f89c019b5ca","Julia Solonina"],["1530174883092-c2a7aa3f1cfe","Alisa Anton"],["1541329351076-600b0f9fdf28","Deepansh Khurana"],["1664192578366-523c01b7ce43","Alice Pasqual"]],
 postre:[["1698688334089-c68105801d02","Laura Peruchi"],["1621792907526-e69888069079","Adam Bartoszewicz"],["1607257882338-70f7dd2ae344","Ayesha Firdaus"],["1654921913191-f535f8978768","Eiliv Aceron"],["1630384057168-b537be58939c","Mitchell Luo"],["1642220618391-72214d19711c","Tai's Captures"]],
 marisco:[["1606850780554-b55ea4dd0b70","Max Mota"],["1651323018466-b36b7df1d2b1","Yuval Zukerman"],["1557267725-c530b236f446","Douglas Lopez"],["1595579547936-c3a0e6c171fc","sunorwind"],["1572776082973-1cb8d1790872","SJ"],["1654095221806-4340755b9922","Xavier Photography"]],
 burger:[["1568901346375-23c9450c58cd","amirali mirhashemian"],["1586190848861-99aa4a171e90","David Foodphototasty"],["1572802419224-296b0aeee0d9","amirali mirhashemian"],["1550547660-d9450f859349","Mae Mu"],["1571091718767-18b5b1457add","Ilya Mashkov"],["1607013251379-e6eecfffe234","Eiliv Aceron"]],
 tapas:[["1656423521731-9665583f100c","CHUTTERSNAP"],["1565599837634-134bc3aadce8","Nacho Carretero Molero"],["1622883464819-e086aa5d4830","Arantxa Aniorte"],["1605013343009-c126c3dc2f9d","Nadja Oertlin"]],
 local:[["1551632436-cbf8dd35adfa","Louis Hansel"],["1560053608-13721e0d69e8","Igor Rand"],["1625418277638-6db2d521a78c","Veronika Hradilová"],["1527253862047-63b8b10f38e5","Fredrik Öhlander"]]
};
/* palabras → tipo de foto (el orden importa: lo más concreto primero) */
var CATS=[
 ["postre",/postre|tarta|pastel|chocolate|dulce|helado|coulant|flan|tiramis|dessert|cake|nachtisch|kuchen|g[aâ]teau/],
 ["coctel",/c[oó]ctel|cocktail|mojito|copa|copas|gin|ginebra|ron\b|happy ?hour|bebida|drink|spritz|sangr[ií]a|pi[nñ]a colada|margarita|aperol/],
 ["paella",/paella|arroz|arr[oò]s|bogavante|socarrat|\brice\b|\breis\b|\briz\b/],
 ["brunch",/brunch|desayuno|caf[eé]|tostada|breakfast|fr[uü]hst[uü]ck|petit.d[eé]jeuner|zumo|croissant|tortilla/],
 ["marisco",/marisco|pescado|gamba|pulpo|calamar|mejill|seafood|fish|fisch|poisson|ostra/],
 ["burger",/hamburgues|burger/],
 ["tapas",/tapa|croqueta|pincho|aperitivo|bravas|jam[oó]n/],
 ["evento",/evento|fiesta|m[uú]sica|concierto|directo|\bdj\b|noche|party|karaoke|partido|f[uú]tbol|baile|caribe|show|event|live/],
 ["terraza",/terraza|\bsol\b|verano|atardecer|terrace|terrasse|sunset/],
 ["local",/rese[nñ]a|estrellas|cliente|empresa|grupo|celebraci|cumplea|equipo|bienvenid|review/],
 ["plato",/men[uú]|plato|carne|entrecot|churrasco|parrilla|mofongo|comida|almuerzo|cena|temporada|carta|steak|lunch|dinner/]
];
function sinTildes(s){return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}
function catDe(t){var s=(t||"").toLowerCase(),s2=sinTildes(t);for(var k=0;k<CATS.length;k++){if(CATS[k][1].test(s)||CATS[k][1].test(s2))return CATS[k][0];}return "plato";}
function fotoUrl(id,w,h){return "https://images.unsplash.com/photo-"+id+"?auto=format&fit=crop&q=80&w="+w+(h?"&h="+h:"");}
function fotoDe(cat,n){var a=F[cat]||F.plato;return a[((n%a.length)+a.length)%a.length];}
var SEM=Math.floor(Math.random()*97);

/* ---------- utilidades ---------- */
function $(id){return document.getElementById(id);}
function esc(s){return(s==null?"":""+s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function vertical(p){return p.formato==="reel"||p.formato==="historia";}
function aspecto(p){return vertical(p)?"9/16":(p.formato==="carrusel"?"4/5":"1/1");}
function N(){return S.negocio||{};}
function esperar(ms){return new Promise(function(r){setTimeout(r,ms);});}
function cargarImg(src){return new Promise(function(ok,ko){var im=new Image();im.crossOrigin="anonymous";im.onload=function(){ok(im);};im.onerror=ko;im.src=src;});}
function esMovil(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.userAgent));}
function copiar(t){try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).then(function(){return true;},function(){return copiarViejo(t);});}catch(e){}return Promise.resolve(copiarViejo(t));}
function copiarViejo(t){try{var a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();var ok=document.execCommand("copy");document.body.removeChild(a);return ok;}catch(e){return false;}}

/* ---------- textos ---------- */
var KICK=[["Hoy en "+"{neg}","Recién hecho","De nuestra cocina"],["Solo este finde","Plazas limitadas","No te lo pierdas"],["¿Te apuntas?","Te preguntamos","¿Ya lo probaste?"],["Palma · Mallorca","Tu sitio en Palma","Desde 1968"]];
function capital(s){s=(s||"").trim();return s.charAt(0).toUpperCase()+s.slice(1);}
function tituloCorto(s){s=capital((s||"").replace(/[#@].*$/,"").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,"").trim());if(s.length>42){var c=s.slice(0,42);s=c.slice(0,c.lastIndexOf(" ")>18?c.lastIndexOf(" "):42)+"…";}return s||"Te esperamos";}
function ctasPorDefecto(){return [{t:"📅 Reservar",tipo:"reserva",url:""},{t:"🌐 Ver web",tipo:"web",url:""}];}
function fechaBonita(f){if(!f)return "";try{var d=new Date(f);return d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"})+" · "+d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});}catch(e){return f;}}
function proximo(dow,h){var d=new Date();d.setHours(h,0,0,0);var add=(dow-d.getDay()+7)%7;if(add===0&&new Date()>d)add=7;d.setDate(d.getDate()+add);var p=function(n){return (n<10?"0":"")+n;};return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(h)+":00";}

/* ---------- ejemplos listos de El Paraíso ---------- */
function ejemplos(){
 var neg=N().nombre||"El Paraíso";
 return [
  {ang:"🥘 Paella del domingo",formato:"post",cat:"paella",foto:0,L:0,titulo:"Paella de bogavante",kicker:"Este domingo",
   txt:"Domingo de paella en "+neg+" 🥘\n\nBogavante, fumet casero y ese socarrat que se pelea en la mesa. La hacemos al momento, para dos o para toda la familia.\n\n📍 Carrer d'Anselm Turmeda, 5 · Palma\n⏰ Domingos de 11:30 a 22:30",
   tags:"#paella #bogavante #Palma #Mallorca #ElParaisoPalma",fecha:proximo(0,12),por:"La foto del plato estrella y la hora concreta es lo que más reservas trae en fin de semana."},
  {ang:"🍽️ Menú del día",formato:"carrusel",cat:"plato",foto:1,L:2,titulo:"Menú del día",kicker:"De lunes a viernes",
   txt:"Menú del día en "+neg+" 🍽️\n\nPrimero, segundo, postre, pan y bebida. Cocina casera mediterránea y caribeña, hecha cada mañana.\n\nDe lunes a viernes a mediodía (los miércoles descansamos). ¿Te guardamos mesa?",
   tags:"#menudeldia #Palma #comidacasera #Mallorca",fecha:proximo(1,11),por:"Publicarlo a las 11:00 pilla a la gente pensando dónde comer."},
  {ang:"🍹 Cócteles al atardecer",formato:"reel",cat:"coctel",foto:5,L:1,titulo:"Cócteles en la terraza",kicker:"Happy hour",
   txt:"Atardecer en la terraza 🍹\n\nMojitos, piña colada y cócteles de la casa para empezar el finde con buen ambiente.\n\nTe esperamos en "+neg+", Palma.",
   tags:"#mojito #cocktails #terraza #Palma #Mallorca",fecha:proximo(5,18),por:"Los reels de bebidas en movimiento son lo que más se comparte en verano."},
  {ang:"🎶 Evento del fin de semana",formato:"historia",cat:"evento",foto:3,L:3,titulo:"Noche caribeña",kicker:"Sábado · 21:00",
   txt:"Este sábado, noche caribeña en "+neg+" 🎶\n\nMúsica en directo, mofongo, churrasco y buen ron. Plazas limitadas: reserva tu mesa.\n\n📅 Sábado desde las 21:00",
   tags:"#musicaendirecto #planfinde #Palma #Mallorca",fecha:proximo(4,19),por:"Las historias con fecha y botón de reserva convierten el evento en mesas llenas."}
 ];
}

/* =====================================================================
   PANTALLA: tarjetas
   ===================================================================== */
function nuevoPost(o){
  var p={txt:o.txt||"",tags:o.tags||"",ang:o.ang||"",por:o.por||"",formato:o.formato||window._formato||"post",
    titulo:o.titulo||tituloCorto(o.idea||o.txt),kicker:o.kicker||"",cat:o.cat||catDe((o.idea||"")+" "+o.txt),
    foto:(o.foto!=null?o.foto:0),L:(o.L!=null?o.L:0),media:null,creando:false,ctas:ctasPorDefecto(),fecha:o.fecha||"",sinTexto:false,slide:0};
  return p;
}
function cabecera(){var n=N();return '<div class="ph"><div class="av">'+esc(n.logo||"🍽️")+'</div><div style="min-width:0"><div style="font-weight:700;font-size:13px">'+esc(n.nombre)+'</div><div style="font-size:11px;color:var(--tx3)">'+esc(n.ciudad||"")+'</div></div></div>';}
function fmtNombre(f){return {post:"🖼️ Post",carrusel:"🎠 Carrusel",historia:"📸 Historia",reel:"🎬 Reel"}[f]||"🖼️ Post";}

function tarjeta(i){
  var p=window._posts[i];
  return '<div class="cm-card" id="cmCard_'+i+'">'+
    '<div class="cm-top"><div class="ang">'+esc(p.ang)+'</div><span class="chip">'+fmtNombre(p.formato)+'</span>'+
      (p.fecha?'<span class="cm-fecha" onclick="cmEditar('+i+',\'fecha\')" title="Cambiar fecha">🗓️ '+esc(fechaBonita(p.fecha))+'</span>':'')+'</div>'+
    '<div class="cm-post">'+(typeof ofertaBadge==="function"?ofertaBadge():"")+'<div class="pacc"></div>'+cabecera()+
      '<div class="cm-media" id="img_'+i+'" style="aspect-ratio:'+aspecto(p)+'">'+medio(i,false)+'</div>'+
      '<div class="cm-body">'+
        '<div class="cm-ed" contenteditable="true" spellcheck="false" data-i="'+i+'" data-k="txt" onblur="cmGuardarCampo(this)" aria-label="Texto de la publicación">'+esc(p.txt)+'</div>'+
        '<div class="cm-tags"><div class="cm-ed" contenteditable="true" spellcheck="false" data-i="'+i+'" data-k="tags" onblur="cmGuardarCampo(this)" aria-label="Hashtags">'+esc(p.tags)+'</div></div>'+
        '<div class="cm-ctas">'+p.ctas.map(function(c,k){return '<button class="'+(k===0?"p":"")+'" onclick="cmCta('+i+','+k+')">'+esc(c.t)+'</button>';}).join("")+'</div>'+
        '<div class="cm-hint">✏️ Toca el texto para cambiarlo · <a href="javascript:void 0" onclick="cmEditar('+i+')">editar todo</a></div>'+
      '</div></div>'+
    (p.por?'<div class="cm-por">💡 '+esc(p.por)+'</div>':'')+
    '<input type="file" accept="image/*,video/*" id="file_'+i+'" style="display:none" onchange="subirFoto('+i+',this)">'+
    '<div class="cm-acts">'+
      '<button class="btn pp" onclick="crearImagenIA('+i+')">'+(p.media&&p.media.tipo!=="propia"?"↻ Otra versión":"✨ Crear imagen con IA")+'</button>'+
      '<button class="btn g" onclick="cmElegirArchivo('+i+')">📷 '+(p.media&&p.media.tipo==="propia"?"Cambiar foto":"Subir foto o vídeo")+'</button>'+
      '<button class="btn g" onclick="cmEditar('+i+')">✏️ Editar</button>'+
      '<button class="btn g" onclick="programarGen('+i+')">📅 Programar</button>'+
      '<button class="btn full" onclick="publicarGen('+i+')">🚀 Publicar</button>'+
    '</div></div>';
}
function repintar(i){var c=$("cmCard_"+i);if(c)c.outerHTML=tarjeta(i);}
function repintarMedio(i){var d=$("img_"+i);if(d){d.style.aspectRatio=aspecto(window._posts[i]);d.innerHTML=medio(i,false);}}

/* escena: lo que se ve dentro de la imagen */
function escena(p,opt){
  opt=opt||{};var m=p.media,n=N();
  var V=vertical(p)||opt.vert;
  var src=m.tipo==="propia"?m.url:(m.slides?m.slides[p.slide||0].url:m.url);
  var tit=(m.slides&&p.slide>0)?(p.slide===1?"Hecho cada día":"Reserva tu mesa"):p.titulo;
  var words=(tit||"").split(/\s+/).filter(Boolean).map(function(w,k){return '<span style="--d:'+(0.45+k*0.12).toFixed(2)+'s">'+esc(w)+'</span>';}).join("");
  var kb="k"+((p.foto||0)%4);
  var media=(m.esVideo?'<video class="kb" src="'+esc(src)+'" autoplay muted loop playsinline></video>':'<img class="kb '+kb+'" src="'+esc(src)+'" alt="'+esc(p.titulo)+'"'+(m.tipo==="propia"?'':' crossorigin="anonymous"')+'>');
  var kick=(p.kicker||"").replace("{neg}",n.nombre||"");
  return '<div class="cm-scene L'+(p.L||0)+(V?" V":"")+(p.sinTexto?" sinTexto":"")+'">'+media+
    '<div class="sh"></div><div class="gl"></div>'+(m.esVideo?'':'<div class="sw"></div>')+
    '<div class="br"><i>'+esc(n.logo||"🍽️")+'</i>'+esc(n.nombre||"")+'</div>'+
    (n.oferta?'<div class="of">🔥 '+esc(n.oferta)+'</div>':'')+
    '<div class="tx">'+(kick?'<div class="kk">'+esc(kick)+'</div>':'')+'<div class="tt">'+words+'</div>'+
      '<div class="ct">'+esc(p.ctas&&p.ctas[0]?p.ctas[0].t.replace(/^\S+\s/,"")+" →":"Reserva tu mesa →")+'</div></div>'+
  '</div>';
}
function medio(i,mini){
  var p=window._posts[i];
  if(p.creando)return '<div class="cm-crea"><div class="sp"></div><b>Creando tu imagen…</b><small id="cmPaso_'+i+'">Leyendo tu texto</small></div>';
  if(!p.media)return '<div class="cm-empty"><div class="ic">🖼️</div><div>Tu publicación todavía no tiene imagen</div><div class="row2">'+
    '<button class="p" onclick="crearImagenIA('+i+')">✨ Crear con IA</button><button onclick="cmElegirArchivo('+i+')">📷 Subir foto</button></div></div>';
  var m=p.media,h=escena(p);
  var nav="";
  if(m.slides&&m.slides.length>1){
    nav='<button class="cm-nav" style="left:6px" onclick="cmSlide('+i+',-1)" aria-label="Anterior">‹</button><button class="cm-nav" style="right:6px" onclick="cmSlide('+i+',1)" aria-label="Siguiente">›</button>'+
      '<div class="cm-dots">'+m.slides.map(function(s,k){return '<i class="'+(k===(p.slide||0)?"on":"")+'"></i>';}).join("")+'</div>';
  }
  var cred=m.cred?'<a class="cm-cred" href="https://unsplash.com/?utm_source=chispa&utm_medium=referral" target="_blank" rel="noopener">Foto: '+esc(m.cred)+' · Unsplash</a>':'';
  var badge='<div class="cm-badge">'+(m.tipo==="propia"?(m.esVideo?"🎬 Tu vídeo":"📷 Tu foto"):(m.tipo==="ia"?"✨ Imagen generada por IA":"✨ Creada por Chispa"))+'</div>';
  var tool='<div class="cm-tool">'+
    '<button title="Volver a animar" onclick="cmRepetir('+i+')">▶</button>'+
    (m.tipo!=="propia"?'<button title="Otra versión" onclick="crearImagenIA('+i+')">↻</button>':'<button title="Cambiar" onclick="cmElegirArchivo('+i+')">📷</button>')+
    '<button title="Descargar imagen o vídeo" onclick="cmExportar('+i+')">⬇</button>'+
    '<button title="Quitar imagen" onclick="cmQuitar('+i+')">✕</button></div>';
  return h+nav+(m.slides?"":badge)+cred+tool;
}

/* =====================================================================
   CREAR IMAGEN
   ===================================================================== */
function promptDe(p){
  var cat={paella:"Spanish lobster paella in a wide pan",coctel:"colourful cocktails and mojitos on a bar counter",plato:"plated Mediterranean dish of the day",evento:"lively restaurant evening with live music and warm lights",terraza:"sunny Mediterranean restaurant terrace",brunch:"Mediterranean breakfast with coffee and toast",postre:"elegant homemade dessert",marisco:"fresh seafood platter",burger:"gourmet burger",tapas:"Spanish tapas table",local:"cozy Mediterranean restaurant interior"}[p.cat]||"restaurant food";
  return "Professional food photography for Instagram, "+cat+", restaurant in Palma de Mallorca, natural light, shallow depth of field, appetizing, no text, no logos. Context: "+(p.titulo||"")+". "+(p.txt||"").slice(0,200);
}
/* ---------------------------------------------------------------------
   MOTOR DE IMAGEN INTERCAMBIABLE
   Una sola función: CHISPA_MOTOR.generar(pedido) → Promise<medio>.
   El proveedor se elige con CHISPA_MOTOR.proveedor:
     "fotos"    → fotos libres de Unsplash elegidas por el texto (gratis, sin clave). Por defecto.
     "servidor" → NUESTRO servidor de IA (o el Worker de conectores/imagen-ia-worker.js).
                  Recibe {prompt, formato, ancho, alto, cantidad} y devuelve {url} o {urls:[…]}.
                  La clave del modelo vive en el servidor, nunca en este fichero.
   Otro proveedor: CHISPA_MOTOR.proveedores.nombre = function(pedido){ return Promise<medio> }
   Si el proveedor elegido falla, cae solo a "fotos" para que nunca quede en blanco.
   --------------------------------------------------------------------- */
var MOTOR=window.CHISPA_MOTOR=window.CHISPA_MOTOR||{};
MOTOR.url=MOTOR.url||window.CHISPA_IA_URL||"";
MOTOR.proveedor=MOTOR.proveedor||(MOTOR.url?"servidor":"fotos");
MOTOR.proveedores=MOTOR.proveedores||{};
MOTOR.proveedores.fotos=function(q){
  var n=q.cantidad||1,sl=[];
  for(var s=0;s<n;s++){var f=fotoDe(q.cat,q.semilla+s*2);sl.push({url:fotoUrl(f[0],q.ancho,q.alto),cred:f[1]});}
  return Promise.all(sl.map(function(s){return cargarImg(s.url).catch(function(){});})).then(function(){
    return n>1?{tipo:"foto",slides:sl,url:sl[0].url,cred:sl[0].cred}:{tipo:"foto",url:sl[0].url,cred:sl[0].cred};});
};
MOTOR.proveedores.servidor=function(q){
  if(!MOTOR.url)return Promise.reject(new Error("Sin dirección del servidor de IA"));
  return fetch(MOTOR.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:q.prompt,formato:q.formato,ancho:q.ancho,alto:q.alto,cantidad:q.cantidad||1})})
    .then(function(r){if(!r.ok)throw new Error("El servidor de IA respondió "+r.status);return r.json();})
    .then(function(j){var urls=j&&(j.urls||(j.url?[j.url]:[]));if(!urls||!urls.length)throw new Error("El servidor no devolvió imagen");
      return Promise.all(urls.map(cargarImg)).then(function(){var sl=urls.map(function(u){return {url:u,cred:""};});
        return sl.length>1?{tipo:"ia",slides:sl,url:sl[0].url,cred:""}:{tipo:"ia",url:urls[0],cred:""};});});
};
MOTOR.generar=function(q){
  var fn=MOTOR.proveedores[MOTOR.proveedor]||MOTOR.proveedores.fotos;
  return fn(q).catch(function(e){if(fn===MOTOR.proveedores.fotos)throw e;try{console.warn("Motor de imagen «"+MOTOR.proveedor+"» falló; uso fotos:",e&&e.message);}catch(x){}return MOTOR.proveedores.fotos(q);});
};
var PASOS=["Leyendo tu texto","Eligiendo la mejor imagen","Ajustando luz y encuadre","Animando el texto"];
window.crearImagenIA=function(i){
  var p=window._posts&&window._posts[i];if(!p)return;
  if(p.media&&p.media.tipo!=="propia")p.foto=(p.foto||0)+1; // otra versión
  if(p.media&&p.media.tipo==="propia"&&p.media.url){try{URL.revokeObjectURL(p.media.url);}catch(e){}}
  p.creando=true;repintar(i);
  var t0=Date.now(),k=0,iv=setInterval(function(){k=(k+1)%PASOS.length;var e=$("cmPaso_"+i);if(e)e.textContent=PASOS[k];},450);
  var w=1080,h=vertical(p)?1920:(p.formato==="carrusel"?1350:1080);
  var listo=function(media){clearInterval(iv);var d=Math.max(0,1300-(Date.now()-t0));setTimeout(function(){p.creando=false;p.media=media;p.slide=0;repintar(i);toast(media.tipo==="ia"?"✨ Imagen creada por IA":"✨ Imagen lista · pulsa ↻ para otra versión");},d);};
  MOTOR.generar({prompt:promptDe(p),cat:p.cat,formato:p.formato,ancho:w,alto:h,cantidad:p.formato==="carrusel"?3:1,semilla:SEM+i*3+(p.foto||0)})
    .then(listo,function(){clearInterval(iv);p.creando=false;repintar(i);toast("No se pudo crear la imagen. Prueba otra vez.");});
};
window.cmSlide=function(i,d){var p=window._posts[i];var n=p.media.slides.length;p.slide=((p.slide||0)+d+n)%n;repintarMedio(i);};
window.cmRepetir=function(i){repintarMedio(i);};
window.cmQuitar=function(i){var p=window._posts[i];if(p.media&&p.media.tipo==="propia"){try{URL.revokeObjectURL(p.media.url);}catch(e){}}p.media=null;p.file=null;repintar(i);toast("Imagen quitada");};

/* =====================================================================
   SUBIR FOTO O VÍDEO (sin FileReader: URL.createObjectURL)
   ===================================================================== */
window.cmElegirArchivo=function(i){var inp=$("file_"+i);if(inp){inp.value="";inp.click();}};
window.subirFoto=function(i,inp){
  var f=inp.files&&inp.files[0];if(!f)return;
  var esV=/^video\//.test(f.type),esI=/^image\//.test(f.type)||/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name||"");
  if(!esV&&!esI){toast("Elige una foto o un vídeo 🙂");return;}
  var p=window._posts[i];
  if(p.media&&p.media.tipo==="propia"){try{URL.revokeObjectURL(p.media.url);}catch(e){}}
  p.media={tipo:"propia",url:URL.createObjectURL(f),esVideo:esV,nombre:f.name};p.file=f;p.creando=false;
  repintar(i);toast(esV?"Vídeo añadido ✓":"Foto añadida ✓");
};

/* =====================================================================
   EDITAR
   ===================================================================== */
window.cmGuardarCampo=function(el){var i=+el.getAttribute("data-i"),k=el.getAttribute("data-k");var p=window._posts[i];if(!p)return;var v=(el.innerText||"").replace(/\n{3,}/g,"\n\n").trim();if(v!==p[k]){p[k]=v;toast("Guardado ✓");}};
window.cmCta=function(i,k){var c=window._posts[i].ctas[k];if(!c)return;
  if(c.url){window.open(/^https?:|^tel:|^mailto:/.test(c.url)?c.url:"https://"+c.url,"_blank","noopener");return;}
  if(typeof abrirCta==="function"&&(c.tipo==="reserva"||c.tipo==="web"||c.tipo==="tel"))abrirCta(c.tipo);else cmEditar(i,"ctas");};
window.cmEditar=function(i,foco){
  var p=window._posts[i];
  var c0=p.ctas[0]||{t:"",url:""},c1=p.ctas[1]||{t:"",url:""};
  var f=function(id,lb,v,ph,type){return '<label class="lb" style="margin-top:10px">'+lb+'</label><input class="inp" id="'+id+'" type="'+(type||"text")+'" value="'+esc(v||"")+'" placeholder="'+esc(ph||"")+'">';};
  modal('<h3>✏️ Editar publicación</h3>'+
    '<label class="lb">Texto</label><textarea id="cmeTxt" style="min-height:120px">'+esc(p.txt)+'</textarea>'+
    f("cmeTags","Hashtags",p.tags,"#paella #Palma")+
    '<div class="row">'+'<div>'+f("cmeTit","Título sobre la imagen",p.titulo,"Paella de bogavante")+'</div><div>'+f("cmeKick","Frase pequeña de arriba",p.kicker,"Este domingo")+'</div></div>'+
    '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;color:var(--tx2)"><input type="checkbox" id="cmeSin" style="width:auto" '+(p.sinTexto?"checked":"")+'> Imagen limpia, sin texto encima</label>'+
    '<div class="row">'+'<div>'+f("cmeB0","Botón 1",c0.t,"📅 Reservar")+'</div><div>'+f("cmeU0","Enlace del botón 1",c0.url,"Vacío = el de Mi negocio")+'</div></div>'+
    '<div class="row">'+'<div>'+f("cmeB1","Botón 2",c1.t,"🌐 Ver web")+'</div><div>'+f("cmeU1","Enlace del botón 2",c1.url,"Vacío = el de Mi negocio")+'</div></div>'+
    '<div class="row"><div>'+f("cmeFecha","Fecha y hora de publicación",p.fecha,"","datetime-local")+'</div><div><label class="lb" style="margin-top:10px">Formato</label><select id="cmeFmt">'+
      ["post","carrusel","historia","reel"].map(function(x){return '<option value="'+x+'"'+(x===p.formato?" selected":"")+'>'+fmtNombre(x)+'</option>';}).join("")+'</select></div></div>'+
    '<label class="lb" style="margin-top:12px">Imagen</label><div class="row" style="gap:8px">'+
      '<button class="btn g sm" style="flex:none" onclick="cerrarModal();crearImagenIA('+i+')">✨ '+(p.media?"Otra versión":"Crear con IA")+'</button>'+
      '<button class="btn g sm" style="flex:none" onclick="cerrarModal();cmElegirArchivo('+i+')">📷 Subir la mía</button>'+
      (p.media?'<button class="btn g sm" style="flex:none" onclick="cerrarModal();cmQuitar('+i+')">✕ Quitar</button>':'')+'</div>'+
    '<p style="font-size:11.5px;color:var(--tx3);margin:10px 0 0">Si dejas un enlace vacío, el botón usa el de «Mi negocio».</p>'+
    '<button class="btn pp" style="width:100%;margin-top:14px" onclick="cmGuardarEdicion('+i+')">💾 Guardar cambios</button>');
  setTimeout(function(){var map={fecha:"cmeFecha",ctas:"cmeU0"};var el=$(map[foco]||"cmeTxt");if(el)el.focus();},60);
};
window.cmGuardarEdicion=function(i){
  var p=window._posts[i],v=function(id){var e=$(id);return e?e.value:"";};
  var fmt=v("cmeFmt"),cambioFmt=fmt!==p.formato;
  p.txt=v("cmeTxt").trim();p.tags=v("cmeTags").trim();p.titulo=v("cmeTit").trim();p.kicker=v("cmeKick").trim();p.sinTexto=$("cmeSin").checked;
  p.ctas=[{t:v("cmeB0").trim()||"📅 Reservar",tipo:"reserva",url:v("cmeU0").trim()},{t:v("cmeB1").trim()||"🌐 Ver web",tipo:"web",url:v("cmeU1").trim()}];
  p.fecha=v("cmeFecha");p.formato=fmt;
  cerrarModal();
  if(cambioFmt&&p.media&&p.media.tipo!=="propia"){p.media=null;repintar(i);crearImagenIA(i);}else repintar(i);
  toast("Publicación guardada ✓");
};
window.programarGen=function(i){
  var p=window._posts[i];if(!p)return;
  if(!p.fecha){cmEditar(i,"fecha");toast("Elige el día y la hora 🙂");return;}
  var d=new Date(p.fecha),dia=(d.getDay()+6)%7;
  S.programados.push({dia:dia,txt:((p.titulo||p.txt.split("\n")[0])+" · "+d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})).slice(0,38),tipo:"p"});
  guardar();toast("📅 Programado para "+fechaBonita(p.fecha)+" ✓ (en el Calendario)");
};

/* =====================================================================
   GENERAR (sustituye al de index.html)
   ===================================================================== */
function pintar(lista,cabeceraHtml){
  window._posts=lista;window._fotos={};window._fotosArr={};window._cIdx={};
  var html=cabeceraHtml+'<div class="ideas cm-wrap">'+lista.map(function(p,i){return tarjeta(i);}).join("")+'</div>'+(typeof avisoConectar==="function"?avisoConectar():"");
  $("resultado").innerHTML=html;
}
function tiraEjemplos(){
  return '<div class="cm-lbl" style="margin-top:4px">Ejemplos listos de '+esc(N().nombre)+' · toca uno</div><div class="cm-ej">'+ejemplos().map(function(e,k){var f=fotoDe(e.cat,e.foto);
    return '<button class="cm-ejb" onclick="cmEjemplo('+k+')"><img src="'+fotoUrl(f[0],480,360)+'" alt="" loading="lazy"><span>'+esc(e.ang)+'<small>'+fmtNombre(e.formato)+'</small></span></button>';}).join("")+'</div>';
}
window.cmEjemplos=function(){
  var L=ejemplos().map(function(e){var p=nuevoPost(e);return p;});
  pintar(L,'<div class="card prop"><div class="pl">⚡ Propuesta de hoy</div><div style="font-size:13.5px;color:var(--tx2);margin-top:4px">Cuatro publicaciones listas para <b style="color:var(--tx)">'+esc(N().nombre)+'</b>, cada una con su imagen. Toca cualquier texto para cambiarlo, o escribe tu idea arriba.</div></div>'+
    '<div class="hd" style="margin-top:4px"><h2>Elige tu publicación</h2><button class="btn g sm" onclick="cmEjemplos()">↻ Otras fotos</button></div>');
  SEM++;
  L.forEach(function(p,i){crearImagenIA(i);});
};
window.cmEjemplo=function(k){var e=ejemplos()[k];var b=$("idea");if(b)b.value=e.titulo;cmEjemplos();setTimeout(function(){var c=$("cmCard_"+k);if(c)c.scrollIntoView({behavior:"smooth",block:"center"});},80);};
window.proponerHoy=function(){var r=$("resultado");if(!r)return;cmEjemplos();var c=document.querySelector("#main .card");if(c&&!$("cmTira")){var d=document.createElement("div");d.id="cmTira";d.innerHTML=tiraEjemplos();c.parentNode.insertBefore(d,c.nextSibling);}};

window.generar=function(ideaOpt,auto){
  var idea=(typeof ideaOpt==="string"&&ideaOpt)?ideaOpt:(($("idea")&&$("idea").value||"").trim());
  if(!idea){toast("Escribe una idea primero 🙂");return;}
  if($("idea"))$("idea").value=idea;
  var n=N(),tag=(typeof hashIdea==="function"?hashIdea(idea):"Palma"),donde=n.nombre+(n.ciudad?(", en "+n.ciudad):"");
  var LC=window._lang||"es",VT=(LC==="es")?null:(window.ANGL_T||{})[LC];
  var ANG=window.ANGULOS||[];
  var cat=catDe(idea);
  var L=ANG.map(function(a,i){
    var vv=(VT&&VT[i]&&VT[i].v)?VT[i].v:a.v;
    var txt=vv[Math.floor(Math.random()*vv.length)].replace(/{idea}/g,idea).replace(/{neg}/g,donde);
    if(n.oferta)txt+="\n\n🔥 "+n.oferta;
    var tt=(VT&&VT[i]&&VT[i].tags)?VT[i].tags:a.tags;
    var kk=KICK[i%KICK.length];
    var tit=i===2?("¿"+tituloCorto(idea).replace(/^¿|\?$/g,"")+"?"):tituloCorto(idea);
    if(i===1&&n.oferta)kk=[n.oferta];
    return nuevoPost({ang:a.k,por:a.por,txt:txt,tags:tt.map(function(t){return t.replace("{tag}",tag);}).join(" "),idea:idea,titulo:tit,kicker:kk[Math.floor(Math.random()*kk.length)],cat:cat,foto:i,L:i%4});
  });
  pintar(L,(auto?'<div class="card prop"><div class="pl">⚡ Propuesta de hoy</div><div style="font-size:13.5px;color:var(--tx2);margin-top:4px">Te he preparado esto sobre <b style="color:var(--tx)">'+esc(idea)+'</b>.</div></div>':'')+
    '<div class="hd" style="margin-top:4px"><h2>✅ Chispa te preparó '+L.length+' versiones</h2><button class="btn g sm" onclick="generar()">↻ Más ideas</button></div>'+
    '<p style="color:var(--tx3);font-size:12.5px;margin:-4px 0 10px">Para <b>'+esc(donde)+'</b>'+(n.oferta?' · oferta activa: <b style="color:var(--amber)">'+esc(n.oferta)+'</b>':'')+'. Cada una lleva su imagen; toca el texto para cambiarlo, sube tu foto o pide otra versión.</p>');
  L.forEach(function(p,i){crearImagenIA(i);});
  if(!auto)$("resultado").scrollIntoView({behavior:"smooth",block:"start"});
};

/* =====================================================================
   DIBUJAR EN CANVAS (para descargar imagen / vídeo)
   ===================================================================== */
function fuentesListas(){try{return Promise.all([document.fonts.load("800 60px Inter"),document.fonts.load("italic 600 60px Fraunces"),document.fonts.load("600 60px Fraunces"),document.fonts.load("700 30px Inter")]).catch(function(){});}catch(e){return Promise.resolve();}}
function ease(t){return t<0?0:t>1?1:1-Math.pow(1-t,3);}
function envolver(x,txt,maxW){var w=(txt||"").split(/\s+/),l=[],c="";for(var k=0;k<w.length;k++){var t=c?c+" "+w[k]:w[k];if(x.measureText(t).width>maxW&&c){l.push(c);c=w[k];}else c=t;}if(c)l.push(c);return l;}
function rr(x,X,Y,W,H,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+W,Y,X+W,Y+H,r);x.arcTo(X+W,Y+H,X,Y+H,r);x.arcTo(X,Y+H,X,Y,r);x.arcTo(X,Y,X+W,Y,r);x.closePath();}
function dibujar(x,W,H,p,fuente,t,dur){
  var Lw=p.L||0,n=N(),u=W/100,V=H>W*1.3;
  // fondo con Ken Burns
  var k=ease(t/dur),dir=(p.foto||0)%4;
  var s0=[1.04,1.2,1.06,1.14][dir],s1=[1.2,1.04,1.18,1.04][dir];
  var tx0=[0,3,-2,0][dir],tx1=[-3,0,2,0][dir],ty0=[0,1,2,-3][dir],ty1=[-2,0,-2,2][dir];
  var sc=s0+(s1-s0)*(t/dur),ox=(tx0+(tx1-tx0)*(t/dur))*u,oy=(ty0+(ty1-ty0)*(t/dur))*H/100;
  if(p.media&&p.media.esVideo){sc=1;ox=0;oy=0;}
  x.fillStyle="#000";x.fillRect(0,0,W,H);
  if(fuente){var iw=fuente.videoWidth||fuente.naturalWidth||fuente.width,ih=fuente.videoHeight||fuente.naturalHeight||fuente.height;
    if(iw&&ih){var r=Math.max(W/iw,H/ih)*sc,dw=iw*r,dh=ih*r;x.drawImage(fuente,(W-dw)/2+ox,(H-dh)/2+oy,dw,dh);}}
  // sombras
  var g;
  if(Lw===1){g=x.createRadialGradient(W/2,H*.55,W*.1,W/2,H*.55,Math.max(W,H)*.75);g.addColorStop(0,"rgba(0,0,0,.25)");g.addColorStop(1,"rgba(0,0,0,.72)");}
  else{g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"rgba(0,0,0,.35)");g.addColorStop(.3,"rgba(0,0,0,0)");g.addColorStop(.5,"rgba(0,0,0,0)");g.addColorStop(1,Lw===2?"rgba(10,8,20,.9)":"rgba(0,0,0,.82)");}
  x.fillStyle=g;x.fillRect(0,0,W,H);
  // brillo que cruza
  if(!(p.media&&p.media.esVideo)){var sw=((t*1000)%7000)/7000;if(sw<.45){var px=-W*.6+(sw/.45)*W*2.2;var gs=x.createLinearGradient(px-W*.25,0,px+W*.25,H*.3);gs.addColorStop(0,"rgba(255,236,190,0)");gs.addColorStop(.5,"rgba(255,236,190,.16)");gs.addColorStop(1,"rgba(255,236,190,0)");x.fillStyle=gs;x.fillRect(0,0,W,H);}}
  if(Lw===3){x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=Math.max(2,u*.25);rr(x,3.6*u,3.6*u,W-7.2*u,H-7.2*u,2*u);x.stroke();}
  // marca
  var aB=ease(t/0.6);x.globalAlpha=aB;
  x.font="700 "+(3.6*u)+"px Inter, sans-serif";x.textBaseline="middle";
  var bx=5.5*u,by=9*u,lbl=n.nombre||"";
  if(Lw===3){var bw=8*u+2*u+x.measureText(lbl).width;bx=(W-bw)/2;by=11.5*u;}
  x.fillStyle="rgba(255,255,255,.92)";x.beginPath();x.arc(bx+4*u,by,4*u,0,7);x.fill();
  x.font=(4.4*u)+"px sans-serif";x.textAlign="center";x.fillStyle="#111";x.fillText(n.logo||"🍽️",bx+4*u,by+.2*u);
  x.textAlign="left";x.font="700 "+(3.6*u)+"px Inter, sans-serif";x.fillStyle="#fff";x.fillText(lbl,bx+10*u,by);
  x.globalAlpha=1;
  if(p.sinTexto)return;
  // oferta
  if(n.oferta){var ao=ease((t-1.9)/0.5);if(ao>0){x.save();x.globalAlpha=ao;x.font="800 "+(3.6*u)+"px Inter, sans-serif";var ot="🔥 "+n.oferta,ow=x.measureText(ot).width+6.4*u;x.translate(W-5*u-ow/2,8*u);x.rotate(.05);x.scale(.6+.4*ao,.6+.4*ao);var go=x.createLinearGradient(-ow/2,0,ow/2,0);go.addColorStop(0,"#fb7185");go.addColorStop(1,"#ffb020");x.fillStyle=go;rr(x,-ow/2,-3.6*u,ow,7.2*u,3.6*u);x.fill();x.fillStyle="#2a0b0b";x.textAlign="center";x.fillText(ot,0,.2*u);x.restore();}}
  // titular
  var serif=(Lw===1||Lw===2),fs=(Lw===1?11:Lw===2?11.5:Lw===3?9:10.5)*u*(V?(Lw===3?1.1:1.14):1);
  var font=(Lw===1?"italic 600 ":serif?"600 ":"800 ")+fs+"px "+(serif?"Fraunces, Georgia, serif":"Inter, sans-serif");
  x.font=font;var tit=(p.titulo||"");if(Lw===3)tit=tit.toUpperCase();
  var lines=envolver(x,tit,W-13*u),lh=fs*1.05;
  var kick=(p.kicker||"").replace("{neg}",n.nombre||"");
  var cta=(p.ctas&&p.ctas[0]?p.ctas[0].t.replace(/^\S+\s/,""):"Reserva tu mesa")+" →";
  var kH=kick?7*u:0,cH=12*u,blockH=kH+3*u+lines.length*lh+cH;
  var center=(Lw===1||Lw===3),left=6.5*u;
  var y0=(Lw===1)?(H-blockH)/2:H-(V?16:Lw===3?10:7)*u-blockH;
  x.textBaseline="alphabetic";x.shadowColor="rgba(0,0,0,.45)";x.shadowBlur=18;
  // frase pequeña
  if(kick){var ak=ease((t-.25)/.7);if(ak>0){x.save();x.globalAlpha=ak;x.font="700 "+(3.6*u)+"px Inter, sans-serif";var kw=x.measureText(kick.toUpperCase()).width+kick.length*.5*u+5.2*u;var kx=center?(W-kw)/2:left;kx+=(1-ak)*-12;
      x.shadowBlur=0;if(Lw===1){x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=2;x.beginPath();x.moveTo(kx,y0);x.lineTo(kx+kw,y0);x.moveTo(kx,y0+kH);x.lineTo(kx+kw,y0+kH);x.stroke();}
      else{x.fillStyle=Lw===2?(n.color||"#8b5cf6"):"rgba(255,255,255,.2)";rr(x,kx,y0,kw,kH,Lw===2?3:kH/2);x.fill();}
      x.fillStyle="#fff";x.textBaseline="middle";if("letterSpacing" in x)x.letterSpacing=(.5*u)+"px";x.fillText(kick.toUpperCase(),kx+2.6*u,y0+kH/2+.2*u);if("letterSpacing" in x)x.letterSpacing="0px";x.restore();}}
  // palabras que entran
  x.font=font;x.textBaseline="alphabetic";var wi=0;
  for(var li=0;li<lines.length;li++){
    var ws=lines[li].split(" "),lw=x.measureText(lines[li]).width,cx=center?(W-lw)/2:left,yy=y0+kH+3*u+(li+1)*lh-lh*.18;
    for(var w=0;w<ws.length;w++){var d=.45+wi*.12,a=ease((t-d)/.8);wi++;var ww=x.measureText(ws[w]+" ").width;
      if(a>0){x.save();x.globalAlpha=a;x.fillStyle="#fff";x.fillText(ws[w],cx,yy+(1-a)*lh*.45);x.restore();}cx+=ww;}
  }
  x.shadowBlur=0;
  // botón
  var ac=ease((t-1.5)/.6);if(ac>0){x.save();x.font="800 "+(3.8*u)+"px Inter, sans-serif";var cw=x.measureText(cta).width+8*u,ch=9*u,cx2=center?(W-cw)/2:left,cy=y0+kH+3*u+lines.length*lh+3*u;
    x.translate(cx2+cw/2,cy+ch/2);var scc=.6+.4*Math.min(1,ac*1.15);x.scale(scc,scc);x.globalAlpha=Math.min(1,ac);
    x.shadowColor="rgba(0,0,0,.35)";x.shadowBlur=20;x.fillStyle="#ffcc33";rr(x,-cw/2,-ch/2,cw,ch,ch/2);x.fill();x.shadowBlur=0;x.fillStyle="#1a1200";x.textAlign="center";x.textBaseline="middle";x.fillText(cta,0,.3*u);x.restore();}
}
function fuenteDe(p){
  var m=p.media;if(!m)return Promise.resolve(null);
  var src=m.slides?m.slides[p.slide||0].url:m.url;
  if(m.esVideo)return new Promise(function(ok){var v=document.createElement("video");v.muted=true;v.playsInline=true;v.loop=true;v.src=src;v.oncanplay=function(){v.oncanplay=null;ok(v);};v.onerror=function(){ok(null);};v.load();});
  return cargarImg(src).catch(function(){return null;});
}
function medidas(p){return vertical(p)?[1080,1920]:(p.formato==="carrusel"?[1080,1350]:[1080,1080]);}
function hacerImagen(p){
  return Promise.all([fuentesListas(),fuenteDe(p)]).then(function(r){var src=r[1],wh=medidas(p),c=document.createElement("canvas");c.width=wh[0];c.height=wh[1];
    var x=c.getContext("2d");dibujar(x,wh[0],wh[1],p,src,4,6);
    return new Promise(function(ok,ko){try{c.toBlob(function(b){b?ok(b):ko(new Error("vacío"));},"image/jpeg",.92);}catch(e){ko(e);}});});
}
function tipoVideo(){var t=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];if(!window.MediaRecorder)return "";for(var k=0;k<t.length;k++){try{if(MediaRecorder.isTypeSupported(t[k]))return t[k];}catch(e){}}return "";}
function hacerVideo(p,progreso,dur){
  dur=dur||6;var mt=tipoVideo();if(!mt)return Promise.reject(new Error("Este navegador no graba vídeo"));
  return Promise.all([fuentesListas(),fuenteDe(p)]).then(function(r){
    var src=r[1],wh=[1080,1920];
    if(!vertical(p)&&p.formato!=="carrusel")wh=[1080,1080];
    if(p.formato==="carrusel")wh=[1080,1350];
    var c=document.createElement("canvas");c.width=wh[0];c.height=wh[1];var x=c.getContext("2d");
    if(src&&src.play){try{src.currentTime=0;src.play();}catch(e){}}
    var st=c.captureStream(30),rec=new MediaRecorder(st,{mimeType:mt,videoBitsPerSecond:8000000}),trozos=[];
    rec.ondataavailable=function(e){if(e.data&&e.data.size)trozos.push(e.data);};
    return new Promise(function(ok,ko){
      rec.onstop=function(){if(src&&src.pause)try{src.pause();}catch(e){}ok(new Blob(trozos,{type:mt.split(";")[0]}));};
      rec.onerror=function(e){ko(e.error||e);};
      var t0=performance.now();rec.start(250);
      (function paso(){var t=(performance.now()-t0)/1000;dibujar(x,wh[0],wh[1],p,src,Math.min(t,dur),dur);if(progreso)progreso(Math.min(1,t/dur));
        if(t<dur)requestAnimationFrame(paso);else setTimeout(function(){rec.stop();},120);})();
    });
  });
}
function nombreArchivo(p,ext){return (sinTildes(N().nombre||"chispa")+"-"+sinTildes(p.titulo||"post")).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)+"."+ext;}
function ext(b){return /mp4/.test(b.type)?"mp4":/webm/.test(b.type)?"webm":/png/.test(b.type)?"png":"jpg";}
function bajar(b,nombre){var u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=nombre;document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},4000);}
function compartirArchivo(b,nombre,texto){
  try{var f=new File([b],nombre,{type:b.type});if(navigator.canShare&&navigator.canShare({files:[f]})){return navigator.share({files:[f],text:texto}).then(function(){return "compartido";},function(e){return (e&&e.name==="AbortError")?"cancelado":"error";});}}catch(e){}
  return Promise.resolve("no");
}

/* ---------- ventana para descargar ---------- */
function ov(){var o=$("cmOv");if(!o){o=document.createElement("div");o.id="cmOv";o.className="cm-ov";o.innerHTML='<div class="cm-box" id="cmBox" role="dialog" aria-modal="true"></div>';document.body.appendChild(o);o.addEventListener("click",function(e){if(e.target===o)cmCerrar();});}return o;}
window.cmCerrar=function(){var o=$("cmOv");if(o)o.classList.remove("on");document.body.style.overflow="";};
function abrirOv(html){var o=ov();$("cmBox").innerHTML=html;o.classList.add("on");document.body.style.overflow="hidden";$("cmBox").scrollTop=0;}
window.cmExportar=function(i){
  var p=window._posts[i];if(!p.media){toast("Primero crea o sube una imagen 🙂");return;}
  var puedeV=!!tipoVideo();
  abrirOv('<div class="cm-bh"><h3>⬇ Descargar para redes</h3><button class="x" onclick="cmCerrar()" aria-label="Cerrar">×</button></div><div class="cm-bb"><div class="cm-exp">'+
    '<p style="margin:0;color:var(--tx2);font-size:14px">La imagen sale con el texto y tu marca encima, lista para subir. El vídeo dura 6 segundos, con el zoom lento y el texto entrando.</p>'+
    '<button class="btn pp cm-big" onclick="cmBajarImg('+i+')">🖼️ Descargar imagen ('+medidas(p).join("×")+')</button>'+
    (puedeV?'<button class="btn cm-big" style="margin-top:0" onclick="cmBajarVid('+i+')">🎬 Descargar vídeo vertical (6 s)</button>':'<div class="cm-note">Este navegador no puede grabar vídeo. En el iPhone (Safari) y en Chrome sí.</div>')+
    '<div class="cm-bar" id="cmBar" style="display:none"><i></i></div><div id="cmExpMsg" style="font-size:12.5px;color:var(--tx3)"></div></div></div>');
};
window.cmBajarImg=function(i){var p=window._posts[i];$("cmExpMsg").textContent="Preparando la imagen…";
  hacerImagen(p).then(function(b){var nm=nombreArchivo(p,"jpg");if(esMovil())return compartirArchivo(b,nm,p.txt).then(function(r){if(r==="no")bajar(b,nm);$("cmExpMsg").textContent="✓ Imagen lista";});bajar(b,nm);$("cmExpMsg").textContent="✓ Imagen descargada";})
  .catch(function(){$("cmExpMsg").textContent="No se pudo preparar la imagen. Prueba otra versión.";});};
window.cmBajarVid=function(i){var p=window._posts[i],bar=$("cmBar");bar.style.display="block";$("cmExpMsg").textContent="Grabando el vídeo… (6 segundos)";
  var vp=Object.assign({},p);if(!vertical(p)&&p.formato!=="carrusel")vp.formato="reel";
  hacerVideo(vp,function(f){bar.firstChild.style.width=(f*100)+"%";}).then(function(b){var nm=nombreArchivo(p,ext(b));window._cmUltimoVideo={i:i,b:b};
    if(esMovil())return compartirArchivo(b,nm,p.txt).then(function(r){if(r==="no")bajar(b,nm);$("cmExpMsg").textContent="✓ Vídeo listo";});
    bajar(b,nm);$("cmExpMsg").textContent="✓ Vídeo descargado ("+ext(b).toUpperCase()+", "+Math.round(b.size/1024)+" KB)";})
  .catch(function(e){$("cmExpMsg").textContent="No se pudo grabar el vídeo: "+(e&&e.message||"error");});};

/* =====================================================================
   PUBLICAR
   ===================================================================== */
var REDES=[
 {id:"igf",nm:"Instagram",sub:"Publicación en el muro",cls:"ig",ic:"◎",vert:false,subir:"https://www.instagram.com/"},
 {id:"igs",nm:"Instagram Stories",sub:"Historia de 24 horas",cls:"ig",ic:"◉",vert:true,subir:"https://www.instagram.com/"},
 {id:"tt",nm:"TikTok",sub:"Vídeo vertical",cls:"tt",ic:"♪",vert:true,subir:"https://www.tiktok.com/upload"},
 {id:"fb",nm:"Facebook",sub:"Publicación en tu página",cls:"fb",ic:"f",vert:false,subir:"https://www.facebook.com/"},
 {id:"wa",nm:"WhatsApp Estado",sub:"Lo ven tus contactos",cls:"wa",ic:"✆",vert:true,subir:""},
 {id:"yt",nm:"YouTube Shorts",sub:"Vídeo corto vertical",cls:"yt",ic:"▶",vert:true,subir:"https://www.youtube.com/upload"}
];
var PUB={i:0,sel:{igf:1,igs:1,fb:1,wa:1},tab:"igf",paso:1,hecho:{}};
function red(id){for(var k=0;k<REDES.length;k++)if(REDES[k].id===id)return REDES[k];return REDES[0];}
function textoCompleto(p){return (p.txt||"")+(p.tags?"\n\n"+p.tags:"");}
function miniEscena(p,vert,h){
  if(!p.media)return '<div style="height:'+h+'px;display:grid;place-items:center;color:#888;background:#eee;font-size:12px">Sin imagen</div>';
  var q=Object.assign({},p);if(vert&&!vertical(p))q.formato="reel";if(!vert&&vertical(p))q.formato="post";
  return '<div style="position:relative;height:'+h+'px">'+escena(q,{vert:vert})+'</div>';
}
function telefono(contenido,oscuro){return '<div class="cm-phone"><div class="isl"></div><div class="scr'+(oscuro?" dark":"")+'">'+contenido+'</div></div>';}
function sb(osc){return '<div class="pv-sb" style="'+(osc?"color:#fff":"")+'"><span>'+new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})+'</span><span>●●● 5G ▮</span></div>';}
function usuario(){var n=N();return (n.instagram||"").replace(/^.*instagram\.com\//,"").replace(/^@/,"").replace(/\/.*$/,"")||sinTildes(n.nombre||"tunegocio").replace(/[^a-z0-9]+/g,"")+"palma";}
function vista(p,id,pub){
  var n=N(),u=usuario(),cap=esc(textoCompleto(p)),ctaT=esc(p.ctas&&p.ctas[0]?p.ctas[0].t:"📅 Reservar");
  var likes=pub?'<span class="n" data-cuenta="'+(180+Math.floor(Math.random()*240))+'">0</span>':(120+((p.titulo||"").length*7)%300);
  var marca=pub?'<div class="pv-pub"><div>✓ Publicado</div></div>':'';
  if(id==="igf")return telefono(sb()+'<div class="pv-bar" style="font-size:18px;font-weight:800;font-family:Georgia,serif">Instagram<span style="margin-left:auto;font-size:18px">♡ ✉</span></div>'+
    '<div class="pv-bar"><div class="pv-av"><i>'+esc(n.logo||"🍽️")+'</i></div><div><div style="font-size:12.5px">'+esc(u)+'</div><div style="font-size:10.5px;color:#777;font-weight:400">'+esc(n.ciudad||"")+'</div></div><span style="margin-left:auto">⋯</span></div>'+
    '<div class="pv-m">'+miniEscena(p,false,280)+'</div><div class="pv-ic"><span>♡</span><span>💬</span><span>➤</span><span style="margin-left:auto">🔖</span></div>'+
    '<div class="pv-likes">Le gusta a <span>'+likes+'</span> personas</div><div class="pv-cap"><b>'+esc(u)+'</b>'+cap.slice(0,160)+(cap.length>160?'… <span style="color:#888">más</span>':'')+'</div>'+marca);
  if(id==="igs")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-prog"><i></i></div><div class="pv-bar" style="position:absolute;top:18px;left:0;right:0;color:#fff;z-index:6"><div class="pv-av"><i>'+esc(n.logo||"🍽️")+'</i></div><span style="font-size:12px">'+esc(u)+' <span style="opacity:.7;font-weight:400">2 min</span></span></div>'+
    '<div class="pv-stick">🔗 '+ctaT.replace(/^\S+\s/,"")+'</div><div class="pv-bar" style="position:absolute;bottom:14px;left:0;right:0;z-index:6;color:#fff"><div style="flex:1;border:1px solid rgba(255,255,255,.6);border-radius:30px;padding:8px 12px;font-weight:400;font-size:12px">Enviar mensaje</div><span>♡</span><span>➤</span></div>'+marca,true);
  if(id==="tt")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-bar" style="position:absolute;top:26px;left:0;right:0;justify-content:center;color:#fff;z-index:6;gap:16px;font-size:13px"><span style="opacity:.7">Siguiendo</span><span style="border-bottom:2px solid #fff">Para ti</span></div>'+
    '<div class="pv-side"><div class="pv-av" style="width:40px;height:40px"><i>'+esc(n.logo||"🍽️")+'</i></div><div><span>♥</span>'+(pub?likes:"2,4 mil")+'</div><div><span>💬</span>86</div><div><span>🔖</span>210</div><div><span>↪</span>47</div></div>'+
    '<div class="pv-btm"><b>@'+esc(u)+'</b>'+cap.slice(0,110)+(cap.length>110?'…':'')+'<div style="margin-top:6px">♫ sonido original · '+esc(n.nombre||"")+'</div></div>'+marca,true);
  if(id==="fb")return telefono('<div class="pv-fb" style="display:flex;flex-direction:column;height:100%">'+sb()+'<div class="pv-bar" style="color:#1877F2;font-size:22px;font-weight:800">facebook</div>'+
    '<div class="pv-bar"><div class="pv-av"><i>'+esc(n.logo||"🍽️")+'</i></div><div><div style="font-size:12.5px">'+esc(n.nombre||"")+'</div><div style="font-size:10.5px;color:#65676b;font-weight:400">Ahora · 🌍</div></div></div>'+
    '<div class="pv-cap" style="max-height:72px">'+cap.slice(0,150)+(cap.length>150?'… Ver más':'')+'</div><div class="pv-m">'+miniEscena(p,false,250)+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f0f2f5;font-size:12px"><div><div style="color:#65676b;font-size:10.5px">'+esc((n.web||"el-paraiso-eight.vercel.app").replace(/^https?:\/\//,"").toUpperCase().slice(0,28))+'</div><b>'+esc(n.nombre||"")+'</b></div><span style="background:#e4e6eb;border-radius:6px;padding:6px 10px;font-weight:700">'+ctaT.replace(/^\S+\s/,"")+'</span></div>'+
    '<div class="pv-fbr"><span>👍 Me gusta</span><span>💬 Comentar</span><span>↪ Compartir</span></div></div>'+marca);
  if(id==="wa")return telefono('<div class="pv-full pv-wa">'+miniEscena(p,true,560)+'</div><div class="pv-prog"><i></i></div><div class="pv-bar" style="position:absolute;top:18px;left:0;right:0;color:#fff;z-index:6"><span>←</span><div class="pv-av" style="background:#25D366"><i>'+esc(n.logo||"🍽️")+'</i></div><div style="font-size:12px">'+esc(n.nombre||"")+'<div style="font-weight:400;opacity:.8;font-size:10.5px">hace un momento</div></div></div>'+
    '<div class="pv-btm" style="right:12px;text-align:center;bottom:16px"><div style="background:rgba(0,0,0,.45);border-radius:10px;padding:8px">'+esc((p.titulo||"")+" · "+(p.ctas&&p.ctas[0]?p.ctas[0].t:""))+'</div><div style="margin-top:8px;opacity:.85">⌃ Responder</div></div>'+marca,true);
  if(id==="yt")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-bar" style="position:absolute;top:26px;left:0;right:0;color:#fff;z-index:6"><b style="font-size:15px">Shorts</b><span style="margin-left:auto">🔍 ⋮</span></div>'+
    '<div class="pv-side"><div><span>👍</span>'+(pub?likes:"1,1 mil")+'</div><div><span>👎</span>No</div><div><span>💬</span>54</div><div><span>↪</span>Compartir</div></div>'+
    '<div class="pv-btm"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><div class="pv-av" style="background:#f00;width:26px;height:26px"><i>'+esc(n.logo||"🍽️")+'</i></div><b style="display:inline;margin:0">@'+esc(u)+'</b><span style="background:#fff;color:#000;border-radius:20px;padding:3px 9px;font-weight:700;font-size:11px">Suscribirse</span></div>'+esc(p.titulo||"")+'</div>'+marca,true);
  return "";
}
window.publicarGen=function(i){
  var p=window._posts&&window._posts[i];if(!p)return;
  PUB.i=i;PUB.paso=1;PUB.hecho={};
  if(vertical(p)){PUB.sel={igs:1,tt:1,wa:1,yt:1};PUB.tab="igs";}else{PUB.sel={igf:1,igs:1,fb:1,wa:1};PUB.tab="igf";}
  pintarPub();
};
function seleccion(){return REDES.filter(function(r){return PUB.sel[r.id];});}
function pintarPub(){
  var p=window._posts[PUB.i],sel=seleccion();
  if(!PUB.sel[PUB.tab]&&sel.length)PUB.tab=sel[0].id;
  var pasos='<div class="cm-steps"><span'+(PUB.paso===1?'':' style="opacity:.6"')+'>'+(PUB.paso===1?'<b>1 · Redes y vista previa</b>':'1 · Redes')+'</span><span>›</span><span>'+(PUB.paso===2?'<b>2 · Enviar</b>':'2 · Enviar')+'</span><span>›</span><span>'+(PUB.paso===3?'<b>3 · Publicado</b>':'3 · Publicado')+'</span></div>';
  var h='<div class="cm-bh"><div><h3>🚀 Publicar</h3>'+pasos+'</div><button class="x" onclick="cmCerrar()" aria-label="Cerrar">×</button></div><div class="cm-bb">';
  if(PUB.paso===1){
    h+='<div class="cm-grid"><div><div class="cm-lbl">¿Dónde lo publicamos?</div><div class="cm-redes">'+REDES.map(function(r){return '<button class="cm-red'+(PUB.sel[r.id]?" on":"")+'" onclick="cmRed(\''+r.id+'\')"><span class="ri '+r.cls+'">'+r.ic+'</span><span><div class="rn">'+r.nm+'</div><div class="rd">'+r.sub+'</div></span><span class="ck"></span></button>';}).join("")+'</div>'+
      (p.media?'':'<div class="cm-note" style="border-color:rgba(255,204,51,.5);color:var(--amber)">⚠️ Esta publicación no tiene imagen. <a href="javascript:void 0" onclick="cmCerrar();crearImagenIA('+PUB.i+')">Crear una con IA</a> o <a href="javascript:void 0" onclick="cmCerrar();cmElegirArchivo('+PUB.i+')">subir tu foto</a>.</div>')+
      '</div><div><div class="cm-lbl">Así se verá</div><div class="cm-tabs">'+sel.map(function(r){return '<button class="'+(PUB.tab===r.id?"on":"")+'" onclick="cmTab(\''+r.id+'\')">'+r.nm+'</button>';}).join("")+'</div>'+
      '<div class="cm-stage">'+(sel.length?vista(p,PUB.tab,false):'<div class="empty">Elige al menos una red</div>')+'</div></div></div>'+
      '<button class="btn pp cm-big" '+(sel.length?'':'disabled style="opacity:.5"')+' onclick="cmPaso(2)">Continuar · publicar en '+sel.length+' '+(sel.length===1?"red":"redes")+' →</button>';
  }else if(PUB.paso===2){
    var movil=esMovil(),puedeArch=!!(navigator.canShare);
    h+='<p style="margin:0 0 6px;color:var(--tx2);font-size:14px">Pulsa cada red. Chispa <b>copia el texto</b>, prepara la imagen o el vídeo y te abre la red para pegarlo. '+(movil&&puedeArch?'En el móvil se abre directamente el menú de compartir.':'')+'</p>'+
      '<div class="cm-acc">'+sel.map(function(r){var ok=PUB.hecho[r.id];return '<div class="cm-row"><span class="ri '+r.cls+'" style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:#fff;font-weight:800">'+r.ic+'</span><div class="rn">'+r.nm+'<div class="st'+(ok?" ok":"")+'" id="cmSt_'+r.id+'">'+(ok?"✓ "+ok:(r.vert?"Se prepara un vídeo vertical de 6 s":"Se prepara la imagen"))+'</div></div><button class="btn '+(ok?"g":"pp")+' sm" style="flex:none" onclick="cmEnviar(\''+r.id+'\')">'+(ok?"Otra vez":"Publicar en "+r.nm.split(" ")[0])+'</button></div>';}).join("")+'</div>'+
      '<div class="cm-row" style="margin-top:8px"><div class="rn">📋 Texto y hashtags<div class="st">Por si quieres pegarlo tú</div></div><button class="btn g sm" style="flex:none" onclick="cmCopiarTexto()">Copiar texto</button></div>'+
      '<div class="cm-note">🔗 <b>Publicar solo, sin pasos:</b> cuando conectes tus cuentas oficiales (Meta para Instagram y Facebook, TikTok y Google/YouTube), Chispa lo sube él solo a la hora programada. '+
        (typeof conectarCuentas==="function"?'<a href="javascript:void 0" onclick="cmCerrar();conectarCuentas()">Conectar cuentas</a>':'')+'</div>'+
      '<div class="row" style="gap:8px;margin-top:6px"><button class="btn g cm-big" style="flex:none;width:auto" onclick="cmPaso(1)">← Volver</button><button class="btn pp cm-big" style="flex:1" onclick="cmPaso(3)">Ver cómo lo ve tu cliente ✓</button></div>';
  }else{
    h+='<div class="cm-ok"><span class="cm-sim">SIMULACIÓN · así lo ve tu cliente</span><h4>Publicado ✓</h4><p>'+sel.map(function(r){return r.nm;}).join(" · ")+'</p></div>'+
      '<div class="cm-tabs" style="justify-content:center">'+sel.map(function(r){return '<button class="'+(PUB.tab===r.id?"on":"")+'" onclick="cmTab(\''+r.id+'\')">'+r.nm+'</button>';}).join("")+'</div>'+
      '<div class="cm-stage">'+vista(p,PUB.tab,true)+'</div>'+
      '<div class="cm-note">Es una simulación para que veas el resultado. Lo que de verdad sale publicado es lo que has enviado en el paso 2 (o lo que suba Chispa solo cuando conectes tus cuentas).</div>'+
      '<button class="btn pp cm-big" onclick="cmCerrar()">Hecho</button>';
  }
  abrirOv(h+'</div>');
  if(PUB.paso===3)contarLikes();
}
function contarLikes(){var els=document.querySelectorAll("[data-cuenta]");Array.prototype.forEach.call(els,function(e){var fin=+e.getAttribute("data-cuenta"),t0=performance.now();(function f(){var k=Math.min(1,(performance.now()-t0)/2200);e.textContent=Math.round(fin*ease(k));if(k<1)requestAnimationFrame(f);})();});}
window.cmRed=function(id){if(PUB.sel[id])delete PUB.sel[id];else{PUB.sel[id]=1;PUB.tab=id;}pintarPub();};
window.cmTab=function(id){PUB.tab=id;pintarPub();};
window.cmPaso=function(n){PUB.paso=n;if(n===3){S.historial=S.historial||[];S.historial.push({cuando:Date.now(),redes:Object.keys(PUB.sel),titulo:window._posts[PUB.i].titulo});guardar();}pintarPub();};
window.cmCopiarTexto=function(){copiar(textoCompleto(window._posts[PUB.i])).then(function(){toast("📋 Texto copiado");});};
var cacheArch={};
function prepararArchivo(p,vert){
  var k=PUB.i+"|"+(vert?"v":"i")+"|"+(p.media&&p.media.url)+"|"+p.titulo+"|"+p.kicker+"|"+p.L+"|"+p.sinTexto;
  if(cacheArch[k])return Promise.resolve(cacheArch[k]);
  var pr;
  if(p.media&&p.media.tipo==="propia"&&p.media.esVideo&&p.file)pr=Promise.resolve(p.file);
  else if(vert&&tipoVideo()){var q=Object.assign({},p);if(!vertical(p))q.formato="reel";pr=hacerVideo(q,function(f){var e=$("cmSt_"+PUB.tab);});}
  else pr=hacerImagen(p);
  return pr.then(function(b){cacheArch[k]=b;return b;});
}
window.cmEnviar=function(id){
  var p=window._posts[PUB.i],r=red(id),st=$("cmSt_"+id),texto=textoCompleto(p),n=N();
  var set=function(t,ok){if(st){st.textContent=t;st.className="st"+(ok?" ok":"");}};
  // 1) Publicación directa por API oficial, si nuestro servidor tiene la cuenta conectada
  var PD=window.CHISPA_PUBLICADOR;
  if(PD&&PD.url&&p.media&&!(PD._fallo&&PD._fallo[id])&&(!PD.conectada||PD.conectada(id))){
    set("Publicando directamente en "+r.nm+"…");
    prepararArchivo(p,r.vert).then(function(b){var fd=new FormData();fd.append("red",id);fd.append("texto",texto);fd.append("fecha",p.fecha||"");fd.append("archivo",b,nombreArchivo(p,ext(b)));
      return fetch(PD.url,{method:"POST",body:fd,credentials:"include"});})
    .then(function(res){if(!res.ok)throw new Error("respuesta "+res.status);PUB.hecho[id]="Publicado directamente";set("✓ Publicado directamente en "+r.nm,true);})
    .catch(function(e){set("La publicación directa falló ("+(e&&e.message||"error")+"). Pulsa otra vez para hacerlo a mano.");PD._fallo=PD._fallo||{};PD._fallo[id]=1;});
    return;
  }
  // 2) Sin permiso todavía: se abre la red con el contenido listo
  copiar(texto);
  var web=n.web||"https://el-paraiso-eight.vercel.app/";
  // WhatsApp y Facebook en ordenador: enlace directo de compartir
  if(!esMovil()&&id==="wa"){window.open("https://wa.me/?text="+encodeURIComponent(texto+"\n\n"+web),"_blank","noopener");PUB.hecho[id]="Abierto WhatsApp con el texto";set("✓ Abierto WhatsApp con el texto",true);return;}
  if(!esMovil()&&id==="fb"){window.open("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(web)+"&quote="+encodeURIComponent(texto),"_blank","noopener");}
  if(!p.media){if(id!=="fb"){set("Falta la imagen: créala o súbela primero");}return;}
  set(r.vert?"Preparando el vídeo… (6 s)":"Preparando la imagen…");
  var ventana=null;
  if(!esMovil()&&r.subir&&id!=="fb"){try{ventana=window.open("about:blank","_blank");}catch(e){}}
  prepararArchivo(p,r.vert).then(function(b){
    var nm=nombreArchivo(p,ext(b));
    return compartirArchivo(b,nm,texto).then(function(res){
      if(res==="compartido"){PUB.hecho[id]="Enviado desde el menú de compartir";set("✓ Enviado desde el menú de compartir",true);return;}
      if(res==="cancelado"){set("Cancelado. Pulsa otra vez cuando quieras.");if(ventana)ventana.close();return;}
      bajar(b,nm);
      if(ventana&&r.subir){ventana.location.href=r.subir;}
      var msg=id==="fb"?"Abierto Facebook · archivo descargado · texto copiado":("Archivo descargado y texto copiado"+(r.subir?" · abierta "+r.nm.split(" ")[0]+": súbelo y pega el texto":""));
      PUB.hecho[id]=msg;set("✓ "+msg,true);
    });
  }).catch(function(e){if(ventana)ventana.close();set("No se pudo preparar: "+(e&&e.message||"error"));});
};

/* =====================================================================
   ARRANQUE: si el panel ya está pintado, volver a pintarlo con lo nuevo
   ===================================================================== */
document.addEventListener("keydown",function(e){if(e.key==="Escape")cmCerrar();});
try{if($("app")&&$("app").classList.contains("on")&&typeof panel==="function"&&typeof TAB!=="undefined"&&TAB==="asistente")panel("asistente");}catch(e){}
window.CHISPA_ESTUDIO={version:"2026-10-07",catDe:catDe,fotos:F,hacerImagen:hacerImagen,hacerVideo:hacerVideo};
})();
