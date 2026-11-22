/* Copiado tal cual de solers-es/fama (fama/motor.js, versión 982c6a9) para
   reutilizar su lógica de respuestas a reseñas en Chispa. Solo la lógica:
   ningún dato de clientes de FAMA. Si se mejora allí, volver a copiarlo. */
/* ──────────────────────────────────────────────────────────────────────────
   FAMA · el motor de respuestas sin IA

   Sirve a la vez en el navegador (window.FamaMotor) y en el servidor
   (require('../fama/motor.js') desde api/fama.js). Así la demo funciona
   aunque no haya clave de IA, y cuando la haya, esto queda de red: si la IA
   falla o se niega, se contesta con esto y el dueño no se queda sin nada.

   Por qué plantillas y no una sola frase: una respuesta que se ve copiada
   ("¡Gracias por su reseña!" veinte veces) le dice a quien lee Google que
   nadie la ha leído. Por eso se mira qué menciona la reseña (comida,
   servicio, espera, terraza…) y se contesta a ESO, en su idioma.
   ────────────────────────────────────────────────────────────────────────── */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.FamaMotor = fabrica();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── Idioma ────────────────────────────────────────────────────────────
     Palma recibe sobre todo reseñas en español, inglés, alemán, francés e
     italiano. Se cuentan palabras muy frecuentes de cada uno; gana el que
     más aciertos tenga. Si no hay forma de saberlo, español. */
  const PALABRAS = {
    es: ['el','la','los','las','que','muy','con','para','pero','por','una','del','es','y','mas','más','todo','buen','bueno','buena','comida','camarero','precio','volveremos','gracias','rico','sitio','lugar','nos','atención'],
    en: ['the','and','was','very','with','for','but','great','good','food','staff','service','we','our','nice','friendly','place','will','definitely','amazing','drinks','they','were','this'],
    de: ['und','der','die','das','sehr','mit','nicht','wir','war','ist','ein','eine','essen','gut','lecker','freundlich','bedienung','preis','wieder','auch','für','zu','gerne','super'],
    fr: ['le','la','les','et','très','avec','pour','mais','nous','était','est','une','un','bon','bonne','service','accueil','prix','sympa','repas','merci','reviendrons','serveur','des','du'],
    it: ['il','la','e','molto','con','per','ma','noi','era','è','una','buono','buona','servizio','cibo','prezzo','gentile','personale','torneremo','ottimo','locale','grazie','del','della']
  };
  function detectarIdioma(texto) {
    const t = ' ' + String(texto || '').toLowerCase().replace(/[^a-záéíóúüñàèìòùâêîôûçäöß' ]/gi, ' ') + ' ';
    let mejor = 'es', max = 0;
    for (const id in PALABRAS) {
      let n = 0;
      for (const p of PALABRAS[id]) if (t.indexOf(' ' + p + ' ') >= 0) n++;
      if (n > max) { max = n; mejor = id; }
    }
    return mejor;
  }

  /* ── De qué habla la reseña ────────────────────────────────────────── */
  const TEMAS = {
    comida:   ['comida','tapa','tapas','plato','cocina','rico','sabroso','hamburguesa','food','dish','tasty','delicious','burger','essen','lecker','speisen','gericht','repas','plat','cuisine','délicieux','cibo','piatto','cucina','buonissimo'],
    bebida:   ['cóctel','coctel','cócteles','cocteles','mojito','cerveza','caña','cañas','copa','copas','vino','bebida','cocktail','cocktails','drinks','drink','beer','wine','bier','getränke','wein','boissons','bière','vin','birra','vino'],
    servicio: ['camarero','camarera','servicio','atención','personal','trato','amable','simpático','simpática','staff','service','waiter','waitress','friendly','bedienung','personal','freundlich','kellner','serveur','serveuse','accueil','personnel','servizio','cameriere','cameriera','gentile','personale'],
    espera:   ['espera','esperar','lento','lenta','tardaron','tardó','tarde','slow','wait','waited','waiting','ages','langsam','warten','gewartet','lange','attente','attendre','lent','attesa','aspettato','lento'],
    precio:   ['precio','precios','caro','cara','barato','económico','price','prices','expensive','cheap','value','preis','preise','teuer','günstig','prix','cher','chère','prezzo','prezzi','caro','economico'],
    ambiente: ['ambiente','terraza','música','musica','local','sitio','vistas','atmosphere','terrace','music','vibe','atmosphäre','terrasse','musik','stimmung','ambiance','atmosfera','terrazza'],
    billar:   ['billar','pool','billiard','billiards','billard','biliardo'],
    limpieza: ['sucio','sucia','limpieza','limpio','baño','baños','dirty','clean','toilet','toilets','bathroom','schmutzig','sauber','toilette','sale','propre','toilettes','sporco','pulito','bagno']
  };
  function temasDe(texto) {
    const t = ' ' + String(texto || '').toLowerCase().replace(/[.,;:!?¡¿()"\n]/g, ' ') + ' ';
    const fuera = [];
    for (const k in TEMAS) if (TEMAS[k].some(p => t.indexOf(' ' + p + ' ') >= 0)) fuera.push(k);
    return fuera;
  }

  const banda = e => (e >= 5 ? 'alta' : e === 4 ? 'buena' : e === 3 ? 'media' : 'baja');

  /* ── Los textos ────────────────────────────────────────────────────────
     {n} = nombre de quien escribe · {l} = nombre del local.
     Cada hueco tiene varias versiones: «Otra versión» va rotando. */
  const T = {
    es: {
      hola: { cercano: ['¡Hola, {n}!', '¡Muchas gracias, {n}!', '{n}, ¡qué alegría leerte!'], formal: ['Estimado/a {n}:', 'Hola, {n}:', 'Buenos días, {n}:'] },
      holaSin: { cercano: ['¡Hola!', '¡Muchas gracias!'], formal: ['Buenos días:', 'Hola:'] },
      abre: {
        alta:  { cercano: ['Nos has alegrado el día con estas cinco estrellas.', 'Gracias de corazón por tu reseña, así da gusto.', 'Leer cosas así es lo que nos hace seguir con más ganas.'],
                 formal:  ['Le agradecemos sinceramente su valoración de cinco estrellas.', 'Muchas gracias por dedicarnos su tiempo y por su excelente valoración.'] },
        buena: { cercano: ['Muchas gracias por tu visita y por las cuatro estrellas.', 'Gracias por pasarte y por contarnos qué tal.'],
                 formal:  ['Le agradecemos su visita y su buena valoración.', 'Muchas gracias por su reseña y por su confianza.'] },
        media: { cercano: ['Gracias por venir y por contarnos tu experiencia con sinceridad.', 'Gracias por tu reseña: nos sirve para mejorar.'],
                 formal:  ['Le agradecemos su visita y sus comentarios.', 'Gracias por compartir su experiencia con nosotros.'] },
        baja:  { cercano: ['Sentimos de verdad que tu visita no fuera como esperabas.', 'Lamentamos mucho lo que cuentas; no es lo que queremos para nadie.'],
                 formal:  ['Lamentamos sinceramente que su experiencia no estuviera a la altura.', 'Sentimos mucho lo ocurrido y le pedimos disculpas.'] }
      },
      bien: {
        comida: ['Nos alegra mucho que te gustara la comida', 'Que disfrutaras de la comida es lo mejor que nos podías decir'],
        bebida: ['Nos encanta que te gustaran las bebidas', 'Se lo diremos a la barra: los cócteles son su orgullo'],
        servicio: ['Se lo diremos al equipo, que se lo merece', 'Tu comentario sobre el equipo se lo pasamos hoy mismo'],
        ambiente: ['Nos alegra que estuvieras a gusto en el local', 'La terraza y el ambiente son nuestra casa, y nos alegra que se note'],
        billar: ['¡Y que disfrutaras del billar!', 'El billar siempre os espera para la revancha'],
        precio: ['Intentamos que venir sea un buen plan también para el bolsillo', 'Nos alegra que la relación calidad-precio te pareciera buena']
      },
      mal: {
        espera: ['Tienes razón con la espera: estamos reforzando el equipo en las horas de más gente', 'La espera que cuentas no es aceptable y ya estamos organizándonos mejor'],
        servicio: ['Lo que cuentas del trato lo hemos hablado con el equipo', 'No es el trato que queremos dar y ya lo hemos hablado con el equipo'],
        comida: ['Lo que comentas de la comida se lo hemos trasladado a cocina', 'Cocina ya tiene tu comentario para revisarlo'],
        precio: ['Tomamos nota de lo que dices sobre los precios', 'Revisamos los precios con frecuencia y tu comentario nos ayuda'],
        limpieza: ['Lo de la limpieza no debió pasar: ya hemos reforzado los repasos', 'Hemos revisado la limpieza para que no se repita'],
        bebida: ['Lo que cuentas de las bebidas lo revisamos con la barra', 'Tomamos nota de lo de las bebidas'],
        ambiente: ['Tomamos nota de lo que comentas sobre el ambiente', 'Tu comentario sobre el local nos ayuda a mejorarlo']
      },
      cierra: {
        alta:  { cercano: ['¡Te esperamos pronto en {l}!', '¡Hasta la próxima, aquí tienes tu casa!'], formal: ['Será un placer recibirle de nuevo en {l}.', 'Esperamos verle pronto de nuevo.'] },
        buena: { cercano: ['Queremos ganarnos la quinta estrella en tu próxima visita. ¡Te esperamos!', '¡Vuelve cuando quieras!'], formal: ['Esperamos ganarnos la quinta estrella en su próxima visita.', 'Será un placer atenderle de nuevo.'] },
        media: { cercano: ['Nos encantaría que nos dieras otra oportunidad.', 'Ojalá la próxima vez salgas encantado/a.'], formal: ['Nos gustaría tener la oportunidad de mejorar su experiencia.', 'Esperamos poder atenderle mejor en su próxima visita.'] },
        baja:  { cercano: ['Si nos escribes o preguntas por el encargado la próxima vez, te atendemos personalmente.', 'Nos gustaría compensártelo: pregunta por el encargado cuando vuelvas.'], formal: ['Si lo desea, puede contactar con nosotros directamente y lo atenderemos personalmente.', 'Le rogamos que nos contacte para poder solucionarlo en persona.'] }
      },
      firma: { cercano: 'El equipo de {l}', formal: 'La dirección de {l}' },
      y: ' y '
    },
    en: {
      hola: { cercano: ['Hi {n}!', 'Thanks so much, {n}!'], formal: ['Dear {n},', 'Hello {n},'] },
      holaSin: { cercano: ['Hi there!', 'Thanks so much!'], formal: ['Hello,', 'Dear guest,'] },
      abre: {
        alta:  { cercano: ['Five stars made our day!', 'Thank you so much for this lovely review.'], formal: ['Thank you very much for your five-star review.', 'We sincerely appreciate your kind words.'] },
        buena: { cercano: ['Thanks for coming by and for the four stars.', 'Thanks for visiting and for telling us how it went.'], formal: ['Thank you for your visit and your positive review.', 'We appreciate your review and your visit.'] },
        media: { cercano: ['Thanks for your visit and for your honest feedback.', 'Thanks for the review, it really helps us improve.'], formal: ['Thank you for your visit and your comments.', 'We appreciate you sharing your experience.'] },
        baja:  { cercano: ['We are really sorry your visit was not what you expected.', 'We are very sorry to read this; it is not what we want for anyone.'], formal: ['We sincerely regret that your experience fell short.', 'We are very sorry about your experience and apologise.'] }
      },
      bien: {
        comida: ['We are delighted you enjoyed the food', 'So happy the food hit the spot'],
        bebida: ['Glad you liked the drinks', 'We will tell the bar team, the cocktails are their pride'],
        servicio: ['We will pass your kind words on to the team', 'The team will be very happy to hear this'],
        ambiente: ['We are glad you felt at home with us', 'Happy you enjoyed the terrace and the atmosphere'],
        billar: ['And glad you enjoyed the pool table!', 'The pool table is ready for a rematch'],
        precio: ['We try hard to keep it good value', 'Glad you found it good value for money']
      },
      mal: {
        espera: ['You are right about the wait: we are adding staff at the busiest times', 'That wait is not acceptable and we are reorganising'],
        servicio: ['We have discussed what you describe with the team', 'That is not the service we want to give, and we have talked it through with the team'],
        comida: ['We have passed your comments on to the kitchen', 'The kitchen already has your feedback'],
        precio: ['We have noted your comment about prices', 'We review our prices regularly and your feedback helps'],
        limpieza: ['That should not have happened: we have stepped up cleaning checks', 'We have reviewed our cleaning so it does not happen again'],
        bebida: ['We are reviewing the drinks with the bar team', 'Noted about the drinks'],
        ambiente: ['We have noted your comments about the venue', 'Your feedback about the venue helps us improve']
      },
      cierra: {
        alta:  { cercano: ['Hope to see you again soon at {l}!', 'See you next time!'], formal: ['We look forward to welcoming you back to {l}.', 'We hope to see you again soon.'] },
        buena: { cercano: ['We will try to earn that fifth star next time!', 'Come back any time!'], formal: ['We hope to earn the fifth star on your next visit.', 'It will be a pleasure to welcome you again.'] },
        media: { cercano: ['We would love another chance.', 'Hope you leave delighted next time.'], formal: ['We would welcome the chance to improve your experience.', 'We hope to serve you better next time.'] },
        baja:  { cercano: ['Please ask for the manager next time and we will look after you personally.', 'We would like to make it up to you: just ask for the manager.'], formal: ['Please feel free to contact us directly so we can address this personally.', 'We would appreciate the chance to put this right in person.'] }
      },
      firma: { cercano: 'The {l} team', formal: 'The management of {l}' },
      y: ' and '
    },
    de: {
      hola: { cercano: ['Hallo {n}!', 'Vielen Dank, {n}!'], formal: ['Liebe/r {n},', 'Guten Tag {n},'] },
      holaSin: { cercano: ['Hallo!', 'Vielen Dank!'], formal: ['Guten Tag,', 'Liebe Gäste,'] },
      abre: {
        alta:  { cercano: ['Fünf Sterne – Sie haben uns den Tag versüßt!', 'Herzlichen Dank für diese tolle Bewertung.'], formal: ['Vielen Dank für Ihre Fünf-Sterne-Bewertung.', 'Wir bedanken uns herzlich für Ihre freundlichen Worte.'] },
        buena: { cercano: ['Danke für Ihren Besuch und die vier Sterne.', 'Schön, dass Sie da waren – danke für die Bewertung.'], formal: ['Vielen Dank für Ihren Besuch und Ihre positive Bewertung.', 'Wir danken Ihnen für Ihre Bewertung.'] },
        media: { cercano: ['Danke für Ihren Besuch und Ihr ehrliches Feedback.', 'Danke für die Bewertung, sie hilft uns, besser zu werden.'], formal: ['Vielen Dank für Ihren Besuch und Ihre Anmerkungen.', 'Danke, dass Sie Ihre Erfahrung mit uns teilen.'] },
        baja:  { cercano: ['Es tut uns wirklich leid, dass Ihr Besuch nicht wie erwartet war.', 'Das zu lesen tut uns sehr leid.'], formal: ['Wir bedauern aufrichtig, dass Ihr Besuch nicht Ihren Erwartungen entsprach.', 'Wir entschuldigen uns für Ihre Erfahrung.'] }
      },
      bien: {
        comida: ['Es freut uns sehr, dass Ihnen das Essen geschmeckt hat', 'Schön, dass es Ihnen geschmeckt hat'],
        bebida: ['Schön, dass Ihnen die Getränke gefallen haben', 'Wir sagen es der Bar – die Cocktails sind ihr Stolz'],
        servicio: ['Wir geben Ihr Lob an das Team weiter', 'Das Team wird sich sehr darüber freuen'],
        ambiente: ['Schön, dass Sie sich bei uns wohlgefühlt haben', 'Wir freuen uns, dass Ihnen Terrasse und Atmosphäre gefallen haben'],
        billar: ['Und schön, dass der Billardtisch Spaß gemacht hat!', 'Der Billardtisch wartet auf die Revanche'],
        precio: ['Wir achten auf ein gutes Preis-Leistungs-Verhältnis', 'Schön, dass Sie das Preis-Leistungs-Verhältnis gut fanden']
      },
      mal: {
        espera: ['Sie haben recht mit der Wartezeit: Zu Stoßzeiten verstärken wir das Team', 'Diese Wartezeit ist nicht in Ordnung, wir organisieren uns besser'],
        servicio: ['Wir haben Ihre Schilderung mit dem Team besprochen', 'So wollen wir nicht bedienen, und wir haben das im Team besprochen'],
        comida: ['Ihre Anmerkungen zum Essen haben wir an die Küche weitergegeben', 'Die Küche hat Ihr Feedback bereits'],
        precio: ['Ihren Hinweis zu den Preisen nehmen wir auf', 'Wir überprüfen unsere Preise regelmäßig'],
        limpieza: ['Das hätte nicht passieren dürfen: Wir haben die Reinigung verstärkt', 'Wir haben die Sauberkeit überprüft'],
        bebida: ['Wir prüfen das mit der Bar', 'Danke für den Hinweis zu den Getränken'],
        ambiente: ['Ihren Hinweis zum Lokal nehmen wir auf', 'Ihr Feedback hilft uns, besser zu werden']
      },
      cierra: {
        alta:  { cercano: ['Bis bald im {l}!', 'Wir freuen uns auf Ihren nächsten Besuch!'], formal: ['Wir freuen uns, Sie bald wieder im {l} begrüßen zu dürfen.', 'Wir hoffen, Sie bald wiederzusehen.'] },
        buena: { cercano: ['Beim nächsten Mal holen wir uns den fünften Stern!', 'Kommen Sie gerne wieder!'], formal: ['Wir hoffen, uns beim nächsten Besuch den fünften Stern zu verdienen.', 'Wir freuen uns auf Ihren nächsten Besuch.'] },
        media: { cercano: ['Geben Sie uns gerne noch eine Chance.', 'Beim nächsten Mal machen wir es besser.'], formal: ['Wir würden uns über eine weitere Gelegenheit freuen.', 'Wir hoffen, Sie beim nächsten Mal besser zu bedienen.'] },
        baja:  { cercano: ['Fragen Sie beim nächsten Mal nach dem Chef, wir kümmern uns persönlich.', 'Wir möchten das wiedergutmachen – fragen Sie einfach nach dem Chef.'], formal: ['Bitte kontaktieren Sie uns direkt, damit wir uns persönlich darum kümmern können.', 'Wir würden das gerne persönlich klären.'] }
      },
      firma: { cercano: 'Ihr {l}-Team', formal: 'Die Leitung des {l}' },
      y: ' und '
    },
    fr: {
      hola: { cercano: ['Bonjour {n} !', 'Merci beaucoup, {n} !'], formal: ['Cher/Chère {n},', 'Bonjour {n},'] },
      holaSin: { cercano: ['Bonjour !', 'Merci beaucoup !'], formal: ['Bonjour,', 'Cher client,'] },
      abre: {
        alta:  { cercano: ['Cinq étoiles, vous avez illuminé notre journée !', 'Merci beaucoup pour ce très bel avis.'], formal: ['Nous vous remercions sincèrement pour votre avis cinq étoiles.', 'Merci pour vos aimables mots.'] },
        buena: { cercano: ['Merci pour votre visite et pour les quatre étoiles.', 'Merci d\'être passé(e) et de nous avoir donné votre avis.'], formal: ['Nous vous remercions pour votre visite et votre avis positif.', 'Merci pour votre avis et votre confiance.'] },
        media: { cercano: ['Merci pour votre visite et votre avis sincère.', 'Merci pour votre avis, il nous aide à progresser.'], formal: ['Nous vous remercions pour votre visite et vos remarques.', 'Merci d\'avoir partagé votre expérience.'] },
        baja:  { cercano: ['Nous sommes vraiment désolés que votre visite n\'ait pas été à la hauteur.', 'Nous regrettons beaucoup ce que vous décrivez.'], formal: ['Nous regrettons sincèrement que votre expérience n\'ait pas été satisfaisante.', 'Nous vous présentons nos excuses.'] }
      },
      bien: {
        comida: ['Ravis que la cuisine vous ait plu', 'Nous sommes heureux que vous ayez bien mangé'],
        bebida: ['Ravis que les boissons vous aient plu', 'Nous le dirons au bar, les cocktails sont leur fierté'],
        servicio: ['Nous transmettrons vos compliments à l\'équipe', 'L\'équipe sera ravie de lire cela'],
        ambiente: ['Heureux que vous vous soyez senti(e) bien chez nous', 'Ravis que la terrasse et l\'ambiance vous aient plu'],
        billar: ['Et ravis que le billard vous ait amusé !', 'Le billard vous attend pour la revanche'],
        precio: ['Nous tenons à garder un bon rapport qualité-prix', 'Heureux que le rapport qualité-prix vous ait convenu']
      },
      mal: {
        espera: ['Vous avez raison pour l\'attente : nous renforçons l\'équipe aux heures de pointe', 'Cette attente n\'est pas acceptable et nous nous réorganisons'],
        servicio: ['Nous avons parlé de votre retour avec l\'équipe', 'Ce n\'est pas le service que nous voulons offrir, et nous en avons parlé en équipe'],
        comida: ['Nous avons transmis vos remarques à la cuisine', 'La cuisine a bien reçu votre retour'],
        precio: ['Nous prenons note de votre remarque sur les prix', 'Nous révisons régulièrement nos prix'],
        limpieza: ['Cela n\'aurait pas dû arriver : nous avons renforcé le nettoyage', 'Nous avons revu le nettoyage'],
        bebida: ['Nous revoyons cela avec le bar', 'Merci pour votre remarque sur les boissons'],
        ambiente: ['Nous prenons note de vos remarques sur le lieu', 'Votre retour nous aide à nous améliorer']
      },
      cierra: {
        alta:  { cercano: ['À très bientôt chez {l} !', 'Au plaisir de vous revoir !'], formal: ['Ce sera un plaisir de vous accueillir à nouveau chez {l}.', 'Nous espérons vous revoir bientôt.'] },
        buena: { cercano: ['Nous tenterons de gagner la cinquième étoile la prochaine fois !', 'Revenez quand vous voulez !'], formal: ['Nous espérons mériter la cinquième étoile lors de votre prochaine visite.', 'Au plaisir de vous accueillir à nouveau.'] },
        media: { cercano: ['Nous aimerions avoir une autre chance.', 'La prochaine fois, nous ferons mieux.'], formal: ['Nous serions heureux de pouvoir améliorer votre expérience.', 'Nous espérons mieux vous servir la prochaine fois.'] },
        baja:  { cercano: ['Demandez le responsable la prochaine fois, nous nous occuperons de vous personnellement.', 'Nous aimerions nous rattraper : demandez simplement le responsable.'], formal: ['N\'hésitez pas à nous contacter directement pour que nous puissions régler cela personnellement.', 'Nous souhaiterions pouvoir arranger cela en personne.'] }
      },
      firma: { cercano: 'L\'équipe de {l}', formal: 'La direction de {l}' },
      y: ' et '
    },
    it: {
      hola: { cercano: ['Ciao {n}!', 'Grazie mille, {n}!'], formal: ['Gentile {n},', 'Buongiorno {n},'] },
      holaSin: { cercano: ['Ciao!', 'Grazie mille!'], formal: ['Buongiorno,', 'Gentile cliente,'] },
      abre: {
        alta:  { cercano: ['Cinque stelle, ci hai fatto la giornata!', 'Grazie di cuore per questa bellissima recensione.'], formal: ['La ringraziamo sinceramente per la sua recensione a cinque stelle.', 'Grazie per le sue gentili parole.'] },
        buena: { cercano: ['Grazie per la visita e per le quattro stelle.', 'Grazie di essere passato/a e di averci raccontato com\'è andata.'], formal: ['La ringraziamo per la visita e per la sua recensione positiva.', 'Grazie per la sua recensione e per la fiducia.'] },
        media: { cercano: ['Grazie per la visita e per il commento sincero.', 'Grazie per la recensione, ci aiuta a migliorare.'], formal: ['La ringraziamo per la visita e per i suoi commenti.', 'Grazie per aver condiviso la sua esperienza.'] },
        baja:  { cercano: ['Ci dispiace davvero che la visita non sia andata come speravi.', 'Ci dispiace molto leggere questo.'], formal: ['Siamo sinceramente dispiaciuti che la sua esperienza non sia stata all\'altezza.', 'Le porgiamo le nostre scuse.'] }
      },
      bien: {
        comida: ['Siamo felici che il cibo ti sia piaciuto', 'Che bello che tu abbia mangiato bene'],
        bebida: ['Felici che i drink ti siano piaciuti', 'Lo diremo al bar, i cocktail sono il loro orgoglio'],
        servicio: ['Riferiremo i tuoi complimenti al team', 'Il team sarà felicissimo di leggerlo'],
        ambiente: ['Siamo felici che ti sia trovato/a bene da noi', 'Felici che terrazza e atmosfera ti siano piaciute'],
        billar: ['E felici che il biliardo ti sia piaciuto!', 'Il biliardo ti aspetta per la rivincita'],
        precio: ['Ci teniamo a un buon rapporto qualità-prezzo', 'Felici che il rapporto qualità-prezzo ti sia sembrato buono']
      },
      mal: {
        espera: ['Hai ragione sull\'attesa: stiamo rinforzando il personale nelle ore di punta', 'Quell\'attesa non va bene e ci stiamo organizzando meglio'],
        servicio: ['Abbiamo parlato con il team di quanto racconti', 'Non è il servizio che vogliamo offrire e ne abbiamo parlato con il team'],
        comida: ['Abbiamo girato i tuoi commenti alla cucina', 'La cucina ha già il tuo commento'],
        precio: ['Prendiamo nota del tuo commento sui prezzi', 'Rivediamo spesso i prezzi'],
        limpieza: ['Non doveva succedere: abbiamo rafforzato le pulizie', 'Abbiamo rivisto le pulizie'],
        bebida: ['Lo rivediamo con il bar', 'Grazie per il commento sui drink'],
        ambiente: ['Prendiamo nota dei tuoi commenti sul locale', 'Il tuo commento ci aiuta a migliorare']
      },
      cierra: {
        alta:  { cercano: ['Ti aspettiamo presto da {l}!', 'Alla prossima!'], formal: ['Sarà un piacere accoglierla di nuovo da {l}.', 'Speriamo di rivederla presto.'] },
        buena: { cercano: ['La prossima volta ci guadagniamo la quinta stella!', 'Torna quando vuoi!'], formal: ['Speriamo di meritare la quinta stella alla prossima visita.', 'Sarà un piacere servirla di nuovo.'] },
        media: { cercano: ['Ci piacerebbe avere un\'altra occasione.', 'La prossima volta faremo meglio.'], formal: ['Saremmo lieti di poter migliorare la sua esperienza.', 'Speriamo di servirla meglio la prossima volta.'] },
        baja:  { cercano: ['La prossima volta chiedi del responsabile, ci occuperemo di te personalmente.', 'Vorremmo rimediare: chiedi pure del responsabile.'], formal: ['La invitiamo a contattarci direttamente per risolvere di persona.', 'Vorremmo poter rimediare di persona.'] }
      },
      firma: { cercano: 'Il team di {l}', formal: 'La direzione di {l}' },
      y: ' e '
    }
  };

  const IDIOMAS = { es: 'Español', en: 'Inglés', de: 'Alemán', fr: 'Francés', it: 'Italiano' };

  /* Nombre de pila: «María G.» → «María». Si Google da un anónimo
     («Un usuario de Google»), mejor no saludar por el nombre. */
  function nombrePila(autor) {
    const a = String(autor || '').trim();
    if (!a || /usuario de google|google user|anonym|anónimo/i.test(a)) return '';
    return a.split(/\s+/)[0].replace(/[^\p{L}'-]/gu, '').slice(0, 30);
  }

  /* Las frases de elogio y de queja están escritas tuteando. En tono formal
     se pasan a usted (español) o a Lei (italiano); inglés, alemán y francés
     ya valen igual para los dos tonos. */
  const A_USTED = {
    es: [[/\bTienes razón\b/g, 'Tiene razón'], [/\bcomentas\b/g, 'comenta'], [/\bcuentas\b/g, 'cuenta'], [/\bdices\b/g, 'dice'],
         [/\bestuvieras\b/g, 'estuviera'], [/\bdisfrutaras\b/g, 'disfrutara'], [/\bte gustara\b/g, 'le gustara'], [/\bte gustaran\b/g, 'le gustaran'],
         [/\bte pareciera\b/g, 'le pareciera'], [/\bos espera\b/g, 'le espera'], [/\bTu comentario\b/g, 'Su comentario'], [/\btu comentario\b/g, 'su comentario'],
         [/\bQue disfrutaras\b/g, 'Que disfrutara'], [/\bnos podías\b/g, 'nos podía']],
    it: [[/\bHai ragione\b/g, 'Ha ragione'], [/\bracconti\b/g, 'racconta'], [/\bti sia piaciuto\b/g, 'le sia piaciuto'], [/\bti siano piaciuti\b/g, 'le siano piaciuti'],
         [/\bti siano piaciute\b/g, 'le siano piaciute'], [/\bti sia trovato\/a\b/g, 'si sia trovato/a'], [/\bti aspetta\b/g, 'la aspetta'],
         [/\bti sia sembrato\b/g, 'le sia sembrato'], [/\btuoi complimenti\b/g, 'suoi complimenti'], [/\bIl tuo commento\b/g, 'Il suo commento'],
         [/\bil tuo commento\b/g, 'il suo commento'], [/\btu abbia\b/g, 'lei abbia']]
  };
  function trato(frase, idioma, tono) {
    if (tono !== 'formal' || !A_USTED[idioma]) return frase;
    return A_USTED[idioma].reduce((f, par) => f.replace(par[0], par[1]), frase);
  }

  const elige = (lista, v) => lista[((v % lista.length) + lista.length) % lista.length];
  const rellena = (s, n, l) => s.replace(/\{n\}/g, n).replace(/\{l\}/g, l);

  /* La receta: saludo + apertura + (lo que menciona) + cierre + firma.
     En las buenas se celebra lo que ha gustado; en las flojas se contesta
     a la queja concreta. Nunca se discute con el cliente ni se dan datos
     suyos: la respuesta es pública y la lee todo el que busca el local. */
  function proponer(op) {
    op = op || {};
    const estrellas = Math.max(1, Math.min(5, parseInt(op.estrellas, 10) || 5));
    const idioma = T[op.idioma] ? op.idioma : detectarIdioma(op.texto);
    const tono = op.tono === 'formal' ? 'formal' : 'cercano';
    const v = parseInt(op.variante, 10) || 0;
    const local = String(op.local || 'nuestro local').trim().slice(0, 60);
    const L = T[idioma];
    const b = banda(estrellas);
    const n = nombrePila(op.autor);
    const temas = temasDe(op.texto);

    const partes = [];
    partes.push(n ? rellena(elige(L.hola[tono], v), n, local) : elige(L.holaSin[tono], v));
    partes.push(elige(L.abre[b][tono], v));

    /* Qué se celebra y qué se contesta como queja. La espera, el precio y
       la limpieza casi siempre salen para quejarse; el resto (comida,
       bebida, trato, ambiente) suele ser elogio salvo en 1-2 estrellas. */
    const QUEJA = ['espera', 'precio', 'limpieza'];
    let buenos = [], malos = [];
    if (b === 'alta') buenos = temas.filter(t => L.bien[t]);
    else if (b === 'buena' || b === 'media') {
      /* «el servicio fue lento» no es un elogio al equipo: si se queja de
         la espera, el trato no se celebra. */
      buenos = temas.filter(t => L.bien[t] && QUEJA.indexOf(t) < 0 && !(t === 'servicio' && temas.indexOf('espera') >= 0));
      malos = temas.filter(t => QUEJA.indexOf(t) >= 0);
    } else {
      malos = temas.filter(t => QUEJA.indexOf(t) >= 0 || t === 'servicio');
      if (!malos.length) malos = temas.filter(t => L.mal[t]);
    }
    buenos = buenos.slice(0, 2); malos = malos.filter(t => L.mal[t]).slice(0, 2);
    if (buenos.length) {
      const frases = buenos.map((t, i) => trato(elige(L.bien[t], v + i), idioma, tono));
      partes.push(frases.map((f, i) => i ? f.charAt(0).toLowerCase() + f.slice(1) : f).join(L.y).replace(/[.!]*$/, '') + '.');
    }
    malos.forEach((t, i) => partes.push(trato(elige(L.mal[t], v + i), idioma, tono) + '.'));
    partes.push(rellena(elige(L.cierra[b][tono], v), n, local));

    const firma = op.firma ? String(op.firma).trim().slice(0, 80) : rellena(L.firma[tono], n, local);
    /* Un saludo formal («Estimado/a Carlos:») va en su propia línea. */
    const saludo = partes.shift();
    const resto = partes.join(' ').replace(/\s+/g, ' ').replace(/\.\./g, '.').trim();
    const cuerpo = /[:,]$/.test(saludo) ? saludo + '\n\n' + resto : saludo + ' ' + resto;
    return { texto: cuerpo + '\n\n' + firma, idioma, temas, tono, origen: 'plantilla' };
  }

  return { proponer, detectarIdioma, temasDe, IDIOMAS, nombrePila };
}));
