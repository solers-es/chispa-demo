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
    estado:o.estado||(o.cuando?"programada":"borrador"),por:o.por||"",media:o.media||null,mediaLocal:!!o.mediaLocal,ejemplo:!!o.ejemplo,res:o.res||{},motivo:o.motivo||""};
  if(!it.media&&!it.mediaLocal&&E().fotoPara){var v=it.formato==="reel"||it.formato==="historia";var f=E().fotoPara(cat,it.foto,1080,v?1920:1080);it.media={tipo:"foto",url:f.url,cred:f.cred};}
  return it;
}
function buscar(id){var A=S.agenda||[];for(var k=0;k<A.length;k++)if(A[k].id===id)return A[k];return null;}

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
function aPost(it){
  var p=E().nuevoPost?E().nuevoPost({txt:it.txt,tags:it.tags,titulo:it.titulo,kicker:it.kicker,formato:it.formato,cat:it.cat,foto:it.foto,L:it.L,fecha:it.cuando,ang:"📅 "+(it.cuando?bonito(fecha(it.cuando)):"Sin fecha")}):{txt:it.txt,tags:it.tags,titulo:it.titulo};
  if(it.ctas)p.ctas=it.ctas;p.sinTexto=it.sinTexto;p._agendaId=it.id;
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
function ocupadas(excluir){return (S.agenda||[]).filter(function(a){return a.cuando&&a.estado!=="publicada"&&(!excluir||excluir.indexOf(a.id)<0);}).map(function(a){return fecha(a.cuando);});}
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
function resumenLista(L){return L.map(function(it){var d=fecha(it.cuando);return "• "+DIAS[dow(d)]+" "+hora(d)+" — "+it.titulo;}).join("\n");}

function planificarSemana(irAlCalendario){
  datos();
  var L=delEstudio(),borr=S.agenda.filter(function(a){return a.estado==="borrador";});
  var nuevos=L.slice();
  if(!L.length&&!borr.length){nuevos=semanaNueva();}
  repartirSemana(nuevos.concat(borr));
  nuevos.forEach(function(it){S.agenda.push(it);});
  guardarTodo();sincronizarTodas();
  var todo=nuevos.concat(borr).sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
  var texto="Hecho ✓ He programado "+todo.length+" publicaciones en las mejores horas para un restaurante en Palma:\n\n"+resumenLista(todo)+
    "\n\nPor qué: el menú a las 11:30 (la gente decide dónde comer antes de las 12:30), las de la noche y la terraza a las 18:30 (se decide al salir de trabajar), los reels a las 20:30 (sofá y móvil) y la paella el fin de semana a las 11:00. El miércoles no publico promociones porque cerráis.";
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
  var L=delEstudio(),borr=S.agenda.filter(function(a){return a.estado==="borrador";});
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
  it.estado=estado;if(motivo)it.motivo=motivo;
  (redes||[]).forEach(function(r){it.res[r]=estado;});
  if(estado==="publicada"&&!it.cuando)it.cuando=iso(new Date());
  if(estado==="publicada")it.publicadaEn=iso(new Date());
  guardarTodo();if(typeof TAB!=="undefined"&&TAB==="calendario")setTimeout(refrescar,50);
}
function publicarAhora(id){
  var it=buscar(id);if(!it)return;
  var go=function(){if(!E().publicar){toast("No se pudo abrir Publicar");return;}cerrarModal();E().publicar(aPost(it),it.redes.filter(function(r){return r!=="gbp";}));};
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
function orden(texto){
  var t=sinTildes(texto).replace(/[¿?¡!.,]/g," ").replace(/\s+/g," ").trim();
  if(!t)return null;
  var dia=diaDe(t),hh=horaDe(t);
  var verbo=/(publica|programa|planifica|organiza|reparte|pon|ponme|sube|saca|prepara)/.test(t);
  if(/(planifica|programa|organiza|reparte|prepara|llena|rellena).*(semana)|mi semana|la semana/.test(t)&&!dia)return {texto:planificarSemana(false).texto,accion:"semana"};
  if(verbo&&dia)return {texto:programarTodoEn(dia,hh).texto,accion:"dia"};
  if(/(que|cuantas?).*(programad|calendario|agenda|pendiente|toca)|mi calendario|que tengo/.test(t)){
    datos();var fut=S.agenda.filter(function(a){return a.estado==="programada"&&a.cuando&&fecha(a.cuando)>new Date();}).sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
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
  var d=it.cuando?fecha(it.cuando):null,R=REDES[it.redes[0]]||{c:"#888"};
  return '<div class="ag-it '+it.estado+(compacta?" mini":"")+'" data-id="'+esc(it.id)+'" style="--c:'+R.c+'" tabindex="0" role="button" aria-label="'+esc(it.titulo)+'">'+
    (compacta?'':miniatura(it))+'<span class="ag-tx"><span class="ag-h">'+(d?hora(d):"—")+' '+puntos(it)+'</span><span class="ag-t">'+esc(it.titulo)+'</span>'+
    (compacta?'':'<span class="ag-s">'+chipEstado(it.estado)+'</span>')+'</span></div>';
}
function cabecera(){
  var hoy=new Date(),L=lunes(REF),t;
  if(VISTA==="mes")t=MESES[REF.getMonth()].replace(/^./,function(c){return c.toUpperCase();})+" "+REF.getFullYear();
  else if(VISTA==="semana"){var f=sumaDias(L,6);t=L.getDate()+(L.getMonth()!==f.getMonth()?" "+MESES[L.getMonth()].slice(0,3):"")+" – "+f.getDate()+" "+MESES[f.getMonth()].slice(0,3)+" "+f.getFullYear();}
  else t="Próximas publicaciones";
  var avisos=("Notification" in window)?(Notification.permission==="granted"?'<button class="btn g sm" onclick="agProbarAviso()">🔔 Avisos activados</button>':'<button class="btn g sm" onclick="agAvisos()">🔔 Avisarme a la hora</button>'):"";
  return '<div class="hd ag-hd"><h2>📅 Calendario</h2><div class="ag-acc"><button class="btn pp sm" onclick="CHISPA_AGENDA.planificarSemana(true)">⚡ Planificar mi semana</button><button class="btn g sm" onclick="agNueva()">+ Nueva</button>'+avisos+'</div></div>'+
    '<div class="ag-cmd"><span class="ag-cmd-ic">⚡</span><input id="agOrden" placeholder="Dile a Chispa: «publica todo esto el lunes», «programa la semana»…" autocomplete="off" enterkeyhint="send"><button class="btn pp sm" onclick="agOrden()">Hacer</button></div>'+
    '<div class="ag-sug">'+["Programa la semana","Publica todo esto el viernes","¿Qué tengo programado?","¿Cuál es la mejor hora?"].map(function(s){return '<button onclick="agOrden(\''+s.replace(/'/g,"")+'\')">'+s+'</button>';}).join("")+'</div>'+
    '<div id="agResp" class="ag-resp"'+(ULTIMO?'':' hidden')+'>'+(ULTIMO?esc(ULTIMO).replace(/\n/g,"<br>"):'')+'</div>'+
    '<div class="ag-bar"><div class="ag-nav"><button class="btn g sm" onclick="agMover(-1)" aria-label="Anterior">‹</button><button class="btn g sm" onclick="agHoy()">Hoy</button><button class="btn g sm" onclick="agMover(1)" aria-label="Siguiente">›</button><b>'+esc(t)+'</b></div>'+
    '<div class="ag-seg">'+["semana","mes","lista"].map(function(v){return '<button class="'+(VISTA===v?"on":"")+'" onclick="agVista(\''+v+'\')">'+v.charAt(0).toUpperCase()+v.slice(1)+'</button>';}).join("")+'</div></div>'+
    '<div class="ag-ley">'+Object.keys(REDES).map(chipRed).join("")+'<span class="ag-sep"></span>'+Object.keys(ESTADOS).map(chipEstado).join("")+'</div>';
}
function vSemana(){
  var L=lunes(REF),hoy=diaIso(new Date()),A=datos(),H0=8,H1=23;
  var h='<div class="ag-wk-wrap"><div class="ag-wk" style="--filas:'+(H1-H0+1)+'"><div class="ag-c0"></div>';
  for(var d=0;d<7;d++){var dd=sumaDias(L,d);h+='<div class="ag-dh'+(diaIso(dd)===hoy?" hoy":"")+'">'+DC[d]+' <b>'+dd.getDate()+'</b>'+(d===CERRADO?'<small>cerrado</small>':'')+'</div>';}
  var buenas={"11":[0,1,3,4],"18":[3,4],"20":[1,3,6],"9":[5,6]};
  for(var hr=H0;hr<=H1;hr++){
    h+='<div class="ag-hr">'+pad(hr)+':00</div>';
    for(var d2=0;d2<7;d2++){var dia=sumaDias(L,d2),k=diaIso(dia);
      var aqui=A.filter(function(a){if(!a.cuando)return false;var x=fecha(a.cuando);return diaIso(x)===k&&x.getHours()===hr;}).sort(function(a,b){return fecha(a.cuando)-fecha(b.cuando);});
      var top=(buenas[hr]&&buenas[hr].indexOf(d2)>=0);
      h+='<div class="ag-cell'+(top?" top":"")+(d2===CERRADO?" cerr":"")+'" data-dia="'+k+'" data-h="'+hr+'"'+(top?' title="Buena hora para publicar"':'')+'>'+aqui.map(function(a){return tarjetaMini(a,false);}).join("")+'</div>';}
  }
  h+='</div></div><p class="ag-nota">★ Las casillas con brillo son buenas horas para un restaurante en Palma. Arrastra una publicación (en el móvil: mantén pulsado) para cambiarla de día y hora.</p>';
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
  var desde=sumaDias(new Date(),-7);desde.setHours(0,0,0,0);
  var grupos={},orden=[];
  A.forEach(function(a){var k=a.cuando?a.cuando.slice(0,10):"sin";if(a.cuando&&fecha(a.cuando)<desde)return;if(!grupos[k]){grupos[k]=[];orden.push(k);}grupos[k].push(a);});
  if(!orden.length)return '<div class="card empty">No hay publicaciones. Pulsa «Planificar mi semana» y Chispa te la llena.</div>';
  return orden.map(function(k){var tit=k==="sin"?"Sin fecha":(function(){var d=new Date(k+"T12:00");var hoy=diaIso(new Date());return (k===hoy?"Hoy · ":k===diaIso(sumaDias(new Date(),1))?"Mañana · ":"")+DIAS[dow(d)]+" "+d.getDate()+" de "+MESES[d.getMonth()];})();
    return '<div class="ag-lg"><div class="ag-lgh">'+tit+'</div>'+grupos[k].map(function(a){
      var d=a.cuando?fecha(a.cuando):null;
      return '<div class="ag-row '+a.estado+'" data-id="'+esc(a.id)+'">'+miniatura(a)+'<div class="ag-rc" onclick="agAbrir(\''+a.id+'\')"><div class="ag-rt"><b>'+(d?hora(d):"—")+'</b> '+esc(a.titulo)+'</div><div class="ag-rr">'+a.redes.map(chipRed).join("")+chipEstado(a.estado)+(a.ejemplo?'<span class="ag-ej">EJEMPLO</span>':'')+'</div>'+
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
window.agAbrir=function(id){
  var it=buscar(id);if(!it)return;
  var prev='';
  if(E().escena&&it.media&&!it.mediaLocal){var p=aPost(it);prev='<div class="ag-prev" style="aspect-ratio:'+(E().aspecto?E().aspecto(p):"1/1")+'">'+E().escena(p)+'</div>';}
  else prev='<div class="ag-prev">'+miniatura(it)+'</div>';
  modal('<h3>'+esc(it.titulo)+'</h3>'+prev+
    (it.por?'<div class="ag-por">💡 '+esc(it.por)+'</div>':'')+
    (it.estado==="fallo"&&it.motivo?'<div class="warn"><b>Falló:</b> '+esc(it.motivo)+'</div>':'')+
    '<label class="lb" style="margin-top:12px">Texto</label><textarea id="agTxt" style="min-height:96px">'+esc(it.txt)+'</textarea>'+
    '<label class="lb" style="margin-top:10px">Título sobre la imagen</label><input class="inp" id="agTit" value="'+esc(it.titulo)+'">'+
    '<div class="row"><div><label class="lb" style="margin-top:10px">Día y hora</label><input class="inp" id="agCuando" type="datetime-local" value="'+esc(it.cuando)+'"></div>'+
    '<div><label class="lb" style="margin-top:10px">Estado</label><select id="agEst">'+Object.keys(ESTADOS).map(function(e){return '<option value="'+e+'"'+(e===it.estado?" selected":"")+'>'+ESTADOS[e].nm+'</option>';}).join("")+'</select></div></div>'+
    '<label class="lb" style="margin-top:10px">Dónde</label>'+opcionesRedes(it.redes)+
    '<button class="btn g sm" style="margin-top:8px" onclick="agMejorHora(\''+id+'\')">⚡ Ponla en la mejor hora</button>'+
    '<div class="ag-mb"><button class="btn pp" onclick="agGuardar(\''+id+'\')">💾 Guardar</button>'+
      '<button class="btn" onclick="CHISPA_AGENDA.publicarAhora(\''+id+'\')">🚀 Publicar ahora</button>'+
      (it.estado==="publicada"?'<button class="btn g" onclick="agApuntar(\''+id+'\')">✍️ Apuntar resultados</button>':'')+
      '<button class="btn g" onclick="agDuplicar(\''+id+'\')">⧉ Duplicar</button>'+
      '<button class="btn g" onclick="agBorrar(\''+id+'\')">🗑 Borrar</button></div>');
  pintarLocales($("modalBox"));
};
window.agGuardar=function(id){var it=buscar(id);if(!it)return;
  it.txt=$("agTxt").value.trim();it.titulo=$("agTit").value.trim()||it.titulo;var c=$("agCuando").value;
  var est=$("agEst").value;if(c!==it.cuando){it.cuando=c;it.por="";if(est==="borrador"&&c)est="programada";}
  if(!c&&est==="programada")est="borrador";it.estado=est;var r=leerRedes();if(r.length)it.redes=r;
  guardarTodo();sincronizar(it);cerrarModal();refrescar();toast("Guardado ✓");};
window.agMejorHora=function(id){var it=buscar(id);repartirSemana([it]);guardarTodo();sincronizar(it);cerrarModal();refrescar();toast("⚡ "+bonito(fecha(it.cuando)));};
window.agDuplicar=function(id){var it=buscar(id);var c=JSON.parse(JSON.stringify(it));c.id=uid();c.estado="borrador";c.cuando="";c.res={};c.ejemplo=false;c.mediaLocal=false;if(it.mediaLocal)c.media=null;S.agenda.push(item(c));guardarTodo();cerrarModal();refrescar();toast("Duplicada como borrador");};
window.agBorrar=function(id){S.agenda=S.agenda.filter(function(a){return a.id!==id;});guardarTodo();quitarServidor(id);cerrarModal();refrescar();toast("Borrada");};
window.agBorrarEjemplos=function(){S.agenda=S.agenda.filter(function(a){return !a.ejemplo;});S.metricas=(S.metricas||[]).filter(function(m){return m.fuente!=="ejemplo";});S.ocultarEjemplo=true;guardarTodo();refrescar();toast("Ejemplos quitados");};
window.agNueva=function(){
  var d=sumaDias(new Date(),1);d.setHours(11,30,0,0);
  modal('<h3>+ Nueva publicación</h3><label class="lb">¿De qué va?</label><input class="inp" id="agNTit" placeholder="Ej: paella de los domingos, mojitos a 6 €…">'+
    '<label class="lb" style="margin-top:10px">Texto</label><textarea id="agNTxt" placeholder="Si lo dejas vacío, lo escribe Chispa"></textarea>'+
    '<div class="row"><div><label class="lb" style="margin-top:10px">Formato</label><select id="agNFmt"><option value="post">Post</option><option value="carrusel">Carrusel</option><option value="reel">Reel</option><option value="historia">Historia</option></select></div>'+
    '<div><label class="lb" style="margin-top:10px">Día y hora</label><input class="inp" id="agNCuando" type="datetime-local" value="'+iso(d)+'"></div></div>'+
    '<label class="lb" style="margin-top:10px">Dónde</label>'+opcionesRedes(["igf","fb"])+
    '<div class="ag-mb"><button class="btn pp" onclick="agCrear(false)">📅 Programar</button><button class="btn g" onclick="agCrear(true)">⚡ Que Chispa elija la hora</button></div>');
};
window.agCrear=function(auto){
  var t=($("agNTit").value||"").trim();if(!t){toast("Escribe de qué va 🙂");return;}
  var neg=(S.negocio&&S.negocio.nombre)||"";
  var it=item({titulo:E().tituloCorto?E().tituloCorto(t):t,txt:($("agNTxt").value||"").trim()||(t.charAt(0).toUpperCase()+t.slice(1)+" en "+neg+" ✨ Te esperamos."),formato:$("agNFmt").value,redes:leerRedes(),cuando:auto?"":$("agNCuando").value});
  if(!it.redes.length)it.redes=redesPorFormato(it.formato);
  if(auto)repartirSemana([it]);
  S.agenda.push(it);guardarTodo();sincronizar(it);cerrarModal();
  if(it.cuando){REF=fecha(it.cuando);}refrescar();toast("📅 "+(it.cuando?bonito(fecha(it.cuando)):"Guardada"));
};
window.agVerDia=function(k){REF=new Date(k+"T12:00");VISTA="semana";refrescar();};
window.agVista=function(v){VISTA=v;refrescar();};
window.agHoy=function(){REF=new Date();refrescar();};
window.agMover=function(n){if(VISTA==="mes")REF=new Date(REF.getFullYear(),REF.getMonth()+n,1);else REF=sumaDias(REF,7*n);refrescar();};
window.agOrden=function(txt){
  var inp=$("agOrden"),v=(typeof txt==="string"?txt:(inp&&inp.value)||"").trim();if(!v){toast("Escríbele algo a Chispa 🙂");return;}
  var r=orden(v);
  if(!r){ULTIMO="No te he entendido del todo 🙂 Prueba con: «programa la semana», «publica todo esto el lunes», «publica el viernes a las 20:00» o «¿qué tengo programado?».";}
  else ULTIMO=r.texto;
  if(r&&(r.accion==="dia"||r.accion==="semana")){var pr=S.agenda.filter(function(a){return a.estado==="programada"&&a.cuando;}).sort(function(a,b){return fecha(b.cuando)-fecha(a.cuando);});if(r.accion==="dia"&&pr.length)REF=fecha(pr[0].cuando);}
  refrescar();
};
window.agAvisos=function(){
  if(!("Notification" in window)){toast("Este navegador no avisa. En el iPhone: añade Chispa a la pantalla de inicio.");return;}
  Notification.requestPermission().then(function(p){toast(p==="granted"?"🔔 Te avisaré a la hora de cada publicación":"Sin permiso: te avisaré dentro de la página");refrescar();});
};
window.agProbarAviso=function(){avisar({id:"prueba",titulo:"Así te avisará Chispa",txt:"A la hora de cada publicación verás este aviso con todo listo."},true);};

/* ---------- arrastrar (ratón y dedo) ---------- */
var DR=null;
function iniciarArrastre(){
  var raiz=$("main");if(!raiz||raiz._agDrag)return;raiz._agDrag=1;
  raiz.addEventListener("pointerdown",function(e){
    var el=e.target.closest&&e.target.closest(".ag-it");if(!el||e.button>0)return;
    DR={el:el,id:el.getAttribute("data-id"),x:e.clientX,y:e.clientY,activo:false,tactil:e.pointerType!=="mouse",t:null,pid:e.pointerId};
    if(DR.tactil){DR.t=setTimeout(function(){if(DR&&!DR.mov)empezar(e.clientX,e.clientY);},300);}
  });
  document.addEventListener("pointermove",function(e){if(!DR)return;
    var dx=e.clientX-DR.x,dy=e.clientY-DR.y,dist=Math.abs(dx)+Math.abs(dy);
    if(!DR.activo){if(DR.tactil){if(dist>10){DR.mov=1;clearTimeout(DR.t);DR=null;}return;}if(dist>6)empezar(e.clientX,e.clientY);else return;}
    mover(e.clientX,e.clientY);
  });
  document.addEventListener("touchmove",function(e){if(DR&&DR.activo)e.preventDefault();},{passive:false});
  document.addEventListener("pointerup",function(e){if(!DR)return;clearTimeout(DR.t);var d=DR;DR=null;
    if(!d.activo){if(!d.mov)window.agAbrir(d.id);return;}
    soltar(d,e.clientX,e.clientY);});
  document.addEventListener("pointercancel",function(){if(DR&&DR.activo)return;if(DR)clearTimeout(DR.t);DR=null;});
  raiz.addEventListener("keydown",function(e){var el=e.target.closest&&e.target.closest(".ag-it");if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();window.agAbrir(el.getAttribute("data-id"));}});
}
function empezar(x,y){if(!DR)return;DR.activo=true;
  var r=DR.el.getBoundingClientRect(),g=DR.el.cloneNode(true);g.className+=" ag-ghost";g.style.width=r.width+"px";g.style.left=(x-r.width/2)+"px";g.style.top=(y-18)+"px";
  document.body.appendChild(g);DR.g=g;DR.el.classList.add("ag-orig");document.body.classList.add("ag-arrastrando");
  try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}}
function destino(x,y){DR&&DR.g&&(DR.g.style.display="none");var t=document.elementFromPoint(x,y);DR&&DR.g&&(DR.g.style.display="");return t&&t.closest&&t.closest(".ag-cell,.ag-mc,.ag-pool");}
function mover(x,y){if(!DR||!DR.g)return;var w=DR.g.offsetWidth;DR.g.style.left=(x-w/2)+"px";DR.g.style.top=(y-18)+"px";
  var t=destino(x,y);Array.prototype.forEach.call(document.querySelectorAll(".ag-over"),function(c){if(c!==t)c.classList.remove("ag-over");});if(t)t.classList.add("ag-over");
  // desplazar si se acerca al borde
  var wrap=document.querySelector(".ag-wk-wrap");if(wrap){var b=wrap.getBoundingClientRect();if(x>b.right-40)wrap.scrollLeft+=12;else if(x<b.left+40)wrap.scrollLeft-=12;}
  if(y>innerHeight-50)scrollBy(0,14);else if(y<70)scrollBy(0,-14);}
function soltar(d,x,y){
  var t=destino(x,y);if(d.g)d.g.remove();d.el.classList.remove("ag-orig");document.body.classList.remove("ag-arrastrando");
  Array.prototype.forEach.call(document.querySelectorAll(".ag-over"),function(c){c.classList.remove("ag-over");});
  var it=buscar(d.id);if(!it||!t)return;
  if(t.classList.contains("ag-pool")){it.cuando="";it.estado="borrador";}
  else{var k=t.getAttribute("data-dia"),old=it.cuando?fecha(it.cuando):null,nd=new Date(k+"T12:00");
    if(t.hasAttribute("data-h"))nd.setHours(+t.getAttribute("data-h"),old&&old.getHours()===+t.getAttribute("data-h")?old.getMinutes():(old?old.getMinutes():0),0,0);
    else nd.setHours(old?old.getHours():11,old?old.getMinutes():30,0,0);
    it.cuando=iso(nd);it.por="";if(it.estado==="borrador"||it.estado==="fallo")it.estado="programada";
    if(dow(nd)===CERRADO)toast("Ojo: ese día cerráis");}
  guardarTodo();sincronizar(it);refrescar();
  if(it.cuando)toast("📅 "+it.titulo+" → "+bonito(fecha(it.cuando)));
}

/* =====================================================================
   AVISO A LA HORA (sin servidor) y servidor de publicación
   ===================================================================== */
function avisar(it,prueba){
  var b=$("agAviso");if(!b){b=document.createElement("div");b.id="agAviso";b.className="ag-aviso";document.body.appendChild(b);}
  b.innerHTML='<div class="ag-av-ic">⏰</div><div class="ag-av-t"><b>Toca publicar: '+esc(it.titulo)+'</b><span>'+(prueba?esc(it.txt):"Texto, imagen y vídeo listos. Un toque y lo subes.")+'</span></div>'+
    (prueba?'':'<button class="btn pp sm" onclick="document.getElementById(\'agAviso\').classList.remove(\'on\');CHISPA_AGENDA.publicarAhora(\''+it.id+'\')">🚀 Publicar</button>')+'<button class="ag-av-x" onclick="this.parentNode.classList.remove(\'on\')" aria-label="Cerrar">×</button>';
  b.classList.add("on");
  try{if("Notification" in window&&Notification.permission==="granted"){
    var n=new Notification("⏰ Toca publicar: "+it.titulo,{body:(it.txt||"").slice(0,120),icon:"icono-192.png",tag:"chispa-"+it.id});
    n.onclick=function(){window.focus();n.close();if(!prueba)publicarAhora(it.id);};}}catch(e){}
}
function vigilar(){
  if(!S.agenda)return;var PD=window.CHISPA_PUBLICADOR;if(PD&&PD.url)return; // el servidor se encarga
  var ahora=new Date();
  S.agenda.forEach(function(it){if(it.estado!=="programada"||!it.cuando||it.avisado)return;var d=fecha(it.cuando);
    if(d<=ahora&&ahora-d<6*3600*1000){it.avisado=1;guardarTodo();avisar(it);}});
}
setInterval(vigilar,30000);setTimeout(vigilar,4000);

function base(){var PD=window.CHISPA_PUBLICADOR;if(!PD||!PD.url)return "";return (PD.base||PD.url.replace(/\/publicar\/?$/,"")).replace(/\/$/,"");}
function cab(){var PD=window.CHISPA_PUBLICADOR||{};var h={"Content-Type":"application/json"};if(PD.clave)h["X-Chispa-Clave"]=PD.clave;return h;}
/* las redes descargan la foto o el vídeo de una dirección pública: se prepara aquí (con el titular y el logo integrado) y se sube al servidor */
function prepararMedios(it){
  var b=base(),es=E();if(!b||!es.hacerImagen)return Promise.resolve([]);
  var go=function(){var p=aPost(it),vert=(it.formato==="reel"||it.formato==="historia");
    var pr=(p.media&&p.media.tipo==="propia"&&p.media.esVideo&&p.file)?Promise.resolve(p.file):(vert&&es.hacerVideo?es.hacerVideo(p):es.hacerImagen(p));
    return pr.then(function(blob){var fd=new FormData();fd.append("archivo",blob,"chispa-"+it.id+(/video/.test(blob.type)?(/mp4/.test(blob.type)?".mp4":".webm"):".jpg"));
      var h=cab();delete h["Content-Type"];return fetch(b+"/subir",{method:"POST",headers:h,body:fd});}).then(function(r){return r.ok?r.json():{};}).then(function(j){return j.url?[j.url]:[];});};
  return (it.mediaLocal?leerLocal(it.id):Promise.resolve()).then(go).catch(function(){return [];});
}
function sincronizar(it){
  var b=base();if(!b||!it)return;
  if(it.estado!=="programada"||!it.cuando){quitarServidor(it.id);return;}
  prepararMedios(it).then(function(medios){
    if(!medios.length&&!it.mediaLocal){var u=it.media&&(it.media.slides?it.media.slides.map(function(s){return s.url;}):[it.media.url]);medios=(u||[]).map(function(x){return x.replace(/auto=format/,"fm=jpg");});}
    return fetch(b+"/programar",{method:"POST",headers:cab(),body:JSON.stringify({id:it.id,redes:it.redes,texto:it.txt+(it.tags?"\n\n"+it.tags:""),titulo:it.titulo,formato:it.formato,
      cuando:new Date(it.cuando).toISOString(),medios:medios})});})
    .then(function(r){it.sync=r&&r.ok?"ok":"error";guardarTodo();},function(){it.sync="error";guardarTodo();});
}
function sincronizarTodas(){if(!base())return;(S.agenda||[]).forEach(sincronizar);}
function quitarServidor(id){var b=base();if(!b)return;fetch(b+"/programar/"+encodeURIComponent(id),{method:"DELETE",headers:cab()}).catch(function(){});}
function traerEstados(){var b=base();if(!b)return;
  fetch(b+"/agenda",{headers:cab()}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(!j||!j.items)return;
    j.items.forEach(function(s){var it=buscar(s.id);if(!it)return;if(s.estado&&s.estado!==it.estado){it.estado=s.estado;it.res=s.res||it.res;it.motivo=s.motivo||"";}});guardarTodo();}).catch(function(){});}
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
  ["Programa la semana","Publica todo esto el lunes","¿Qué tengo programado?","¿Cuál es la mejor hora?","Publícalo ya"].forEach(function(p){var b=document.createElement("button");b.textContent=p;b.onclick=function(){preguntar(p);};q.appendChild(b);});
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
  redes:REDES,estados:ESTADOS,mejoresHoras:POR,datos:datos,_avisar:avisar};
try{if(typeof TAB!=="undefined"&&(TAB==="calendario"||TAB==="stats")&&$("app").classList.contains("on"))window.panel(TAB);}catch(e){}
var hs=location.hash||"";if(/calendario/.test(hs)){vista("panel");window.panel("calendario");}else if(/estadisticas|stats/.test(hs)){vista("panel");window.panel("stats");}
})();
