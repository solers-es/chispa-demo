// Uso: [CHROMIUM=ruta] node pruebas/calendario-franjas-barra.js [url]
// Caso del 07/10/2026 (Chrome de Stalin, ~1400 px): con datos guardados de antes, «Dile a Chispa» creaba la franja
// pero la vista saltaba a la semana de la publicación más lejana y la franja no se veía. Comprueba, desde la barra
// y con estado previo, que tras pulsar «Hacer» el bloque está en la semana visible y la fila en la lista.
const {chromium}=require('playwright-core');
const URL=process.argv[2]||'file://'+require('path').resolve(__dirname,'../index.html');
const ok=(c,m)=>{console.log((c?'OK  ':'FALLO ')+m);if(!c)process.exitCode=1;};
(async()=>{
  const b=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
  const ctx=await b.newContext({viewport:{width:1400,height:900}});const pg=await ctx.newPage();const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.dismiss());
  await pg.goto(URL+'#calendario',{waitUntil:'load'});await pg.waitForTimeout(1500);
  // estado previo: formato viejo (sin modo ni versión) y publicaciones programadas semanas por delante
  await pg.evaluate(()=>{const p=n=>(n<10?'0':'')+n,f=d=>d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T13:00';
    S.agenda.forEach(a=>{delete a.modo;delete a.piezas;delete a.hasta;});S.agenda=S.agenda.filter(a=>!a.promo);delete S.agendaV;
    for(const n of [9,16,23]){const d=new Date();d.setDate(d.getDate()+n);S.agenda.push({id:'viejo'+n,titulo:'Publicación vieja +'+n,txt:'x',formato:'post',redes:['igf'],cuando:f(d),estado:'programada',res:{}});}
    guardar();});
  await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);
  for(const frase of ['pon una promo el viernes de 18 a 23 con 4 historias','Promo el sábado todo el día','Reparte 6 stories entre 20:00 y 00:00']){
    await pg.evaluate(()=>agVista('semana'));
    await pg.fill('#agOrden',frase);await pg.click('.ag-cmd button');await pg.waitForTimeout(500);
    const it=await pg.evaluate(()=>{const A=S.agenda.filter(a=>a.modo&&a.modo!=='hora');const x=A[A.length-1];return x&&{id:x.id,l:CHISPA_AGENDA.linea(x),modo:x.modo};});
    const sel=it.modo==='dia'?`.ag-ad .ag-it[data-id="${it.id}"]`:`.ag-fr[data-id="${it.id}"]`;
    ok(await pg.locator(sel).count()===1,`semana: «${frase}» → se ve ${it.l} (${await pg.locator('.ag-nav b').innerText()})`);
    await pg.evaluate(()=>agVista('lista'));await pg.waitForTimeout(200);
    ok(await pg.locator(`.ag-row[data-id="${it.id}"]`).count()===1,`lista: aparece ${it.l}`);
  }
  await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>S.agenda.filter(a=>a.modo&&a.modo!=='hora'&&!a.ejemplo).length)===3,'las tres siguen tras recargar');
  ok(!errs.length,'sin errores en la página '+(errs.join(' | ')));
  await b.close();
})();
