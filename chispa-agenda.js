/* =====================================================================
   Chispa · Calendario de publicaciones, órdenes a Chispa y estadísticas
   (trabajador A). Fichero aparte: sustituye las pestañas «Calendario» y
   «Estadísticas» del Panel del negocio envolviendo panel(), como hace
   resenas.js. Usa las publicaciones del Estudio (chispa-estudio.js).

   - Calendario: semana / mes / lista, arrastrar a otro día y hora (ratón y
     dedo: mantener pulsado), colores por red y estado (borrador, programada,
     publicada, falló).
   - Órdenes: «Chispa, publica todo esto el lunes», «programa la semana»…
     en el chat y en la barra del calendario. Reparte en las mejores horas
     para un restaurante en Palma y explica por qué.
   - Publicación automática: con la página cerrada lo hace el servidor
     conectores/publicador-worker.js (Cloudflare, Cron cada 5 min, APIs
     oficiales). Sin servidor: aviso a la hora con el contenido listo.
   - Estadísticas: datos reales de Instagram que tenemos, registro a mano y
     datos de ejemplo marcados como EJEMPLO; preparado para leer Insights.
   ===================================================================== */
(function(){
"use strict";
if(typeof S==="undefined"||typeof TABS==="undefined")return;
function $(id){return document.getElementById(id);}
function esc(s){return(s==null?"":""+s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function E(){return window.CHISPA_ESTUDIO||{};}
function sinTildes(s){return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}
function pad(n){return (n<10?"0":"")+n;}
function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
function diaIso(d){return iso(d).slice(0,10);}
function fecha(s){return new Date(s);}
function lunes(d){var x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function sumaDias(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function dow(d){return (d.getDay()+6)%7;} // 0 = lunes
var DIAS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
var DC=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
var MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function hora(d){return pad(d.getHours())+":"+pad(d.getMinutes());}
function bonito(d){return DIAS[dow(d)].toLowerCase()+" "+d.getDate()+" de "+MESES[d.getMonth()]+" a las "+hora(d);}
function uid(){return "a"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

/* ---------- redes y estados ---------- */
var REDES={
  igf:{nm:"Instagram",c:"#e1306c",ic:"◎"},
  igs:{nm:"Stories",c:"#f77737",ic:"◉"},
  tt:{nm:"TikTok",c:"#14958f",ic:"♪"},
  fb:{nm:"Facebook",c:"#4c8dff",ic:"f"},
  wa:{nm:"WhatsApp",c:"#25a35a",ic:"✆"},
  yt:{nm:"YouTube",c:"#9a6cf0",ic:"▶"},
  gbp:{nm:"Google",c:"#b88400",ic:"G"}
};
var ESTADOS={borrador:{nm:"Borrador",ic:"✎"},programada:{nm:"Programada",ic:"⏱"},publicada:{nm:"Publicada",ic:"✓"},fallo:{nm:"Falló",ic:"!"}};
function redesPorFormato(f){return (f==="reel")?["igf","tt","yt"]:(f==="historia")?["igs","wa"]:["igf","fb"];}

/* ---------- estado guardado ---------- */
function guardarTodo(){try{guardar();}catch(e){}}
function datos(){
  if(!S.agenda){S.agenda=sembrar();S.metricas=metricasEjemplo(S.agenda);guardarTodo();}
  if(!S.metricas)S.metricas=[];
  if(!S.seguidores)S.seguidores=[{red:"igf",fecha:"2026-10-07",n:1206,fuente:"real"}];
  if(!S.cuentas)S.cuentas={igf:{usuario:"elparaisobarrestaurante",seguidores:1206,publicaciones:123,fecha:"2026-10-07",fuente:"real"}};
  importarViejos();
  migrar();
  return S.agenda;
}
/* lo que otras pantallas dejan en S.programados (plan de la semana, añadir…) entra en el calendario */
function importarViejos(){
  if(!S.programados)return;var L=lunes(new Date()),n=0;
  S.programados.forEach(function(o){if(o._ag)return;o._ag=1;n++;
    var d=sumaDias(L,o.dia||0);d.setHours(13,0,0,0);
    var t=(o.txt||"Publicación").replace(/^[^\wÁÉÍÓÚÑáéíóúñ¿¡]+/,"").trim();
    S.agenda.push(item({titulo:t,txt:t,cuando:iso(d),estado:"programada",cat:E().catDe?E().catDe(t):"plato",redes:o.tipo==="a"?["fb","igf"]:["igf"]}));});
  if(n)guardarTodo();
}
function item(o){
  var cat=o.cat||(E().catDe?E().catDe((o.titulo||"")+" "+(o.txt||"")):"plato");
  var it={id:o.id||uid(),titulo:o.titulo||"Publicación",txt:o.txt||"",tags:o.tags||"",kicker:o.kicker||"",formato:o.formato||"post",cat:cat,
    L:o.L||0,foto:o.foto||0,ctas:o.ctas||null,sinTexto:!!o.sinTexto,redes:o.redes||redesPorFormato(o.formato),cuando:o.cuando||"",
    estado:o.estado||(o.cuando?"programada":"borrador"),por:o.por||"",media:o.media||null,mediaLocal:!!o.mediaLocal,ejemplo:!!o.ejemplo,res:o.res||{},motivo:o.motivo||"",
    // cuándo: «hora» (una hora exacta), «franja» (desde cuando hasta hasta) o «dia» (todo el día); piezas = historias/publicaciones dentro de la franja
    modo:(o.modo==="franja"||o.modo==="dia")?o.modo:"hora",hasta:o.hasta||"",piezas:o.piezas||null,reparto:o.reparto||"auto",cada:o.cada||0,promo:!!o.promo};
  if(!it.media&&!it.mediaLocal&&E().fotoPara){var v=it.formato==="reel"||it.formato==="historia";var f=E().fotoPara(cat,it.foto,1080,v?1920:1080);it.media={tipo:"foto",url:f.url,cred:f.cred};}
  return it;
}
function buscar(id){id=String(id||"").split("~")[0];var A=S.agenda||[];for(var k=0;k<A.length;k++)if(A[k].id===id)return A[k];return null;}

/* ---------- fotos y vídeos propios: se guardan en el aparato (IndexedDB) ---------- */
var IDB=null,urlLocal={};
function idb(){if(IDB)return IDB;IDB=new Promise(function(ok,ko){try{var r=indexedDB.open("chispa-medios",1);r.onupgradeneeded=function(){r.result.createObjectStore("m");};r.onsuccess=function(){ok(r.result);};r.onerror=function(){ko(r.error);};}catch(e){ko(e);}});return IDB;}
function guardarLocal(id,blob){return idb().then(function(db){return new Promise(function(ok,ko){var t=db.transaction("m","readwrite");t.objectStore("m").put(blob,id);t.oncomplete=ok;t.onerror=function(){ko(t.error);};});});}
function leerLocal(id){if(urlLocal[id])return Promise.resolve(urlLocal[id]);return idb().then(function(db){return new Promise(function(ok){var r=db.transaction("m").objectStore("m").get(id);r.onsuccess=function(){if(r.result){urlLocal[id]={url:URL.createObjectURL(r.result),esVideo:/^video\//.test(r.result.type),blob:r.result};ok(urlLocal[id]);}else ok(null);};r.onerror=function(){ok(null);};});}).catch(function(){return null;});}
function pintarLocales(raiz){
  var els=(raiz||document).querySelectorAll("[data-local]");
  Array.prototype.forEach.call(els,function(el){leerLocal(el.getAttribute("data-local")).then(function(m){if(!m)return;el.removeAttribute("data-local");
    el.innerHTML=m.esVideo?'<video src="'+m.url+'" muted playsinline></video>':'<img src="'+m.url+'" alt="">';});});
}
function miniatura(it){
  if(it.mediaLocal)return '<span class="ag-th" data-local="'+esc(it.id)+'">📷</span>';
  var u=it.media&&(it.media.slides?it.media.slides[0].url:it.media.url);
  if(!u||/^blob:/.test(u))return '<span class="ag-th">🖼️</span>';
  return '<span class="ag-th"><img src="'+esc(u.replace(/w=\d+/,"w=160").replace(/h=\d+/,"h=160"))+'" alt="" loading="lazy"></span>';
}
function aPost(it,pz){
  var cu=pz&&pz.cuando?pz.cuando:it.cuando,fmt=pz?pz.formato:it.formato;
  var p=E().nuevoPost?E().nuevoPost({txt:it.txt,tags:it.tags,titulo:it.titulo,kicker:it.kicker,formato:fmt,cat:it.cat,foto:it.foto,L:it.L,fecha:cu,ang:"📅 "+(cu?bonito(fecha(cu)):"Sin fecha")}):{txt:it.txt,tags:it.tags,titulo:it.titulo};
  if(it.ctas)p.ctas=JSON.parse(JSON.stringify(it.ctas));p.sinTexto=it.sinTexto;p._agendaId=it.id+(pz?"~"+pz.id:"");
  if(it.mediaLocal&&urlLocal[it.id]){var m=urlLocal[it.id];p.media={tipo:"propia",url:m.url,esVideo:m.esVideo};p.file=m.blob;}
  else if(it.media)p.media=JSON.parse(JSON.stringify(it.media));
  return p;
}

/* ---------- ejemplos de El Paraíso ---------- */
function sembrar(){
  var hoy=new Date(),A=[];
  function d(n,h,m){var x=sumaDias(hoy,n);x.setHours(h,m||0,0,0);return iso(x);}
  var neg=(S.negocio&&S.negocio.nombre)||"El Paraíso";
  A.push(item({ejemplo:1,titulo:"Menú del día",kicker:"De lunes a viernes",formato:"carrusel",cat:"plato",foto:1,L:2,redes:["igf","fb"],cuando:d(-6,11,30),estado:"publicada",
    txt:"Menú del día en "+neg+" 🍽️\n\nPrimero, segundo, postre, pan y bebida. Cocina casera hecha cada mañana.",tags:"#menudeldia #Palma"}));
  A.push(item({ejemplo:1,titulo:"Cócteles en la terraza",kicker:"Happy hour",formato:"reel",cat:"coctel",foto:5,L:1,redes:["igf","tt"],cuando:d(-4,18,30),estado:"publicada",
    txt:"Atardecer en la terraza 🍹 Mojitos y cócteles de la casa.",tags:"#mojito #terraza #Palma"}));
  A.push(item({ejemplo:1,titulo:"Paella de bogavante",kicker:"Este domingo",formato:"post",cat:"paella",foto:0,L:0,redes:["igf","fb","gbp"],cuando:d(-2,11,0),estado:"publicada",
    txt:"Domingo de paella en "+neg+" 🥘 Bogavante y socarrat, al momento.",tags:"#paella #bogavante #Palma"}));
  A.push(item({ejemplo:1,titulo:"Noche caribeña",kicker:"Sábado · 21:00",formato:"historia",cat:"evento",foto:3,L:3,redes:["tt"],cuando:d(-1,20,30),estado:"fallo",motivo:"TikTok no está conectado todavía",
    txt:"Este sábado, noche caribeña 🎶 Música en directo, mofongo y buen ron.",tags:"#planfinde #Palma"}));
  A.push(item({ejemplo:1,titulo:"Menú del día",kicker:"Hoy",formato:"post",cat:"plato",foto:4,L:2,redes:["igf","fb"],cuando:d(1,11,30),estado:"programada",
    txt:"Hoy en "+neg+": menú del día casero 🍽️ ¿Te guardamos mesa?",tags:"#menudeldia #Palma"}));
  A.push(item({ejemplo:1,titulo:"Lo que dicen de nosotros",kicker:"5 estrellas",formato:"post",cat:"local",foto:0,L:3,redes:["igf","fb"],cuando:"",estado:"borrador",
    txt:"«La mejor paella de Palma y un trato de familia» ⭐⭐⭐⭐⭐ Gracias por venir.",tags:"#Palma #restaurante"}));
  A.push(item({ejemplo:1,titulo:"Mojitos a 6 €",kicker:"Jueves y viernes",formato:"reel",cat:"coctel",foto:2,L:1,redes:["igs","tt"],cuando:d(3,18,30),estado:"programada",
    txt:"Jueves y viernes, mojitos a 6 € en la terraza 🍹",tags:"#mojito #Palma"}));
  A.push(item({ejemplo:1,titulo:"Paella de los domingos",kicker:"Reserva tu mesa",formato:"post",cat:"paella",foto:3,L:0,redes:["igf","fb","gbp"],cuando:d(5,11,0),estado:"programada",
    txt:"Este domingo, paella de bogavante 🥘 Reserva tu mesa.",tags:"#paella #Palma"}));
  return A;
}

/* =====================================================================
   MEJORES HORAS (restaurante en Palma)
   ===================================================================== */
var POR={
  comida:"La gente decide dónde comer entre las 11:00 y las 12:30; en España se come de 13:30 a 15:30. Si sale a las 11:30, te ven justo cuando lo están pensando.",
  finde:"El plan de comida del fin de semana se decide la víspera por la tarde y esa misma mañana, con el café.",
  noche:"El plan de la noche se decide al salir de trabajar, entre las 18:00 y las 19:30. Las cenas en Palma empiezan a las 21:00.",
  desayuno:"Los desayunos y el brunch se deciden al despertar: a primera hora entre semana y algo más tarde el fin de semana.",
  sofa:"De 20:30 a 22:00 es cuando más se mira el móvil en el sofá: es lo mejor para reels y vídeos que no piden venir ya.",
  tarde:"A media tarde (16:30-17:30) llega el antojo dulce y el café.",
  turistas:"En temporada, los turistas miran planes desde el hotel por la mañana (10:00-11:00) y a media tarde."
};
// candidatos por tipo: [día(0=lun), hora, minuto, motivo]
function candidatos(it){
  var c=it.cat,f=it.formato;
  if(c==="plato")return [[0,11,30,"comida"],[1,11,30,"comida"],[3,11,30,"comida"],[4,11,30,"comida"]];
  if(c==="paella"||c==="marisco"||c==="tapas")return [[5,11,0,"finde"],[6,11,0,"finde"],[4,19,30,"finde"]];
  if(c==="coctel"||c==="terraza")return [[3,18,30,"noche"],[4,18,30,"noche"],[5,18,0,"noche"]];
  if(c==="evento")return [[3,19,0,"noche"],[4,19,0,"noche"],[1,20,30,"sofa"]];
  if(c==="brunch")return [[5,9,30,"desayuno"],[6,9,30,"desayuno"],[0,8,30,"desayuno"]];
  if(c==="postre")return [[6,16,30,"tarde"],[4,16,30,"tarde"],[1,16,30,"tarde"]];
  if(f==="reel")return [[1,20,30,"sofa"],[3,20,30,"sofa"],[6,20,30,"sofa"]];
  return [[1,20,30,"sofa"],[3,13,0,"comida"],[6,20,30,"sofa"]];
}
var CERRADO=2; // El Paraíso cierra los miércoles (0=lunes)
function huecoLibre(d,usados){
  var k=diaIso(d),mios=usados.filter(function(u){return diaIso(u)===k;});
  if(mios.length>=2)return false;
  for(var i=0;i<mios.length;i++)if(Math.abs(mios[i]-d)<3*3600*1000)return false;
  return true;
}
function ocupadas(excluir){var out=[];(S.agenda||[]).forEach(function(a){if(!a.cuando||a.estado==="publicada"||(excluir&&excluir.indexOf(a.id)>=0))return;tiemposDe(a).forEach(function(t){out.push(new Date(t));});});return out;}
/* reparte una lista de publicaciones en los próximos 7 días */
function repartirSemana(lista,desde){
  var ini=desde||sumaDias(new Date(),1);ini.setHours(0,0,0,0);
  var usados=ocupadas(lista.map(function(x){return x.id;})),out=[];
  lista.forEach(function(it){
    var cs=candidatos(it),hecho=null;
    for(var vuelta=0;vuelta<2&&!hecho;vuelta++){
      for(var n=0;n<7&&!hecho;n++){var dia=sumaDias(ini,n);
        for(var k=0;k<cs.length;k++){if(cs[k][0]!==dow(dia)||dow(dia)===CERRADO)continue;
          var d=new Date(dia);d.setHours(cs[k][1],cs[k][2],0,0);if(d<new Date())continue;
          if(vuelta===0&&!huecoLibre(d,usados))continue;hecho={d:d,por:POR[cs[k][3]]};break;}}
      if(!hecho&&vuelta===1){ // ningún hueco ideal: el siguiente día libre a la hora genérica
        for(var m=0;m<7&&!hecho;m++){var dd=sumaDias(ini,m);if(dow(dd)===CERRADO)continue;var h2=new Date(dd);h2.setHours(it.formato==="reel"?20:13,it.formato==="reel"?30:0,0,0);
          if(huecoLibre(h2,usados))hecho={d:h2,por:POR[it.formato==="reel"?"sofa":"comida"]};}}
    }
    if(!hecho){var x=sumaDias(ini,6);x.setHours(20,30,0,0);hecho={d:x,por:POR.sofa};}
    usados.push(hecho.d);it.cuando=iso(hecho.d);it.estado="programada";it.por=hecho.por;out.push(it);
  });
  return out;
}
/* todas el mismo día, separadas */
function repartirDia(lista,dia,horaFija){
  var franjas=[[11,30,"comida"],[13,0,"comida"],[18,30,"noche"],[20,30,"sofa"],[21,30,"sofa"],[9,30,"desayuno"],[16,30,"tarde"]];
  var pref={plato:[0,1],paella:[0,1],marisco:[0,1],tapas:[1,2],coctel:[2,3],terraza:[2],evento:[2,3],brunch:[5,0],postre:[6,3],local:[3,4]};
  var usados=ocupadas(lista.map(function(x){return x.id;})),out=[];
  lista.forEach(function(it,i){
    var d=new Date(dia),por;
    if(horaFija){d.setHours(horaFija[0],horaFija[1]+i*90,0,0);por="La hora la has elegido tú; las separo hora y media para que no se pisen.";}
    else{var orden=(pref[it.cat]||[3,0,2,1]).concat([0,1,2,3,4,5,6]),ok=null;
      for(var k=0;k<orden.length&&!ok;k++){var f=franjas[orden[k]],c=new Date(dia);c.setHours(f[0],f[1],0,0);
        if(c<new Date())continue;if(huecoLibreDia(c,usados))ok={d:c,por:POR[f[2]]};}
      if(!ok){var c2=new Date(dia);c2.setHours(22,0,0,0);ok={d:c2,por:POR.sofa};}
      d=ok.d;por=ok.por;}
    usados.push(d);it.cuando=iso(d);it.estado="programada";it.por=por+" Las separo para que Instagram no entierre una con la otra.";out.push(it);
  });
  return out;
}
function huecoLibreDia(d,usados){for(var i=0;i<usados.length;i++)if(Math.abs(usados[i]-d)<80*60*1000)return false;return true;}

/* =====================================================================
   FRANJAS Y DÍA ENTERO (trabajador D)
   Cada publicación puede salir a una hora exacta, en una franja «de 18:00
   a 23:00» o el día entero. Dentro de la franja van varias piezas
   (historias, una publicación, un estado de WhatsApp) que Chispa reparte
   equilibradas, cada X minutos o a mano. Nada se pisa: si choca, avisa y
   propone otro hueco.
   ===================================================================== */
var H0=8,H1=23,R0=3;            // semana: de 8:00 a 24:00; fila 1 cabecera, fila 2 «día entero»
var APERTURA=[10,0],CIERRE=[23,0]; // un día entero se reparte en horario de apertura
var MARGEN=10*60000;            // dos publicaciones a menos de 10 min se pisan
var CAPAZ={historia:["igs","wa","fb"],post:["igf","fb","gbp"],carrusel:["igf","fb"],reel:["igf","tt","yt","fb"]};
var TIPOS={post:{nm:"publicación",pl:"publicaciones",ic:"▣"},carrusel:{nm:"carrusel",pl:"carruseles",ic:"▤"},reel:{nm:"reel",pl:"reels",ic:"▶"},historia:{nm:"historia",pl:"historias",ic:"◉"},estado:{nm:"estado de WhatsApp",pl:"estados de WhatsApp",ic:"✆"}};
// horas flojas de El Paraíso para una promo que llene (0 = lunes; el miércoles cierra)
var VALLE={0:[18,0,21,0],1:[18,0,21,0],3:[18,0,21,0],4:[16,30,19,30],5:[16,30,19,30],6:[18,0,22,0]};
var POR_VALLE={
  0:"Las tardes de lunes, martes y jueves son las más flojas: la promo sale cuando la gente termina de trabajar y decide el plan, y llena antes de la cena.",
  4:"Viernes y sábado la cena se llena sola; lo flojo es la tarde, entre la comida y la cena. La promo llena ese hueco.",
  6:"La noche del domingo es la más tranquila de la semana: una promo llamativa a esa hora es la que más mesas llena."};
function porValle(d){var k=dow(d);return POR_VALLE[k===4||k===5?4:k===6?6:0];}

function modoDe(it){return it&&(it.modo==="franja"||it.modo==="dia")?it.modo:"hora";}
function diaDeIt(it){var d=fecha(it.cuando);d.setHours(0,0,0,0);return d;}
function iniDe(it){return modoDe(it)==="dia"?diaDeIt(it):fecha(it.cuando);}
function finDe(it){var m=modoDe(it);if(m==="hora")return fecha(it.cuando);if(m==="dia")return sumaDias(diaDeIt(it),1);
  var f=it.hasta?fecha(it.hasta):null,a=fecha(it.cuando);if(!f||isNaN(f)||f<=a)f=new Date(a.getTime()+3*3600000);return f;}
function rangoReparto(it){if(modoDe(it)==="dia"){var a=diaDeIt(it),b=diaDeIt(it);a.setHours(APERTURA[0],APERTURA[1],0,0);b.setHours(CIERRE[0],CIERRE[1],0,0);return [a,b];}return [iniDe(it),finDe(it)];}
function rango(it){var m=modoDe(it);if(!it.cuando)return "Sin fecha";if(m==="dia")return "Todo el día";if(m==="hora")return hora(fecha(it.cuando));return hora(iniDe(it))+"–"+hora(finDe(it));}
function diaCorto(d){return DC[dow(d)]+" "+d.getDate();}
function linea(it){var t=it.titulo||"Nueva publicación";return it.cuando?diaCorto(iniDe(it))+" · "+rango(it)+" · "+t:"Sin fecha · "+t;}
function tipoPieza(p){return (p.redes&&p.redes.length===1&&p.redes[0]==="wa")?"estado":(TIPOS[p.formato]?p.formato:"historia");}
function nombrePiezas(it){var c={},o=[];(it.piezas||[]).forEach(function(p){var t=tipoPieza(p);if(!c[t]){c[t]=0;o.push(t);}c[t]++;});
  return o.map(function(t){return c[t]+" "+(c[t]===1?TIPOS[t].nm:TIPOS[t].pl);}).join(" + ");}
function piezasOrdenadas(it){return (it.piezas||[]).slice().sort(function(a,b){return (a.cuando||"")<(b.cuando||"")?-1:(a.cuando||"")>(b.cuando||"")?1:0;});}
function tiemposDe(it){
  if(!it.cuando)return [];
  if(it.piezas&&it.piezas.length)return it.piezas.filter(function(p){return p.cuando&&p.estado!=="publicada";}).map(function(p){return fecha(p.cuando).getTime();});
  return modoDe(it)==="hora"?[fecha(it.cuando).getTime()]:[];
}
function tiemposOtros(id){var out=[];(S.agenda||[]).forEach(function(a){if(a.id===id||a.estado==="publicada")return;out=out.concat(tiemposDe(a));});return out;}
function pid(){return "p"+Math.random().toString(36).slice(2,8);}
function redesPieza(fmt,redes){var c=CAPAZ[fmt]||CAPAZ.post,r=[];(redes||[]).forEach(function(x){if(fmt==="historia"&&x==="igf")x="igs";if(c.indexOf(x)>=0&&r.indexOf(x)<0)r.push(x);});return r.length?r:(fmt==="historia"?["igs"]:redesPorFormato(fmt));}
function nuevaPieza(fmt,redes,ancla){return {id:pid(),formato:fmt||"historia",redes:redes||redesPieza(fmt||"historia"),cuando:"",estado:"programada",ancla:ancla||""};}
function redondear(t){return Math.round(t/300000)*300000;}
function esquivar(t,otros,a,b){ // si otra publicación sale a menos de 10 min, la corre de 5 en 5 min dentro de la franja
  for(var s=0;s<40;s++){var c=t+(s%2?1:-1)*Math.ceil(s/2)*300000;if(c<a||c>=b)continue;
    if(otros.every(function(o){return Math.abs(o-c)>=MARGEN;}))return c;}
  return t;}
/* reparte las piezas: «auto» = equilibradas, «cada» = cada X minutos, «manual» = las deja donde estén */
function repartir(it){
  if(modoDe(it)==="hora"||!it.cuando||!it.piezas||!it.piezas.length)return it;
  var R=rangoReparto(it),a=R[0].getTime(),b=R[1].getTime(),otros=tiemposOtros(it.id);
  var libres=it.piezas.filter(function(p){return !p.ancla&&p.estado!=="publicada";}),n=libres.length;
  it.piezas.forEach(function(p){if(p.ancla==="inicio"&&p.estado!=="publicada")p.cuando=iso(new Date(a));});
  it.avisoCada="";
  if(it.reparto==="manual"){it.piezas.forEach(function(p){if(p.estado==="publicada")return;var t=p.cuando?fecha(p.cuando).getTime():a;
    if(isNaN(t)||t<a)t=a;if(t>=b)t=b-300000;p.cuando=iso(new Date(t));});}
  else{
    var paso=(it.reparto==="cada"&&it.cada>0)?it.cada*60000:(b-a)/Math.max(1,n);
    if(it.reparto==="cada"&&n&&a+paso*(n-1)>=b){it.avisoCada="Cada "+it.cada+" min no caben "+n+" piezas en la franja: las reparto equilibradas.";paso=(b-a)/n;}
    libres.forEach(function(p,k){var t=esquivar(redondear(a+paso*k),otros,a,b);p.cuando=iso(new Date(t));});
  }
  it.piezas=piezasOrdenadas(it);
  return it;
}
function moverA(it,ini){
  var m=modoDe(it);ini=new Date(ini);if(m==="dia")ini.setHours(0,0,0,0);
  var delta=ini.getTime()-iniDe(it).getTime();
  if(m==="franja"){var f=finDe(it);it.hasta=iso(new Date(f.getTime()+delta));}
  it.cuando=iso(ini);
  (it.piezas||[]).forEach(function(p){if(p.cuando&&p.estado!=="publicada")p.cuando=iso(new Date(fecha(p.cuando).getTime()+delta));});
  return it;
}
/* qué se pisa con qué */
function choques(it){
  var out=[];if(!it||!it.cuando||it.estado==="publicada")return out;
  var m=modoDe(it),a=iniDe(it),b=finDe(it),mis=tiemposDe(it);
  (S.agenda||[]).forEach(function(o){if(o.id===it.id||!o.cuando||o.estado==="publicada")return;
    var mo=modoDe(o),oa=iniDe(o),ob=finDe(o),txt="";
    if(m==="dia"&&mo==="dia"&&diaIso(a)===diaIso(oa))txt="ese día ya hay otra de día entero";
    else if(m==="franja"&&mo==="franja"&&a<ob&&oa<b)txt="las dos franjas se pisan ("+rango(o)+")";
    else{var suyos=tiemposDe(o);
      for(var i=0;i<mis.length&&!txt;i++)for(var j=0;j<suyos.length;j++)if(Math.abs(mis[i]-suyos[j])<MARGEN){txt="salen casi a la vez ("+hora(new Date(mis[i]))+" y "+hora(new Date(suyos[j]))+")";break;}}
    if(txt)out.push({o:o,txt:txt});});
  return out;
}
/* Chispa busca el hueco libre más cercano: mismo día de media en media hora y, si no, los días siguientes (menos el miércoles) */
function proponer(it){
  var m=modoDe(it),base=iniDe(it),dur=finDe(it)-base,ahora=new Date();
  var p=JSON.parse(JSON.stringify(it));
  function prueba(ini){var q=JSON.parse(JSON.stringify(p));moverA(q,ini);if(q.reparto!=="manual")repartir(q);
    if(dow(iniDe(q))===CERRADO||finDe(q)<ahora||choques(q).length)return null;return q;}
  if(m!=="dia"){
    var tope=sumaDias(diaDeIt(it),1).getTime()+2*3600000;
    for(var s=1;s<=(m==="hora"?40:8);s++){var ini=new Date(base.getTime()+(s%2?1:-1)*Math.ceil(s/2)*(m==="hora"?15:30)*60000);
      if(ini<ahora||diaIso(ini)!==diaIso(base)||ini.getHours()<8||ini.getTime()+dur>tope)continue;
      var q=prueba(ini);if(q)return q;}
  }
  for(var d=1;d<=21;d++){var q2=prueba(sumaDias(base,d));if(q2)return q2;}
  return null;
}
/* mismas horas, otro día (cuando el dueño ha dicho las horas, se respetan) */
function proponerOtroDia(it){var ahora=new Date();
  for(var d=1;d<=14;d++){var q=JSON.parse(JSON.stringify(it));moverA(q,sumaDias(iniDe(it),d));if(q.reparto!=="manual")repartir(q);
    if(dow(iniDe(q))!==CERRADO&&finDe(q)>ahora&&!choques(q).length)return q;}
  return null;}
function aplicar(it,q){["cuando","hasta","piezas","reparto","cada"].forEach(function(k){it[k]=q[k];});return it;}

/* plantilla «Promoción para llenar»: franja con varias historias + una publicación + estado de WhatsApp */
function proximoDiaPromo(desde){
  var d=new Date();d.setHours(0,0,0,0);if(desde){d=new Date(desde);d.setHours(0,0,0,0);}
  for(var i=0;i<14;i++){var x=sumaDias(d,i),v=VALLE[dow(x)];if(!v)continue;var ini=new Date(x);ini.setHours(v[0],v[1],0,0);
    if(ini.getTime()-30*60000<Date.now())continue;
    var fin=new Date(x);fin.setHours(v[2],v[3],0,0);
    var libre=!(S.agenda||[]).some(function(o){return modoDe(o)==="franja"&&o.cuando&&o.estado!=="publicada"&&iniDe(o)<fin&&ini<finDe(o);});
    if(libre)return x;}
  var y=sumaDias(d,1);if(dow(y)===CERRADO)y=sumaDias(y,1);return y;
}
function textoPromo(promo,d,f,todoDia){
  var neg=(S.negocio&&S.negocio.nombre)||"El Paraíso";
  return "🔥 ¡"+promo.toUpperCase()+"! 🔥\n"+(todoDia?"Solo hoy, todo el día":"Solo hoy de "+hora(d)+" a "+hora(f))+" en "+neg+".\nCorre, que vuela 🏃 Reserva tu mesa 👇";
}
function crearPromo(o){
  var promo=(o.txt||"").trim()||"2x1 en cócteles";promo=promo.charAt(0).toLowerCase()+promo.slice(1);
  var dia=new Date(o.dia);dia.setHours(0,0,0,0);var v=VALLE[dow(dia)]||[18,0,21,0];
  var a=o.a!=null?o.a:v[0]*60+v[1],b=o.b!=null?o.b:v[2]*60+v[3];
  var d=new Date(dia);d.setMinutes(a);var f=new Date(dia);f.setMinutes(b);if(f<=d)f=sumaDias(f,1);
  var piezas=[];if(o.post!==false)piezas.push(nuevaPieza("post",["igf","fb"],"inicio"));if(o.wa!==false)piezas.push(nuevaPieza("historia",["wa"],"inicio"));
  for(var k=0;k<(o.n||4);k++)piezas.push(nuevaPieza("historia",["igs"]));
  var titulo="Promo "+promo;
  var it=item({titulo:titulo.length>40?titulo.slice(0,39)+"…":titulo,kicker:o.todoDia?"Solo hoy":"Solo hoy · "+hora(d)+"–"+hora(f),txt:textoPromo(promo,d,f,o.todoDia),tags:"#Palma #Mallorca #promo",formato:"historia",
    cat:E().catDe?E().catDe(promo):"coctel",redes:["igs","igf","fb","wa"],cuando:o.todoDia?iso(dia):iso(d),estado:"programada",modo:o.todoDia?"dia":"franja",hasta:o.todoDia?"":iso(f),
    piezas:piezas,reparto:"auto",promo:true,ejemplo:!!o.ejemplo,ctas:[{t:"📅 Reservar",tipo:"reserva",url:""},{t:"🌐 Ver web",tipo:"web",url:""}]});
  repartir(it);
  it.por=o.todoDia?"Día entero: Chispa reparte las historias de "+pad(APERTURA[0])+":00 a "+pad(CIERRE[0])+":00 para que la promo se vea toda la jornada.":porValle(dia);
  return it;
}
/* nueva franja o día entero de historias (sin promo) */
function crearBloque(o){
  var dia=new Date(o.dia);dia.setHours(0,0,0,0);var neg=(S.negocio&&S.negocio.nombre)||"El Paraíso";
  var d=new Date(dia),f=new Date(dia);if(!o.todoDia){d.setMinutes(o.a);f.setMinutes(o.b);if(f<=d)f=sumaDias(f,1);}
  var tp=o.formato||"historia",fmt=tp==="estado"?"historia":tp,red=tp==="estado"?["wa"]:redesPieza(fmt),piezas=[];
  for(var k=0;k<(o.n||3);k++)piezas.push(nuevaPieza(fmt,red.slice()));
  var pl=TIPOS[tp].pl.replace(/^./,function(c){return c.toUpperCase();});
  var mom=d.getHours()<13?"de la mañana":d.getHours()<20?"de la tarde":"de la noche";
  var it=item({titulo:o.titulo||(o.todoDia?pl+" de todo el día":pl+" "+mom),txt:o.txt||("Hoy en "+neg+" ✨ Te esperamos."),formato:fmt,cat:o.cat||"local",redes:red,
    cuando:o.todoDia?iso(dia):iso(d),estado:"programada",modo:o.todoDia?"dia":"franja",hasta:o.todoDia?"":iso(f),piezas:piezas,reparto:o.cada?"cada":"auto",cada:o.cada||0});
  repartir(it);return it;
}
/* las publicaciones guardadas antes (todas a hora exacta) pasan al formato nuevo sin perder nada */
function migrar(){
  if(S.agendaV>=2)return;
  (S.agenda||[]).forEach(function(a){if(a.modo!=="franja"&&a.modo!=="dia")a.modo="hora";if(!a.reparto)a.reparto="auto";});
  if(!S.ocultarEjemplo&&(S.agenda||[]).some(function(a){return a.ejemplo;})&&!(S.agenda||[]).some(function(a){return a.promo;})){
    var d=new Date();d.setHours(0,0,0,0);d=sumaDias(d,1);var x=null;for(var i=0;i<10&&!x;i++){var y=sumaDias(d,i);if(dow(y)===3||dow(y)===4)x=y;}
    var ej=crearPromo({txt:"2x1 en mojitos",dia:x||proximoDiaPromo(),n:4,ejemplo:1});
    if(choques(ej).length){var q=proponer(ej);if(q)aplicar(ej,q);}
    S.agenda.push(ej);}
  S.agendaV=2;guardarTodo();
}

/* publicaciones del Estudio que aún no están en el calendario */
function delEstudio(){
  var P=(window._posts||[]).filter(function(p,i){return p&&i<900&&!p._agendaId;});
  return P.map(function(p){var it=item({titulo:p.titulo,txt:p.txt,tags:p.tags,kicker:p.kicker,formato:p.formato,cat:p.cat,foto:p.foto,L:p.L,ctas:p.ctas,sinTexto:p.sinTexto,
    media:(p.media&&p.media.tipo!=="propia")?JSON.parse(JSON.stringify(p.media)):null,mediaLocal:!!(p.media&&p.media.tipo==="propia"&&p.file),redes:redesPorFormato(p.formato)});
    if(it.mediaLocal)guardarLocal(it.id,p.file).catch(function(){});
    p._agendaId=it.id;return it;});
}
/* si no hay nada, Chispa prepara la semana entera */
function semanaNueva(){
  var neg=(S.negocio&&S.negocio.nombre)||"tu restaurante";
  var B=[
    {titulo:"Menú del día",kicker:"Hecho esta mañana",formato:"carrusel",cat:"plato",L:2,txt:"Menú del día en "+neg+" 🍽️ Primero, segundo, postre y bebida. Cocina casera.",tags:"#menudeldia #Palma #Mallorca"},
    {titulo:"Así se hace nuestro arroz",kicker:"Desde 1968",formato:"reel",cat:"paella",L:1,txt:"Del fuego a tu mesa 🔥 Así preparamos el arroz en "+neg+".",tags:"#paella #Palma #cocina"},
    {titulo:"Lo que dicen de nosotros",kicker:"5 estrellas",formato:"post",cat:"local",L:3,txt:"«Trato de familia y la mejor paella» ⭐⭐⭐⭐⭐ Gracias a todos los que venís.",tags:"#Palma #restaurante"},
    {titulo:"Mojitos en la terraza",kicker:"Happy hour",formato:"reel",cat:"coctel",L:1,txt:"Jueves de terraza 🍹 Mojitos y cócteles de la casa al atardecer.",tags:"#mojito #terraza #Palma"},
    {titulo:"Noche caribeña",kicker:"Sábado · 21:00",formato:"historia",cat:"evento",L:3,txt:"Este sábado, música en directo, mofongo y churrasco 🎶 Reserva tu mesa.",tags:"#planfinde #Palma"},
    {titulo:"Paella de bogavante",kicker:"Este domingo",formato:"post",cat:"paella",L:0,txt:"Domingo de paella en "+neg+" 🥘 Bogavante y socarrat, al momento.",tags:"#paella #bogavante #Mallorca"},
    {titulo:"Desayuno completo",kicker:"Desde las 8:00",formato:"post",cat:"brunch",L:2,txt:"Tostadas, tortilla, café y zumo natural ☕ Empieza bien el día en "+neg+".",tags:"#desayuno #Palma"}
  ];
  return B.map(function(b,i){b.foto=i;return item(b);});
}

/* =====================================================================
   ACCIONES
   ===================================================================== */
var VISTA=null,REF=new Date(),ULTIMO="";
function vistaPorDefecto(){return window.innerWidth<760?"lista":"semana";}
function refrescar(){if(typeof TAB!=="undefined"&&TAB==="calendario")window.panel("calendario");else if(typeof TAB!=="undefined"&&TAB==="stats")window.panel("stats");}
function horasPiezas(it){var v={};piezasOrdenadas(it).forEach(function(p){if(p.cuando)v[hora(fecha(p.cuando))]=1;});return Object.keys(v).join(" · ");}
function resumenLista(L){return L.map(function(it){return "• "+linea(it)+(it.piezas&&it.piezas.length&&modoDe(it)!=="hora"?"\n    ↳ "+nombrePiezas(it)+": "+horasPiezas(it):"");}).join("\n");}
function esSuelta(a){return modoDe(a)==="hora";}
function franjasSemana(){var a=new Date(),b=sumaDias(a,7);return (S.agenda||[]).filter(function(x){return modoDe(x)!=="hora"&&x.cuando&&x.estado==="programada"&&finDe(x)>a&&iniDe(x)<b;}).sort(function(x,y){return iniDe(x)-iniDe(y);});}

function planificarSemana(irAlCalendario){
  datos();
  var L=delEstudio(),borr=S.agenda.filter(function(a){return a.estado==="borrador"&&esSuelta(a);});
  var nuevos=L.slice();
  if(!L.length&&!borr.length){nuevos=semanaNueva();}
  repartirSemana(nuevos.concat(borr));
  nuevos.forEach(function(it){S.agenda.push(it);});
  guardarTodo();sincronizarTodas();
  var todo=nuevos.concat(borr).sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
  var texto="Hecho ✓ He programado "+todo.length+" publicaciones en las mejores horas para un restaurante en Palma:\n\n"+resumenLista(todo)+
    "\n\nPor qué: el menú a las 11:30 (la gente decide dónde comer antes de las 12:30), las de la noche y la terraza a las 18:30 (se decide al salir de trabajar), los reels a las 20:30 (sofá y móvil) y la paella el fin de semana a las 11:00. El miércoles no publico promociones porque cerráis."+
    (function(){var F=franjasSemana();return F.length?"\n\nY además, en franjas:\n"+resumenLista(F):"\n\n¿Quieres llenar una tarde floja? Dime «pon una promo el jueves de 18 a 21 con 4 historias» y la monto en franja.";})();
  ULTIMO=texto;
  if(irAlCalendario){REF=new Date();if(typeof vista==="function")vista("panel");window.panel("calendario");toast("📅 Semana planificada: "+todo.length+" publicaciones");}
  return {texto:texto,n:todo.length};
}
function todoAlCalendario(){
  datos();var L=delEstudio();
  if(!L.length){toast("Estas publicaciones ya están en el calendario");window.panel("calendario");return;}
  L.forEach(function(it){S.agenda.push(it);});guardarTodo();
  toast("📅 "+L.length+" publicaciones en el calendario como borrador. Arrástralas a su día o pulsa «Planificar mi semana».");
  window.panel("calendario");
}
function programarTodoEn(dia,horaFija){
  datos();
  var L=delEstudio(),borr=S.agenda.filter(function(a){return a.estado==="borrador"&&esSuelta(a);});
  var lista=L.concat(borr);
  if(!lista.length){lista=semanaNueva().slice(0,3);}
  repartirDia(lista,dia,horaFija);
  lista.forEach(function(it){if(!buscar(it.id))S.agenda.push(it);});
  guardarTodo();sincronizarTodas();
  lista.sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
  var texto="Listo ✓ "+lista.length+" publicaciones para el "+DIAS[dow(dia)].toLowerCase()+" "+dia.getDate()+" de "+MESES[dia.getMonth()]+":\n\n"+resumenLista(lista)+
    "\n\n"+(horaFija?"Empiezo a la hora que me has dicho y las separo hora y media.":"No las saco todas a la vez: Instagram enseña la primera y esconde las demás. Las pongo en las horas en que la gente decide dónde comer (11:30), dónde cenar (18:30) y cuando mira el móvil en el sofá (20:30).")+
    (dow(dia)===CERRADO?"\n\nOjo: ese día cerráis. ¿Seguro que quieres publicar promociones?":"");
  ULTIMO=texto;return {texto:texto,n:lista.length};
}
function marcar(id,estado,redes,motivo){
  datos();var it=buscar(id);if(!it)return;
  var pz=String(id).split("~")[1];
  if(pz&&it.piezas){ // una pieza de una franja: la franja queda publicada cuando lo están todas
    var p=it.piezas.filter(function(x){return x.id===pz;})[0];if(!p)return;
    p.estado=estado;if(motivo)p.motivo=motivo;p.res=p.res||{};(redes||[]).forEach(function(r){p.res[r]=estado;});
    if(it.piezas.every(function(x){return x.estado==="publicada";})){it.estado="publicada";it.publicadaEn=iso(new Date());}
    else if(estado==="fallo"){it.estado="fallo";it.motivo=motivo||"";}
    guardarTodo();if(typeof TAB!=="undefined"&&TAB==="calendario")setTimeout(refrescar,50);return;}
  it.estado=estado;if(motivo)it.motivo=motivo;
  (redes||[]).forEach(function(r){it.res[r]=estado;});
  if(estado==="publicada"&&!it.cuando)it.cuando=iso(new Date());
  if(estado==="publicada")it.publicadaEn=iso(new Date());
  guardarTodo();if(typeof TAB!=="undefined"&&TAB==="calendario")setTimeout(refrescar,50);
}
function publicarAhora(id,pzId){
  var it=buscar(id);if(!it)return;
  pzId=pzId||String(id).split("~")[1];
  var p=null;if(it.piezas&&it.piezas.length){var P=piezasOrdenadas(it);p=(pzId&&P.filter(function(x){return x.id===pzId;})[0])||P.filter(function(x){return x.estado!=="publicada";})[0]||null;}
  var go=function(){if(!E().publicar){toast("No se pudo abrir Publicar");return;}cerrarModal();E().publicar(aPost(it,p),(p?p.redes:it.redes).filter(function(r){return r!=="gbp";}));};
  if(it.mediaLocal)leerLocal(it.id).then(go);else go();
}

/* ---------- entender una orden ---------- */
var NDIAS={lunes:0,martes:1,miercoles:2,jueves:3,viernes:4,sabado:5,domingo:6};
function diaDe(t){
  var hoy=new Date();hoy.setHours(0,0,0,0);
  if(/pasado manana/.test(t))return sumaDias(hoy,2);
  if(/\bmanana\b/.test(t))return sumaDias(hoy,1);
  if(/\bhoy\b|esta (tarde|noche|manana)/.test(t))return hoy;
  for(var k in NDIAS){if(new RegExp("\\b"+k+"\\b").test(t)){var n=(NDIAS[k]-dow(hoy)+7)%7;if(n===0)n=7;return sumaDias(hoy,n);}}
  return null;
}
function horaDe(t){var m=t.match(/a las (\d{1,2})(?:[:.h](\d{2}))?/)||t.match(/\b(\d{1,2})(?::(\d{2}))?\s?h\b/);if(!m)return null;var h=+m[1],mi=+(m[2]||0);
  if(h<8&&/tarde|noche/.test(t))h+=12;if(h>23||mi>59)return null;return [h,mi];}
/* «de 18 a 23», «entre 20:00 y 00:00», «desde las 19 hasta las 22» → minutos desde las 0:00 */
function franjaDe(t){
  var m=t.match(/(?:\bde|\bdesde|\bentre)\s+(?:las\s+)?(\d{1,2})(?:[:h](\d{2}))?\s*(?:h\s+)?(?:y|a|hasta)\s+(?:las\s+)?(\d{1,2})(?:[:h](\d{2}))?/);
  if(!m)return null;
  var a=+m[1],am=+(m[2]||0),b=+m[3],bm=+(m[4]||0);if(a>24||b>24||am>59||bm>59)return null;
  if(a>=1&&a<=7)a+=12;if(a===24)a=0;if(b===24)b=0;
  var A=a*60+am,B=b*60+bm;
  if(B<=A){if(b>=1&&b<=11&&(b+12)*60+bm>A)B=(b+12)*60+bm;else B+=1440;}
  if(B-A<15||B-A>16*60)return null;
  return {a:A,b:B};
}
var NUMS={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12};
function piezasDe(t){
  var m=t.match(/\b(\d{1,2}|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(historias?|stories|storys?|estados?|publicaciones|publicacion|posts?|reels?|piezas?)\b/);
  if(!m)return null;var n=/^\d+$/.test(m[1])?+m[1]:NUMS[m[1]];if(!n||n>12)return null;var w=m[2];
  return {n:n,formato:/estado/.test(w)?"estado":/reel/.test(w)?"reel":/public|post/.test(w)?"post":"historia"};
}
function promoDe(s){
  var t=(s||"").toLowerCase().replace(/[¿?¡!.,«»"]/g," ").replace(/\s+/g," ").trim();
  var m=t.match(/(?:promo(?:ci[oó]n)?|oferta)\s+(?:de\s+|del\s+)?(.+)$/);if(!m)return "";
  var r=m[1].split(/\s+(?=(?:el|este|esta|hoy|mañana|pasado|para|desde|entre|con|todo|toda|a las|de \d|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?:\s|$))/)[0].trim();
  if(!r||/^(el|este|esta|hoy|mañana|para|desde|entre|con|todo|toda|de|a|llamativa|que)(\s|$)/.test(r))return "";
  return r;
}
function ordenFranja(texto,t,o){
  datos();
  var hoy=new Date();hoy.setHours(0,0,0,0);var dia=o.dia,nota="",fr=o.fr;
  if(dia&&dow(dia)===CERRADO&&o.promo)return {texto:"El miércoles cerráis, así que ese día no pongo promociones 🙂 ¿Te la preparo el jueves? Dime «pon la promo el jueves».",accion:"nada"};
  if(!dia){
    if(o.promo&&!fr&&!o.todoDia)dia=proximoDiaPromo();
    else{dia=new Date(hoy);
      if(fr&&hoy.getTime()+fr.a*60000<Date.now()+10*60000)dia=sumaDias(hoy,1);
      if(o.todoDia&&new Date().getHours()>=12)dia=sumaDias(hoy,1);}
    if(dow(dia)===CERRADO){dia=sumaDias(dia,1);nota="El miércoles cerráis: lo paso al jueves.\n\n";}
  }
  var it;
  if(o.promo)it=crearPromo({txt:promoDe(texto),dia:dia,a:fr?fr.a:null,b:fr?fr.b:null,n:(o.pz&&o.pz.formato==="historia")?o.pz.n:4,todoDia:o.todoDia&&!fr});
  else it=crearBloque({dia:dia,a:fr?fr.a:0,b:fr?fr.b:0,todoDia:!fr,n:o.pz?o.pz.n:(fr?3:4),formato:o.pz?o.pz.formato:"historia"});
  if(dow(dia)===CERRADO)nota+="Ojo: ese día cerráis.\n\n";
  var ch=choques(it),movida="";
  if(ch.length){var q=(fr&&proponerOtroDia(it))||proponer(it);if(q){aplicar(it,q);movida="\n\nChocaba con «"+ch[0].o.titulo+"» ("+ch[0].txt+"), así que la he movido al primer hueco libre"+(fr&&diaIso(iniDe(it))!==diaIso(dia)?" con las mismas horas":"")+". Todo cuadrado ✓";}
    else movida="\n\n⚠️ Choca con «"+ch[0].o.titulo+"» ("+ch[0].txt+") y no encuentro otro hueco: revísala en el calendario.";}
  S.agenda.push(it);guardarTodo();sincronizar(it);REF=iniDe(it);
  var que=o.promo?"He montado la promoción para llenar":modoDe(it)==="dia"?"He programado el día entero":"He programado la franja";
  return {texto:nota+"Hecho ✓ "+que+":\n\n"+resumenLista([it])+movida+(it.por?"\n\nPor qué: "+it.por:"")+
    (it.promo?"\n\nLa publicación y el estado de WhatsApp salen al empezar; las historias, repartidas hasta el final, todas con el botón «Reservar».":"")+
    "\n\nPara cambiarla, tócala en el calendario o estira el bloque.",accion:"dia",ref:iso(iniDe(it)),id:it.id};
}
function orden(texto){
  var t=sinTildes(texto).replace(/[¿?¡!.,]/g," ").replace(/\s+/g," ").trim();
  if(!t)return null;
  var dia=diaDe(t),hh=horaDe(t);
  var verbo=/(publica|programa|planifica|organiza|reparte|pon|ponme|sube|saca|prepara)/.test(t);
  var fr=franjaDe(t),todoDia=/todo el dia|dia entero|dia completo|toda la jornada/.test(t),promo=/\bpromo|promocion|oferta|2x1|para llenar|happy hour/.test(t);
  if(fr||todoDia||(promo&&(verbo||/\b(crea|haz|monta|lanza|quiero)\b/.test(t))))return ordenFranja(texto,t,{dia:dia,fr:fr,todoDia:todoDia,pz:piezasDe(t),promo:promo});
  if(/(planifica|programa|organiza|reparte|prepara|llena|rellena).*(semana)|mi semana|la semana/.test(t)&&!dia)return {texto:planificarSemana(false).texto,accion:"semana"};
  if(verbo&&dia)return {texto:programarTodoEn(dia,hh).texto,accion:"dia"};
  if(/(que|cuantas?).*(programad|calendario|agenda|pendiente|toca)|mi calendario|que tengo/.test(t)){
    datos();var fut=S.agenda.filter(function(a){return a.estado==="programada"&&a.cuando&&finDe(a)>new Date();}).sort(function(a,b){return iniDe(a)-iniDe(b);});
    var bo=S.agenda.filter(function(a){return a.estado==="borrador";}).length,fa=S.agenda.filter(function(a){return a.estado==="fallo";}).length;
    return {texto:(fut.length?"Tienes "+fut.length+" publicaciones programadas:\n\n"+resumenLista(fut.slice(0,8)):"No tienes nada programado todavía.")+(bo?"\n\n"+bo+" en borrador.":"")+(fa?"\n"+fa+" que fallaron: míralas en el calendario.":"")+"\n\n¿Quieres que planifique la semana?",accion:"ver"};}
  if(/mejor hora|a que hora|cuando (publico|subo|pongo)|horario/.test(t))return {texto:"Para un restaurante en Palma:\n\n• Menú del día: 11:30. "+POR.comida+"\n• Planes de noche y terraza: 18:30. "+POR.noche+"\n• Reels: 20:30. "+POR.sofa+"\n• Fin de semana: 11:00. "+POR.finde+"\n\nCuando conectes Instagram, ajusto estas horas con tus datos reales.",accion:"horas"};
  if(/publica(lo|la)? (ya|ahora)|publicar ahora|sube(lo)? ya/.test(t)){
    datos();var sig=S.agenda.filter(function(a){return a.estado==="programada"||a.estado==="borrador"||a.estado==="fallo";}).sort(function(a,b){return (a.cuando?fecha(a.cuando):0)-(b.cuando?fecha(b.cuando):0);})[0];
    if(!sig)return {texto:"No hay nada pendiente de publicar. Crea una publicación en el Asistente y te la publico.",accion:"nada"};
    setTimeout(function(){if(typeof cerrarChat==="function")cerrarChat();publicarAhora(sig.id);},900);
    return {texto:"Vamos con «"+sig.titulo+"». Te abro la ventana de publicar con todo listo.",accion:"publicar"};}
  return null;
}

/* =====================================================================
   PANTALLA CALENDARIO
   ===================================================================== */
function chipRed(r){var R=REDES[r]||{nm:r,c:"#888",ic:"•"};return '<span class="ag-red" style="--c:'+R.c+'" title="'+esc(R.nm)+'"><i>'+R.ic+'</i>'+esc(R.nm)+'</span>';}
function puntos(it){return '<span class="ag-dots">'+it.redes.map(function(r){var R=REDES[r]||{c:"#888",nm:r};return '<i style="background:'+R.c+'" title="'+esc(R.nm)+'"></i>';}).join("")+'</span>';}
function chipEstado(e){var X=ESTADOS[e]||ESTADOS.borrador;return '<span class="ag-est '+e+'"><b>'+X.ic+'</b>'+X.nm+'</span>';}
function tarjetaMini(it,compacta){
  var R=REDES[it.redes[0]]||{c:"#888"},m=modoDe(it);
  return '<div class="ag-it '+it.estado+(compacta?" mini":"")+(m!=="hora"?" ag-"+m:"")+(it.promo?" promo":"")+'" data-id="'+esc(it.id)+'" style="--c:'+R.c+'" tabindex="0" role="button" aria-label="'+esc(it.titulo+" · "+rango(it))+'">'+
    (compacta?'':miniatura(it))+'<span class="ag-tx"><span class="ag-h">'+(it.cuando?(m==="dia"?"☀ ":m==="franja"?"↕ ":"")+esc(rango(it)):"—")+' '+puntos(it)+'</span><span class="ag-t">'+(it.promo?"🔥 ":"")+esc(it.titulo)+'</span>'+
    (m!=="hora"&&it.piezas&&it.piezas.length&&!compacta?'<span class="ag-pzn">'+esc(nombrePiezas(it))+'</span>':'')+
    (compacta?'':'<span class="ag-s">'+chipEstado(it.estado)+'</span>')+'</span></div>';
}
function cabecera(){
  var hoy=new Date(),L=lunes(REF),t;
  if(VISTA==="mes")t=MESES[REF.getMonth()].replace(/^./,function(c){return c.toUpperCase();})+" "+REF.getFullYear();
  else if(VISTA==="semana"){var f=sumaDias(L,6);t=L.getDate()+(L.getMonth()!==f.getMonth()?" "+MESES[L.getMonth()].slice(0,3):"")+" – "+f.getDate()+" "+MESES[f.getMonth()].slice(0,3)+" "+f.getFullYear();}
  else t="Próximas publicaciones";
  var avisos=("Notification" in window)?(Notification.permission==="granted"?'<button class="btn g sm" onclick="agProbarAviso()">🔔 Avisos activados</button>':'<button class="btn g sm" onclick="agAvisos()">🔔 Avisarme a la hora</button>'):"";
  return '<div class="hd ag-hd"><h2>📅 Calendario</h2><div class="ag-acc"><button class="btn pp sm" onclick="CHISPA_AGENDA.planificarSemana(true)">⚡ Planificar mi semana</button><button class="btn g sm" onclick="agNueva()">+ Nueva</button><button class="btn g sm ag-bpromo" onclick="agPromo()">🔥 Promo para llenar</button>'+avisos+'</div></div>'+
    '<div class="ag-cmd"><span class="ag-cmd-ic">⚡</span><input id="agOrden" placeholder="Dile a Chispa: «pon una promo el viernes de 18 a 23 con 4 historias»…" autocomplete="off" enterkeyhint="send"><button class="btn pp sm" onclick="agOrden()">Hacer</button></div>'+
    '<div class="ag-sug">'+["Programa la semana","Pon una promo el viernes de 18 a 23 con 4 historias","Promo el sábado todo el día","Reparte 6 stories entre 20:00 y 00:00","Publica todo esto el viernes","¿Qué tengo programado?","¿Cuál es la mejor hora?"].map(function(s){return '<button onclick="agOrden(\''+s.replace(/'/g,"")+'\')">'+s+'</button>';}).join("")+'</div>'+
    '<div id="agResp" class="ag-resp"'+(ULTIMO?'':' hidden')+'>'+(ULTIMO?esc(ULTIMO).replace(/\n/g,"<br>"):'')+'</div>'+
    '<div class="ag-bar"><div class="ag-nav"><button class="btn g sm" onclick="agMover(-1)" aria-label="Anterior">‹</button><button class="btn g sm" onclick="agHoy()">Hoy</button><button class="btn g sm" onclick="agMover(1)" aria-label="Siguiente">›</button><b>'+esc(t)+'</b></div>'+
    '<div class="ag-seg">'+["semana","mes","lista"].map(function(v){return '<button class="'+(VISTA===v?"on":"")+'" onclick="agVista(\''+v+'\')">'+v.charAt(0).toUpperCase()+v.slice(1)+'</button>';}).join("")+'</div></div>'+
    '<div class="ag-ley">'+Object.keys(REDES).map(chipRed).join("")+'<span class="ag-sep"></span>'+Object.keys(ESTADOS).map(chipEstado).join("")+'</div>';
}
/* bloque de una franja en la semana: ocupa de la hora de inicio a la de fin; las piezas son marcas dentro */
function filasFranja(it,k){ // horas [desde,hasta) que ocupa en la rejilla del día k
  var a=iniDe(it),b=finDe(it),d0=new Date(k+"T00:00"),d1=sumaDias(d0,1);
  var ha=a<d0?0:a.getHours()+a.getMinutes()/60,hb=b>=d1?24:b.getHours()+b.getMinutes()/60;
  var f0=Math.max(H0,Math.floor(ha)),f1=Math.min(24,Math.max(f0+1,Math.ceil(hb)));
  return {f0:f0,f1:f1,ha:Math.max(ha,H0),hb:Math.min(Math.max(hb,H0+0.5),24)};
}
function bloqueFranja(it,k,col,carril,total){
  var F=filasFranja(it,k),span=F.f1-F.f0,R=REDES[it.redes[0]]||{c:"#888"};
  var top=(F.ha-F.f0)/span*100,bot=(F.f1-F.hb)/span*100,a=iniDe(it).getTime(),b=finDe(it).getTime();
  var marcas=piezasOrdenadas(it).map(function(p){if(!p.cuando)return "";var t=fecha(p.cuando).getTime(),y=Math.max(0,Math.min(100,(t-a)/(b-a)*100)),tp=tipoPieza(p),c=(REDES[p.redes[0]]||R).c;
    return '<i class="ag-mk'+(p.estado==="publicada"?" ok":"")+'" style="top:'+y.toFixed(2)+'%;--c:'+c+'" title="'+esc(TIPOS[tp].nm+" · "+hora(fecha(p.cuando)))+'"><span><b>'+TIPOS[tp].ic+'</b>'+hora(fecha(p.cuando))+'</span></i>';}).join("");
  return '<div class="ag-fr '+it.estado+(it.promo?" promo":"")+'" data-id="'+esc(it.id)+'" tabindex="0" role="button" aria-label="'+esc(it.titulo+" · "+rango(it)+" · "+nombrePiezas(it))+'" style="grid-column:'+col+';grid-row:'+(F.f0-H0+R0)+' / '+(F.f1-H0+R0)+';--c:'+R.c+';margin-left:'+(carril/total*100).toFixed(2)+'%;width:'+(100/total).toFixed(2)+'%">'+
    '<div class="ag-fr-in" style="top:'+top.toFixed(2)+'%;bottom:'+bot.toFixed(2)+'%"><div class="ag-fr-h"><b>'+(it.promo?"🔥 ":"")+esc(it.titulo)+'</b><span>'+esc(rango(it))+' · '+(it.piezas||[]).length+' piezas</span></div>'+marcas+
    (it.estado!=="publicada"?'<div class="ag-fr-asa" data-asa="'+esc(it.id)+'" title="Estira para cambiar la hora de fin" aria-hidden="true"></div>':'')+'</div></div>';
}
function vSemana(){
  var L=lunes(REF),hoy=diaIso(new Date()),A=datos();
  var h='<div class="ag-wk-wrap"><div class="ag-wk"><div class="ag-c0" style="grid-row:1;grid-column:1"></div>';
  for(var d=0;d<7;d++){var dd=sumaDias(L,d);h+='<div class="ag-dh'+(diaIso(dd)===hoy?" hoy":"")+'" style="grid-row:1;grid-column:'+(d+2)+'">'+DC[d]+' <b>'+dd.getDate()+'</b>'+(d===CERRADO?'<small>cerrado</small>':'')+'</div>';}
  // fila «día entero»: banda arriba de cada día
  h+='<div class="ag-hr ag-hr-ad" style="grid-row:2;grid-column:1">Todo<br>el día</div>';
  for(var d1=0;d1<7;d1++){var k1=diaIso(sumaDias(L,d1));
    var todo=A.filter(function(a){return a.cuando&&modoDe(a)==="dia"&&a.cuando.slice(0,10)===k1;});
    h+='<div class="ag-ad'+(d1===CERRADO?" cerr":"")+'" data-dia="'+k1+'" style="grid-row:2;grid-column:'+(d1+2)+'">'+todo.map(function(a){return tarjetaMini(a,true);}).join("")+'</div>';}
  var buenas={"11":[0,1,3,4],"18":[3,4],"20":[1,3,6],"9":[5,6]},bloques="";
  for(var d2=0;d2<7;d2++){var dia=sumaDias(L,d2),k=diaIso(dia);
    // franjas del día, en carriles para que no se tapen
    var fr=A.filter(function(a){return a.cuando&&modoDe(a)==="franja"&&a.cuando.slice(0,10)===k;}).sort(function(a,b){return iniDe(a)-iniDe(b);});
    var fines=[],carril=[],cubre={};
    fr.forEach(function(f){var a=iniDe(f),c=-1;for(var j=0;j<fines.length;j++)if(fines[j]<=a){c=j;break;}if(c<0){c=fines.length;fines.push(0);}fines[c]=finDe(f);carril.push(c);
      var F=filasFranja(f,k);for(var x=F.f0;x<F.f1;x++)cubre[x]=1;});
    var sueltas=A.filter(function(a){if(!a.cuando||modoDe(a)!=="hora")return false;var x=fecha(a.cuando);return diaIso(x)===k&&x.getHours()>=H0;});
    var dentro=sueltas.some(function(a){return cubre[fecha(a.cuando).getHours()];}),off=dentro?1:0,total=fines.length+off;
    fr.forEach(function(f,i){bloques+=bloqueFranja(f,k,d2+2,carril[i]+off,total);});
    for(var hr=H0;hr<=H1;hr++){
      var aqui=sueltas.filter(function(a){return fecha(a.cuando).getHours()===hr;}).sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
      var top=(buenas[hr]&&buenas[hr].indexOf(d2)>=0),pr=(cubre[hr]&&total>1)?' padding-right:calc('+((total-1)/total*100).toFixed(2)+'% + 3px);':'';
      h+='<div class="ag-cell'+(top?" ag-top":"")+(pr?" ag-cub":"")+(d2===CERRADO?" cerr":"")+'" data-dia="'+k+'" data-h="'+hr+'" style="grid-row:'+(hr-H0+R0)+';grid-column:'+(d2+2)+';'+pr+'"'+(top?' title="Buena hora para publicar"':'')+'>'+aqui.map(function(a){return tarjetaMini(a,false);}).join("")+'</div>';}
  }
  for(var hr2=H0;hr2<=H1;hr2++)h+='<div class="ag-hr" style="grid-row:'+(hr2-H0+R0)+';grid-column:1">'+pad(hr2)+':00</div>';
  h+=bloques+'</div></div><p class="ag-nota">★ Las casillas con brillo son buenas horas para un restaurante en Palma. Arrastra una publicación o una franja (en el móvil: mantén pulsado) para cambiarla de día y hora; estira el borde de abajo de una franja para cambiar la hora de fin.</p>';
  var sin=A.filter(function(a){return !a.cuando;});
  if(sin.length)h+='<div class="card ag-sinf"><h3>✎ Sin fecha ('+sin.length+')</h3><div class="ag-pool" data-pool="1">'+sin.map(function(a){return tarjetaMini(a,false);}).join("")+'</div><p class="ag-nota">Arrástralas al calendario o pulsa «Planificar mi semana».</p></div>';
  return h;
}
function vMes(){
  var A=datos(),p=new Date(REF.getFullYear(),REF.getMonth(),1),ini=lunes(p),hoy=diaIso(new Date());
  var h='<div class="ag-mes">'+DC.map(function(d){return '<div class="ag-mh">'+d+'</div>';}).join("");
  for(var i=0;i<42;i++){var d=sumaDias(ini,i),k=diaIso(d),fuera=d.getMonth()!==REF.getMonth();
    var aqui=A.filter(function(a){return a.cuando&&a.cuando.slice(0,10)===k;}).sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
    h+='<div class="ag-mc'+(fuera?" fuera":"")+(k===hoy?" hoy":"")+'" data-dia="'+k+'"><div class="ag-mn">'+d.getDate()+'</div>'+aqui.slice(0,3).map(function(a){return tarjetaMini(a,true);}).join("")+
      (aqui.length>3?'<button class="ag-mas" onclick="agVerDia(\''+k+'\')">+'+(aqui.length-3)+' más</button>':'')+'</div>';}
  return h+'</div><p class="ag-nota">Arrastra una publicación a otro día: mantiene su hora.</p>';
}
function vLista(){
  var A=datos().slice().sort(function(a,b){return (a.cuando?fecha(a.cuando):new Date(8e15))-(b.cuando?fecha(b.cuando):new Date(8e15));});
  var desde=sumaDias(REF||new Date(),-7);desde.setHours(0,0,0,0); /* las flechas ‹ › también mueven la lista (J) */
  var grupos={},orden=[];
  A.forEach(function(a){var k=a.cuando?a.cuando.slice(0,10):"sin";if(a.cuando&&fecha(a.cuando)<desde)return;if(!grupos[k]){grupos[k]=[];orden.push(k);}grupos[k].push(a);});
  if(!orden.length)return '<div class="card empty">No hay publicaciones. Pulsa «Planificar mi semana» y Chispa te la llena.</div>';
  return orden.map(function(k){var tit=k==="sin"?"Sin fecha":(function(){var d=new Date(k+"T12:00");var hoy=diaIso(new Date());return (k===hoy?"Hoy · ":k===diaIso(sumaDias(new Date(),1))?"Mañana · ":"")+DIAS[dow(d)]+" "+d.getDate()+" de "+MESES[d.getMonth()];})();
    return '<div class="ag-lg"><div class="ag-lgh">'+tit+'</div>'+grupos[k].map(function(a){
      var m=modoDe(a),pzs=(m!=="hora"&&a.piezas&&a.piezas.length)?'<div class="ag-pzl"><span class="ag-pzn">'+esc(nombrePiezas(a))+'</span>'+piezasOrdenadas(a).map(function(p){var c=(REDES[p.redes[0]]||{c:"#888"}).c;return '<span class="ag-pzc'+(p.estado==="publicada"?" ok":"")+'" style="--c:'+c+'"><b>'+TIPOS[tipoPieza(p)].ic+'</b>'+(p.cuando?hora(fecha(p.cuando)):"—")+'</span>';}).join("")+'</div>':'';
      return '<div class="ag-row '+a.estado+(m!=="hora"?" ag-"+m:"")+(a.promo?" promo":"")+'" data-id="'+esc(a.id)+'">'+miniatura(a)+'<div class="ag-rc" onclick="agAbrir(\''+a.id+'\')"><div class="ag-rt"><b>'+(a.cuando?esc(rango(a)):"—")+'</b> '+(a.promo?"🔥 ":"")+esc(a.titulo)+'</div>'+pzs+'<div class="ag-rr">'+(m==="franja"?'<span class="ag-modo-chip">↕ Franja</span>':m==="dia"?'<span class="ag-modo-chip">☀ Día entero</span>':'')+a.redes.map(chipRed).join("")+chipEstado(a.estado)+(a.ejemplo?'<span class="ag-ej">EJEMPLO</span>':'')+'</div>'+
        (a.estado==="fallo"&&a.motivo?'<div class="ag-mot">⚠️ '+esc(a.motivo)+'</div>':'')+'</div>'+
        '<div class="ag-ra">'+(a.estado!=="publicada"?'<button class="btn pp sm" onclick="CHISPA_AGENDA.publicarAhora(\''+a.id+'\')">🚀 Publicar</button>':'<button class="btn g sm" onclick="agApuntar(\''+a.id+'\')">✍️ Resultados</button>')+'<button class="btn g sm" onclick="agAbrir(\''+a.id+'\')">Editar</button></div></div>';}).join("")+'</div>';}).join("");
}
function vCalendario2(){
  if(!VISTA)VISTA=vistaPorDefecto();
  datos();
  var cuerpo=VISTA==="mes"?vMes():VISTA==="lista"?vLista():vSemana();
  var ej=S.agenda.some(function(a){return a.ejemplo;});
  return cabecera()+'<div class="ag-body">'+cuerpo+'</div>'+
    (ej?'<p class="ag-nota">Hay publicaciones de EJEMPLO para que veas cómo funciona. <a href="javascript:void 0" onclick="agBorrarEjemplos()">Quitar los ejemplos</a></p>':'')+
    '<div class="card ag-auto"><h3>🤖 Publicación automática</h3>'+estadoAuto()+'</div>';
}
function estadoAuto(){
  var PD=window.CHISPA_PUBLICADOR;
  if(PD&&PD.url)return '<p>Conectado al servidor de Chispa: publica él solo a la hora aunque tengas la página cerrada.</p>';
  var perm=("Notification" in window)?Notification.permission:"no";
  return '<p>Ahora mismo, a la hora de cada publicación Chispa <b>te avisa con todo listo</b> (texto copiado, imagen o vídeo preparado) y la subes con un toque. '+
    (perm==="granted"?'Los avisos del navegador están activados.':'<button class="btn g sm" onclick="agAvisos()">🔔 Activar avisos</button>')+'</p>'+
    '<p class="ag-nota">Para que publique solo con la página cerrada hace falta el servidor de Chispa (preparado: <code>conectores/publicador-worker.js</code>) y el permiso de cada red: Meta (Instagram y Facebook), TikTok, YouTube y Google. '+
    (typeof window.conectarCuentas==="function"?'<a href="javascript:void 0" onclick="conectarCuentas()">Conectar cuentas</a>':'')+'</p>';
}

/* ---------- modales ---------- */
function opcionesRedes(sel){return '<div class="ag-redsel">'+Object.keys(REDES).map(function(r){var R=REDES[r];return '<label class="ag-rs" style="--c:'+R.c+'"><input type="checkbox" value="'+r+'"'+(sel.indexOf(r)>=0?" checked":"")+'><span><i>'+R.ic+'</i>'+R.nm+'</span></label>';}).join("")+'</div>';}
function leerRedes(){var v=[];Array.prototype.forEach.call(document.querySelectorAll(".ag-redsel input:checked"),function(i){v.push(i.value);});return v;}
/* ---------- formulario «cuándo sale»: hora exacta / franja / día entero ---------- */
var FORM=null,ANTES=null;
function mayus(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function bloqueCuando(t){
  var m=modoDe(t),ini=t.cuando?iniDe(t):(function(){var d=sumaDias(new Date(),1);d.setHours(11,30,0,0);return d;})();
  var desde=m==="franja"?hora(iniDe(t)):"18:00",hasta=m==="franja"?hora(finDe(t)):"21:00";
  var libres=(t.piezas||[]).filter(function(p){return !p.ancla;}),n=libres.length||(m==="dia"?4:3),fmt=libres[0]?tipoPieza(libres[0]):"historia";
  return '<div id="agFC" class="ag-cuando m-'+m+(t.reparto==="cada"?" r-cada":"")+'">'+
    '<label class="lb" style="margin-top:12px">Cuándo sale</label>'+
    '<div class="ag-seg ag-modo" role="group" aria-label="Cuándo sale">'+[["hora","🕐 Hora exacta"],["franja","↕ Franja"],["dia","☀ Día entero"]].map(function(x){return '<button type="button" data-m="'+x[0]+'" class="'+(m===x[0]?"on":"")+'" onclick="agFModo(\''+x[0]+'\')">'+x[1]+'</button>';}).join("")+'</div>'+
    '<div class="ag-fgrid"><div><label class="lb">Día</label><input class="inp" type="date" id="agFDia" value="'+(t.cuando?diaIso(ini):(FORM&&FORM.nueva?diaIso(ini):""))+'" onchange="agFRef()"></div>'+
      '<div class="ag-f-h"><label class="lb">Hora</label><input class="inp" type="time" id="agFHora" step="300" value="'+(m==="hora"&&t.cuando?hora(fecha(t.cuando)):"11:30")+'" onchange="agFRef()"></div>'+
      '<div class="ag-f-fr"><label class="lb">Desde</label><input class="inp" type="time" id="agFDesde" step="300" value="'+desde+'" onchange="agFRef()"></div>'+
      '<div class="ag-f-fr"><label class="lb">Hasta</label><input class="inp" type="time" id="agFHasta" step="300" value="'+hasta+'" onchange="agFRef()"></div></div>'+
    '<div class="ag-f-pz"><div class="ag-fgrid"><div><label class="lb">Cuántas piezas</label><input class="inp" type="number" inputmode="numeric" min="1" max="12" id="agFN" value="'+n+'" onchange="agFRef(\'n\')"></div>'+
        '<div><label class="lb">Qué son</label><select id="agFFmt" onchange="agFRef(\'n\')">'+["historia","post","reel","estado"].map(function(f){return '<option value="'+f+'"'+(fmt===f?" selected":"")+'>'+mayus(TIPOS[f].pl)+'</option>';}).join("")+'</select></div></div>'+
      '<label class="lb" style="margin-top:10px">Reparto dentro de la franja</label><div class="ag-seg ag-rep" role="group" aria-label="Reparto">'+[["auto","⚖ Equilibrado"],["cada","⏱ Cada X min"],["manual","✋ A mano"]].map(function(x){return '<button type="button" data-r="'+x[0]+'" class="'+((t.reparto||"auto")===x[0]?"on":"")+'" onclick="agFRep(\''+x[0]+'\')">'+x[1]+'</button>';}).join("")+'</div>'+
      '<div class="ag-f-cada"><label class="lb" for="agFCada">Cada</label><input class="inp" type="number" inputmode="numeric" min="5" step="5" id="agFCada" value="'+(t.cada||45)+'" onchange="agFRef()"><span>minutos</span></div>'+
      '<div id="agFPzs" class="ag-pzs"></div></div>'+
    '<div id="agFAviso" aria-live="polite"></div></div>';
}
function marcarSeg(sel,attr,v){Array.prototype.forEach.call(document.querySelectorAll(sel+" button"),function(b){b.classList.toggle("on",b.getAttribute(attr)===v);});}
function rellenarForm(){var t=FORM.t,m=modoDe(t),c=$("agFC");if(!c)return;
  c.className="ag-cuando m-"+m+(t.reparto==="cada"?" r-cada":"");marcarSeg(".ag-modo","data-m",m);marcarSeg(".ag-rep","data-r",t.reparto||"auto");
  if(t.cuando){$("agFDia").value=diaIso(iniDe(t));if(m==="hora")$("agFHora").value=hora(fecha(t.cuando));if(m==="franja"){$("agFDesde").value=hora(iniDe(t));$("agFHasta").value=hora(finDe(t));}}
  var libres=(t.piezas||[]).filter(function(p){return !p.ancla;});if(libres.length)$("agFN").value=libres.length;}
window.agFModo=function(m){if(!FORM)return;var t=FORM.t;t.modo=m;
  if(m!=="hora"&&(!t.piezas||!t.piezas.length)){var n=m==="dia"?4:3;$("agFN").value=n;}
  if(m!=="hora"&&!$("agFDia").value){var d=sumaDias(new Date(),1);$("agFDia").value=diaIso(d);}
  $("agFC").className="ag-cuando m-"+m+(t.reparto==="cada"?" r-cada":"");marcarSeg(".ag-modo","data-m",m);agFRef((t.piezas&&t.piezas.length)?"":"n");};
window.agFRep=function(r){if(!FORM)return;FORM.t.reparto=r;marcarSeg(".ag-rep","data-r",r);$("agFC").classList.toggle("r-cada",r==="cada");agFRef();};
window.agFRef=function(cambio){if(!FORM||!$("agFC"))return;var t=FORM.t,m=modoDe(t);if(cambio!=="guardar")FORM.forzar=false;
  var dia=$("agFDia").value;
  if(!dia)t.cuando="";
  else if(m==="hora"){t.cuando=dia+"T"+($("agFHora").value||"11:30");t.hasta="";}
  else if(m==="dia"){t.cuando=dia+"T00:00";t.hasta="";}
  else{var a=$("agFDesde").value||"18:00",b=$("agFHasta").value||"21:00";t.cuando=dia+"T"+a;var f=new Date(dia+"T"+b);if(f<=fecha(t.cuando))f=sumaDias(f,1);t.hasta=iso(f);}
  if(m!=="hora"){
    var n=Math.max(1,Math.min(12,parseInt($("agFN").value,10)||1)),tp=$("agFFmt").value,fmt=tp==="estado"?"historia":tp,red=tp==="estado"?["wa"]:redesPieza(fmt,leerRedes());
    t.piezas=t.piezas||[];var fijas=t.piezas.filter(function(p){return p.ancla||p.estado==="publicada";}),libres=t.piezas.filter(function(p){return !p.ancla&&p.estado!=="publicada";});
    if(cambio==="n"){while(libres.length<n)libres.push(nuevaPieza(fmt,red.slice()));libres=libres.slice(0,n);libres.forEach(function(p){p.formato=fmt;p.redes=red.slice();});}
    t.piezas=fijas.concat(libres);t.cada=parseInt($("agFCada").value,10)||0;
    repartir(t);
  }
  pintarPiezas();pintarAviso();
};
function pintarPiezas(){var box=$("agFPzs");if(!box||!FORM)return;var t=FORM.t;if(modoDe(t)==="hora"||!t.piezas){box.innerHTML="";return;}
  box.innerHTML='<div class="ag-pzh">'+esc(nombrePiezas(t))+(t.cuando?' · '+esc(rango(t)):'')+'</div>'+piezasOrdenadas(t).map(function(p){var tp=tipoPieza(p),c=(REDES[p.redes[0]]||{c:"#888"}).c;
    return '<div class="ag-pz" style="--c:'+c+'"><i>'+TIPOS[tp].ic+'</i><span>'+esc(mayus(TIPOS[tp].nm))+(p.ancla?' <em>al empezar</em>':'')+'<small>'+esc(p.redes.map(function(r){return (REDES[r]||{nm:r}).nm;}).join(", "))+'</small></span>'+
      '<input class="inp" type="time" step="300" value="'+(p.cuando?hora(fecha(p.cuando)):"")+'" onchange="agFPz(\''+p.id+'\',this.value)" aria-label="Hora de la pieza"'+(p.estado==="publicada"?" disabled":"")+'>'+
      '<button type="button" class="ag-pzx" onclick="agFQuitar(\''+p.id+'\')" aria-label="Quitar pieza">×</button></div>';}).join("")+
    '<button type="button" class="btn g sm" style="margin-top:6px" onclick="agFMas()">+ Añadir pieza</button>'+(t.avisoCada?'<div class="ag-nota">'+esc(t.avisoCada)+'</div>':'');
}
function pintarAviso(){var box=$("agFAviso");if(!box||!FORM)return;var t=FORM.t,h="";
  if(t.cuando&&dow(iniDe(t))===CERRADO)h+='<div class="warn">El miércoles cerráis'+(t.promo?': una promo ese día no llena nada.':'. ¿Seguro que quieres publicar ese día?')+'</div>';
  var ch=choques(t);
  if(ch.length)h+='<div class="ag-choque"><b>⚠️ No cuadra:</b><ul>'+ch.slice(0,4).map(function(c){return '<li>«'+esc(c.o.titulo)+'» · '+esc(rango(c.o))+' — '+esc(c.txt)+'</li>';}).join("")+'</ul>'+
    '<button type="button" class="btn pp sm" onclick="agFCuadrar()">⚡ Que Chispa lo cuadre</button>'+(FORM.forzar?'<div class="ag-nota">Si aun así la quieres ahí, pulsa otra vez el botón de guardar.</div>':'')+'</div>';
  else if(t.cuando)h+='<div class="ag-ok">✓ Todo cuadrado: no se pisa con nada.</div>';
  box.innerHTML=h;}
window.agFPz=function(id,v){if(!FORM||!v)return;var t=FORM.t,p=(t.piezas||[]).filter(function(x){return x.id===id;})[0];if(!p)return;
  var base=diaIso(iniDe(t));var c=new Date(base+"T"+v);if(modoDe(t)==="franja"&&c<iniDe(t))c=sumaDias(c,1);
  p.cuando=iso(c);if(p.ancla)p.ancla="";t.reparto="manual";marcarSeg(".ag-rep","data-r","manual");$("agFC").classList.remove("r-cada");repartir(t);pintarPiezas();pintarAviso();};
window.agFQuitar=function(id){if(!FORM)return;var t=FORM.t;if((t.piezas||[]).length<=1){toast("Tiene que quedar al menos una pieza");return;}
  t.piezas=t.piezas.filter(function(x){return x.id!==id;});$("agFN").value=t.piezas.filter(function(p){return !p.ancla;}).length||1;repartir(t);pintarPiezas();pintarAviso();};
window.agFMas=function(){if(!FORM)return;var t=FORM.t,tp=$("agFFmt").value,fmt=tp==="estado"?"historia":tp;if((t.piezas||[]).length>=14){toast("Como mucho 14 piezas en una franja");return;}
  t.piezas=(t.piezas||[]).concat([nuevaPieza(fmt,tp==="estado"?["wa"]:redesPieza(fmt,leerRedes()))]);$("agFN").value=t.piezas.filter(function(p){return !p.ancla;}).length;repartir(t);pintarPiezas();pintarAviso();};
window.agFCuadrar=function(){if(!FORM)return;var q=proponer(FORM.t);if(!q){toast("No encuentro otro hueco libre en tres semanas");return;}
  aplicar(FORM.t,q);(FORM.rellenar||rellenarForm)();pintarPiezas();pintarAviso();toast("⚡ "+linea(FORM.t));};
/* la mejor hora (hora exacta) o la mejor franja (las horas flojas del día) */
function mejorSitio(t){
  var m=modoDe(t);
  if(m==="hora"){var c=JSON.parse(JSON.stringify(t));repartirSemana([c]);t.cuando=c.cuando;t.por=c.por;return t;}
  var d=t.cuando?diaDeIt(t):proximoDiaPromo(),v=VALLE[dow(d)];
  if(!v||(m==="franja"&&new Date(d.getFullYear(),d.getMonth(),d.getDate(),v[0],v[1])<new Date())){d=proximoDiaPromo(sumaDias(d,v?1:0));v=VALLE[dow(d)];}
  if(m==="franja"){var a=new Date(d);a.setHours(v[0],v[1],0,0);var b=new Date(d);b.setHours(v[2],v[3],0,0);t.cuando=iso(a);t.hasta=iso(b);t.por=porValle(d);}
  else{t.cuando=iso(d);t.por="Día entero: Chispa reparte las piezas en horario de apertura.";}
  t.reparto="auto";repartir(t);if(choques(t).length){var q=proponer(t);if(q)aplicar(t,q);}
  return t;
}
window.agFMejor=function(){if(!FORM)return;mejorSitio(FORM.t);rellenarForm();pintarPiezas();pintarAviso();toast("⚡ "+linea(FORM.t));};

window.agAbrir=function(id){
  var it=buscar(id);if(!it)return;
  var prev='';
  if(E().escena&&it.media&&!it.mediaLocal){var p=aPost(it);prev='<div class="ag-prev" style="aspect-ratio:'+(E().aspecto?E().aspecto(p):"1/1")+'">'+E().escena(p)+'</div>';}
  else prev='<div class="ag-prev">'+miniatura(it)+'</div>';
  FORM={t:JSON.parse(JSON.stringify(it)),nueva:false,forzar:false,rellenar:null};
  var m=modoDe(it);
  modal('<h3>'+(it.promo?"🔥 ":"")+esc(it.titulo)+'</h3>'+prev+
    (it.cuando?'<div class="ag-cuando-res">'+esc(linea(it))+(m!=="hora"&&it.piezas?' · '+esc(nombrePiezas(it)):'')+'</div>':'')+
    (it.por?'<div class="ag-por">💡 '+esc(it.por)+'</div>':'')+
    (it.estado==="fallo"&&it.motivo?'<div class="warn"><b>Falló:</b> '+esc(it.motivo)+'</div>':'')+
    '<label class="lb" style="margin-top:12px">Texto</label><textarea id="agTxt" style="min-height:96px">'+esc(it.txt)+'</textarea>'+
    '<label class="lb" style="margin-top:10px">Título sobre la imagen</label><input class="inp" id="agTit" value="'+esc(it.titulo)+'">'+
    bloqueCuando(FORM.t)+
    '<div class="row"><div><label class="lb" style="margin-top:10px">Estado</label><select id="agEst">'+Object.keys(ESTADOS).map(function(e){return '<option value="'+e+'"'+(e===it.estado?" selected":"")+'>'+ESTADOS[e].nm+'</option>';}).join("")+'</select></div></div>'+
    '<label class="lb" style="margin-top:10px">Dónde</label>'+opcionesRedes(it.redes)+
    '<button class="btn g sm" style="margin-top:8px" onclick="agFMejor()">⚡ Que Chispa elija el mejor momento</button>'+
    '<div class="ag-mb"><button class="btn pp" onclick="agGuardar(\''+id+'\')">💾 Guardar</button>'+
      '<button class="btn" onclick="CHISPA_AGENDA.publicarAhora(\''+id+'\')">🚀 Publicar '+(m!=="hora"&&it.piezas&&it.piezas.length?"la siguiente":"ahora")+'</button>'+
      (it.estado==="publicada"?'<button class="btn g" onclick="agApuntar(\''+id+'\')">✍️ Apuntar resultados</button>':'')+
      '<button class="btn g" onclick="agDuplicar(\''+id+'\')">⧉ Duplicar</button>'+
      '<button class="btn g" onclick="agBorrar(\''+id+'\')">🗑 Borrar</button></div>');
  pintarPiezas();pintarAviso();
  pintarLocales($("modalBox"));
};
window.agGuardar=function(id){var it=buscar(id);if(!it||!FORM)return;agFRef("guardar");var t=FORM.t,m=modoDe(t);
  if(m!=="hora"&&!t.cuando){toast("Elige el día");return;}
  if(t.cuando&&choques(t).length&&!FORM.forzar){FORM.forzar=true;pintarAviso();var bx=$("agFAviso");if(bx&&bx.scrollIntoView)bx.scrollIntoView({block:"center",behavior:"smooth"});return;}
  it.txt=$("agTxt").value.trim();it.titulo=$("agTit").value.trim()||it.titulo;
  var cambio=t.cuando!==it.cuando||t.hasta!==it.hasta||m!==modoDe(it)||JSON.stringify(t.piezas||null)!==JSON.stringify(it.piezas||null);
  var est=$("agEst").value;
  if(cambio){it.modo=m;it.cuando=t.cuando;it.hasta=m==="franja"?t.hasta:"";it.piezas=m==="hora"?null:t.piezas;it.reparto=t.reparto;it.cada=t.cada;it.por=t.por&&t.por!==it.por?t.por:"";if(est==="borrador"&&t.cuando)est="programada";}
  if(!it.cuando&&est==="programada")est="borrador";it.estado=est;var r=leerRedes();if(r.length)it.redes=r;
  FORM=null;guardarTodo();sincronizar(it);cerrarModal();if(it.cuando)REF=iniDe(it);refrescar();toast("Guardado ✓ "+(it.cuando?linea(it):""));};
window.agMejorHora=function(id){var it=buscar(id);if(!it)return;mejorSitio(it);it.estado="programada";guardarTodo();sincronizar(it);cerrarModal();refrescar();toast("⚡ "+linea(it));};
window.agDuplicar=function(id){var it=buscar(id);if(!it)return;var c=JSON.parse(JSON.stringify(it));c.id=uid();c.res={};c.ejemplo=false;c.mediaLocal=false;if(it.mediaLocal)c.media=null;
  if(modoDe(it)!=="hora"&&it.cuando){ // una franja se duplica a la semana siguiente, ya cuadrada
    c.estado="programada";(c.piezas||[]).forEach(function(p){p.id=pid();p.estado="programada";p.avisado=0;p.res={};});moverA(c,sumaDias(iniDe(it),7));
    var n=item(c);if(choques(n).length){var q=proponer(n);if(q)aplicar(n,q);}S.agenda.push(n);guardarTodo();sincronizar(n);cerrarModal();REF=iniDe(n);refrescar();toast("Duplicada: "+linea(n));return;}
  c.estado="borrador";c.cuando="";S.agenda.push(item(c));guardarTodo();cerrarModal();refrescar();toast("Duplicada como borrador");};
window.agBorrar=function(id){var it=buscar(id);S.agenda=S.agenda.filter(function(a){return a.id!==id;});guardarTodo();quitarServidor(id);
  if(it&&it.piezas)it.piezas.forEach(function(p){quitarServidor(id+"~"+p.id);});cerrarModal();refrescar();toast("Borrada");};
window.agBorrarEjemplos=function(){S.agenda=S.agenda.filter(function(a){return !a.ejemplo;});S.metricas=(S.metricas||[]).filter(function(m){return m.fuente!=="ejemplo";});S.ocultarEjemplo=true;guardarTodo();refrescar();toast("Ejemplos quitados");};
window.agNueva=function(modo){
  var d=sumaDias(new Date(),1);d.setHours(11,30,0,0);
  FORM={t:{id:uid(),modo:modo||"hora",cuando:"",hasta:"",piezas:null,reparto:"auto",cada:0,estado:"programada"},nueva:true,forzar:false,rellenar:null};
  modal('<h3>+ Nueva publicación</h3><label class="lb">¿De qué va?</label><input class="inp" id="agNTit" placeholder="Ej: paella de los domingos, mojitos a 6 €…">'+
    '<label class="lb" style="margin-top:10px">Texto</label><textarea id="agNTxt" placeholder="Si lo dejas vacío, lo escribe Chispa"></textarea>'+
    '<div class="row"><div><label class="lb" style="margin-top:10px">Formato</label><select id="agNFmt"><option value="post">Post</option><option value="carrusel">Carrusel</option><option value="reel">Reel</option><option value="historia">Historia</option></select></div></div>'+
    bloqueCuando(FORM.t)+
    '<label class="lb" style="margin-top:10px">Dónde</label>'+opcionesRedes(["igf","fb"])+
    '<div class="ag-mb"><button class="btn pp" onclick="agCrear(false)">📅 Programar</button><button class="btn g" onclick="agCrear(true)">⚡ Que Chispa elija el momento</button></div>');
  $("agFDia").value=diaIso(d);if(modo&&modo!=="hora")agFModo(modo);else agFRef();
};
window.agCrear=function(auto){
  var tt=($("agNTit").value||"").trim();if(!tt){toast("Escribe de qué va 🙂");return;}
  agFRef("guardar");var t=FORM.t,m=modoDe(t);
  var neg=(S.negocio&&S.negocio.nombre)||"";
  var it=item({id:t.id,titulo:E().tituloCorto?E().tituloCorto(tt):tt,txt:($("agNTxt").value||"").trim()||(tt.charAt(0).toUpperCase()+tt.slice(1)+" en "+neg+" ✨ Te esperamos."),formato:m==="hora"?$("agNFmt").value:(t.piezas&&t.piezas[0]?t.piezas[0].formato:"historia"),redes:leerRedes(),
    cuando:auto&&m==="hora"?"":t.cuando,modo:m,hasta:m==="franja"?t.hasta:"",piezas:m==="hora"?null:t.piezas,reparto:t.reparto,cada:t.cada});
  if(!it.redes.length)it.redes=redesPorFormato(it.formato);
  if(m!=="hora"&&!it.cuando&&!auto){toast("Elige el día");return;}
  if(auto)mejorSitio(it);
  else if(it.cuando&&choques(it).length&&!FORM.forzar){FORM.forzar=true;pintarAviso();var bx=$("agFAviso");if(bx&&bx.scrollIntoView)bx.scrollIntoView({block:"center",behavior:"smooth"});return;}
  it.estado=it.cuando?"programada":"borrador";
  FORM=null;S.agenda.push(it);guardarTodo();sincronizar(it);cerrarModal();
  if(it.cuando){REF=iniDe(it);}refrescar();toast("📅 "+(it.cuando?linea(it):"Guardada"));
};

/* ---------- plantilla «Promoción para llenar» ---------- */
function horaAMin(v,def){var m=/^(\d{1,2}):(\d{2})/.exec(v||"");return m?(+m[1])*60+(+m[2]):def;}
window.agPromo=function(){
  datos();var d=proximoDiaPromo(),hoy0=new Date(),opts="";hoy0.setHours(0,0,0,0);
  for(var i=0;i<14;i++){var x=sumaDias(hoy0,i);opts+='<option value="'+diaIso(x)+'"'+(diaIso(x)===diaIso(d)?" selected":"")+(dow(x)===CERRADO?" disabled":"")+'>'+(i===0?"Hoy, ":i===1?"Mañana, ":"")+DIAS[dow(x)].toLowerCase()+" "+x.getDate()+(dow(x)===CERRADO?" · cerrado":"")+'</option>';}
  FORM={t:null,nueva:true,forzar:false,rellenar:function(){var t=FORM.t;if(!t||!t.cuando)return;var s=$("agPDia");if(s)s.value=diaIso(iniDe(t));if(modoDe(t)==="franja"){$("agPDesde").value=hora(iniDe(t));$("agPHasta").value=hora(finDe(t));}agPRef(true);}};
  modal('<h3>🔥 Promoción para llenar</h3><p class="ag-sub">Chispa monta una franja con varias historias, una publicación y un aviso en el estado de WhatsApp, con texto llamativo y el botón «Reservar». Te propone las horas flojas de ese día; tú lo cambias si quieres.</p>'+
    '<label class="lb">¿Qué promo?</label><input class="inp" id="agPTxt" placeholder="Ej: 2x1 en mojitos, tapa gratis con la caña…" oninput="agPRef()">'+
    '<div class="ag-fgrid"><div><label class="lb">Día</label><select id="agPDia" onchange="agPDiaCambia()">'+opts+'</select></div>'+
      '<div class="ag-chk"><label><input type="checkbox" id="agPTodo" onchange="agPRef()"> Todo el día</label></div>'+
      '<div class="ag-p-fr"><label class="lb">Desde</label><input class="inp" type="time" step="300" id="agPDesde" onchange="agPRef()"></div><div class="ag-p-fr"><label class="lb">Hasta</label><input class="inp" type="time" step="300" id="agPHasta" onchange="agPRef()"></div></div>'+
    '<div id="agPPor" class="ag-por"></div>'+
    '<div class="ag-fgrid"><div><label class="lb">Historias</label><input class="inp" type="number" inputmode="numeric" id="agPN" min="1" max="10" value="4" onchange="agPRef()"></div>'+
      '<div class="ag-chk"><label><input type="checkbox" id="agPPost" checked onchange="agPRef()"> Publicación en Instagram y Facebook</label><label><input type="checkbox" id="agPWa" checked onchange="agPRef()"> Aviso en el estado de WhatsApp</label></div></div>'+
    '<div id="agPVista" class="ag-pvista"></div><div id="agFAviso" aria-live="polite"></div>'+
    '<div class="ag-mb"><button class="btn pp" onclick="agPCrear()">🔥 Crear la promo</button><button class="btn g" onclick="cerrarModal()">Cancelar</button></div>');
  agPDiaCambia();
};
window.agPDiaCambia=function(){var d=new Date($("agPDia").value+"T12:00"),v=VALLE[dow(d)]||[18,0,21,0];
  $("agPDesde").value=pad(v[0])+":"+pad(v[1]);$("agPHasta").value=pad(v[2])+":"+pad(v[3]);agPRef();};
window.agPRef=function(sinRehacer){if(!FORM||!$("agPDia"))return;FORM.forzar=false;
  var d=new Date($("agPDia").value+"T12:00"),todo=$("agPTodo").checked;
  Array.prototype.forEach.call(document.querySelectorAll(".ag-p-fr"),function(e){e.style.display=todo?"none":"";});
  if(sinRehacer!==true){
    var a=horaAMin($("agPDesde").value,18*60),b=horaAMin($("agPHasta").value,21*60);if(b<=a)b+=1440;
    FORM.t=crearPromo({txt:$("agPTxt").value,dia:d,a:a,b:b,n:Math.max(1,Math.min(10,parseInt($("agPN").value,10)||4)),post:$("agPPost").checked,wa:$("agPWa").checked,todoDia:todo});}
  var t=FORM.t;
  $("agPPor").innerHTML='💡 '+esc(t.por||"");
  var reserva=E().enlace?E().enlace("reserva"):"";
  $("agPVista").innerHTML='<div class="ag-story"><div class="ag-story-k">'+esc(t.kicker)+'</div><div class="ag-story-t">🔥 '+esc(t.titulo.replace(/^Promo /,"").toUpperCase())+' 🔥</div><span class="ag-story-b">📅 Reservar</span>'+(reserva?'<div class="ag-story-u">'+esc(reserva.replace(/^https?:\/\//,""))+'</div>':'')+'</div>'+
    '<div class="ag-story-l"><b>'+esc(linea(t))+'</b><br>'+esc(nombrePiezas(t))+'<div class="ag-pzl">'+piezasOrdenadas(t).map(function(p){var c=(REDES[p.redes[0]]||{c:"#888"}).c;return '<span class="ag-pzc" style="--c:'+c+'"><b>'+TIPOS[tipoPieza(p)].ic+'</b>'+hora(fecha(p.cuando))+'</span>';}).join("")+'</div></div>';
  pintarAviso();
};
window.agPCrear=function(){if(!FORM||!FORM.t)return;var t=FORM.t;
  if(dow(iniDe(t))===CERRADO){toast("El miércoles cerráis: elige otro día");return;}
  if(choques(t).length&&!FORM.forzar){FORM.forzar=true;pintarAviso();return;}
  FORM=null;S.agenda.push(t);guardarTodo();sincronizar(t);cerrarModal();REF=iniDe(t);
  ULTIMO="Hecho ✓ He montado la promoción para llenar:\n\n"+resumenLista([t])+"\n\nPor qué: "+t.por+"\n\nLa publicación y el estado de WhatsApp salen al empezar; las historias, repartidas hasta el final, todas con el botón «Reservar».";
  refrescar();toast("🔥 Promo lista: "+linea(t));};

/* ---------- cuando algo movido no cuadra ---------- */
function trasMover(it,antes){
  guardarTodo();sincronizar(it);refrescar();
  var ch=choques(it);if(!ch.length){toast("📅 "+linea(it));return;}
  var q=proponer(it);ANTES={id:it.id,json:antes,q:q};
  modal('<h3>⚠️ Así no cuadra</h3><p style="margin:0 0 8px">«'+esc(it.titulo)+'» ('+esc(linea(it))+') choca con:</p><ul class="ag-chl">'+ch.slice(0,4).map(function(c){return '<li>«'+esc(c.o.titulo)+'» · '+esc(rango(c.o))+' — '+esc(c.txt)+'</li>';}).join("")+'</ul>'+
    (q?'<div class="ag-por">⚡ Chispa propone: <b>'+esc(linea(q))+'</b></div>':'<div class="ag-por">No encuentro otro hueco libre cerca.</div>')+
    '<div class="ag-mb">'+(q?'<button class="btn pp" onclick="agChoque(\'mover\')">⚡ Moverla ahí</button>':'')+'<button class="btn g" onclick="agChoque(\'dejar\')">Dejarla así</button><button class="btn g" onclick="agChoque(\'deshacer\')">↩ Deshacer</button></div>');
}
window.agChoque=function(a){var X=ANTES;ANTES=null;cerrarModal();if(!X)return;var it=buscar(X.id);if(!it)return;
  if(a==="mover"&&X.q)aplicar(it,X.q);else if(a==="deshacer"&&X.json){var o=JSON.parse(X.json);Object.keys(o).forEach(function(k){it[k]=o[k];});}
  guardarTodo();sincronizar(it);if(it.cuando)REF=iniDe(it);refrescar();toast(a==="dejar"?"La dejo ahí":"📅 "+linea(it));};
window.agVerDia=function(k){REF=new Date(k+"T12:00");VISTA="semana";refrescar();};
window.agVista=function(v){VISTA=v;refrescar();};
window.agHoy=function(){REF=new Date();refrescar();};
window.agMover=function(n){if(VISTA==="mes")REF=new Date(REF.getFullYear(),REF.getMonth()+n,1);else REF=sumaDias(REF,7*n);refrescar();};
window.agOrden=function(txt){
  var inp=$("agOrden"),v=(typeof txt==="string"?txt:(inp&&inp.value)||"").trim();if(!v){toast("Escríbele algo a Chispa 🙂");return;}
  var r=orden(v);
  if(!r){ULTIMO="No te he entendido del todo 🙂 Prueba con: «programa la semana», «publica todo esto el lunes», «publica el viernes a las 20:00» o «¿qué tengo programado?».";}
  else ULTIMO=r.texto;
  if(r&&r.ref){REF=fecha(r.ref);}else if(r&&(r.accion==="dia"||r.accion==="semana")){var pr=S.agenda.filter(function(a){return a.estado==="programada"&&a.cuando;}).sort(function(a,b){return fecha(b.cuando)-fecha(a.cuando);});if(r.accion==="dia"&&pr.length)REF=fecha(pr[0].cuando);}
  refrescar();
};
window.agAvisos=function(){
  if(!("Notification" in window)){toast("Este navegador no avisa. En el iPhone: añade Chispa a la pantalla de inicio.");return;}
  Notification.requestPermission().then(function(p){toast(p==="granted"?"🔔 Te avisaré a la hora de cada publicación":"Sin permiso: te avisaré dentro de la página");refrescar();});
};
window.agProbarAviso=function(){avisar({id:"prueba",titulo:"Así te avisará Chispa",txt:"A la hora de cada publicación verás este aviso con todo listo."},true);};

/* ---------- arrastrar (ratón y dedo) y estirar franjas ---------- */
var DR=null,RS=null;
function iniciarArrastre(){
  var raiz=$("main");if(!raiz||raiz._agDrag)return;raiz._agDrag=1;
  raiz.addEventListener("pointerdown",function(e){
    if(e.button>0||!e.target.closest)return;
    var asa=e.target.closest(".ag-fr-asa");
    if(asa){var bl=asa.closest(".ag-fr"),it=buscar(asa.getAttribute("data-asa"));if(!bl||!it)return;e.preventDefault();e.stopPropagation();
      RS={el:bl,id:it.id,dia:it.cuando.slice(0,10),hr:null,fila0:bl.style.gridRowEnd};bl.style.pointerEvents="none";document.body.classList.add("ag-estirando");return;}
    var el=e.target.closest(".ag-it,.ag-fr");if(!el)return;
    DR={el:el,id:el.getAttribute("data-id"),x:e.clientX,y:e.clientY,activo:false,tactil:e.pointerType!=="mouse",t:null,pid:e.pointerId};
    if(DR.tactil){DR.t=setTimeout(function(){if(DR&&!DR.mov)empezar(e.clientX,e.clientY);},300);}
  });
  document.addEventListener("pointermove",function(e){
    if(RS){estirar(e.clientX,e.clientY);return;}
    if(!DR)return;
    var dx=e.clientX-DR.x,dy=e.clientY-DR.y,dist=Math.abs(dx)+Math.abs(dy);
    if(!DR.activo){if(DR.tactil){if(dist>10){DR.mov=1;clearTimeout(DR.t);DR=null;}return;}if(dist>6)empezar(e.clientX,e.clientY);else return;}
    mover(e.clientX,e.clientY);
  });
  document.addEventListener("touchmove",function(e){if((DR&&DR.activo)||RS)e.preventDefault();},{passive:false});
  document.addEventListener("pointerup",function(e){
    if(RS){var r=RS;RS=null;document.body.classList.remove("ag-estirando");terminarEstirar(r);return;}
    if(!DR)return;clearTimeout(DR.t);var d=DR;DR=null;
    if(!d.activo){if(!d.mov)window.agAbrir(d.id);return;}
    soltar(d,e.clientX,e.clientY);});
  document.addEventListener("pointercancel",function(){if(RS){RS.el.style.gridRowEnd=RS.fila0;RS.el.style.pointerEvents="";RS=null;document.body.classList.remove("ag-estirando");var l=$("agEstL");if(l)l.remove();}
    if(DR&&DR.activo)return;if(DR)clearTimeout(DR.t);DR=null;});
  raiz.addEventListener("keydown",function(e){var el=e.target.closest&&e.target.closest(".ag-it,.ag-fr");if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();window.agAbrir(el.getAttribute("data-id"));}});
}
function empezar(x,y){if(!DR)return;DR.activo=true;
  var r=DR.el.getBoundingClientRect(),g;
  if(DR.el.classList.contains("ag-fr")){var it=buscar(DR.id);g=document.createElement("div");g.className="ag-it ag-ghost";g.style.setProperty("--c",DR.el.style.getPropertyValue("--c"));
    g.innerHTML='<span class="ag-tx"><span class="ag-h">↕ '+esc(it?rango(it):"")+'</span><span class="ag-t">'+esc(it?it.titulo:"")+'</span></span>';document.body.appendChild(g);g.style.width=Math.max(140,Math.min(220,r.width))+"px";}
  else{g=DR.el.cloneNode(true);g.className+=" ag-ghost";g.style.width=r.width+"px";document.body.appendChild(g);}
  g.style.left=(x-g.offsetWidth/2)+"px";g.style.top=(y-18)+"px";
  DR.g=g;DR.el.classList.add("ag-orig");document.body.classList.add("ag-arrastrando");
  try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}}
function destino(x,y){DR&&DR.g&&(DR.g.style.display="none");var t=document.elementFromPoint(x,y);DR&&DR.g&&(DR.g.style.display="");return t&&t.closest&&t.closest(".ag-cell,.ag-ad,.ag-mc,.ag-pool");}
function mover(x,y){if(!DR||!DR.g)return;var w=DR.g.offsetWidth;DR.g.style.left=(x-w/2)+"px";DR.g.style.top=(y-18)+"px";
  var t=destino(x,y);Array.prototype.forEach.call(document.querySelectorAll(".ag-over"),function(c){if(c!==t)c.classList.remove("ag-over");});if(t)t.classList.add("ag-over");
  // desplazar si se acerca al borde
  var wrap=document.querySelector(".ag-wk-wrap");if(wrap){var b=wrap.getBoundingClientRect();if(x>b.right-40)wrap.scrollLeft+=12;else if(x<b.left+40)wrap.scrollLeft-=12;}
  if(y>innerHeight-50)scrollBy(0,14);else if(y<70)scrollBy(0,-14);}
function soltar(d,x,y){
  var t=destino(x,y);if(d.g)d.g.remove();d.el.classList.remove("ag-orig");document.body.classList.remove("ag-arrastrando");
  Array.prototype.forEach.call(document.querySelectorAll(".ag-over"),function(c){c.classList.remove("ag-over");});
  var it=buscar(d.id);if(!it||!t)return;
  var antes=JSON.stringify({cuando:it.cuando,hasta:it.hasta,piezas:it.piezas,estado:it.estado,por:it.por}),m=modoDe(it);
  if(t.classList.contains("ag-pool")){
    if(m!=="hora"){toast("Las franjas y los días enteros necesitan fecha: muévela a otro día");return;}
    it.cuando="";it.estado="borrador";guardarTodo();sincronizar(it);refrescar();return;}
  var k=t.getAttribute("data-dia");if(!k)return;
  if(m==="hora"){var old=it.cuando?fecha(it.cuando):null,nd=new Date(k+"T12:00");
    if(t.hasAttribute("data-h"))nd.setHours(+t.getAttribute("data-h"),old?old.getMinutes():0,0,0);
    else nd.setHours(old?old.getHours():11,old?old.getMinutes():30,0,0);
    it.cuando=iso(nd);}
  else{var ini=new Date(k+"T00:00");
    if(m==="franja"){var o=iniDe(it);if(t.hasAttribute("data-h"))ini.setHours(+t.getAttribute("data-h"),o.getMinutes(),0,0);else ini.setHours(o.getHours(),o.getMinutes(),0,0);}
    moverA(it,ini);}
  it.por="";if(it.estado==="borrador"||it.estado==="fallo")it.estado="programada";
  if(dow(iniDe(it))===CERRADO)toast("Ojo: ese día cerráis");
  trasMover(it,antes);
}
/* estirar el borde de abajo de una franja: cambia la hora de fin */
function estirar(x,y){if(!RS)return;
  var e=document.elementFromPoint(x,y);
  var c=e&&e.closest&&e.closest(".ag-cell");if(!c||c.getAttribute("data-dia")!==RS.dia){if(y>innerHeight-50)scrollBy(0,14);return;}
  var hr=+c.getAttribute("data-h"),it=buscar(RS.id);if(!it)return;var ini=iniDe(it);if(hr<ini.getHours())hr=ini.getHours();
  RS.hr=hr;RS.el.style.gridRowEnd=String(hr+1-H0+R0);
  var l=$("agEstL");if(!l){l=document.createElement("div");l.id="agEstL";l.className="ag-estl";document.body.appendChild(l);}
  l.textContent="Hasta las "+(hr+1===24?"00:00":pad(hr+1)+":00");l.style.left=x+"px";l.style.top=(y-44)+"px";
  if(y>innerHeight-50)scrollBy(0,14);else if(y<70)scrollBy(0,-14);}
function terminarEstirar(r){var l=$("agEstL");if(l)l.remove();
  var it=buscar(r.id);if(!it||r.hr==null){refrescar();return;}
  var fin=new Date(r.dia+"T00:00");fin.setHours(r.hr+1,0,0,0);var ini=iniDe(it);
  if(fin.getTime()-ini.getTime()<30*60000){toast("La franja tiene que durar al menos media hora");refrescar();return;}
  var antes=JSON.stringify({cuando:it.cuando,hasta:it.hasta,piezas:it.piezas,estado:it.estado,por:it.por});
  it.hasta=iso(fin);repartir(it);trasMover(it,antes);
}

/* =====================================================================
   AVISO A LA HORA (sin servidor) y servidor de publicación
   ===================================================================== */
function avisar(it,prueba,pz){
  var b=$("agAviso");if(!b){b=document.createElement("div");b.id="agAviso";b.className="ag-aviso";document.body.appendChild(b);}
  var que=pz?" ("+TIPOS[tipoPieza(pz)].nm+")":"",ref=it.id+(pz?"~"+pz.id:"");
  b.innerHTML='<div class="ag-av-ic">⏰</div><div class="ag-av-t"><b>Toca publicar: '+esc(it.titulo)+esc(que)+'</b><span>'+(prueba?esc(it.txt):"Texto, imagen y vídeo listos. Un toque y lo subes.")+'</span></div>'+
    (prueba?'':'<button class="btn pp sm" onclick="document.getElementById(\'agAviso\').classList.remove(\'on\');CHISPA_AGENDA.publicarAhora(\''+ref+'\')">🚀 Publicar</button>')+'<button class="ag-av-x" onclick="this.parentNode.classList.remove(\'on\')" aria-label="Cerrar">×</button>';
  b.classList.add("on");
  try{if("Notification" in window&&Notification.permission==="granted"){
    var n=new Notification("⏰ Toca publicar: "+it.titulo+que,{body:(it.txt||"").slice(0,120),icon:"icono-192.png",tag:"chispa-"+ref});
    n.onclick=function(){window.focus();n.close();if(!prueba)publicarAhora(ref);};}}catch(e){}
}
function vigilar(){
  if(!S.agenda)return;var PD=window.CHISPA_PUBLICADOR;if(PD&&PD.url)return; // el servidor se encarga
  var ahora=new Date();
  S.agenda.forEach(function(it){if(it.estado!=="programada"||!it.cuando)return;
    if(it.piezas&&it.piezas.length&&modoDe(it)!=="hora"){ // franja: un aviso por pieza
      it.piezas.forEach(function(p){if(p.avisado||p.estado==="publicada"||!p.cuando)return;var d=fecha(p.cuando);
        if(d<=ahora&&ahora-d<6*3600*1000){p.avisado=1;guardarTodo();avisar(it,false,p);}});return;}
    if(it.avisado)return;var d=fecha(it.cuando);
    if(d<=ahora&&ahora-d<6*3600*1000){it.avisado=1;guardarTodo();avisar(it);}});
}
setInterval(vigilar,30000);setTimeout(vigilar,4000);

function base(){var PD=window.CHISPA_PUBLICADOR;if(!PD||!PD.url)return "";return (PD.base||PD.url.replace(/\/publicar\/?$/,"")).replace(/\/$/,"");}
function cab(){var PD=window.CHISPA_PUBLICADOR||{};var h={"Content-Type":"application/json"};if(PD.clave)h["X-Chispa-Clave"]=PD.clave;return h;}
/* las redes descargan la foto o el vídeo de una dirección pública: se prepara aquí (con el titular y el logo integrado) y se sube al servidor */
function prepararMedios(it,pz){
  var b=base(),es=E();if(!b||!es.hacerImagen)return Promise.resolve([]);
  var go=function(){var p=aPost(it,pz),fmt=pz?pz.formato:it.formato,vert=(fmt==="reel"||fmt==="historia");
    var pr=(p.media&&p.media.tipo==="propia"&&p.media.esVideo&&p.file)?Promise.resolve(p.file):(vert&&es.hacerVideo?es.hacerVideo(p):es.hacerImagen(p));
    return pr.then(function(blob){var fd=new FormData();fd.append("archivo",blob,"chispa-"+it.id+(pz?"-"+pz.id:"")+(/video/.test(blob.type)?(/mp4/.test(blob.type)?".mp4":".webm"):".jpg"));
      var h=cab();delete h["Content-Type"];return fetch(b+"/subir",{method:"POST",headers:h,body:fd});}).then(function(r){return r.ok?r.json():{};}).then(function(j){return j.url?[j.url]:[];});};
  return (it.mediaLocal?leerLocal(it.id):Promise.resolve()).then(go).catch(function(){return [];});
}
/* programa una publicación (o una pieza de una franja) en el servidor */
function enviarServidor(b,id,it,redes,formato,cuando,pz){
  return prepararMedios(it,pz).then(function(medios){
    if(!medios.length&&!it.mediaLocal){var u=it.media&&(it.media.slides?it.media.slides.map(function(s){return s.url;}):[it.media.url]);medios=(u||[]).map(function(x){return x.replace(/auto=format/,"fm=jpg");});}
    return fetch(b+"/programar",{method:"POST",headers:cab(),body:JSON.stringify({id:id,redes:redes,texto:it.txt+(it.tags?"\n\n"+it.tags:""),titulo:it.titulo,formato:formato,
      cuando:new Date(cuando).toISOString(),medios:medios})});});
}
function sincronizar(it){
  var b=base();if(!b||!it)return;
  if(it.piezas&&it.piezas.length&&modoDe(it)!=="hora"){ // franja: cada pieza es una publicación programada en el servidor
    quitarServidor(it.id);
    it.piezas.forEach(function(p){var id=it.id+"~"+p.id;
      if(it.estado!=="programada"||p.estado==="publicada"||!p.cuando){quitarServidor(id);return;}
      enviarServidor(b,id,it,p.redes,p.formato,p.cuando,p).then(function(r){p.sync=r&&r.ok?"ok":"error";guardarTodo();},function(){p.sync="error";guardarTodo();});});
    return;}
  if(it.estado!=="programada"||!it.cuando){quitarServidor(it.id);return;}
  enviarServidor(b,it.id,it,it.redes,it.formato,it.cuando).then(function(r){it.sync=r&&r.ok?"ok":"error";guardarTodo();},function(){it.sync="error";guardarTodo();});
}
function sincronizarTodas(){if(!base())return;(S.agenda||[]).forEach(sincronizar);}
function quitarServidor(id){var b=base();if(!b)return;fetch(b+"/programar/"+encodeURIComponent(id),{method:"DELETE",headers:cab()}).catch(function(){});}
function traerEstados(){var b=base();if(!b)return;
  fetch(b+"/agenda",{headers:cab()}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(!j||!j.items)return;
    j.items.forEach(function(s){var it=buscar(s.id);if(!it||!s.estado)return;
      if(String(s.id).indexOf("~")>0){var p=(it.piezas||[]).filter(function(x){return x.id===String(s.id).split("~")[1];})[0];if(p&&p.estado!==s.estado)marcar(s.id,s.estado,Object.keys(s.res||{}),s.motivo);return;}
      if(s.estado!==it.estado){it.estado=s.estado;it.res=s.res||it.res;it.motivo=s.motivo||"";}});guardarTodo();}).catch(function(){});}
setTimeout(traerEstados,3000);

/* =====================================================================
   ESTADÍSTICAS
   ===================================================================== */
var SERIES=["igf","fb","tt","gbp","yt"]; // orden fijo; colores validados para fondo oscuro
function semilla(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return function(){h=(h*1103515245+12345)|0;return ((h>>>8)&0xffff)/65536;};}
function metricasEjemplo(A){
  var M=[];A.filter(function(a){return a.estado==="publicada";}).forEach(function(a){
    a.redes.forEach(function(r){var R=semilla(a.id+r),base={igf:1,fb:.35,tt:1.4,gbp:.25,yt:.3,igs:.4,wa:.2}[r]||.3,f=a.formato==="reel"?1.8:a.formato==="carrusel"?1.2:1;
      var vistas=Math.round((700+R()*900)*base*f),alc=Math.round(vistas*(.62+R()*.15));
      M.push({id:uid(),agId:a.id,titulo:a.titulo,red:r,formato:a.formato,fecha:a.cuando,hora:fecha(a.cuando).getHours(),vistas:vistas,alcance:alc,
        megusta:Math.round(alc*(.05+R()*.04)),comentarios:Math.round(alc*(.004+R()*.01)),guardados:Math.round(alc*(a.formato==="carrusel"?.03:.01)*(1+R())),compartidos:Math.round(alc*(.004+R()*.008)),
        seguidores:Math.round(1+R()*6*f),fuente:"ejemplo"});});});
  return M;
}
function semanasEjemplo(){
  var R=semilla("semanas"),out={},base={igf:3200,fb:800,tt:1500,gbp:420,yt:180};
  SERIES.forEach(function(r){out[r]=[];for(var w=0;w<8;w++)out[r].push(Math.round(base[r]*(.75+w*.05+R()*.25)));});
  return out;
}
function interacciones(m){return (m.megusta||0)+(m.comentarios||0)+(m.guardados||0)+(m.compartidos||0);}
function metricasVisibles(){return (S.metricas||[]).filter(function(m){return !(S.ocultarEjemplo&&m.fuente==="ejemplo");});}
var charts2=[];
function vStats2(){
  datos();
  var M=metricasVisibles(),hay30=M.filter(function(m){return fecha(m.fecha)>sumaDias(new Date(),-30);});
  var tieneEj=hay30.some(function(m){return m.fuente==="ejemplo";});
  var sum=function(k){return hay30.reduce(function(a,m){return a+(m[k]||0);},0);};
  var alc=sum("alcance"),inter=hay30.reduce(function(a,m){return a+interacciones(m);},0);
  var ig=S.cuentas.igf,ultSeg=S.seguidores.filter(function(s){return s.red==="igf";}).slice(-1)[0];
  var segGan=ultSeg&&S.seguidores.length>1?ultSeg.n-S.seguidores[0].n:sum("seguidores");
  var fmtN=function(n){return (n||0).toLocaleString("es-ES");};
  var tile=function(lbl,val,sub,ej){return '<div class="kpi"><div class="l">'+lbl+(ej?' <span class="ag-ej">EJEMPLO</span>':'')+'</div><div class="n">'+val+'</div><div class="l">'+sub+'</div></div>';};
  var cuentas='<div class="ag-cuentas">'+
    '<div class="ag-cta real"><div class="ag-cta-h">'+chipRed("igf")+'<span class="ag-real">DATO REAL · '+ig.fecha.split("-").reverse().join("/")+'</span></div><div class="ag-cta-u">@'+esc(ig.usuario)+'</div>'+
      '<div class="ag-cta-n"><div><b>'+fmtN(ultSeg?ultSeg.n:ig.seguidores)+'</b><span>seguidores</span></div><div><b>'+fmtN(ig.publicaciones)+'</b><span>publicaciones</span></div></div>'+
      '<div class="ag-cta-b"><button class="btn g sm" onclick="agSeguidores()">✍️ Hoy tengo… seguidores</button><a class="btn g sm" href="https://www.instagram.com/'+esc(ig.usuario)+'/" target="_blank" rel="noopener">Abrir perfil</a></div></div>'+
    ["fb","tt","yt","gbp"].map(function(r){var api={fb:"Facebook Insights (Meta)",tt:"TikTok (Display API)",yt:"YouTube Analytics",gbp:"Google Business Performance"}[r];
      return '<div class="ag-cta"><div class="ag-cta-h">'+chipRed(r)+'<span class="ag-sinc">Sin conectar</span></div><div class="ag-cta-d">Cuando lo conectes, Chispa leerá aquí las cifras de '+api+'.</div>'+
        '<div class="ag-cta-b"><button class="btn g sm" onclick="agConectar(\''+r+'\')">🔗 Conectar</button><button class="btn g sm" onclick="agApuntar(null,\''+r+'\')">✍️ Apuntar a mano</button></div></div>';}).join("")+'</div>';
  var top=hay30.slice().sort(function(a,b){return b.vistas-a.vistas;});
  var filas=top.slice(0,12).map(function(m){var tasa=m.alcance?(interacciones(m)/m.alcance*100):0;
    return '<tr><td>'+esc(m.titulo)+'</td><td>'+chipRed(m.red)+'</td><td>'+fecha(m.fecha).toLocaleDateString("es-ES",{day:"numeric",month:"short"})+'</td><td class="n">'+fmtN(m.vistas)+'</td><td class="n">'+fmtN(m.alcance)+'</td><td class="n">'+fmtN(interacciones(m))+'</td><td class="n">'+tasa.toFixed(1).replace(".",",")+' %</td><td class="n">+'+fmtN(m.seguidores)+'</td><td>'+
      (m.fuente==="ejemplo"?'<span class="ag-ej">EJEMPLO</span>':m.fuente==="manual"?'<span class="ag-man">A mano</span>':'<span class="ag-real">'+esc(m.fuente)+'</span>')+'</td></tr>';}).join("");
  var h='<div class="hd"><h2>📈 Estadísticas</h2><div class="ag-acc"><button class="btn pp sm" onclick="agApuntar()">✍️ Apuntar resultados</button>'+
    (base()?'<button class="btn g sm" onclick="agTraerStats()">↻ Leer de las redes</button>':'<button class="btn g sm" onclick="agConectar()">🔗 Conectar redes</button>')+
    '<button class="btn g sm" onclick="agToggleEj()">'+(S.ocultarEjemplo?"Ver con ejemplos":"Ocultar ejemplos")+'</button></div></div>'+
    (tieneEj?'<div class="ag-avisoej">Las cifras con la etiqueta <span class="ag-ej">EJEMPLO</span> son inventadas para enseñar el panel. Las reales son las de Instagram de arriba y las que apuntes a mano; cuando conectes las redes se rellenan solas.</div>':'')+
    cuentas+
    '<div class="kpis">'+tile("Visualizaciones · 30 días",fmtN(sum("vistas")),"todas las redes",tieneEj)+tile("Alcance · 30 días",fmtN(alc),"personas distintas",tieneEj)+
      tile("Interacción",(alc?(inter/alc*100).toFixed(1).replace(".",","):"0")+" %","me gusta, comentarios, guardados y compartidos ÷ alcance",tieneEj)+tile("Seguidores ganados",(segGan>=0?"+":"")+fmtN(segGan),"en 30 días",tieneEj&&!(S.seguidores.length>1))+'</div>'+
    '<div class="ch"><h3>Visualizaciones por semana y red'+(S.ocultarEjemplo?'':' <span class="ag-ej">EJEMPLO</span>')+'</h3><div class="chbox"><canvas id="agC1" aria-label="Visualizaciones por semana y red"></canvas></div></div>'+
    '<div class="row"><div class="ch" style="flex:1;min-width:260px"><h3>Interacción media por formato</h3><div class="chbox"><canvas id="agC2" aria-label="Interacción por formato"></canvas></div></div>'+
    '<div class="ch" style="flex:1;min-width:260px"><h3>Seguidores en Instagram</h3><div class="chbox"><canvas id="agC3" aria-label="Seguidores en Instagram"></canvas></div></div></div>'+
    '<div class="card"><h3>Por publicación</h3>'+(filas?'<div class="ag-tabla"><table><thead><tr><th>Publicación</th><th>Red</th><th>Fecha</th><th class="n">Vistas</th><th class="n">Alcance</th><th class="n">Interacciones</th><th class="n">Tasa</th><th class="n">Seguidores</th><th>Origen</th></tr></thead><tbody>'+filas+'</tbody></table></div>':'<div class="empty">Todavía no hay resultados. Pulsa «Apuntar resultados» cuando mires tus cifras en Instagram.</div>')+'</div>'+
    '<div class="card ag-consejos"><h3>🧠 Consejos para el algoritmo</h3>'+consejos(M)+'</div>';
  return h;
}
function consejos(M){
  var reales=M.filter(function(m){return m.fuente!=="ejemplo";}),porHora={},porFmt={};
  var fuente=reales.length>=5?reales:M;
  fuente.forEach(function(m){var h=m.hora!=null?m.hora:fecha(m.fecha).getHours();var t=m.alcance?interacciones(m)/m.alcance:0;(porHora[h]=porHora[h]||[]).push(t);(porFmt[m.formato]=porFmt[m.formato]||[]).push(m.vistas);});
  var media=function(a){return a.reduce(function(x,y){return x+y;},0)/a.length;};
  var mh=Object.keys(porHora).sort(function(a,b){return media(porHora[b])-media(porHora[a]);})[0];
  var mf=Object.keys(porFmt).sort(function(a,b){return media(porFmt[b])-media(porFmt[a]);})[0];
  var nf={post:"las fotos",carrusel:"los carruseles",reel:"los reels",historia:"las historias"};
  var basado=reales.length>=5?"con tus datos":"con los datos de ejemplo (cuando haya datos reales, se recalcula)";
  var semana=(S.agenda||[]).filter(function(a){return a.cuando&&fecha(a.cuando)>=lunes(new Date())&&fecha(a.cuando)<sumaDias(lunes(new Date()),7)&&a.redes.indexOf("igf")>=0;}).length;
  return '<div class="ag-tips">'+
    '<div class="ag-tip"><b>⏰ Mejor hora</b><p>'+(mh?'La que mejor te funciona '+basado+': <b>'+pad(+mh)+':00</b>. ':'')+'Para un restaurante en Palma: menú a las 11:30, planes de noche a las 18:30, reels a las 20:30 y el fin de semana a las 11:00.</p></div>'+
    '<div class="ag-tip"><b>🎬 Qué formato funciona</b><p>'+(mf?'Lo que más vistas te da '+basado+': <b>'+(nf[mf]||mf)+'</b>. ':'')+'Los reels son lo que más enseña Instagram a gente que todavía no te sigue; los carruseles son lo que más se guarda; las historias mantienen a tus clientes de siempre.</p></div>'+
    '<div class="ag-tip"><b>📆 Frecuencia</b><p>Con '+S.cuentas.igf.seguidores.toLocaleString("es-ES")+' seguidores y '+S.cuentas.igf.publicaciones+' publicaciones, lo que hace crecer es la constancia: <b>3-4 publicaciones a la semana</b> en Instagram (al menos 1 reel) e historias casi a diario. Esta semana llevas <b>'+semana+'</b> programadas en Instagram.'+(semana<3?' <a href="javascript:void 0" onclick="CHISPA_AGENDA.planificarSemana(true)">Planificar la semana</a>':'')+'</p></div>'+
    '<div class="ag-tip"><b>💬 La primera hora</b><p>Contesta los comentarios en la primera hora: Instagram y TikTok lo toman como señal de que la publicación gusta y la enseñan a más gente.</p></div>'+
    '<div class="ag-tip"><b>📍 Google</b><p>Publica en tu ficha de Google una vez a la semana (oferta, menú o evento): es lo que ve quien busca «restaurante cerca» en Palma.</p></div>'+
  '</div>';
}
function dibujar2(){
  charts2.forEach(function(c){try{c.destroy();}catch(e){}});charts2=[];
  if(typeof Chart==="undefined")return;
  var M=metricasVisibles(),tx="#a3adbf",grid="rgba(255,255,255,.06)";
  Chart.defaults.color=tx;Chart.defaults.font.family="Inter, -apple-system, system-ui, sans-serif";
  // 1) semanas por red
  var L0=lunes(new Date()),labels=[],ws=[];for(var w=7;w>=0;w--){var d=sumaDias(L0,-7*w);ws.push(d);labels.push(d.getDate()+" "+MESES[d.getMonth()].slice(0,3));}
  var ej=S.ocultarEjemplo?null:semanasEjemplo();
  var ds=SERIES.map(function(r){var vals=ws.map(function(d,i){var fin=sumaDias(d,7);var man=M.filter(function(m){return m.red===r&&m.fuente!=="ejemplo"&&fecha(m.fecha)>=d&&fecha(m.fecha)<fin;}).reduce(function(a,m){return a+(m.vistas||0);},0);return (ej?ej[r][i]:0)+man;});
    return {label:REDES[r].nm,data:vals,borderColor:REDES[r].c,backgroundColor:REDES[r].c,borderWidth:2,pointRadius:3,pointHoverRadius:6,tension:.3};}).filter(function(s){return s.data.some(function(v){return v>0;});});
  var c1=$("agC1");
  if(c1)charts2.push(new Chart(c1,{type:"line",data:{labels:labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
    plugins:{legend:{position:"top",labels:{usePointStyle:true,boxWidth:8}},tooltip:{callbacks:{label:function(c){return " "+c.dataset.label+": "+c.parsed.y.toLocaleString("es-ES");}}}},
    scales:{x:{grid:{color:grid}},y:{beginAtZero:true,grid:{color:grid},ticks:{callback:function(v){return v.toLocaleString("es-ES");}}}}}}));
  // 2) formato
  var F={post:"Foto",carrusel:"Carrusel",reel:"Reel",historia:"Historia"},fx=[],fy=[];
  Object.keys(F).forEach(function(f){var a=M.filter(function(m){return m.formato===f&&m.alcance;});if(!a.length)return;fx.push(F[f]);fy.push(+(a.reduce(function(s,m){return s+interacciones(m)/m.alcance;},0)/a.length*100).toFixed(1));});
  var c2=$("agC2");
  if(c2)charts2.push(new Chart(c2,{type:"bar",data:{labels:fx,datasets:[{label:"Interacción media (%)",data:fy,backgroundColor:"#9a6cf0",borderRadius:4,maxBarThickness:42}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return " "+String(c.parsed.y).replace(".",",")+" % de interacción";}}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:grid},ticks:{callback:function(v){return v+" %";}}}}}}));
  // 3) seguidores (solo reales / a mano)
  var Sg=S.seguidores.filter(function(s){return s.red==="igf";}).sort(function(a,b){return a.fecha<b.fecha?-1:1;});
  var c3=$("agC3");
  if(c3)charts2.push(new Chart(c3,{type:"line",data:{labels:Sg.map(function(s){var d=new Date(s.fecha+"T12:00");return d.getDate()+" "+MESES[d.getMonth()].slice(0,3);}),
    datasets:[{label:"Seguidores",data:Sg.map(function(s){return s.n;}),borderColor:"#e1306c",backgroundColor:"#e1306c",borderWidth:2,pointRadius:4,pointHoverRadius:7,tension:.2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return " "+c.parsed.y.toLocaleString("es-ES")+" seguidores";}}}},scales:{x:{grid:{display:false}},y:{grid:{color:grid},ticks:{callback:function(v){return v.toLocaleString("es-ES");}}}}}}));
}
window.agToggleEj=function(){S.ocultarEjemplo=!S.ocultarEjemplo;guardarTodo();refrescar();};
window.agConectar=function(r){
  if(typeof window.conectarCuentas==="function"){window.conectarCuentas(r);return;}
  if(typeof panel==="function"){panel("ajustes");toast("Conecta tus redes en «Mi negocio»");}
};
window.agSeguidores=function(){
  var u=S.seguidores.filter(function(s){return s.red==="igf";}).slice(-1)[0];
  modal('<h3>✍️ Seguidores de hoy en Instagram</h3><p style="color:var(--tx2);font-size:13px;margin:0 0 8px">Mira el número en tu perfil y apúntalo. Con dos o más días, Chispa te dibuja la curva.</p>'+
    '<div class="row"><div><label class="lb">Seguidores</label><input class="inp" id="agSegN" type="number" inputmode="numeric" value="'+(u?u.n:"")+'"></div><div><label class="lb">Día</label><input class="inp" id="agSegF" type="date" value="'+diaIso(new Date())+'"></div></div>'+
    '<div class="row"><div><label class="lb" style="margin-top:10px">Publicaciones (opcional)</label><input class="inp" id="agSegP" type="number" inputmode="numeric" value="'+S.cuentas.igf.publicaciones+'"></div></div>'+
    '<button class="btn pp" style="width:100%;margin-top:14px" onclick="agGuardarSeg()">Guardar</button>');
};
window.agGuardarSeg=function(){var n=parseInt($("agSegN").value,10),f=$("agSegF").value,p=parseInt($("agSegP").value,10);if(!n||!f){toast("Pon el número y el día");return;}
  S.seguidores=S.seguidores.filter(function(s){return !(s.red==="igf"&&s.fecha===f);});S.seguidores.push({red:"igf",fecha:f,n:n,fuente:"manual"});
  S.seguidores.sort(function(a,b){return a.fecha<b.fecha?-1:1;});if(p){S.cuentas.igf.publicaciones=p;}S.cuentas.igf.seguidores=S.seguidores.slice(-1)[0].n;
  guardarTodo();cerrarModal();refrescar();toast("Apuntado ✓");};
window.agApuntar=function(id,red){
  datos();var pub=S.agenda.filter(function(a){return a.estado==="publicada";}).sort(function(a,b){return fecha(b.cuando)-fecha(a.cuando);});
  var it=id?buscar(id):null;
  var f=function(k,lb){return '<div><label class="lb" style="margin-top:10px">'+lb+'</label><input class="inp" id="agM_'+k+'" type="number" inputmode="numeric" min="0" placeholder="0"></div>';};
  modal('<h3>✍️ Apuntar resultados</h3><p style="color:var(--tx2);font-size:13px;margin:0 0 8px">En Instagram: abre la publicación › «Ver estadísticas». Copia aquí lo que pone; con eso Chispa aprende qué te funciona.</p>'+
    '<label class="lb">Publicación</label><select id="agMPub"><option value="">Otra (escribe el nombre abajo)</option>'+pub.map(function(a){return '<option value="'+a.id+'"'+(it&&it.id===a.id?" selected":"")+'>'+esc(a.titulo)+' · '+fecha(a.cuando).toLocaleDateString("es-ES",{day:"numeric",month:"short"})+'</option>';}).join("")+'</select>'+
    '<input class="inp" id="agMTit" style="margin-top:6px" placeholder="Nombre de la publicación (si es «Otra»)">'+
    '<div class="row"><div><label class="lb" style="margin-top:10px">Red</label><select id="agMRed">'+Object.keys(REDES).map(function(r){return '<option value="'+r+'"'+((red||(it&&it.redes[0])||"igf")===r?" selected":"")+'>'+REDES[r].nm+'</option>';}).join("")+'</select></div>'+
    '<div><label class="lb" style="margin-top:10px">Formato</label><select id="agMFmt">'+["post","carrusel","reel","historia"].map(function(x){return '<option value="'+x+'"'+(it&&it.formato===x?" selected":"")+'>'+x.charAt(0).toUpperCase()+x.slice(1)+'</option>';}).join("")+'</select></div></div>'+
    '<div class="row">'+f("vistas","Visualizaciones")+f("alcance","Alcance (cuentas)")+'</div><div class="row">'+f("megusta","Me gusta")+f("comentarios","Comentarios")+'</div>'+
    '<div class="row">'+f("guardados","Guardados")+f("compartidos","Compartidos")+'</div><div class="row">'+f("seguidores","Seguidores ganados")+'<div></div></div>'+
    '<button class="btn pp" style="width:100%;margin-top:14px" onclick="agGuardarM()">Guardar resultados</button>');
};
window.agGuardarM=function(){
  var id=$("agMPub").value,it=id?buscar(id):null,g=function(k){return parseInt($("agM_"+k).value,10)||0;};
  var t=it?it.titulo:($("agMTit").value||"").trim();if(!t){toast("Elige o escribe la publicación");return;}
  if(!g("vistas")&&!g("alcance")&&!g("megusta")){toast("Apunta al menos las visualizaciones");return;}
  var m={id:uid(),agId:id||"",titulo:t,red:$("agMRed").value,formato:$("agMFmt").value,fecha:it?it.cuando:iso(new Date()),hora:it?fecha(it.cuando).getHours():new Date().getHours(),
    vistas:g("vistas"),alcance:g("alcance")||g("vistas"),megusta:g("megusta"),comentarios:g("comentarios"),guardados:g("guardados"),compartidos:g("compartidos"),seguidores:g("seguidores"),fuente:"manual"};
  S.metricas.push(m);guardarTodo();cerrarModal();if(typeof TAB!=="undefined"&&TAB!=="stats")window.panel("stats");else refrescar();toast("Resultados apuntados ✓");
};
window.agTraerStats=function(){var b=base();if(!b)return;toast("Leyendo de las redes…");
  fetch(b+"/estadisticas",{headers:cab()}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(j){
    (j.publicaciones||[]).forEach(function(m){S.metricas=S.metricas.filter(function(x){return !(x.fuente!=="manual"&&x.extId&&x.extId===m.extId);});m.id=uid();S.metricas.push(m);});
    (j.cuentas||[]).forEach(function(c){if(c.red==="igf"){S.cuentas.igf.seguidores=c.seguidores;S.cuentas.igf.publicaciones=c.publicaciones||S.cuentas.igf.publicaciones;S.cuentas.igf.fecha=diaIso(new Date());
      S.seguidores=S.seguidores.filter(function(s){return !(s.red==="igf"&&s.fecha===diaIso(new Date()));});S.seguidores.push({red:"igf",fecha:diaIso(new Date()),n:c.seguidores,fuente:"Instagram"});}});
    guardarTodo();refrescar();toast("✓ Estadísticas al día");}).catch(function(e){toast("No se pudieron leer: "+e.message);});};

/* =====================================================================
   ENGANCHES: pestañas, «Programar» del Estudio, chat
   ===================================================================== */
for(var i=0;i<TABS.length;i++){if(TABS[i].id==="calendario")TABS[i].nm="Calendario";}
var panelAntes=window.panel;
window.panel=function(tab){
  if(tab!=="calendario"&&tab!=="stats")return panelAntes.apply(this,arguments);
  TAB=tab;pintarNav();
  if(tab==="calendario"){$("main").innerHTML=vCalendario2();iniciarArrastre();pintarLocales($("main"));
    var o=$("agOrden");if(o)o.onkeydown=function(e){if(e.key==="Enter")agOrden();};}
  else{$("main").innerHTML=vStats2();setTimeout(dibujar2,30);}
};
// «📅 Programar» de cada tarjeta del Estudio: elegir día y hora (Chispa propone la mejor)
window.programarGen=function(i){
  var p=window._posts&&window._posts[i];if(!p)return;datos();
  var it=p._agendaId&&buscar(p._agendaId);
  if(!it){it=delEstudio().filter(function(x){return x.id===p._agendaId;})[0];if(!it)return;S.agenda.push(it);}
  if(!it.cuando){if(p.fecha){it.cuando=p.fecha;it.estado="programada";}else repartirSemana([it]);}
  guardarTodo();sincronizar(it);
  modal('<h3>📅 Programar</h3><p style="margin:0 0 6px"><b>'+esc(it.titulo)+'</b></p><div class="ag-por">⚡ Chispa propone: <b>'+esc(bonito(fecha(it.cuando)))+'</b>'+(it.por?'<br>'+esc(it.por):'')+'</div>'+
    '<label class="lb" style="margin-top:12px">Día y hora</label><input class="inp" id="agCuando" type="datetime-local" value="'+esc(it.cuando)+'">'+
    '<label class="lb" style="margin-top:10px">Dónde</label>'+opcionesRedes(it.redes)+
    '<input type="hidden" id="agEst" value="programada"><textarea id="agTxt" hidden>'+esc(it.txt)+'</textarea><input type="hidden" id="agTit" value="'+esc(it.titulo)+'">'+
    '<div class="ag-mb"><button class="btn pp" onclick="agGuardarProg(\''+it.id+'\')">✓ Programar</button><button class="btn g" onclick="cerrarModal();REFag(\''+it.id+'\')">Ver en el calendario</button></div>');
};
window.agGuardarProg=function(id){var it=buscar(id);var c=$("agCuando").value;if(c){it.cuando=c;}it.estado="programada";var r=leerRedes();if(r.length)it.redes=r;guardarTodo();sincronizar(it);cerrarModal();toast("📅 Programada: "+bonito(fecha(it.cuando)));};
window.REFag=function(id){var it=buscar(id);if(it&&it.cuando)REF=fecha(it.cuando);VISTA=VISTA||vistaPorDefecto();window.panel("calendario");};

// el chat entiende órdenes cuando estás en el panel
var cerebroAntes=window.cerebroChat,ultimaAccion=null;
window.cerebroChat=function(t){var r=null;try{r=orden(t);}catch(e){}if(r){ultimaAccion=r.accion;return r.texto;}ultimaAccion=null;return cerebroAntes(t);};
var pregsAntes=window.pintarPregs;
window.pintarPregs=function(){
  if(!$("app")||!$("app").classList.contains("on"))return pregsAntes();
  var q=$("qs");q.innerHTML="";
  if(ultimaAccion==="semana"||ultimaAccion==="dia"||ultimaAccion==="ver"){var v=document.createElement("button");v.textContent="📅 Ver el calendario";v.style.borderColor="var(--purple)";v.onclick=function(){cerrarChat();window.panel("calendario");};q.appendChild(v);}
  ["Programa la semana","Pon una promo el viernes de 18 a 23 con 4 historias","Publica todo esto el lunes","¿Qué tengo programado?","¿Cuál es la mejor hora?","Publícalo ya"].forEach(function(p){var b=document.createElement("button");b.textContent=p;b.onclick=function(){preguntar(p);};q.appendChild(b);});
};
var abrirAntes=window.abrirChat;
window.abrirChat=function(){
  if($("app")&&$("app").classList.contains("on")&&window.GUION){var g=GUION.inicio;GUION.inicio="¡Hola! Dime qué hago con tus publicaciones. Por ejemplo: «publica todo esto el lunes» o «programa la semana». Las reparto en las mejores horas y te digo por qué.";ultimaAccion=null;abrirAntes();GUION.inicio=g;}
  else abrirAntes();
};
// botón flotante en el panel
(function(){var b=document.createElement("button");b.className="ag-fab";b.id="agFab";b.innerHTML='<span>⚡</span> Pídeselo a Chispa';b.onclick=function(){window.abrirChat();};document.body.appendChild(b);
  var vis=function(){b.style.display=($("app")&&$("app").classList.contains("on"))?"":"none";};vis();
  var va=window.vista;window.vista=function(v){va.apply(this,arguments);vis();};})();

window.CHISPA_AGENDA={planificarSemana:planificarSemana,todoAlCalendario:todoAlCalendario,programarTodoEn:programarTodoEn,orden:orden,marcar:marcar,publicarAhora:publicarAhora,
  redes:REDES,estados:ESTADOS,mejoresHoras:POR,datos:datos,_avisar:avisar,
  // franjas y día entero
  crearPromo:crearPromo,crearBloque:crearBloque,repartir:repartir,choques:choques,proponer:proponer,rango:rango,linea:linea,horasValle:VALLE,promo:function(){window.agPromo();}};
try{if(typeof TAB!=="undefined"&&(TAB==="calendario"||TAB==="stats")&&$("app").classList.contains("on"))window.panel(TAB);}catch(e){}
var hs=location.hash||"";if(/calendario/.test(hs)){vista("panel");window.panel("calendario");}else if(/estadisticas|stats/.test(hs)){vista("panel");window.panel("stats");}
})();
