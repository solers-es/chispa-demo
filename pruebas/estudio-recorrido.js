// Uso: node probar.js <url> <prefijo> [antes]
const {chromium,devices}=require('playwright-core');
const url=process.argv[2],pre=process.argv[3],antes=process.argv[4]==='antes';
const OUT=process.env.OUT||__dirname;
(async()=>{
  const b=await chromium.launch();
  for(const modo of ['escritorio','iphone']){
    const ctx=modo==='iphone'?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:1366,height:900}});
    const pg=await ctx.newPage();const errs=[];
    pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    await pg.goto(url+'#panel',{waitUntil:'networkidle'});
    await pg.waitForTimeout(1500);
    if(antes){
      await pg.evaluate(()=>{for(let i=0;i<4;i++)try{crearImagenIA(i)}catch(e){}});
      await pg.waitForTimeout(800);
      await pg.locator('#resultado').screenshot({path:`${OUT}/${pre}-${modo}.png`});
    }else{
      await pg.waitForTimeout(3500);
      await pg.screenshot({path:`${OUT}/${pre}-${modo}-panel.png`,fullPage:false});
      await pg.locator('#resultado').screenshot({path:`${OUT}/${pre}-${modo}-tarjetas.png`});
      // generar por idea
      await pg.fill('#idea','Cócteles y mojitos en la terraza este viernes');
      await pg.evaluate(()=>generar());
      await pg.waitForTimeout(3500);
      await pg.locator('#resultado').screenshot({path:`${OUT}/${pre}-${modo}-idea-cocteles.png`});
      const cats=await pg.evaluate(()=>window._posts.map(p=>p.cat+'|'+(p.media&&p.media.url||'').slice(36,60)));
      console.log(modo,'cócteles →',cats.join('  '));
      // editar en línea
      const ed=pg.locator('#cmCard_0 .cm-ed[data-k="txt"]');
      await ed.click();await pg.keyboard.press('End');await pg.keyboard.type(' ¡Te esperamos!');await ed.evaluate(e=>e.blur());
      console.log(modo,'texto editado:',(await pg.evaluate(()=>window._posts[0].txt.includes('Te esperamos'))));
      // modal editar
      await pg.evaluate(()=>cmEditar(1));await pg.waitForTimeout(300);
      await pg.fill('#cmeTit','Mojitos a 6 €');await pg.fill('#cmeU0','https://el-paraiso-eight.vercel.app/reservas.html?o=instagram');
      await pg.screenshot({path:`${OUT}/${pre}-${modo}-editar.png`});
      await pg.evaluate(()=>cmGuardarEdicion(1));await pg.waitForTimeout(400);
      // subir foto
      await pg.setInputFiles('#file_2',__dirname+'/foto-prueba.jpg');await pg.waitForTimeout(800);
      console.log(modo,'foto subida:',await pg.evaluate(()=>window._posts[2].media&&window._posts[2].media.url.slice(0,5)));
      await pg.locator('#cmCard_2').screenshot({path:`${OUT}/${pre}-${modo}-foto-subida.png`});
      // publicar
      await pg.evaluate(()=>{publicarGen(0);cmRed('tt');cmTab('igf');});await pg.waitForTimeout(1500);
      await pg.screenshot({path:`${OUT}/${pre}-${modo}-publicar-1.png`});
      for(const t of ['igs','tt','fb']){await pg.evaluate(t=>{cmTab(t)},t);await pg.waitForTimeout(900);await pg.locator('.cm-stage').screenshot({path:`${OUT}/${pre}-${modo}-vista-${t}.png`});}
      await pg.evaluate(()=>cmPaso(2));await pg.waitForTimeout(400);
      await pg.screenshot({path:`${OUT}/${pre}-${modo}-publicar-2.png`});
      await pg.evaluate(()=>cmPaso(3));await pg.waitForTimeout(2600);
      await pg.screenshot({path:`${OUT}/${pre}-${modo}-publicado.png`});
      await pg.evaluate(()=>cmCerrar());
      if(modo==='escritorio'){
        // exportar imagen y vídeo
        const r=await pg.evaluate(async()=>{const p=window._posts[1];const im=await CHISPA_ESTUDIO.hacerImagen(p);const iv=await CHISPA_ESTUDIO.hacerImagen(Object.assign({},window._posts[3],{formato:'historia'}));const q=Object.assign({},p,{formato:'reel'});const v=await CHISPA_ESTUDIO.hacerVideo(q,null,3);
          const toB64=b=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(b);});
          return {imv:await toB64(iv),img:await toB64(im),vid:await toB64(v),vt:v.type,vs:v.size,is:im.size};});
        require('fs').writeFileSync(`${OUT}/${pre}-exportada.jpg`,Buffer.from(r.img,'base64'));require('fs').writeFileSync(`${OUT}/${pre}-exportada-vertical.jpg`,Buffer.from(r.imv,'base64'));
        require('fs').writeFileSync(`${OUT}/${pre}-video.${r.vt.includes('mp4')?'mp4':'webm'}`,Buffer.from(r.vid,'base64'));
        console.log('exportar: imagen',r.is,'bytes · vídeo',r.vt,r.vs,'bytes');
      }
    }
    console.log(modo,'errores:',errs.length?errs:'ninguno');
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
