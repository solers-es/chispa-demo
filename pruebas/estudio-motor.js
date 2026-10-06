const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch();const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto((process.argv[2]||'http://localhost:8765/index.html')+'#panel',{waitUntil:'networkidle'});await pg.waitForTimeout(2500);
// servidor que falla → cae a fotos
await pg.evaluate(()=>{CHISPA_MOTOR.proveedor='servidor';CHISPA_MOTOR.url='http://localhost:1/nada';crearImagenIA(0);});await pg.waitForTimeout(3000);
console.log('servidor caído → ',await pg.evaluate(()=>_posts[0].media&&_posts[0].media.tipo));
// servidor falso que responde bien
await pg.route('**/ia-falsa',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({url:'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600'})}));
await pg.evaluate(()=>{CHISPA_MOTOR.url=location.origin+'/ia-falsa';crearImagenIA(1);});await pg.waitForTimeout(3000);
console.log('servidor bien → ',await pg.evaluate(()=>_posts[1].media&&_posts[1].media.tipo));
// publicador directo falso
let recibido=null;await pg.route('**/publicar-falso',async r=>{recibido=r.request().postData()?.length;await r.fulfill({status:200,headers:{'access-control-allow-origin':'*'},body:'{}'});});
await pg.evaluate(()=>{window.CHISPA_PUBLICADOR={url:location.origin+'/publicar-falso'};publicarGen(0);cmPaso(2);cmEnviar('igf');});await pg.waitForTimeout(4000);
console.log('publicación directa →',await pg.evaluate(()=>document.getElementById('cmSt_igf').textContent),'bytes',recibido);
console.log('errores',errs);await b.close();})();
