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
   Con el servidor de Chispa (chispa-ia.js, trabajador G) el proveedor es
   «chispa»: IA de imágenes de verdad (Workers AI) SOLO cuando se pulsa
   «Crear imagen con IA» (pedido.ia=true); las propuestas automáticas siguen
   con fotos libres para no gastar el cupo gratuito.
   VÍDEO: hacerVideo(p, progreso, dur, extras) acepta extras de chispa-ia.js
   (voz grabada en el vídeo, subtítulos palabra a palabra) y, en carruseles,
   pasa por todas las fotos.

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
/* ---------- enlaces por defecto de El Paraíso (los mismos que B pone en «Mi negocio») ---------- */
var DEF_PARAISO={reserva:"https://el-paraiso-eight.vercel.app/reservas.html",
  web:"https://el-paraiso-eight.vercel.app/links",club:"https://el-paraiso-eight.vercel.app",
  tiktok:"https://www.tiktok.com/@elparaisomallorca29",instagram:"https://instagram.com/elparaisobarrestaurante",facebook:"https://www.facebook.com/share/1cxhh2vr9X/"};
function nombreFB(){return esParaiso()?"El Paraíso · Bar Restaurante":(N().nombre||"");}
function esParaiso(){return /para[ií]so/i.test(N().nombre||"");}
function enlace(tipo){try{if(typeof window.chispaEnlace==="function"){var b=window.chispaEnlace(tipo);if(b)return b;}}catch(e){}var n=N(),v=n[tipo];if(v)return v;return esParaiso()?(DEF_PARAISO[tipo]||""):"";}
function ctasPorDefecto(){var c=[{t:"📅 Reservar",tipo:"reserva",url:""},{t:"📖 Ver carta",tipo:"carta",url:""},{t:"📍 Cómo llegar",tipo:"google",url:""},{t:"🌐 Ver web",tipo:"web",url:""}];if(esParaiso())c.push({t:"⭐ Club Paraíso",tipo:"club",url:""});return c;}

/* ---------- logo y marca de agua ---------- */
var LOGO={url:"",urlOsc:"",img:null};
function esLogoNuestro(u){return /^marca\/elparaiso-logo/.test(u||"");}
function logoOscUrl(){var n=N();if(n.logoOscuroUrl||LOGO.urlOsc)return n.logoOscuroUrl||LOGO.urlOsc;if(esParaiso()&&(!n.logoUrl||esLogoNuestro(n.logoUrl)))return "marca/elparaiso-logo-negro-160.jpg";return n.logoUrl||"";}
function logoIntUrl(){var n=N();if(LOGO.url)return LOGO.url;if(n.logoUrl&&!esLogoNuestro(n.logoUrl))return n.logoUrl;return esParaiso()?"marca/elparaiso-logo-integrado.png":"";}
function logoUrl(){return logoIntUrl();}
function oscImg(){var u=logoOscUrl();if(!u)return null;u=u.replace("-160.jpg",".jpg");if(!LOGO.osc||LOGO.osc._u!==u){var im=new Image();im._u=u;im.src=u;LOGO.osc=im;}return LOGO.osc;}
function logoListo(){cargarLogo();var o=oscImg();var esperar=function(im){if(!im||im.complete)return Promise.resolve();return new Promise(function(ok){im.onload=ok;im.onerror=ok;setTimeout(ok,3000);});};return Promise.all([esperar(o),esperar2()]);}
function esperar2(){cargarLogo();var im=LOGO.img;if(!im||im.complete)return Promise.resolve();return new Promise(function(ok){im.onload=ok;im.onerror=ok;setTimeout(ok,3000);});}
function cargarLogo(){var u=logoIntUrl();if(!u){LOGO.img=null;return;}if(LOGO.img&&LOGO.img._u===u)return;var im=new Image();im._u=u;im.src=u;LOGO.img=im;}
function logoHtml(){var o=logoOscUrl();if(o)return '<img class="cm-lg osc" src="'+esc(o)+'" alt="'+esc(N().nombre||"logo")+'">';var u=logoUrl();return u?'<img class="cm-lg" src="'+esc(u.replace("elparaiso-logo.png","elparaiso-logo-160.png"))+'" alt="'+esc(N().nombre||"logo")+'">':esc(N().logo||"🍽️");}
/* logo integrado en la foto (no es marca de agua): translúcido, fundido con la imagen y moviéndose con el zoom */
function logoInt(p,V){var d={on:false,pos:V?"tr":"br",op:45,modo:"screen",tam:V?26:22},o=(p&&p.logoInt)||{};for(var k in o)d[k]=o[k];if(!logoUrl())d.on=false;return d;}
function liCaja(L,V){var m=5,t=V?9:5,b=V?20:5;return (L.pos.charAt(1)==="r"?"right:"+m+"%;":"left:"+m+"%;")+(L.pos.charAt(0)==="b"?"bottom:"+b+"%;":"top:"+t+"%;");}
function liHtml(p,V){var L=logoInt(p,V);if(!L.on)return "";return '<img class="li" src="'+esc(logoIntUrl())+'" alt="" style="'+liCaja(L,V)+'width:'+L.tam+'%;opacity:'+(L.op/100)+';mix-blend-mode:'+L.modo+'">';}
/* SELLO DE MARCA visible (Stalin 07/10): logo negro en círculo + «El Paraíso» + «Bar Restaurante · Palma» */
function selloDe(p){var d={on:true,pos:"tl"},o=(p&&p.sello)||{};for(var k in o)d[k]=o[k];if(!logoOscUrl()&&!N().nombre)d.on=false;return d;}
function selloTextos(){var n=N();if(esParaiso())return ["El Paraíso","Bar Restaurante · Palma"];return [n.nombre||"",((n.sector||"").split("·")[0].trim()+(n.ciudad?" · "+n.ciudad.split(",")[0]:"")).replace(/^ · /,"")];}
function selloHtml(p,V){var S2=selloDe(p);if(!S2.on)return "";var t=selloTextos(),o=logoOscUrl();
  return '<div class="sello s-'+S2.pos+'">'+(o?'<img src="'+esc(o.replace("-160.jpg",".jpg"))+'" alt="">':'<i>'+esc(N().logo||"🍽️")+'</i>')+'<div><b>'+esc(t[0])+'</b>'+(t[1]?'<small>'+esc(t[1])+'</small>':'')+'</div></div>';}
/* Stalin (07/10): nada de marcas de agua. El logo va solo en el avatar y en las cabeceras. */
function marca(){return {on:false,pos:"tl",tam:18};}
function marcaHtml(V){var m=marca();if(!m.on)return "";var u=logoUrl();
  return u?'<img class="wm wm-'+m.pos+'" style="width:'+m.tam+'cqw" src="'+esc(u)+'" alt="">':'<div class="wm wm-'+m.pos+' wm-txt">'+esc((N().logo||"")+" "+(N().nombre||""))+'</div>';}
/* logo propio: se guarda en el aparato (IndexedDB), sin FileReader */
function idbLogo(modo,blob,clave){clave=clave||"logo";return new Promise(function(ok){try{var r=indexedDB.open("chispa-medios",1);r.onupgradeneeded=function(){r.result.createObjectStore("m");};
  r.onsuccess=function(){try{var db=r.result,t=db.transaction("m",modo==="get"?"readonly":"readwrite"),st=t.objectStore("m");
    if(modo==="get"){var q=st.get(clave);q.onsuccess=function(){ok(q.result||null);};q.onerror=function(){ok(null);};}
    else{if(blob)st.put(blob,clave);else st.delete(clave);t.oncomplete=function(){ok(true);};t.onerror=function(){ok(false);};}}catch(e){ok(null);}};r.onerror=function(){ok(null);};}catch(e){ok(null);}});}
setTimeout(function(){idbLogo("get",null,"logoOsc").then(function(b){if(b){LOGO.urlOsc=URL.createObjectURL(b);try{(window._posts||[]).forEach(function(p,i){if(i<900&&p)repintar(i);});}catch(e){}}});idbLogo("get").then(function(b){if(b){LOGO.url=URL.createObjectURL(b);cargarLogo();try{(window._posts||[]).forEach(function(p,i){if(i<900&&p)repintar(i);});}catch(e){}}else cargarLogo();});},0);
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
function cabecera(){var n=N();return '<div class="ph"><div class="av">'+logoHtml()+'</div><div style="min-width:0"><div style="font-weight:700;font-size:13px">'+esc(n.nombre)+'</div><div style="font-size:11px;color:var(--tx3)">'+esc(n.ciudad||"")+'</div></div></div>';}
function fmtNombre(f){return {post:"🖼️ Post",carrusel:"🎠 Carrusel",historia:"📸 Historia",reel:"🎬 Reel"}[f]||"🖼️ Post";}

function tarjeta(i){
  var p=window._posts[i];
  return '<div class="cm-card" id="cmCard_'+i+'">'+
    '<div class="cm-top"><div class="ang">'+esc(p.ang)+'</div><span class="chip">'+fmtNombre(p.formato)+'</span>'+
      (p.fecha?'<span class="cm-fecha" onclick="cmEditar('+i+',\'fecha\')" title="Cambiar fecha">🗓️ '+esc(fechaBonita(p.fecha))+'</span>':'')+'</div>'+
    '<div class="cm-post">'+(typeof ofertaBadge==="function"?ofertaBadge():"")+'<div class="pacc"></div>'+cabecera()+
      '<div class="cm-media" id="img_'+i+'" style="aspect-ratio:'+aspecto(p)+'" title="'+esc(creditoDe(p))+'">'+medio(i,false)+'</div>'+
      '<div class="cm-body">'+
        '<div class="cm-ed" contenteditable="true" spellcheck="false" data-i="'+i+'" data-k="txt" onblur="cmGuardarCampo(this)" aria-label="Texto de la publicación">'+esc(p.txt)+'</div>'+
        '<div class="cm-tags"><div class="cm-ed" contenteditable="true" spellcheck="false" data-i="'+i+'" data-k="tags" onblur="cmGuardarCampo(this)" aria-label="Hashtags">'+esc(p.tags)+'</div></div>'+
        '<div class="cm-ctas">'+p.ctas.map(function(c,k){return '<button class="'+(k===0?"p":"")+'" onclick="cmCta('+i+','+k+')">'+esc(c.t)+'</button>';}).join("")+'</div>'+
        '<div class="cm-hint">✏️ Toca el texto para cambiarlo · <a href="javascript:void 0" onclick="cmEditar('+i+')">editar todo</a></div>'+
      '</div></div>'+
    (p.por?'<div class="cm-por">💡 '+esc(p.por)+'</div>':'')+
    '<input type="file" accept="image/*,video/*" id="file_'+i+'" style="display:none" onchange="subirFoto('+i+',this)">'+
    '<div class="cm-acts">'+
      '<button class="btn pp" onclick="crearImagenIA('+i+',1)">'+(p.media&&p.media.tipo!=="propia"?"↻ Otra versión":"✨ Crear imagen con IA")+'</button>'+
      '<button class="btn g" onclick="cmElegirArchivo('+i+')">📷 '+(p.media&&p.media.tipo==="propia"?"Cambiar foto":"Subir foto o vídeo")+'</button>'+
      '<button class="btn g" onclick="cmEditar('+i+')">✏️ Editar</button>'+
      '<button class="btn g" onclick="programarGen('+i+')">📅 Programar</button>'+
      (window.ChispaIA&&ChispaIA.botonesTarjeta?ChispaIA.botonesTarjeta(i):'')+
      '<button class="btn g full" onclick="cmCliente('+i+')">👁 Así lo ve tu cliente</button>'+
      '<button class="btn full" onclick="publicarGen('+i+')">🚀 Publicar</button>'+
    '</div></div>';
}
function repintar(i){var c=$("cmCard_"+i);if(c)c.outerHTML=tarjeta(i);}
function creditoDe(p){var m=p&&p.media;return m&&m.cred?"Foto: "+m.cred+" (Unsplash)":"";}
function repintarMedio(i){var d=$("img_"+i);if(d){d.title=creditoDe(window._posts[i]);d.style.aspectRatio=aspecto(window._posts[i]);d.innerHTML=medio(i,false);}}

/* escena: lo que se ve dentro de la imagen */
function escena(p,opt){
  opt=opt||{};var m=p.media,n=N();
  var V=vertical(p)||opt.vert;
  var src=m.tipo==="propia"?m.url:(m.slides?m.slides[p.slide||0].url:m.url);
  var tit=(m.slides&&p.slide>0)?(p.slide===1?"Hecho cada día":"Reserva tu mesa"):p.titulo;
  var words=(tit||"").split(/\s+/).filter(Boolean).map(function(w,k){return '<span style="--d:'+(0.45+k*0.12).toFixed(2)+'s">'+esc(w)+'</span>';}).join("");
  var kb="k"+((p.foto||0)%4);
  var media='<div class="kbw'+(m.esVideo?'':' '+kb)+'">'+(m.esVideo?'<video class="kbi" src="'+esc(src)+'" autoplay muted loop playsinline></video>':'<img class="kbi" src="'+esc(src)+'" alt="'+esc(p.titulo)+'"'+(m.tipo==="propia"?'':' crossorigin="anonymous"')+'>')+liHtml(p,V)+'</div>'+selloHtml(p,V);
  var kick=(p.kicker||"").replace("{neg}",n.nombre||"");
  return '<div class="cm-scene L'+(p.L||0)+(V?" V":"")+(p.sinTexto?" sinTexto":"")+'">'+media+
    '<div class="sh"></div><div class="gl"></div>'+(m.esVideo?'':'<div class="sw"></div>')+
    marcaHtml(V)+
    (n.oferta?'<div class="of">🔥 '+esc(n.oferta)+'</div>':'')+
    '<div class="tx">'+(kick?'<div class="kk">'+esc(kick)+'</div>':'')+'<div class="tt">'+words+'</div>'+
      '<div class="ct">'+esc(p.ctas&&p.ctas[0]?p.ctas[0].t.replace(/^\S+\s/,"")+" →":"Reserva tu mesa →")+'</div></div>'+
  '</div>';
}
function medio(i,mini){
  var p=window._posts[i];
  if(p.creando)return '<div class="cm-crea"><div class="sp"></div><b>Creando tu imagen…</b><small id="cmPaso_'+i+'">Leyendo tu texto</small></div>';
  if(!p.media)return '<div class="cm-empty"><div class="ic">🖼️</div><div>Tu publicación todavía no tiene imagen</div><div class="row2">'+
    '<button class="p" onclick="crearImagenIA('+i+',1)">✨ Crear con IA</button><button onclick="cmElegirArchivo('+i+')">📷 Subir foto</button></div></div>';
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
    (m.tipo!=="propia"?'<button title="Otra versión" onclick="crearImagenIA('+i+',1)">↻</button>':'<button title="Cambiar" onclick="cmElegirArchivo('+i+')">📷</button>')+
    '<button title="Descargar imagen o vídeo" onclick="cmExportar('+i+')">⬇</button>'+
    '<button title="Quitar imagen" onclick="cmQuitar('+i+')">✕</button></div>';
  return h+nav+tool;
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
window.crearImagenIA=function(i,conIA){
  var p=window._posts&&window._posts[i];if(!p)return;
  if(p.media&&p.media.tipo!=="propia")p.foto=(p.foto||0)+1; // otra versión
  if(p.media&&p.media.tipo==="propia"&&p.media.url){try{URL.revokeObjectURL(p.media.url);}catch(e){}}
  p.creando=true;repintar(i);
  var t0=Date.now(),k=0,iv=setInterval(function(){k=(k+1)%PASOS.length;var e=$("cmPaso_"+i);if(e)e.textContent=PASOS[k];},450);
  var w=1080,h=vertical(p)?1920:(p.formato==="carrusel"?1350:1080);
  var listo=function(media){clearInterval(iv);var d=Math.max(0,1300-(Date.now()-t0));setTimeout(function(){p.creando=false;p.media=media;p.slide=0;repintar(i);toast(media.tipo==="ia"?"✨ Imagen creada por IA":(media.aviso||"✨ Imagen lista · pulsa ↻ para otra versión"));},d);};
  MOTOR.generar({prompt:promptDe(p),cat:p.cat,formato:p.formato,ancho:w,alto:h,cantidad:p.formato==="carrusel"?3:1,semilla:SEM+i*3+(p.foto||0),ia:!!conIA,texto:p.txt,titulo:p.titulo})
    .then(listo,function(){clearInterval(iv);p.creando=false;repintar(i);toast("No se pudo crear la imagen. Prueba otra vez.");});
};
window.cmRepintar=function(i){repintar(i);};
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
  var u=c.url||enlace(c.tipo);
  if(u){window.open(/^https?:|^tel:|^mailto:/.test(u)?u:"https://"+u,"_blank","noopener");return;}
  if(typeof abrirCta==="function"){abrirCta(c.tipo);return;}
  toast("Pon el enlace de este botón");cmEditar(i,"ctas");};
window.cmEditar=function(i,foco){
  var p=window._posts[i];
  var c0=p.ctas[0]||{t:"",url:""},c1=p.ctas[1]||{t:"",url:""};
  var f=function(id,lb,v,ph,type){return '<label class="lb" style="margin-top:10px">'+lb+'</label><input class="inp" id="'+id+'" type="'+(type||"text")+'" value="'+esc(v||"")+'" placeholder="'+esc(ph||"")+'">';};
  modal('<h3>✏️ Editar publicación</h3>'+
    '<label class="lb">Texto</label><textarea id="cmeTxt" style="min-height:120px">'+esc(p.txt)+'</textarea>'+
    f("cmeTags","Hashtags",p.tags,"#paella #Palma")+
    '<div class="row">'+'<div>'+f("cmeTit","Título sobre la imagen",p.titulo,"Paella de bogavante")+'</div><div>'+f("cmeKick","Frase pequeña de arriba",p.kicker,"Este domingo")+'</div></div>'+
    '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;color:var(--tx2)"><input type="checkbox" id="cmeSin" style="width:auto" '+(p.sinTexto?"checked":"")+'> Imagen limpia, sin texto encima</label>'+
    (function(){var L=selloDe(p);return '<div class="cm-li"><label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--tx2)"><input type="checkbox" id="cmeSe" style="width:auto"'+(L.on?" checked":"")+'> Sello de marca en la imagen (logo + «'+esc(selloTextos()[0])+'»)</label>'+
      '<label class="lb" style="margin-top:8px">Esquina</label><select id="cmeSePos">'+[["tl","Arriba izquierda"],["tr","Arriba derecha"],["bl","Abajo izquierda"],["br","Abajo derecha"]].map(function(o){return '<option value="'+o[0]+'"'+(L.pos===o[0]?" selected":"")+'>'+o[1]+'</option>';}).join("")+'</select></div>';})()+
    '<div class="row">'+'<div>'+f("cmeB0","Botón 1",c0.t,"📅 Reservar")+'</div><div>'+f("cmeU0","Enlace del botón 1",c0.url,"Vacío = el de Mi negocio")+'</div></div>'+
    '<div class="row">'+'<div>'+f("cmeB1","Botón 2",c1.t,"🌐 Ver web")+'</div><div>'+f("cmeU1","Enlace del botón 2",c1.url,"Vacío = el de Mi negocio")+'</div></div>'+
    '<div class="row"><div>'+f("cmeFecha","Fecha y hora de publicación",p.fecha,"","datetime-local")+'</div><div><label class="lb" style="margin-top:10px">Formato</label><select id="cmeFmt">'+
      ["post","carrusel","historia","reel"].map(function(x){return '<option value="'+x+'"'+(x===p.formato?" selected":"")+'>'+fmtNombre(x)+'</option>';}).join("")+'</select></div></div>'+
    '<label class="lb" style="margin-top:12px">Imagen</label><div class="row" style="gap:8px">'+
      '<button class="btn g sm" style="flex:none" onclick="cerrarModal();crearImagenIA('+i+',1)">✨ '+(p.media?"Otra versión":"Crear con IA")+'</button>'+
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
  var resto=(p.ctas||[]).slice(2);p.ctas=[{t:v("cmeB0").trim()||"📅 Reservar",tipo:(p.ctas[0]||{}).tipo||"reserva",url:v("cmeU0").trim()},{t:v("cmeB1").trim()||"📖 Ver carta",tipo:(p.ctas[1]||{}).tipo||"carta",url:v("cmeU1").trim()}].concat(resto);
  p.fecha=v("cmeFecha");p.formato=fmt;
  if($("cmeSe"))p.sello={on:$("cmeSe").checked,pos:v("cmeSePos")};
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
  var barra='<div class="cm-agbar"><span>📅 ¿Cuándo salen?</span><button class="btn pp sm" onclick="window.CHISPA_AGENDA&&CHISPA_AGENDA.planificarSemana(true)">⚡ Planificar mi semana</button><button class="btn g sm" onclick="window.CHISPA_AGENDA&&CHISPA_AGENDA.todoAlCalendario()">Todo al calendario</button><span class="cm-agsp"></span><button class="btn g sm" onclick="cmCliente()">👁 Así lo ve tu cliente</button><button class="btn g sm" onclick="cmDemo()">▶ Ver demo de publicación</button><button class="btn g sm" onclick="cmMarca()">🏷️ Logo</button></div>';
  var html=cabeceraHtml+barra+'<div class="ideas cm-wrap">'+lista.map(function(p,i){return tarjeta(i);}).join("")+'</div>'+(typeof avisoConectar==="function"?avisoConectar():"");
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
  var LI=logoInt(p,V),lgI=LOGO.img;
  if(LI.on&&lgI&&lgI.complete&&lgI.naturalWidth){x.save();x.translate(W/2+ox,H/2+oy);x.scale(sc,sc);x.translate(-W/2,-H/2);
    var lw=W*LI.tam/100,lh=lw*lgI.naturalHeight/lgI.naturalWidth,lx=LI.pos.charAt(1)==="r"?W-W*.05-lw:W*.05,ly=LI.pos.charAt(0)==="b"?H-H*(V?.2:.05)-lh:H*(V?.09:.05);
    x.globalAlpha=LI.op/100;try{x.globalCompositeOperation=LI.modo;}catch(e){}x.drawImage(lgI,lx,ly,lw,lh);x.restore();}
  // sombras
  var g;
  if(Lw===1){g=x.createRadialGradient(W/2,H*.55,W*.1,W/2,H*.55,Math.max(W,H)*.75);g.addColorStop(0,"rgba(0,0,0,.25)");g.addColorStop(1,"rgba(0,0,0,.72)");}
  else{g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"rgba(0,0,0,.35)");g.addColorStop(.3,"rgba(0,0,0,0)");g.addColorStop(.5,"rgba(0,0,0,0)");g.addColorStop(1,Lw===2?"rgba(10,8,20,.9)":"rgba(0,0,0,.82)");}
  x.fillStyle=g;x.fillRect(0,0,W,H);
  // brillo que cruza
  if(!(p.media&&p.media.esVideo)){var sw=((t*1000)%7000)/7000;if(sw<.45){var px=-W*.6+(sw/.45)*W*2.2;var gs=x.createLinearGradient(px-W*.25,0,px+W*.25,H*.3);gs.addColorStop(0,"rgba(255,236,190,0)");gs.addColorStop(.5,"rgba(255,236,190,.16)");gs.addColorStop(1,"rgba(255,236,190,0)");x.fillStyle=gs;x.fillRect(0,0,W,H);}}
  if(Lw===3){x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=Math.max(2,u*.25);if(V)rr(x,3.6*u,14*u,W-7.2*u,H-44*u,2*u);else rr(x,3.6*u,3.6*u,W-7.2*u,H-7.2*u,2*u);x.stroke();}
  // marca
  var aB=ease(t/0.6);x.globalAlpha=aB;
  var MA=marca();
  if(MA.on){var lg=LOGO.img&&LOGO.img.complete&&LOGO.img.naturalWidth?LOGO.img:null;
    var sz=W*MA.tam/100,mx=4.5*u,myT=(V?17:4.5)*u,myB=(V?30:4.5)*u;
    var lx=(MA.pos==="tr"||MA.pos==="br")?W-mx-sz:mx,ly=(MA.pos==="bl"||MA.pos==="br")?H-myB-sz:myT;
    if(lg){x.save();x.shadowColor="rgba(0,0,0,.35)";x.shadowBlur=u*2;x.drawImage(lg,lx,ly,sz,sz);x.restore();}
    else{x.font="700 "+(3.6*u)+"px Inter, sans-serif";x.textBaseline="middle";x.fillStyle="#fff";var der=(MA.pos==="tr"||MA.pos==="br");x.textAlign=der?"right":"left";
      x.fillText(((n.logo||"")+" "+(n.nombre||"")).trim(),der?W-mx:mx,ly+sz/2);x.textAlign="left";}}
  x.globalAlpha=1;
  var SL=selloDe(p);
  if(SL.on){var a5=ease(t/0.7),li=LOGO.osc&&LOGO.osc.complete&&LOGO.osc.naturalWidth?LOGO.osc:null,tx2=selloTextos();
    var R=6.5*u,mxs=4.5*u,top=(V?16:4.5)*u,bot=(V?30:4.5)*u,der=SL.pos.charAt(1)==="r",abajo=SL.pos.charAt(0)==="b";
    x.save();x.globalAlpha=a5;x.font="600 "+(4.6*u)+"px Fraunces, Georgia, serif";var w1=x.measureText(tx2[0]).width;x.font="700 "+(2.4*u)+"px Inter, sans-serif";var w2=x.measureText((tx2[1]||"").toUpperCase()).width+(tx2[1]||"").length*.3*u;
    var cxC=der?W-mxs-R:mxs+R,cy=abajo?H-bot-R:top+R,bx2=cxC-R,txX=der?cxC-R-2.6*u:cxC+R+2.6*u;
    x.shadowColor="rgba(0,0,0,.45)";x.shadowBlur=3*u;x.beginPath();x.arc(bx2+R,cy,R,0,7);x.fillStyle="#000";x.fill();x.shadowBlur=0;
    if(li){x.save();x.beginPath();x.arc(bx2+R,cy,R-.3*u,0,7);x.clip();x.drawImage(li,bx2,cy-R,2*R,2*R);x.restore();}
    x.lineWidth=.45*u;x.strokeStyle="rgba(255,255,255,.85)";x.beginPath();x.arc(bx2+R,cy,R,0,7);x.stroke();
    x.shadowColor="rgba(0,0,0,.6)";x.shadowBlur=2.4*u;x.fillStyle="#fff";x.textBaseline="alphabetic";x.textAlign=der?"right":"left";
    var tx0=txX;x.font="600 "+(4.6*u)+"px Fraunces, Georgia, serif";x.fillText(tx2[0],tx0,cy+(tx2[1]?-.2*u:1.6*u));
    if(tx2[1]){x.font="700 "+(2.4*u)+"px Inter, sans-serif";if("letterSpacing" in x)x.letterSpacing=(.3*u)+"px";x.fillStyle="rgba(255,255,255,.88)";x.fillText(tx2[1].toUpperCase(),tx0,cy+3.4*u);if("letterSpacing" in x)x.letterSpacing="0px";}
    x.restore();}
  if(p.sinTexto)return;
  // oferta
  if(n.oferta){var ao=ease((t-1.9)/0.5);if(ao>0){x.save();x.globalAlpha=ao;x.font="800 "+(3.6*u)+"px Inter, sans-serif";var ot="🔥 "+n.oferta,ow=x.measureText(ot).width+6.4*u;x.translate(W-5*u-ow/2,(V?20:8)*u);x.rotate(.05);x.scale(.6+.4*ao,.6+.4*ao);var go=x.createLinearGradient(-ow/2,0,ow/2,0);go.addColorStop(0,"#fb7185");go.addColorStop(1,"#ffb020");x.fillStyle=go;rr(x,-ow/2,-3.6*u,ow,7.2*u,3.6*u);x.fill();x.fillStyle="#2a0b0b";x.textAlign="center";x.fillText(ot,0,.2*u);x.restore();}}
  // titular
  var serif=(Lw===1||Lw===2),fs=(Lw===1?11:Lw===2?11.5:Lw===3?9:10.5)*u*(V?(Lw===3?1.1:1.14):1);
  var font=(Lw===1?"italic 600 ":serif?"600 ":"800 ")+fs+"px "+(serif?"Fraunces, Georgia, serif":"Inter, sans-serif");
  x.font=font;var tit=(p.titulo||"");if(Lw===3)tit=tit.toUpperCase();
  var lines=envolver(x,tit,W-13*u),lh=fs*1.05;
  var kick=(p.kicker||"").replace("{neg}",n.nombre||"");
  var cta=(p.ctas&&p.ctas[0]?p.ctas[0].t.replace(/^\S+\s/,""):"Reserva tu mesa")+" →";
  var kH=kick?7*u:0,cH=12*u,blockH=kH+3*u+lines.length*lh+cH;
  var center=(Lw===1||Lw===3),left=6.5*u;
  var y0=(Lw===1)?(H-blockH)/2:H-(V?44:Lw===3?10:7)*u-blockH;
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
function fuentesDe(p){
  var m=p.media;if(!m||!m.slides||m.slides.length<2||m.esVideo)return fuenteDe(p).then(function(f){return [f];});
  return Promise.all(m.slides.map(function(s){return cargarImg(s.url).catch(function(){return null;});})).then(function(l){return l.filter(Boolean);});
}
function medidas(p){return vertical(p)?[1080,1920]:(p.formato==="carrusel"?[1080,1350]:[1080,1080]);}
function hacerImagen(p){
  return Promise.all([fuentesListas(),fuenteDe(p),logoListo()]).then(function(r){var src=r[1],wh=medidas(p),c=document.createElement("canvas");c.width=wh[0];c.height=wh[1];
    var x=c.getContext("2d");dibujar(x,wh[0],wh[1],p,src,4,6);
    return new Promise(function(ok,ko){try{c.toBlob(function(b){b?ok(b):ko(new Error("vacío"));},"image/jpeg",.92);}catch(e){ko(e);}});});
}
function tipoVideo(conAudio){var t=conAudio?["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]:["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];if(!window.MediaRecorder)return "";for(var k=0;k<t.length;k++){try{if(MediaRecorder.isTypeSupported(t[k]))return t[k];}catch(e){}}return "";}
function hacerVideo(p,progreso,dur,extras){
  extras=extras||{};dur=extras.dur||dur||6;var mt=tipoVideo(!!extras.audio);if(!mt)return Promise.reject(new Error("Este navegador no graba vídeo"));
  return Promise.all([fuentesListas(),fuentesDe(p),logoListo()]).then(function(r){
    var fuentes=r[1].length?r[1]:[null],src=fuentes[0],wh=[1080,1920];
    if(!vertical(p)&&p.formato!=="carrusel")wh=[1080,1080];
    if(p.formato==="carrusel")wh=[1080,1350];
    var c=document.createElement("canvas");c.width=wh[0];c.height=wh[1];var x=c.getContext("2d");
    if(src&&src.play){try{src.currentTime=0;src.play();}catch(e){}}
    var st=c.captureStream(30),actx=extras.actx||null,voz=null;
    if(extras.audio&&actx){try{var dest=actx.createMediaStreamDestination();voz=actx.createBufferSource();voz.buffer=extras.audio;voz.connect(dest);dest.stream.getAudioTracks().forEach(function(t){st.addTrack(t);});}catch(e){voz=null;}}
    var rec=new MediaRecorder(st,{mimeType:mt,videoBitsPerSecond:8000000}),trozos=[],V=wh[1]>wh[0]*1.3,DV=extras.retraso||0;
    rec.ondataavailable=function(e){if(e.data&&e.data.size)trozos.push(e.data);};
    return new Promise(function(ok,ko){
      rec.onstop=function(){if(src&&src.pause)try{src.pause();}catch(e){}if(actx&&extras.cerrarAudio!==false)try{actx.close();}catch(e){}ok(new Blob(trozos,{type:mt.split(";")[0]}));};
      rec.onerror=function(e){ko(e.error||e);};
      var t0=performance.now();rec.start(250);
      if(voz){try{if(actx.resume)actx.resume();voz.start(actx.currentTime+DV);}catch(e){}}
      (function paso(){var t=(performance.now()-t0)/1000,tt=Math.min(t,dur),k=fuentes.length>1?Math.min(fuentes.length-1,Math.floor(tt/(dur/fuentes.length))):0;
        dibujar(x,wh[0],wh[1],p,fuentes[k],tt,dur);
        if(extras.palabras&&window.ChispaIA&&ChispaIA.dibujarSubtitulos)ChispaIA.dibujarSubtitulos(x,wh[0],wh[1],extras.palabras,tt-DV,V);
        if(progreso)progreso(Math.min(1,t/dur));
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
window.cmCerrar=function(){if(PUB.demo){PUB.demo=0;DEMO.t.forEach(clearTimeout);DEMO.t=[];}var o=$("cmOv");if(o)o.classList.remove("on");document.body.style.overflow="";};
function abrirOv(html){var o=ov();$("cmBox").classList.remove("ancha");$("cmBox").innerHTML=html;o.classList.add("on");document.body.style.overflow="hidden";$("cmBox").scrollTop=0;}
window.cmExportar=function(i){
  var p=window._posts[i];if(!p.media){toast("Primero crea o sube una imagen 🙂");return;}
  var puedeV=!!tipoVideo();
  abrirOv('<div class="cm-bh"><h3>⬇ Descargar para redes</h3><button class="x" onclick="cmCerrar()" aria-label="Cerrar">×</button></div><div class="cm-bb"><div class="cm-exp">'+
    '<p style="margin:0;color:var(--tx2);font-size:14px">La imagen sale con el texto y tu marca encima, lista para subir. El vídeo dura 6 segundos, con el zoom lento y el texto entrando.</p>'+
    '<button class="btn pp cm-big" onclick="cmBajarImg('+i+')">🖼️ Descargar imagen ('+medidas(p).join("×")+')</button>'+
    (puedeV&&window.ChispaIA&&ChispaIA.opcionesVideoHtml?ChispaIA.opcionesVideoHtml(i):'')+
    (puedeV?'<button class="btn cm-big" style="margin-top:0" onclick="cmBajarVid('+i+')">🎬 Descargar vídeo vertical</button>':'<div class="cm-note">Este navegador no puede grabar vídeo. En el iPhone (Safari) y en Chrome sí.</div>')+
    '<div class="cm-bar" id="cmBar" style="display:none"><i></i></div><div id="cmExpMsg" style="font-size:12.5px;color:var(--tx3)"></div></div></div>');
};
window.cmBajarImg=function(i){var p=window._posts[i];$("cmExpMsg").textContent="Preparando la imagen…";
  hacerImagen(p).then(function(b){var nm=nombreArchivo(p,"jpg");if(esMovil())return compartirArchivo(b,nm,p.txt).then(function(r){if(r==="no")bajar(b,nm);$("cmExpMsg").textContent="✓ Imagen lista";});bajar(b,nm);$("cmExpMsg").textContent="✓ Imagen descargada";})
  .catch(function(){$("cmExpMsg").textContent="No se pudo preparar la imagen. Prueba otra versión.";});};
window.cmBajarVid=function(i){var p=window._posts[i],bar=$("cmBar");bar.style.display="block";$("cmExpMsg").textContent="Grabando el vídeo…";
  var vp=Object.assign({},p);if(!vertical(p)&&p.formato!=="carrusel")vp.formato="reel";
  var pre=window.ChispaIA&&ChispaIA.prepararVideo?ChispaIA.prepararVideo(p,function(m){$("cmExpMsg").textContent=m;}):Promise.resolve({});
  pre.then(function(ex){$("cmExpMsg").textContent="Grabando el vídeo… ("+Math.round(ex.dur||6)+" segundos)"+(ex.nota?" · "+ex.nota:"");
    return hacerVideo(vp,function(f){bar.firstChild.style.width=(f*100)+"%";},6,ex);}).then(function(b){var nm=nombreArchivo(p,ext(b));window._cmUltimoVideo={i:i,b:b};
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
 {id:"yt",nm:"YouTube Shorts",sub:"Vídeo corto vertical",cls:"yt",ic:"▶",vert:true,subir:"https://www.youtube.com/upload"},
 {id:"gbp",nm:"Google (tu ficha)",sub:"Novedad en Google Maps y Búsqueda",cls:"gg",ic:"G",vert:false,subir:"https://business.google.com/"}
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
function usuarioTT(){var t=enlace("tiktok");return (t||"").replace(/^.*tiktok\.com\/@?/,"").replace(/^@/,"").replace(/[\/?].*$/,"")||usuario();}
function usuario(){var n=N();return (enlace("instagram")||"").replace(/^.*instagram\.com\//,"").replace(/^@/,"").replace(/\/.*$/,"")||sinTildes(n.nombre||"tunegocio").replace(/[^a-z0-9]+/g,"")+"palma";}
function vista(p,id,pub){
  var n=N(),u=usuario(),crudo=textoCompleto(p),cortar=function(k){return esc(crudo.slice(0,k));},cap=esc(crudo),ctaT=esc(p.ctas&&p.ctas[0]?p.ctas[0].t:"📅 Reservar");
  var likes=pub?'<span class="n" data-cuenta="'+(180+Math.floor(Math.random()*240))+'">0</span>':(120+((p.titulo||"").length*7)%300);
  var marca=pub?'<div class="pv-pub"><div>✓ Publicado</div></div>':'';
  if(id==="igf")return telefono(sb()+'<div class="pv-bar" style="font-size:18px;font-weight:800;font-family:Georgia,serif">Instagram<span style="margin-left:auto;font-size:18px">♡ ✉</span></div>'+
    '<div class="pv-bar"><div class="pv-av"><i>'+logoHtml()+'</i></div><div><div style="font-size:12.5px">'+esc(u)+'</div><div style="font-size:10.5px;color:#777;font-weight:400">'+esc(n.ciudad||"")+'</div></div><span style="margin-left:auto">⋯</span></div>'+
    '<div class="pv-m">'+miniEscena(p,false,280)+'</div><div class="pv-ic"><span>♡</span><span>💬</span><span>➤</span><span style="margin-left:auto">🔖</span></div>'+
    '<div class="pv-likes">Le gusta a <span>'+likes+'</span> personas</div><div class="pv-cap"><b>'+esc(u)+'</b>'+cortar(160)+(crudo.length>160?'… <span style="color:#888">más</span>':'')+'</div>'+marca);
  if(id==="igs")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-prog"><i></i></div><div class="pv-bar" style="position:absolute;top:18px;left:0;right:0;color:#fff;z-index:6"><div class="pv-av"><i>'+logoHtml()+'</i></div><span style="font-size:12px">'+esc(u)+' <span style="opacity:.7;font-weight:400">2 min</span></span></div>'+
    '<a class="pv-stick" href="'+esc(enlace("reserva"))+'" target="_blank" rel="noopener">🔗 '+ctaT.replace(/^\S+\s/,"")+'</a><div class="pv-bar" style="position:absolute;bottom:14px;left:0;right:0;z-index:6;color:#fff"><div style="flex:1;border:1px solid rgba(255,255,255,.6);border-radius:30px;padding:8px 12px;font-weight:400;font-size:12px">Enviar mensaje</div><span>♡</span><span>➤</span></div>'+marca,true);
  if(id==="tt")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-bar" style="position:absolute;top:26px;left:0;right:0;justify-content:center;color:#fff;z-index:6;gap:16px;font-size:13px"><span style="opacity:.7">Siguiendo</span><span style="border-bottom:2px solid #fff">Para ti</span></div>'+
    '<div class="pv-side"><div class="pv-av" style="width:40px;height:40px"><i>'+logoHtml()+'</i></div><div><span>♥</span>'+(pub?likes:"2,4 mil")+'</div><div><span>💬</span>86</div><div><span>🔖</span>210</div><div><span>↪</span>47</div></div>'+
    '<div class="pv-btm"><b>@'+esc(usuarioTT())+'</b>'+cortar(110)+(crudo.length>110?'…':'')+'<div style="margin-top:6px">♫ sonido original · '+esc(n.nombre||"")+'</div></div>'+marca,true);
  if(id==="fb")return telefono('<div class="pv-fb" style="display:flex;flex-direction:column;height:100%">'+sb()+'<div class="pv-bar" style="color:#1877F2;font-size:22px;font-weight:800">facebook</div>'+
    '<div class="pv-bar"><div class="pv-av"><i>'+logoHtml()+'</i></div><div><div style="font-size:12.5px">'+esc(nombreFB())+'</div><div style="font-size:10.5px;color:#65676b;font-weight:400">Ahora · 🌍</div></div></div>'+
    '<div class="pv-cap" style="max-height:72px">'+cortar(150)+(crudo.length>150?'… Ver más':'')+'</div><div class="pv-m">'+miniEscena(p,false,250)+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f0f2f5;font-size:12px"><div><div style="color:#65676b;font-size:10.5px">'+esc((enlace("web")||"tu web").replace(/^https?:\/\//,"").toUpperCase().slice(0,28))+'</div><b>'+esc(n.nombre||"")+'</b></div><a class="pv-fbcta" href="'+esc(enlace("reserva"))+'" target="_blank" rel="noopener">'+ctaT.replace(/^\S+\s/,"")+'</a></div>'+
    '<div class="pv-fbr"><span>👍 Me gusta</span><span>💬 Comentar</span><span>↪ Compartir</span></div></div>'+marca);
  if(id==="wa")return telefono('<div class="pv-full pv-wa">'+miniEscena(p,true,560)+'</div><div class="pv-prog"><i></i></div><div class="pv-bar" style="position:absolute;top:18px;left:0;right:0;color:#fff;z-index:6"><span>←</span><div class="pv-av" style="background:#25D366"><i>'+logoHtml()+'</i></div><div style="font-size:12px">'+esc(n.nombre||"")+'<div style="font-weight:400;opacity:.8;font-size:10.5px">hace un momento</div></div></div>'+
    '<div class="pv-btm" style="right:12px;text-align:center;bottom:16px"><div style="background:rgba(0,0,0,.45);border-radius:10px;padding:8px">'+esc((p.titulo||"")+" · "+(p.ctas&&p.ctas[0]?p.ctas[0].t:""))+'</div><div style="margin-top:8px;opacity:.85">⌃ Responder</div></div>'+marca,true);
  if(id==="yt")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-bar" style="position:absolute;top:26px;left:0;right:0;color:#fff;z-index:6"><b style="font-size:15px">Shorts</b><span style="margin-left:auto">🔍 ⋮</span></div>'+
    '<div class="pv-side"><div><span>👍</span>'+(pub?likes:"1,1 mil")+'</div><div><span>👎</span>No</div><div><span>💬</span>54</div><div><span>↪</span>Compartir</div></div>'+
    '<div class="pv-btm"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><div class="pv-av" style="background:#f00;width:26px;height:26px"><i>'+logoHtml()+'</i></div><b style="display:inline;margin:0">@'+esc(u)+'</b><span style="background:#fff;color:#000;border-radius:20px;padding:3px 9px;font-weight:700;font-size:11px">Suscribirse</span></div>'+esc(p.titulo||"")+'</div>'+marca,true);
  if(id==="igr")return telefono('<div class="pv-full">'+miniEscena(p,true,560)+'</div><div class="pv-bar" style="position:absolute;top:26px;left:0;right:0;color:#fff;z-index:6"><b style="font-size:17px">Reels</b><span style="margin-left:auto">📷</span></div>'+
    '<div class="pv-side"><div><span>♡</span>'+(pub?likes:"1.312")+'</div><div><span>💬</span>48</div><div><span>➤</span>96</div><div><span>⋯</span></div></div>'+
    '<div class="pv-btm"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><div class="pv-av" style="width:26px;height:26px"><i>'+logoHtml()+'</i></div><b style="display:inline;margin:0">'+esc(u)+'</b><span class="pv-seg">Seguir</span></div>'+cortar(90)+(crudo.length>90?'… más':'')+'<div style="margin-top:6px">♫ Audio original · '+esc(u)+'</div></div>'+marca,true);
  if(id==="wam"){var dom=(enlace("reserva")||"").replace(/^https?:\/\//,"").split("/")[0];
    return telefono('<div class="pv-wah"><span>‹</span><div class="pv-av" style="width:30px;height:30px"><i>'+logoHtml()+'</i></div><div><b>'+esc(n.nombre||"")+'</b><div style="font-size:10.5px;opacity:.85">cuenta de empresa</div></div><span style="margin-left:auto">📞</span></div>'+
      '<div class="pv-wab"><div class="pv-wad">HOY</div><div class="pv-wam"><a class="pv-wal" href="'+esc(enlace("reserva"))+'" target="_blank" rel="noopener"><div class="pv-wali">'+miniEscena(p,false,150)+'</div><div class="pv-walt"><b>Reservar mesa · '+esc(n.nombre||"")+'</b><span>'+esc(p.titulo||"")+'</span><small>'+esc(dom)+'</small></div></a>'+
      '<div class="pv-wat">'+cortar(170)+(crudo.length>170?'…':'')+'<br><a href="'+esc(enlace("reserva"))+'" target="_blank" rel="noopener">'+esc(enlace("reserva"))+'</a></div><div class="pv-wah2">'+new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})+' ✓✓</div></div></div>'+
      '<div class="pv-wain"><span>😊</span><div>Mensaje</div><span>📎</span><span>🎤</span></div>');}
  if(id==="gsearch"){var ciu=(n.ciudad||"").split(",")[0];
    return telefono(sb()+'<div class="pv-gg"><div class="pv-ggs"><span style="font-weight:800;color:#4285F4">G</span><span class="q">'+esc((n.nombre||"").toLowerCase()+" "+ciu.toLowerCase())+'</span><span>🎤</span></div>'+
      '<div class="pv-gmap"><i class="r1"></i><i class="r2"></i><i class="r3"></i><span class="pin">📍</span></div>'+
      '<div class="pv-ggf"><div class="pv-ggl">'+logoHtml()+'</div><div><b>'+esc(n.nombre||"")+(esParaiso()?' Bar Restaurante':'')+'</b><div class="pv-ggm">Restaurante · '+esc(ciu)+'</div><div class="pv-ggo">Abierto</div></div></div>'+
      '<div class="pv-gbtn"><a href="'+esc(enlace("reserva"))+'" target="_blank" rel="noopener" class="on">Reservar</a><span>Cómo llegar</span><span>Llamar</span><span>Guardar</span></div>'+
      (esParaiso()?'<div class="pv-ggm" style="padding:2px 12px">Carrer d\'Anselm Turmeda, 5 · Palma · 971 37 90 28</div>':'')+
      '<div class="pv-ggm" style="padding:8px 12px 4px;font-weight:700;color:#202124">Novedades del propietario</div>'+
      '<div class="pv-gnov"><div class="pv-gnovi">'+miniEscena(p,false,110)+'</div><div class="pv-gnovt"><b>'+esc(p.titulo||"")+'</b><span>'+cortar(80)+'…</span></div></div></div>'+marca);}
  if(id==="gbp")return telefono(sb()+'<div class="pv-gg"><div class="pv-ggs"><span>☰</span><span class="q">'+esc(n.nombre||"")+' '+esc((n.ciudad||"").split(",")[0])+'</span><span>🎤</span></div>'+
    '<div class="pv-ggf"><div class="pv-ggl">'+logoHtml()+'</div><div><b>'+esc(n.nombre||"")+(esParaiso()?' Bar Restaurante':'')+'</b><div class="pv-ggm">Restaurante · '+esc((n.ciudad||"").split(",")[0])+'</div><div class="pv-ggo">Abierto</div></div></div>'+
    '<div class="pv-ggt"><span>Resumen</span><span class="on">Novedades</span><span>Reseñas</span><span>Fotos</span></div>'+
    '<div class="pv-ggp"><div class="pv-ggph">'+logoHtml()+'<div><b>'+esc(n.nombre||"")+'</b><div class="pv-ggm">'+(pub?"Hace un momento":"Novedad")+'</div></div></div>'+
      '<div class="pv-m">'+miniEscena(p,false,200)+'</div><div class="pv-cap" style="max-height:58px;padding-top:8px">'+cortar(120)+(crudo.length>120?'…':'')+'</div>'+
      '<a class="pv-ggb" href="'+esc(enlace("reserva"))+'" target="_blank" rel="noopener">'+ctaT.replace(/^\S+\s/,"")+'</a></div></div>'+marca);
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
  var h='<div class="cm-bh"><div><h3>🚀 Publicar</h3>'+pasos+'</div><button class="x" onclick="cmCerrar()" aria-label="Cerrar">×</button></div>'+(PUB.demo?'<div class="cm-demo"><b>▶ DEMOSTRACIÓN</b> Así se publica con Chispa. No se sube nada de verdad. <button onclick="cmDemoParar()">Parar</button></div>':'')+'<div class="cm-bb">';
  if(PUB.paso===1){
    h+='<div class="cm-grid"><div><div class="cm-lbl">¿Dónde lo publicamos?</div><div class="cm-redes">'+REDES.map(function(r){return '<button class="cm-red'+(PUB.sel[r.id]?" on":"")+'" onclick="cmRed(\''+r.id+'\')"><span class="ri '+r.cls+'">'+r.ic+'</span><span><div class="rn">'+r.nm+'</div><div class="rd">'+r.sub+'</div></span><span class="ck"></span></button>';}).join("")+'</div>'+
      (p.media?'':'<div class="cm-note" style="border-color:rgba(255,204,51,.5);color:var(--amber)">⚠️ Esta publicación no tiene imagen. <a href="javascript:void 0" onclick="cmCerrar();crearImagenIA('+PUB.i+',1)">Crear una con IA</a> o <a href="javascript:void 0" onclick="cmCerrar();cmElegirArchivo('+PUB.i+')">subir tu foto</a>.</div>')+
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
window.cmPaso=function(n){PUB.paso=n;if(n===3&&!PUB.demo){S.historial=S.historial||[];S.historial.push({cuando:Date.now(),redes:Object.keys(PUB.sel),titulo:window._posts[PUB.i].titulo});guardar();
    var pp=window._posts[PUB.i],hechas=Object.keys(PUB.hecho);
    if(pp&&pp._agendaId&&window.CHISPA_AGENDA){if(hechas.length)CHISPA_AGENDA.marcar(pp._agendaId,"publicada",hechas);else toast("Cuando la subas, márcala como publicada en el calendario");}}
  pintarPub();};
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
  // Google: lo hace el conector de la ficha del trabajador B (API oficial o, sin conexión, abre la ficha con el texto copiado)
  if(id==="gbp"&&window.ChispaFicha&&ChispaFicha.enviarDesdePublicar){try{var rr=ChispaFicha.enviarDesdePublicar(p);PUB.hecho[id]="Enviado a tu ficha de Google";set("✓ Enviado a tu ficha de Google",true);
    if(rr&&rr.then)rr.then(function(){},function(e){set("Google: "+(e&&e.message||"no se pudo"));});}catch(e){set("Google: "+e.message);}return;}
  // 1) Publicación directa por API oficial, si nuestro servidor tiene la cuenta conectada
  var PD=window.CHISPA_PUBLICADOR;
  if(PD&&PD.url&&p.media&&!(PD._fallo&&PD._fallo[id])&&(!PD.conectada||PD.conectada(id))){
    set("Publicando directamente en "+r.nm+"…");
    prepararArchivo(p,r.vert).then(function(b){var fd=new FormData();fd.append("red",id);fd.append("texto",texto);fd.append("fecha",p.fecha||"");fd.append("archivo",b,nombreArchivo(p,ext(b)));
      return fetch(PD.url,{method:"POST",body:fd,credentials:"include"});})
    .then(function(res){if(!res.ok)throw new Error("respuesta "+res.status);PUB.hecho[id]="Publicado directamente";set("✓ Publicado directamente en "+r.nm,true);if(p._agendaId&&window.CHISPA_AGENDA)CHISPA_AGENDA.marcar(p._agendaId,"publicada",[id]);})
    .catch(function(e){set("La publicación directa falló ("+(e&&e.message||"error")+"). Pulsa otra vez para hacerlo a mano.");PD._fallo=PD._fallo||{};PD._fallo[id]=1;if(p._agendaId&&window.CHISPA_AGENDA)CHISPA_AGENDA.marcar(p._agendaId,"fallo",[id],e&&e.message);});
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
   DEMO DE PUBLICACIÓN (para enseñar): recorre los pasos sola
   ===================================================================== */
var DEMO={t:[]};
function dPaso(ms,fn){DEMO.t.push(setTimeout(function(){if(PUB.demo)fn();},ms));}
function tocar(sel){var e=document.querySelector(sel);if(e){e.classList.add("cm-tap");e.scrollIntoView({block:"nearest",behavior:"smooth"});}}
window.cmDemo=function(i){
  var P=window._posts||[];if(i==null){i=0;for(var k=0;k<P.length&&k<900;k++)if(P[k]&&P[k].media){i=k;break;}}
  var p=P[i];if(!p){toast("Primero crea una publicación");return;}
  if(!p.media){crearImagenIA(i);setTimeout(function(){cmDemo(i);},1800);return;}
  DEMO.t.forEach(clearTimeout);DEMO.t=[];
  PUB.i=i;PUB.paso=1;PUB.hecho={};PUB.sel={};PUB.tab="igf";PUB.demo=1;pintarPub();
  var t=700,redes=["igf","tt","fb","gbp"];
  redes.forEach(function(r){dPaso(t,function(){PUB.sel[r]=1;PUB.tab=r;pintarPub();tocar('.cm-red[onclick*="\''+r+'\'"]');});t+=1900;});
  dPaso(t,function(){tocar(".cm-big");});t+=700;
  dPaso(t,function(){PUB.paso=2;pintarPub();});t+=900;
  redes.forEach(function(r){dPaso(t,function(){var st=$("cmSt_"+r);if(st){st.textContent="Publicando…";st.className="st";}tocar("#cmSt_"+r);});t+=700;
    dPaso(t,function(){PUB.hecho[r]="Publicado (demostración)";pintarPub();});t+=500;});
  dPaso(t+300,function(){PUB.paso=3;PUB.tab="igf";pintarPub();contarLikes();});t+=300;
  ["tt","fb","gbp","igf"].forEach(function(r){t+=3000;dPaso(t,function(){PUB.tab=r;pintarPub();contarLikes();});});
  dPaso(t+2600,function(){PUB.demo=0;pintarPub();toast("Fin de la demostración");});
};
window.cmDemoParar=function(){PUB.demo=0;DEMO.t.forEach(clearTimeout);DEMO.t=[];pintarPub();toast("Demostración parada");};

/* =====================================================================
   LOGO Y MARCA DE AGUA (lo puede abrir también «Mi negocio»)
   ===================================================================== */
window.cmMarca=function(){
  var u=logoUrl(),o=logoOscUrl();
  var caja=function(tipo,url,fondo,txt){return '<div class="cm-mk" style="margin-top:12px"><div class="cm-mkl" style="background:'+fondo+'">'+(url?'<img src="'+esc(url)+'" alt="">':'<span>'+esc(N().logo||"🍽️")+'</span>')+'</div><div>'+
    '<b style="font-size:14px">'+txt+'</b><br><input type="file" accept="image/*" id="cmLogoIn_'+tipo+'" style="display:none" onchange="cmLogoSubir(this,\''+tipo+'\')">'+
    '<button class="btn pp sm" style="margin-top:6px" onclick="document.getElementById(\'cmLogoIn_'+tipo+'\').click()">📷 Cambiar</button> '+
    ((tipo==="claro"?(N().logoUrl||LOGO.url):(N().logoOscuroUrl||LOGO.urlOsc))?'<button class="btn g sm" style="margin-top:6px" onclick="cmLogoQuitar(\''+tipo+'\')">↺ Quitar el mío</button>':'')+'</div></div>';};
  modal('<h3>🏷️ Tus logos</h3><p style="font-size:12.5px;color:var(--tx3);margin:0">El <b>oscuro</b> es la foto de perfil (como en tu Instagram). El <b>claro</b>, mejor PNG transparente, es el que se integra suave en las fotos.</p>'+
    caja("oscuro",o,"#000","Logo oscuro · foto de perfil")+caja("claro",u,"#fff","Logo claro · integrado en las fotos")+
    '<button class="btn pp" style="width:100%;margin-top:14px" onclick="cerrarModal()">Listo</button>');
};
window.cmMkPos=function(b){Array.prototype.forEach.call(b.parentNode.children,function(x){x.className="btn g sm";});b.className="btn pp sm";};
window.cmMarcaGuardar=function(){var on=$("cmMkOn").checked,pb=document.querySelector(".cm-mkpos .pp"),t=+$("cmMkT").value;
  S.negocio.marcaAgua={on:on,pos:pb?pb.getAttribute("data-pos"):"tl",tam:t};guardar();cerrarModal();
  (window._posts||[]).forEach(function(p,i){if(i<900&&p)repintar(i);});toast("Marca de agua guardada ✓");};
window.cmLogoSubir=function(inp,tipo){var f=inp.files&&inp.files[0];if(!f)return;if(!/^image\//.test(f.type)){toast("Elige una imagen");return;}
  if(tipo==="oscuro"){if(LOGO.urlOsc)try{URL.revokeObjectURL(LOGO.urlOsc);}catch(e){}LOGO.urlOsc=URL.createObjectURL(f);delete S.negocio.logoOscuroUrl;idbLogo("put",f,"logoOsc");}
  else{if(LOGO.url)try{URL.revokeObjectURL(LOGO.url);}catch(e){}LOGO.url=URL.createObjectURL(f);delete S.negocio.logoUrl;cargarLogo();idbLogo("put",f);}
  cerrarModal();(window._posts||[]).forEach(function(p,i){if(i<900&&p)repintar(i);});toast("Logo cambiado ✓");cmMarca();};
window.cmLogoQuitar=function(tipo){if(tipo==="oscuro"){if(LOGO.urlOsc)try{URL.revokeObjectURL(LOGO.urlOsc);}catch(e){}LOGO.urlOsc="";delete S.negocio.logoOscuroUrl;guardar();idbLogo("del",null,"logoOsc");}
  else{if(LOGO.url)try{URL.revokeObjectURL(LOGO.url);}catch(e){}LOGO.url="";delete S.negocio.logoUrl;guardar();cargarLogo();idbLogo("del",null);}
  cerrarModal();(window._posts||[]).forEach(function(p,i){if(i<900&&p)repintar(i);});toast("Vuelve el logo de siempre");};

/* «Conectar Instagram / Facebook / TikTok»: si nadie lo ha montado todavía, que haga algo útil */
function conectarAqui(){
  var R=[["igf","Instagram","ig","◎",enlace("instagram"),"https://business.facebook.com/latest/settings/instagram_account","Une tu Instagram profesional a la página de Facebook (lo pide Meta para publicar)"],
    ["fb","Facebook","fb","f",enlace("facebook"),"https://business.facebook.com/latest/settings/pages","Tu página de Facebook en Meta Business"],
    ["tt","TikTok","tt","♪",enlace("tiktok"),"https://www.tiktok.com/business/","Cuenta de empresa de TikTok"],
    ["yt","YouTube","yt","▶",enlace("youtube"),"https://studio.youtube.com/","Tu canal en YouTube Studio"],
    ["gbp","Google","gg","G",enlace("google"),"https://business.google.com/","Tu ficha de Google (Maps y Búsqueda)"]];
  modal('<h3>🔗 Conectar tus redes</h3><p style="color:var(--tx2);font-size:13px;margin:0 0 10px">Abre cada red y deja la sesión iniciada. Mientras Meta, TikTok y Google aprueban a Chispa, publicas con un toque desde «Publicar».</p>'+
    R.map(function(r){return '<div class="cm-row" style="margin-bottom:8px"><span class="ri '+r[2]+'" style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:#fff;font-weight:800">'+r[3]+'</span><div class="rn">'+r[1]+'<div class="st">'+esc(r[6])+'</div></div>'+
      (r[4]?'<a class="btn g sm" style="flex:none;text-decoration:none" href="'+esc(r[4])+'" target="_blank" rel="noopener">Mi perfil</a>':'')+
      '<a class="btn pp sm" style="flex:none;text-decoration:none" href="'+r[5]+'" target="_blank" rel="noopener">Conectar</a></div>';}).join("")+
    '<button class="btn g" style="width:100%;margin-top:6px" onclick="cerrarModal();typeof panel===\'function\'&&panel(\'ajustes\')">Poner mis enlaces en «Mi negocio»</button>');
}
try{if(typeof window.conectarCuentas!=="function"||/pr[oó]ximamente/.test(String(window.conectarCuentas)))window.conectarCuentas=conectarAqui;}catch(e){}

/* =====================================================================
   «ASÍ LO VE TU CLIENTE»: la publicación en todas las plataformas a la vez
   ===================================================================== */
var PLATAFORMAS=[["igf","Instagram · feed"],["igs","Instagram · Stories"],["igr","Instagram · Reels"],["tt","TikTok"],["fb","Facebook"],["wa","WhatsApp · Estado"],["wam","WhatsApp · mensaje"],["gbp","Google · ficha (Maps)"],["gsearch","Google · búsqueda"],["yt","YouTube Shorts"]];
var CLI={i:0,modo:"cuadricula",k:0};
window.cmCliente=function(i){
  var P=window._posts||[];if(i==null){i=0;for(var q=0;q<P.length&&q<900;q++)if(P[q]&&P[q].media){i=q;break;}}
  if(!P[i]){toast("Primero crea una publicación");return;}
  CLI.i=i;if(window.innerWidth<700&&CLI.modo==="cuadricula"&&!CLI.elegido)CLI.modo="una";pintarCli();
};
function pintarCli(){
  var P=window._posts||[],p=P[CLI.i];
  var mini=P.map(function(x,k){if(!x||k>=900)return "";var u=x.media&&(x.media.slides?x.media.slides[0].url:x.media.url);
    return '<button class="cm-clp'+(k===CLI.i?" on":"")+'" onclick="cmCliSel('+k+')">'+(u?'<img src="'+esc(u)+'" alt="">':'<span>🖼️</span>')+'<b>'+esc(x.titulo||"")+'</b></button>';}).join("");
  var cuerpo;
  if(CLI.modo==="cuadricula"){
    cuerpo='<div class="cm-clg">'+PLATAFORMAS.map(function(pl){return '<figure class="cm-clf"><figcaption>'+pl[1]+'</figcaption>'+vista(p,pl[0],false)+'</figure>';}).join("")+'</div>';
  }else{
    var pl=PLATAFORMAS[CLI.k];
    cuerpo='<div class="cm-tabs">'+PLATAFORMAS.map(function(x,k){return '<button class="'+(k===CLI.k?"on":"")+'" onclick="cmCliK('+k+')">'+x[1]+'</button>';}).join("")+'</div>'+
      '<div class="cm-cl1"><button class="cm-clnav" onclick="cmCliK('+((CLI.k+PLATAFORMAS.length-1)%PLATAFORMAS.length)+')" aria-label="Anterior">‹</button>'+
      '<figure class="cm-clf"><figcaption>'+pl[1]+' · '+(CLI.k+1)+'/'+PLATAFORMAS.length+'</figcaption>'+vista(p,pl[0],false)+'</figure>'+
      '<button class="cm-clnav" onclick="cmCliK('+((CLI.k+1)%PLATAFORMAS.length)+')" aria-label="Siguiente">›</button></div>';
  }
  abrirOv('<div class="cm-bh"><div><h3>👁 Así lo ve tu cliente</h3><div class="cm-steps">'+esc(p.titulo||"")+' · en '+PLATAFORMAS.length+' sitios</div></div>'+
    '<div class="ag-seg cm-clm"><button class="'+(CLI.modo==="cuadricula"?"on":"")+'" onclick="cmCliModo(\'cuadricula\')">Todas</button><button class="'+(CLI.modo==="una"?"on":"")+'" onclick="cmCliModo(\'una\')">Una a una</button></div>'+
    '<button class="x" onclick="cmCerrar()" aria-label="Cerrar">×</button></div><div class="cm-bb">'+
    '<div class="cm-clps">'+mini+'</div>'+cuerpo+
    '<div class="cm-note">Vista previa de cómo sale en cada sitio, con tu logo, tus nombres (@'+esc(usuario())+' en Instagram, @'+esc(usuarioTT())+' en TikTok, '+esc(nombreFB())+' en Facebook) y el botón de reservar que lleva a tu página de reservas. Los números de «me gusta» son de muestra.</div>'+
    '<button class="btn pp cm-big" onclick="cmCerrar();publicarGen('+CLI.i+')">🚀 Publicar esta</button></div>');
  var b=$("cmBox");if(b)b.classList.add("ancha");
}
window.cmCliSel=function(k){CLI.i=k;pintarCli();};
window.cmCliK=function(k){CLI.k=k;pintarCli();};
window.cmCliModo=function(m){CLI.modo=m;CLI.elegido=1;pintarCli();};

/* =====================================================================
   ARRANQUE: si el panel ya está pintado, volver a pintarlo con lo nuevo
   ===================================================================== */
document.addEventListener("keydown",function(e){if(e.key==="Escape")cmCerrar();});
try{if($("app")&&$("app").classList.contains("on")&&typeof panel==="function"&&typeof TAB!=="undefined"&&TAB==="asistente")panel("asistente");}catch(e){}
window.CHISPA_ESTUDIO={version:"2026-10-07",cliente:function(i){cmCliente(i);},marca:function(){cmMarca();},demo:function(i){cmDemo(i);},logoUrl:logoUrl,enlace:enlace,catDe:catDe,fotos:F,hacerImagen:hacerImagen,hacerVideo:hacerVideo,
  nuevoPost:nuevoPost,ejemplos:ejemplos,escena:escena,tituloCorto:tituloCorto,fechaBonita:fechaBonita,vertical:vertical,aspecto:aspecto,
  fotoPara:function(cat,n,w,h){var f=fotoDe(cat,n);return {url:fotoUrl(f[0],w||1080,h||1080),cred:f[1]};},
  // abre la ventana Publicar con una publicación que no está en las tarjetas (p. ej. desde el calendario)
  publicar:function(p,redes){window._posts=window._posts||[];var i=900;window._posts[i]=p;publicarGen(i);
    if(redes&&redes.length){PUB.sel={};redes.forEach(function(r){PUB.sel[r]=1;});PUB.tab=redes[0];pintarPub();}}};
})();
