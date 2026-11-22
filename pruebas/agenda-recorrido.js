// Uso: OUT=dir node agenda.js <url>
const {chromium,devices}=require('playwright-core');
const url=process.argv[2]||'http://localhost:8765/index.html',OUT=process.env.OUT||__dirname;
(async()=>{
  const b=await chromium.launch();
  for(const modo of ['escritorio','iphone']){
    const ctx=modo==='iphone'?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:1366,height:900}});
    const pg=await ctx.newPage();const errs=[];
    pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    const log=(...a)=>console.log(modo,...a);
    await pg.goto(url+'#panel',{waitUntil:'networkidle'});await pg.waitForTimeout(3000);
    // logo en tarjetas
    log('logo en avatar:',await pg.evaluate(()=>document.querySelectorAll('.cm-post .av img.cm-lg').length),'marca de agua:',await pg.evaluate(()=>document.querySelectorAll('.cm-scene .wm').length));
    log('enlaces CTA:',await pg.evaluate(()=>window._posts[0].ctas.map(c=>c.t).join('|')));
    await pg.locator('#resultado').screenshot({path:`${OUT}/${modo}-asistente-logo.png`});
    // CTA Reservar abre WhatsApp
    const [pop]=await Promise.all([pg.waitForEvent('popup',{timeout:5000}).catch(()=>null),pg.evaluate(()=>cmCta(0,0))]);
    log('Reservar abre:',pop?pop.url().slice(0,60):'nada');if(pop)await pop.close();
    // demo
    await pg.evaluate(()=>cmDemo(0));await pg.waitForTimeout(4200);
    await pg.screenshot({path:`${OUT}/${modo}-demo-1-redes.png`});
    await pg.waitForTimeout(6500);await pg.screenshot({path:`${OUT}/${modo}-demo-2-enviar.png`});
    await pg.waitForTimeout(3500);await pg.screenshot({path:`${OUT}/${modo}-demo-3-publicado.png`});
    await pg.waitForTimeout(9200);await pg.screenshot({path:`${OUT}/${modo}-demo-4-google.png`});
    await pg.evaluate(()=>cmCerrar());
    // marca
    await pg.evaluate(()=>cmMarca());await pg.waitForTimeout(300);await pg.screenshot({path:`${OUT}/${modo}-logo-ajustes.png`});await pg.evaluate(()=>cerrarModal());
    // exportar con marca de agua
    if(modo==='escritorio'){const r=await pg.evaluate(async()=>{const im=await CHISPA_ESTUDIO.hacerImagen(window._posts[2]);return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(im);});});
      require('fs').writeFileSync(`${OUT}/exportada-con-logo.jpg`,Buffer.from(r,'base64'));}
    // calendario
    await pg.evaluate(()=>panel('calendario'));await pg.waitForTimeout(800);
    await pg.screenshot({path:`${OUT}/${modo}-calendario.png`,fullPage:modo==='escritorio'});
    log('vista:',await pg.evaluate(()=>document.querySelector('.ag-seg .on').textContent),'items:',await pg.evaluate(()=>document.querySelectorAll('.ag-it,.ag-row').length));
    // orden
    await pg.fill('#agOrden','Chispa, publica todo esto el lunes');await pg.press('#agOrden','Enter');await pg.waitForTimeout(600);
    log('orden lunes →',(await pg.evaluate(()=>document.getElementById('agResp').innerText)).split('\n')[0]);
    await pg.evaluate(()=>agOrden('programa la semana'));await pg.waitForTimeout(500);
    log('programa la semana →',(await pg.evaluate(()=>document.getElementById('agResp').innerText)).split('\n')[0]);
    await pg.evaluate(()=>agVista('semana'));await pg.waitForTimeout(500);
    await pg.screenshot({path:`${OUT}/${modo}-semana.png`,fullPage:true});
    // arrastrar
    const it=pg.locator('.ag-cell .ag-it').first();const id=await it.getAttribute('data-id');
    const antes=await pg.evaluate(id=>CHISPA_AGENDA.datos().find(a=>a.id===id).cuando,id);
    await it.scrollIntoViewIfNeeded();const hh=+(await it.evaluate(e=>e.closest('.ag-cell').getAttribute('data-h')));const dd=await it.evaluate(e=>e.closest('.ag-cell').getAttribute('data-dia'));
    const dsig=await pg.evaluate(d=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()+1);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');},dd);
    const destino=pg.locator('.ag-cell[data-dia="'+dsig+'"][data-h="'+(hh+1)+'"]');
    const bi=await it.boundingBox(),bd=await destino.boundingBox();
    if(modo==='escritorio'){await pg.mouse.move(bi.x+10,bi.y+10);await pg.mouse.down();await pg.mouse.move(bi.x+40,bi.y+30,{steps:5});await pg.mouse.move(bd.x+20,bd.y+15,{steps:12});await pg.mouse.up();}
    else{ // dedo: mantener pulsado y arrastrar (eventos pointer de tipo touch)
      await pg.evaluate(({x,y,x2,y2})=>{const el=document.elementFromPoint(x,y);const ev=(t,X,Y,tg)=>tg.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:X,clientY:Y,pointerType:'touch',pointerId:7,isPrimary:true}));
        ev('pointerdown',x,y,el);return new Promise(r=>setTimeout(()=>{ev('pointermove',x+5,y+5,document);for(let k=1;k<=10;k++)ev('pointermove',x+(x2-x)*k/10,y+(y2-y)*k/10,document);ev('pointerup',x2,y2,document);r();},380));},
        {x:bi.x+10,y:bi.y+10,x2:bd.x+20,y2:bd.y+15});}
    await pg.waitForTimeout(500);
    log('arrastrar:',antes,'→',await pg.evaluate(id=>CHISPA_AGENDA.datos().find(a=>a.id===id).cuando,id));
    await pg.evaluate(()=>agVista('mes'));await pg.waitForTimeout(400);await pg.screenshot({path:`${OUT}/${modo}-mes.png`});
    await pg.evaluate(()=>agVista('lista'));await pg.waitForTimeout(400);await pg.screenshot({path:`${OUT}/${modo}-lista.png`});
    // detalle y publicar desde calendario
    const pid=await pg.evaluate(()=>CHISPA_AGENDA.datos().find(a=>a.estado==='programada').id);
    await pg.evaluate(id=>agAbrir(id),pid);await pg.waitForTimeout(400);await pg.screenshot({path:`${OUT}/${modo}-detalle.png`});
    await pg.evaluate(id=>CHISPA_AGENDA.publicarAhora(id),pid);await pg.waitForTimeout(1200);
    log('publicar desde calendario abre:',await pg.evaluate(()=>document.getElementById('cmOv')&&document.getElementById('cmOv').classList.contains('on')));
    await pg.evaluate(()=>cmCerrar());
    // aviso a la hora
    await pg.evaluate(()=>{const a=CHISPA_AGENDA.datos().find(x=>x.estado==='programada');const d=new Date(Date.now()-60000);a.cuando=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');a.avisado=0;});
    await pg.waitForTimeout(31000);
    log('aviso a la hora:',await pg.evaluate(()=>{const a=document.getElementById('agAviso');return a&&a.classList.contains('on')&&a.innerText.split('\n')[0];}));
    await pg.screenshot({path:`${OUT}/${modo}-aviso.png`,timeout:8000}).catch(()=>console.log('captura aviso omitida'));
    // chat
    await pg.evaluate(()=>{abrirChat();});await pg.waitForTimeout(1000);
    await pg.fill('#chatTxt','Chispa, publica todo esto el viernes');await pg.press('#chatTxt','Enter');await pg.waitForTimeout(1300);
    log('chat:',(await pg.evaluate(()=>[...document.querySelectorAll('.bub.ia')].pop().innerText)).split('\n')[0]);
    await pg.screenshot({path:`${OUT}/${modo}-chat.png`});await pg.evaluate(()=>cerrarChat());
    // estadísticas
    await pg.evaluate(()=>panel('stats'));await pg.waitForTimeout(1500);
    await pg.screenshot({path:`${OUT}/${modo}-estadisticas.png`,fullPage:true});
    await pg.evaluate(()=>agApuntar());await pg.waitForTimeout(300);
    await pg.fill('#agMTit','Paella del domingo');await pg.fill('#agM_vistas','1840');await pg.fill('#agM_alcance','1320');await pg.fill('#agM_megusta','96');
    await pg.evaluate(()=>agGuardarM());await pg.waitForTimeout(800);
    log('apuntado a mano:',await pg.evaluate(()=>S.metricas.filter(m=>m.fuente==='manual').length));
    await pg.evaluate(()=>agSeguidores());await pg.fill('#agSegN','1215');await pg.evaluate(()=>agGuardarSeg());await pg.waitForTimeout(800);
    log('seguidores:',await pg.evaluate(()=>S.seguidores.map(s=>s.fecha+':'+s.n).join(',')));
    log('ancho página:',await pg.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]));
    log('errores:',errs.length?errs:'ninguno');
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
