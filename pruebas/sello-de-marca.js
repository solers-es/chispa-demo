const {chromium,devices}=require('playwright-core');const fs=require('fs');const OUT=__dirname+'/out3/';
(async()=>{const b=await chromium.launch();
for(const modo of ['escritorio','iphone']){
const ctx=modo==='iphone'?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:1366,height:900}});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/index.html?v='+Date.now()+'#panel',{waitUntil:'networkidle'});await pg.waitForTimeout(3500);
console.log(modo,'sellos',await pg.evaluate(()=>document.querySelectorAll('.cm-scene .sello').length),'li',await pg.evaluate(()=>document.querySelectorAll('.cm-scene .li').length));
await pg.locator('#cmCard_0').screenshot({path:OUT+modo+'-sello-card0.png'});await pg.locator('#cmCard_3').screenshot({path:OUT+modo+'-sello-card3.png'});
if(modo==='escritorio'){const r=await pg.evaluate(async()=>{const out=[];for(const [i,pos] of [[0,'tl'],[2,'tr'],[3,'tl']]){const p=Object.assign({},window._posts[i],{sello:{on:true,pos}});const im=await CHISPA_ESTUDIO.hacerImagen(p);
  out.push(await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(im);}));}return out;});
  r.forEach((d,k)=>fs.writeFileSync(OUT+'sello-exp-'+k+'.jpg',Buffer.from(d,'base64')));
  await pg.evaluate(()=>cmEditar(0));await pg.waitForTimeout(300);await pg.evaluate(()=>{document.getElementById('cmeSePos').value='tr';cmGuardarEdicion(0);});await pg.waitForTimeout(400);
  console.log('tras editar',await pg.evaluate(()=>[JSON.stringify(window._posts[0].sello),document.querySelector('#cmCard_0 .sello').className]));
  await pg.evaluate(()=>cmCliente(0));await pg.waitForTimeout(1500);await pg.screenshot({path:OUT+'sello-cliente.png'});}
console.log(modo,'err',errs);await ctx.close();}
await b.close();})();
