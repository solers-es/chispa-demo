// Capa que se inyecta en la página para el vídeo: cursor, anillo de clic, rótulos,
// tarjetas de portada y fundidos. Todo cuelga de <html> (no de <body>) para que el
// zoom, que escala <body>, no lo mueva.
window.__V = (function () {
  var css = `
  #v-cur{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;
    transform:translate(720px,430px);transition:transform 0ms;filter:drop-shadow(0 3px 6px rgba(0,0,0,.55))}
  #v-ring{position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;width:56px;height:56px;margin:-28px 0 0 -28px;
    border:3px solid #ffcc33;opacity:0;transform:scale(.3)}
  #v-ring.on{animation:vring .65s ease-out forwards}
  @keyframes vring{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(1.5)}}
  #v-hl{position:fixed;z-index:2147483645;pointer-events:none;border-radius:14px;opacity:0;
    box-shadow:0 0 0 3px #ffcc33,0 0 26px 6px rgba(255,204,51,.45);transition:opacity .35s, left .35s, top .35s, width .35s, height .35s}
  #v-ban{position:fixed;left:26px;top:84px;z-index:2147483640;pointer-events:none;opacity:0;transform:translateY(-14px);
    transition:opacity .5s, transform .5s;background:rgba(15,17,26,.94);border:1px solid rgba(167,139,250,.55);border-radius:18px;
    padding:16px 26px 16px 20px;display:flex;gap:16px;align-items:center;box-shadow:0 18px 50px rgba(0,0,0,.55);
    font-family:-apple-system,"Segoe UI",system-ui,sans-serif;color:#fff;max-width:640px}
  #v-ban.on{opacity:1;transform:none}
  #v-ban .n{min-width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#a78bfa,#ffcc33);color:#1a1200;
    display:grid;place-items:center;font-weight:900;font-size:22px}
  #v-ban b{display:block;font-size:24px;letter-spacing:-.3px}
  #v-ban small{display:block;font-size:14.5px;color:#c9cfdb;margin-top:2px}
  #v-negro{position:fixed;inset:0;background:#07080c;z-index:2147483641;pointer-events:none;opacity:0;transition:opacity .45s}
  #v-card{position:fixed;inset:0;z-index:2147483642;pointer-events:none;opacity:0;transition:opacity .6s;
    background:radial-gradient(1200px 600px at 50% 30%,rgba(139,92,246,.35),transparent 60%),radial-gradient(900px 500px at 70% 90%,rgba(255,204,51,.16),transparent 60%),#0b0d12;
    display:grid;place-items:center;font-family:-apple-system,"Segoe UI",system-ui,sans-serif;color:#fff;text-align:center}
  #v-card.on{opacity:1}
  #v-card .bolt{width:96px;height:96px;border-radius:28px;margin:0 auto 26px;background:linear-gradient(135deg,#a78bfa,#ffcc33);
    display:grid;place-items:center;font-size:56px;color:#1a1200;box-shadow:0 0 60px rgba(255,204,51,.35)}
  #v-card h1{font-size:68px;margin:0;letter-spacing:-1.5px;line-height:1.05}
  #v-card h1 span{background:linear-gradient(135deg,#a78bfa,#ffcc33);-webkit-background-clip:text;background-clip:text;color:transparent}
  #v-card p{font-size:24px;color:#c9cfdb;margin:18px 0 0}
  #v-card .pie{margin-top:42px;font-size:17px;color:#9aa3b5}
  #v-card .url{display:inline-block;margin-top:26px;padding:14px 26px;border-radius:14px;border:1px solid rgba(167,139,250,.6);
    background:rgba(139,92,246,.14);font-size:24px;font-weight:700;color:#fff}
  #v-card .card-in > *{opacity:0;transform:translateY(16px);animation:vin .8s cubic-bezier(.2,.7,.2,1) forwards}
  #v-card .card-in > *:nth-child(2){animation-delay:.15s}#v-card .card-in > *:nth-child(3){animation-delay:.3s}
  #v-card .card-in > *:nth-child(4){animation-delay:.45s}#v-card .card-in > *:nth-child(5){animation-delay:.6s}
  @keyframes vin{to{opacity:1;transform:none}}
  #v-tick{position:fixed;right:0;bottom:0;width:2px;height:2px;z-index:2147483647;pointer-events:none;animation:vtick 1s linear infinite;background:transparent}
  @keyframes vtick{0%{opacity:.01}50%{opacity:.02}100%{opacity:.01}}
  *{scroll-margin-top:86px}
  html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{width:0!important;height:0!important}
  `;
  function el(id, html) {
    var e = document.getElementById(id);
    if (!e) { e = document.createElement('div'); e.id = id; if (html) e.innerHTML = html; document.documentElement.appendChild(e); }
    return e;
  }
  function instalar() {
    if (document.getElementById('v-style')) return;
    var s = document.createElement('style'); s.id = 'v-style'; s.textContent = css; document.documentElement.appendChild(s);
    el('v-negro'); el('v-card'); el('v-ban'); el('v-hl'); el('v-ring'); el('v-tick');
    el('v-cur', '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M5 3 L5 24 L10.5 18.8 L14.2 27 L18 25.3 L14.3 17.3 L21.5 17.3 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>');
  }
  var pos = { x: 720, y: 430 };
  return {
    instalar: instalar,
    mover: function (x, y, ms) {
      var c = document.getElementById('v-cur');
      c.style.transition = 'transform ' + ms + 'ms cubic-bezier(.45,.05,.25,1)';
      c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 3) + 'px)';
      pos = { x: x, y: y };
    },
    pos: function () { return pos; },
    clic: function (x, y) {
      var r = document.getElementById('v-ring');
      r.style.left = x + 'px'; r.style.top = y + 'px';
      r.classList.remove('on'); void r.offsetWidth; r.classList.add('on');
    },
    resaltar: function (x, y, w, h) {
      var e = document.getElementById('v-hl');
      e.style.left = (x - 6) + 'px'; e.style.top = (y - 6) + 'px'; e.style.width = (w + 12) + 'px'; e.style.height = (h + 12) + 'px';
      e.style.opacity = 1;
    },
    apagar: function () { document.getElementById('v-hl').style.opacity = 0; },
    rotulo: function (n, t, s) {
      var b = document.getElementById('v-ban');
      b.innerHTML = '<div class="n">' + n + '</div><div><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>';
      b.classList.add('on');
    },
    quitarRotulo: function () { document.getElementById('v-ban').classList.remove('on'); },
    tarjeta: function (html) { var c = document.getElementById('v-card'); c.innerHTML = '<div class="card-in">' + html + '</div>'; c.classList.add('on'); },
    quitarTarjeta: function () { document.getElementById('v-card').classList.remove('on'); },
    negro: function (on) { document.getElementById('v-negro').style.opacity = on ? 1 : 0; },
    cursorVisible: function (on) { document.getElementById('v-cur').style.opacity = on ? 1 : 0; }
  };
})();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.__V.instalar(); });
else window.__V.instalar();
