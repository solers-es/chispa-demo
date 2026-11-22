// Uso: [CHROMIUM=ruta] node pruebas/calendario-franjas.js [url] — franjas, día entero, promo, choques, arrastrar y estirar (escritorio e iPhone 390 px)
const {chromium,devices}=require('playwright-core');
const URL=process.argv[2]||'file://'+require('path').resolve(__dirname,'../index.html');
const OUT=process.env.OUT||__dirname+'/../capturas/franjas';
require('fs').mkdirSync(OUT,{recursive:true});
const ok=(c,m)=>{console.log((c?'OK  ':'FALLO ')+m);if(!c)process.exitCode=1;};
(async()=>{
  const b=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
  for(const modo of ['escritorio','iphone']){
    const ctx=modo==='iphone'?await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}}):await b.newContext({viewport:{width:1366,height:900}});
    const pg=await ctx.newPage();const errs=[];
    pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push(m.text());});
    pg.on('dialog',d=>d.dismiss());
    await pg.goto(URL+'#calendario',{waitUntil:'load'});await pg.waitForTimeout(1500);
    // 1) migración: dejar datos con el formato viejo (sin modo) y recargar
    await pg.evaluate(()=>{S.agenda.forEach(a=>{delete a.modo;delete a.hasta;delete a.piezas;delete a.reparto;delete a.cada;delete a.promo;});S.agenda=S.agenda.filter(a=>!/^Promo/.test(a.titulo));delete S.agendaV;guardar();});
    const nViejo=await pg.evaluate(()=>S.agenda.length);
    await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);
    const mig=await pg.evaluate(()=>({n:S.agenda.length,v:S.agendaV,horas:S.agenda.filter(a=>a.modo==='hora').length,promo:S.agenda.filter(a=>a.promo).map(a=>CHISPA_AGENDA.linea(a))}));
    ok(mig.v===2&&mig.horas===nViejo&&mig.n===nViejo+1,`${modo}: migración ${nViejo} viejas → ${mig.horas} a hora exacta, + ejemplo promo ${mig.promo}`);
    // 2) órdenes
    const frases=['pon una promo de 2x1 en mojitos el viernes de 18 a 23 con 4 historias','el sábado todo el día','reparte 6 stories entre 20:00 y 00:00','pon una promo el miércoles','Programa la semana'];
    for(const f of frases){const r=await pg.evaluate(f=>{const r=CHISPA_AGENDA.orden(f);return r&&r.texto;},f);console.log('\n» '+f+'\n'+r);}
    const chk=await pg.evaluate(()=>{const A=S.agenda;const p=A.filter(a=>/mojitos/.test(a.titulo)&&a.modo==='franja'&&!a.ejemplo)[0];const s6=A.filter(a=>a.modo==='franja'&&/^Historias/.test(a.titulo)&&a.piezas.length===6)[0];const d=A.filter(a=>a.modo==='dia')[0];
      return {promo:p&&{l:CHISPA_AGENDA.linea(p),n:p.piezas.length,h:p.piezas.map(x=>x.cuando.slice(11)).join(' ')},seis:s6&&{l:CHISPA_AGENDA.linea(s6),h:s6.piezas.map(x=>x.cuando.slice(11)).join(' '),fin:s6.hasta},dia:d&&CHISPA_AGENDA.linea(d),choques:A.filter(a=>a.estado==='programada').map(a=>CHISPA_AGENDA.choques(a).length).reduce((x,y)=>x+y,0)};});
    console.log(JSON.stringify(chk,null,1));
    ok(chk.promo&&chk.promo.n===6&&/18:00–23:00/.test(chk.promo.l),`${modo}: promo viernes 18–23 con 4 historias + post + WhatsApp`);
    ok(chk.seis&&/20:00–00:00/.test(chk.seis.l)&&chk.seis.h.split(' ').length===6,`${modo}: 6 stories 20:00–00:00 (${chk.seis&&chk.seis.h})`);
    ok(!!chk.dia,`${modo}: día entero (${chk.dia})`);
    ok(chk.choques===0,`${modo}: nada se pisa tras las órdenes`);
    // 3) vistas
    await pg.evaluate(()=>{const p=S.agenda.filter(a=>/mojitos/.test(a.titulo)&&!a.ejemplo)[0];agVista('semana');REFag&&0;});
    await pg.evaluate(()=>{const p=S.agenda.filter(a=>/mojitos/.test(a.titulo)&&!a.ejemplo)[0];window.agVerDia(p.cuando.slice(0,10));});
    await pg.waitForTimeout(400);
    const nfr=await pg.locator('.ag-fr').count(),nad=await pg.locator('.ag-ad .ag-it').count();
    ok(nfr>=1,`${modo}: la semana pinta ${nfr} bloques de franja y ${nad} de día entero`);
    await pg.screenshot({path:`${OUT}/${modo}-semana.png`,fullPage:modo!=='iphone'});
    if(modo==='escritorio'){
      // estirar el bloque: arrastrar el asa una hora hacia abajo
      const id=await pg.evaluate(()=>S.agenda.filter(a=>/mojitos/.test(a.titulo)&&!a.ejemplo)[0].id);
      const antes=await pg.evaluate(id=>S.agenda.find(a=>a.id===id).hasta,id);
      const asa=pg.locator(`.ag-fr[data-id="${id}"] .ag-fr-asa`);await asa.scrollIntoViewIfNeeded();
      const bb=await asa.boundingBox();const blk=await pg.locator(`.ag-fr[data-id="${id}"]`).boundingBox();
      const celda=await pg.locator(`.ag-cell[data-h="21"]`).first().boundingBox();
      await pg.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await pg.mouse.down();
      // subir hasta la fila de las 21 de ese mismo día (columna del bloque)
      const k=await pg.evaluate(id=>S.agenda.find(a=>a.id===id).cuando.slice(0,10),id);
      const c21=await pg.locator(`.ag-cell[data-dia="${k}"][data-h="21"]`).boundingBox();
      await pg.mouse.move(c21.x+10,c21.y+c21.height/2,{steps:8});await pg.mouse.up();await pg.waitForTimeout(400);
      const despues=await pg.evaluate(id=>({h:S.agenda.find(a=>a.id===id).hasta,p:S.agenda.find(a=>a.id===id).piezas.map(x=>x.cuando.slice(11)).join(' ')}),id);
      ok(/T22:00/.test(despues.h),`escritorio: estirar el bloque cambia el fin ${antes} → ${despues.h} y reparte: ${despues.p}`);
      if(await pg.locator('#modalOv.on').count())await pg.evaluate(()=>cerrarModal());
      // mover el bloque a otro día/hora
      const blk2=pg.locator(`.ag-fr[data-id="${id}"] .ag-fr-h`);const b2=await blk2.boundingBox();
      const dSig=await pg.evaluate(k=>{const d=new Date(k+'T12:00');d.setDate(d.getDate()+1);const p=n=>(n<10?'0':'')+n;return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());},k);
      const dest=await pg.locator(`.ag-cell[data-dia="${dSig}"][data-h="19"]`).boundingBox();
      await pg.mouse.move(b2.x+20,b2.y+8);await pg.mouse.down();await pg.mouse.move(b2.x+40,b2.y+30,{steps:3});await pg.mouse.move(dest.x+20,dest.y+dest.height/2,{steps:10});await pg.mouse.up();await pg.waitForTimeout(400);
      console.log('destino',JSON.stringify(dest),'origen',JSON.stringify(b2),'vista',await pg.evaluate(()=>[innerHeight,scrollY]));
      const mov=await pg.evaluate(id=>CHISPA_AGENDA.linea(S.agenda.find(a=>a.id===id)),id);
      ok(/19:00/.test(mov),`escritorio: arrastrar el bloque lo mueve → ${mov}`);
      await pg.screenshot({path:`${OUT}/${modo}-tras-mover.png`});
      if(await pg.locator('#modalOv.on').count()){await pg.screenshot({path:`${OUT}/${modo}-choque.png`});await pg.evaluate(()=>agChoque('mover'));}
    }
    // 4) formulario Nueva con franja y choque
    await pg.evaluate(()=>agNueva('franja'));await pg.waitForTimeout(200);
    const k2=await pg.evaluate(()=>S.agenda.filter(a=>/mojitos/.test(a.titulo)&&!a.ejemplo)[0].cuando.slice(0,10));
    const f2=await pg.evaluate(()=>{const p=S.agenda.filter(a=>/mojitos/.test(a.titulo)&&!a.ejemplo)[0];return [p.cuando.slice(0,10),p.cuando.slice(11)];});
    await pg.fill('#agNTit','Noche de salsa');await pg.fill('#agFDia',f2[0]);await pg.fill('#agFDesde',f2[1]);await pg.fill('#agFHasta','23:30');
    await pg.evaluate(()=>agFRef());await pg.fill('#agFN','5');await pg.evaluate(()=>agFRef('n'));await pg.waitForTimeout(200);
    const choqueVis=await pg.locator('.ag-choque').count();ok(choqueVis===1,`${modo}: el formulario avisa del choque`);
    await pg.screenshot({path:`${OUT}/${modo}-form-choque.png`,fullPage:false});
    await pg.evaluate(()=>agFCuadrar());await pg.waitForTimeout(200);
    ok(await pg.locator('.ag-ok').count()===1,`${modo}: «Que Chispa lo cuadre» lo deja cuadrado`);
    await pg.evaluate(()=>agFRep('cada'));await pg.fill('#agFCada','30');await pg.evaluate(()=>agFRef());
    const cada=await pg.evaluate(()=>[...document.querySelectorAll('#agFPzs input[type=time]')].map(i=>i.value).join(' '));console.log('cada 30 min:',cada);
    await pg.screenshot({path:`${OUT}/${modo}-form-franja.png`,fullPage:false});
    await pg.evaluate(()=>agCrear(false));await pg.waitForTimeout(300);
    ok(await pg.evaluate(()=>S.agenda.some(a=>a.titulo==='Noche de salsa'&&a.modo==='franja'&&a.piezas.length===5)),`${modo}: crear franja desde el formulario`);
    // 5) plantilla promo
    await pg.evaluate(()=>agPromo());await pg.waitForTimeout(200);await pg.fill('#agPTxt','tapa gratis con la caña');await pg.evaluate(()=>agPRef());await pg.waitForTimeout(150);
    await pg.screenshot({path:`${OUT}/${modo}-promo.png`,fullPage:false});
    const miOff=await pg.evaluate(()=>[...document.querySelectorAll('#agPDia option')].filter(o=>o.disabled).map(o=>o.textContent));ok(miOff.length>=1&&/cerrado/.test(miOff[0]),`${modo}: miércoles bloqueado en la promo (${miOff.join(', ')})`);
    await pg.evaluate(()=>agPCrear());await pg.waitForTimeout(300);if(await pg.locator('#modalOv.on').count()){await pg.evaluate(()=>agFCuadrar&&agFCuadrar());await pg.evaluate(()=>agPCrear());}
    ok(await pg.evaluate(()=>S.agenda.some(a=>/tapa gratis/.test(a.titulo))),`${modo}: promo creada desde la plantilla`);
    // 6) lista y editar
    await pg.evaluate(()=>agVista('lista'));await pg.waitForTimeout(300);
    await pg.screenshot({path:`${OUT}/${modo}-lista.png`,fullPage:modo!=='iphone'});
    const id3=await pg.evaluate(()=>S.agenda.find(a=>/tapa gratis/.test(a.titulo)).id);
    await pg.evaluate(id=>agAbrir(id),id3);await pg.waitForTimeout(300);
    await pg.screenshot({path:`${OUT}/${modo}-editar.png`,fullPage:false});
    await pg.evaluate(()=>agFModo('dia'));await pg.evaluate(id=>agGuardar(id),id3);await pg.waitForTimeout(200);
    if(await pg.locator('#modalOv.on').count())await pg.evaluate(id=>agGuardar(id),id3);
    ok(await pg.evaluate(id=>S.agenda.find(a=>a.id===id).modo==='dia',id3),`${modo}: editar → pasar a día entero`);
    // 7) aviso a la hora de una pieza y persistencia tras recargar
    const n1=await pg.evaluate(()=>S.agenda.length);await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1200);
    ok(await pg.evaluate(()=>S.agenda.length)===n1,`${modo}: todo sigue tras recargar (${n1})`);
    const ancho=await pg.evaluate(()=>document.documentElement.scrollWidth);ok(ancho<=(modo==='iphone'?390:1366),`${modo}: sin desbordar a lo ancho (${ancho}px)`);
    await pg.evaluate(()=>agVista('mes'));await pg.waitForTimeout(300);await pg.screenshot({path:`${OUT}/${modo}-mes.png`,fullPage:false});
    console.log(modo,'errores:',errs.length?errs:'ninguno');if(errs.length)process.exitCode=1;
    await ctx.close();
  }
  await b.close();
})();
