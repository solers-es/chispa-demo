/* =====================================================================
   Chispa · respuestas sugeridas y etiquetas automáticas (código COMPARTIDO)
   ---------------------------------------------------------------------
   Lo usan:
     · el servidor (conectores/bandeja.js y automatizaciones.js), para
       dejar cada comentario, mensaje o reseña con su respuesta propuesta;
     · la web (chispa-bandeja.js lo carga como módulo), en modo
       demostración, para que los ejemplos se comporten igual.
   Sin IA y sin red: plantillas por intención (reserva, horario, precio,
   queja, elogio…) y por idioma (es, en, de, fr). Determinista: el mismo
   mensaje da la misma respuesta, y «variante» da otra versión.
   ===================================================================== */

export const ETIQUETAS = {
  reserva: { nm: "Reserva", ic: "📅" },
  pregunta: { nm: "Pregunta", ic: "❓" },
  horario: { nm: "Horario", ic: "🕒" },
  precio: { nm: "Precio", ic: "💶" },
  pedido: { nm: "Pedido", ic: "🛍️" },
  queja: { nm: "Queja", ic: "⚠️" },
  elogio: { nm: "Elogio", ic: "💜" },
  urgente: { nm: "Urgente", ic: "🔥" },
  spam: { nm: "Spam", ic: "🚫" },
};

export function normalizar(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
const tiene = (t, lista) => lista.some((p) => (p instanceof RegExp ? p.test(t) : t.includes(p)));

/* Idioma aproximado (palabras frecuentes). Lo que no se reconoce, en español. */
export function idiomaDe(texto) {
  const t = " " + normalizar(texto).replace(/[^a-z\s]/g, " ") + " ";
  const cuenta = (ps) => ps.reduce((n, p) => n + (t.includes(" " + p + " ") ? 1 : 0), 0);
  const p = {
    en: cuenta(["the", "and", "you", "is", "was", "we", "great", "food", "thanks", "thank", "very", "good", "do", "are", "open", "table", "book", "nice", "amazing", "what", "time"]),
    de: cuenta(["und", "der", "die", "das", "ist", "war", "sehr", "gut", "essen", "wir", "ich", "danke", "lecker", "habt", "offen", "tisch", "nicht"]),
    fr: cuenta(["le", "la", "les", "et", "est", "tres", "bon", "merci", "nous", "je", "vous", "etait", "une", "pour", "table", "ouvert"]),
    es: cuenta(["el", "la", "los", "y", "es", "muy", "bueno", "gracias", "que", "para", "una", "mesa", "abris", "esta", "de", "con", "por"]),
  };
  let mejor = "es", n = p.es;
  for (const k of ["en", "de", "fr"]) if (p[k] > n) { mejor = k; n = p[k]; }
  return mejor;
}

/* Etiquetas automáticas a partir del texto y la nota (si es reseña) */
export function etiquetar({ texto = "", nota = null, tipo = "" } = {}) {
  const t = normalizar(texto), out = [];
  if (tiene(t, ["reserv", "mesa para", "book", "table for", "tisch", "reservation", "hay sitio", "teneis sitio", "personas el", "pax"])) out.push("reserva");
  if (tiene(t, ["horario", "a que hora", "abris", "abren", "abierto", "cerrais", "cierran", "open", "opening", "offnungszeit", "geoffnet", "ouvert"])) out.push("horario");
  if (tiene(t, ["precio", "cuanto cuesta", "cuanto vale", "price", "how much", "preis", "kostet", "prix", "€", "euros"])) out.push("precio");
  if (tiene(t, ["pedido", "para llevar", "domicilio", "delivery", "takeaway", "encargar", "encargo", "glovo", "uber eats"])) out.push("pedido");
  if (tiene(t, ["?", "¿", "quisiera saber", "me gustaria saber", "puedo", "se puede", "teneis", "tienen", "hay "])) out.push("pregunta");
  const malo = tiene(t, ["mal ", "malo", "mala", "fatal", "horrible", "asco", "sucio", "frio", "tarde", "esperando", "nunca mas", "decepcion", "caro", "terrible", "awful", "bad", "rude", "dirty", "cold", "schlecht", "unfreundlich", "nul", "decu", "lento", "maleducad", "borde"]);
  if ((nota != null && nota <= 2) || (malo && (nota == null || nota <= 3))) out.push("queja");
  const bueno = tiene(t, ["buenisim", "riquisim", "espectacular", "increible", "gracias", "genial", "encant", "perfect", "excelente", "recomend", "delicious", "amazing", "great", "lecker", "super", "toll", "excellent", "😍", "❤", "🔥", "👏"]);
  if ((nota != null && nota >= 4) || (bueno && !out.includes("queja"))) out.push("elogio");
  if (tiene(t, ["urgente", "hoy mismo", "ahora mismo", "ya mismo", "asap", "urgent"]) || (out.includes("queja") && tipo === "mensaje")) out.push("urgente");
  if (tiene(t, [/https?:\/\/(?!.*(instagram|facebook|google|tiktok|youtube))/, "seguidores gratis", "free followers", "gana dinero", "crypto", "bitcoin", "dm for promo", "promo for", "collab?", "sigueme", "follow me", "check my"])) out.push("spam");
  return [...new Set(out)];
}

const TXT = {
  es: {
    hola: (n) => (n ? "¡Hola, " + n + "!" : "¡Hola!"),
    gracias: ["Muchísimas gracias por tus palabras 💜", "¡Qué alegría leerte! Gracias de corazón 😊", "Gracias por venir y por contarlo 🙌"],
    volver: (neg) => ["¡Te esperamos pronto en " + neg + "!", "Aquí tienes tu casa cuando quieras volver.", "Nos vemos en la próxima 😉"],
    reserva: (url, tel) => "Para reservar mesa, lo más rápido es aquí: " + (url || "nuestro teléfono") + (tel && url ? " (o llámanos al " + tel + ")" : "") + ". Si nos dices día, hora y cuántos sois, te lo dejamos listo.",
    horario: (h) => (h ? "Nuestro horario: " + h + "." : "Te paso el horario por aquí enseguida.") + " ¿Te reservamos mesa?",
    precio: "Te lo contamos encantados: ¿qué te interesa exactamente? Así te damos el precio justo.",
    pedido: "¡Claro! Dinos qué te apetece y para cuándo, y te confirmamos el pedido.",
    pregunta: "¡Gracias por escribirnos! Ahora mismo te respondemos con todo el detalle.",
    queja: (neg) => ["Sentimos mucho que tu experiencia no fuera la que esperabas. Nos importa de verdad: escríbenos por privado y lo hablamos para arreglarlo.", "Lamentamos lo ocurrido y gracias por decírnoslo con claridad. Lo hemos hablado con el equipo; nos encantaría tener otra oportunidad de hacerlo bien en " + neg + "."],
    neutra: "Gracias por tu mensaje, lo hemos leído con atención.",
  },
  en: {
    hola: (n) => (n ? "Hi " + n + "!" : "Hi!"),
    gracias: ["Thank you so much for your kind words 💜", "So happy to read this, thank you! 😊", "Thanks for coming and for sharing it 🙌"],
    volver: (neg) => ["Hope to see you again soon at " + neg + "!", "You're always welcome back.", "See you next time 😉"],
    reserva: (url, tel) => "The quickest way to book a table is here: " + (url || "our phone") + (tel && url ? " (or call us on " + tel + ")" : "") + ". Tell us the day, time and how many of you, and we'll get it ready.",
    horario: (h) => (h ? "Our opening hours: " + h + "." : "We'll send you our opening hours right away.") + " Shall we book you a table?",
    precio: "Happy to help: what exactly are you interested in? That way we can give you the right price.",
    pedido: "Of course! Tell us what you'd like and when, and we'll confirm your order.",
    pregunta: "Thanks for your message! We'll get back to you with all the details right away.",
    queja: (neg) => ["We're really sorry your experience wasn't what you expected. It truly matters to us: please send us a private message so we can make it right.", "We're sorry about what happened and thank you for telling us. We've talked it through with the team and would love another chance at " + neg + "."],
    neutra: "Thanks for your message, we've read it carefully.",
  },
  de: {
    hola: (n) => (n ? "Hallo " + n + "!" : "Hallo!"),
    gracias: ["Vielen Dank für deine lieben Worte 💜", "Wie schön, das zu lesen – danke! 😊", "Danke für deinen Besuch und dein Feedback 🙌"],
    volver: (neg) => ["Wir freuen uns, dich bald wieder im " + neg + " zu sehen!", "Du bist jederzeit herzlich willkommen.", "Bis zum nächsten Mal 😉"],
    reserva: (url, tel) => "Am schnellsten reservierst du hier: " + (url || "per Telefon") + (tel && url ? " (oder ruf uns an: " + tel + ")" : "") + ". Sag uns Tag, Uhrzeit und Personenzahl.",
    horario: (h) => (h ? "Unsere Öffnungszeiten: " + h + "." : "Wir schicken dir gleich unsere Öffnungszeiten.") + " Sollen wir einen Tisch reservieren?",
    precio: "Gerne! Was genau interessiert dich? Dann nennen wir dir den richtigen Preis.",
    pedido: "Klar! Sag uns, was du möchtest und wann, und wir bestätigen die Bestellung.",
    pregunta: "Danke für deine Nachricht! Wir antworten dir gleich ausführlich.",
    queja: (neg) => ["Es tut uns sehr leid, dass dein Besuch nicht deinen Erwartungen entsprach. Schreib uns bitte privat, damit wir es wiedergutmachen können.", "Danke für dein ehrliches Feedback. Wir haben es mit dem Team besprochen und würden uns über eine zweite Chance im " + neg + " freuen."],
    neutra: "Danke für deine Nachricht, wir haben sie aufmerksam gelesen.",
  },
  fr: {
    hola: (n) => (n ? "Bonjour " + n + " !" : "Bonjour !"),
    gracias: ["Merci beaucoup pour vos mots 💜", "Quel plaisir de vous lire, merci ! 😊", "Merci pour votre visite et votre avis 🙌"],
    volver: (neg) => ["À très bientôt chez " + neg + " !", "Vous êtes toujours les bienvenus.", "À la prochaine 😉"],
    reserva: (url, tel) => "Pour réserver, le plus simple est ici : " + (url || "par téléphone") + (tel && url ? " (ou appelez-nous au " + tel + ")" : "") + ". Indiquez-nous le jour, l'heure et le nombre de personnes.",
    horario: (h) => (h ? "Nos horaires : " + h + "." : "Nous vous envoyons nos horaires tout de suite.") + " On vous réserve une table ?",
    precio: "Avec plaisir : qu'est-ce qui vous intéresse exactement ? Nous vous donnerons le bon prix.",
    pedido: "Bien sûr ! Dites-nous ce que vous souhaitez et pour quand, et nous confirmons la commande.",
    pregunta: "Merci pour votre message ! Nous vous répondons tout de suite avec tous les détails.",
    queja: (neg) => ["Nous sommes vraiment désolés que votre expérience n'ait pas été à la hauteur. Écrivez-nous en privé pour que nous puissions arranger cela.", "Merci de nous l'avoir dit. Nous en avons parlé avec l'équipe et aimerions avoir une autre chance chez " + neg + "."],
    neutra: "Merci pour votre message, nous l'avons lu avec attention.",
  },
};

function elegir(lista, n) { return lista[((n % lista.length) + lista.length) % lista.length]; }
function primerNombre(a) { const s = String(a || "").trim().replace(/^@/, ""); if (!s || /^(usuario|user|anonymous|anónimo|un usuario)/i.test(s)) return ""; return s.split(/\s+/)[0].slice(0, 20); }
function semilla(t) { let h = 7; for (const c of String(t || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

/* item: {tipo: comentario|mensaje|resena, red, texto, nota, autor, etiquetas?}
   negocio: {nombre, reservas, telefono, horario}
   variante: 0, 1, 2… para «otra versión» */
export function sugerir(item = {}, negocio = {}, variante = 0) {
  const lc = idiomaDe(item.texto), T = TXT[lc] || TXT.es;
  const et = item.etiquetas && item.etiquetas.length ? item.etiquetas : etiquetar(item);
  const neg = negocio.nombre || "nuestro local";
  const n = semilla(item.texto) + variante;
  const hola = T.hola(primerNombre(item.autor));
  if (et.includes("spam")) return "";
  const partes = [hola];
  if (et.includes("queja")) {
    partes.push(elegir(T.queja(neg), n));
    if (negocio.telefono && variante % 2 === 0) partes.push(lc === "es" ? "También puedes llamarnos al " + negocio.telefono + "." : negocio.telefono);
    return partes.join(" ");
  }
  if (et.includes("reserva")) partes.push(T.reserva(negocio.reservas, negocio.telefono));
  else if (et.includes("horario")) partes.push(T.horario(negocio.horario));
  else if (et.includes("pedido")) partes.push(T.pedido);
  else if (et.includes("precio")) partes.push(T.precio);
  else if (et.includes("elogio")) partes.push(elegir(T.gracias, n));
  else if (et.includes("pregunta")) partes.push(T.pregunta);
  else if (item.tipo === "resena" && item.nota === 3) partes.push(lc === "es" ? "Gracias por tu reseña. Nos quedamos con lo bueno y tomamos nota de lo que podemos mejorar." : T.neutra);
  else partes.push(item.tipo === "resena" ? elegir(T.gracias, n) : T.neutra);
  if (et.includes("elogio") || item.tipo === "resena") partes.push(elegir(T.volver(neg), n + 1));
  return partes.join(" ").replace(/\s+/g, " ").trim();
}
