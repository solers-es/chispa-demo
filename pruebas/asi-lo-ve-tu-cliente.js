const {chromium,devices}=require('playwright-core');
const OUT=process.env.OUT||'/tmp';
(async()=>{const b=await chromium.launch();
for(const modo of ['escritorio','iphone']){
const ctx=modo==='iphone'?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:1440,height:900}});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto((process.argv[2]||'http://localhost:8765/index.html')+'#panel',{waitUntil:'networkidle'});await pg.waitForTimeout(3500);
await pg.evaluate(()=>cmCliente(0));await pg.waitForTimeout(2500);
await pg.screenshot({path:`${OUT}/${modo}-cliente.png`});
if(modo==='escritorio'){await pg.locator('#cmBox').evaluate(e=>e.scrollTop=0);
  const h=await pg.locator('.cm-clg').evaluate(e=>e.scrollHeight);await pg.setViewportSize({width:1440,height:Math.min(h+400,4000)});await pg.waitForTimeout(1500);await pg.locator('.cm-clg').screenshot({path:`${OUT}/escritorio-cliente-todas.png`});}
else{for(const k of [6,8]){await pg.evaluate(k=>cmCliK(k),k);await pg.waitForTimeout(1500);await pg.screenshot({path:`${OUT}/iphone-cliente-${k}.png`});}}
console.log(modo,'fig',await pg.evaluate(()=>document.querySelectorAll('.cm-clf').length),'ancho',await pg.evaluate(()=>[document.getElementById('cmBox').scrollWidth,document.getElementById('cmBox').clientWidth]),'err',errs);
await ctx.close();}
await b.close();})();
