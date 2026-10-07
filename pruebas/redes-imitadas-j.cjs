/* Chispa · APIs de Meta, Google, YouTube y TikTok IMITADAS para las pruebas de la bandeja,
   estadísticas, anuncios y automatizaciones (forma de las respuestas: la de su documentación oficial).
   Uso: const R = require('./redes-imitadas-j.cjs'); R.instalar(sim)  (sim = arrancar() del simulador) */
const HOY = new Date(), ayer = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const comentarioCarta = { id: 'k3', text: 'CARTA', username: 'joana.mallorca', timestamp: HOY.toISOString(), from: { id: 'u3', username: 'joana.mallorca' } };
let comentariosIG = [
  { id: 'k1', text: '¿Abrís los domingos a mediodía?', username: 'marta.palma', timestamp: HOY.toISOString(), from: { id: 'u1', username: 'marta.palma' } },
  { id: 'k2', text: 'Gracias!', username: 'elparaiso', timestamp: HOY.toISOString(), from: { id: 'ig9', username: 'elparaiso' } }, // nuestro: no entra
];
const redesJ = [
  // ---- Instagram ----
  [/v21\.0\/ig9\?/, (u) => [200, u.searchParams.get('fields').includes('followers_count') ? { followers_count: 1210, media_count: 124 } : { username: 'elparaiso' }]],
  [/v21\.0\/ig9\/media\?/, () => [200, { data: [{ id: 'med1', caption: 'Paella de los domingos 🥘', permalink: 'https://instagram.com/p/x', timestamp: HOY.toISOString(), comments_count: 3 }, { id: 'med2', caption: 'Sin comentarios', comments_count: 0 }] }]],
  [/v21\.0\/med1\/comments/, () => [200, { data: comentariosIG }]],
  [/v21\.0\/k\d\/replies/, () => [200, { id: 'resp-ig-1' }]],
  [/v21\.0\/ig9\/insights/, () => [200, { data: [{ name: 'reach', total_value: { value: 512 } }, { name: 'views', total_value: { value: 1400 } }, { name: 'profile_views', total_value: { value: 40 } }, { name: 'website_clicks', total_value: { value: 9 } }, { name: 'total_interactions', total_value: { value: 37 } }] }]],
  // ---- Facebook ----
  [/v21\.0\/p2\/feed\?/, (u, o) => [200, { data: [{ id: 'p2_1', message: 'Menú del día', permalink_url: 'https://facebook.com/p2_1', comments: { data: [{ id: 'fc1', message: 'La paella estaba buenísima 😍', from: { id: 'u5', name: 'Carmen López' }, created_time: HOY.toISOString() }, { id: 'fc2', message: 'Gracias Carmen', from: { id: 'p2', name: 'El Paraíso' }, created_time: HOY.toISOString() }] } }] }]],
  [/v21\.0\/p2\/conversations\?/, (u) => [200, u.searchParams.get('platform') === 'instagram'
    ? { data: [{ id: 'cv-ig-1', participants: { data: [{ id: 'ig9', username: 'elparaiso' }, { id: 'igsid-7', username: 'toni.f' }] }, messages: { data: [{ id: 'mm2', message: 'Quiero reservar para 8 personas el viernes', from: { id: 'igsid-7', username: 'toni.f' }, created_time: HOY.toISOString() }, { id: 'mm1', message: 'Hola', from: { id: 'igsid-7' }, created_time: new Date(Date.now() - 6e4).toISOString() }] } }] }
    : { data: [] }]],
  [/v21\.0\/p2\/messages/, () => [200, { recipient_id: 'x', message_id: 'mid.1' }]],
  [/v21\.0\/fc\d\/comments/, () => [200, { id: 'resp-fb-1' }]],
  [/v21\.0\/p2\/insights/, () => [200, { data: [{ name: 'page_impressions_unique', values: [{ value: 180 }] }, { name: 'page_post_engagements', values: [{ value: 12 }] }] }]],
  [/v21\.0\/p2\?fields=followers_count/, () => [200, { followers_count: 905, fan_count: 900 }]],
  // ---- anuncios Meta ----
  [/v21\.0\/me\/adaccounts/, () => [200, { data: [{ id: 'act_555', account_id: '555', name: 'El Paraíso Ads', currency: 'EUR', account_status: 1 }] }]],
  [/v21\.0\/act_555\/campaigns/, () => [200, { id: 'camp1' }]],
  [/v21\.0\/act_555\/adsets/, () => [200, { id: 'set1' }]],
  [/v21\.0\/act_555\/adcreatives/, () => [200, { id: 'cre1' }]],
  [/v21\.0\/act_555\/ads/, () => [200, { id: 'ad1' }]],
  [/v21\.0\/camp1\/insights/, () => [200, { data: [{ impressions: '3200', reach: '2100', clicks: '87', spend: '14.20', ctr: '2.7', cpc: '0.16', actions: [{ action_type: 'link_click', value: '61' }] }] }]],
  [/v21\.0\/(camp1|set1|ad1)$/, () => [200, { success: true }]],
  // ---- Google ----
  [/mybusiness\.googleapis\.com\/v4\/accounts\/111\/locations\/222\/reviews\?/, () => [200, { reviews: [
    { reviewId: 'rv5', name: 'accounts/111/locations/222/reviews/rv5', reviewer: { displayName: 'Peter Schmidt' }, starRating: 'FIVE', comment: 'Sehr leckeres Essen und super freundlich!', createTime: HOY.toISOString() },
    { reviewId: 'rv2', name: 'accounts/111/locations/222/reviews/rv2', reviewer: { displayName: 'Laura M.' }, starRating: 'TWO', comment: 'Tardaron mucho y la carne llegó fría.', createTime: HOY.toISOString() },
    { reviewId: 'rv4', name: 'accounts/111/locations/222/reviews/rv4', reviewer: { displayName: 'Ana' }, starRating: 'FOUR', comment: 'Muy bien', createTime: HOY.toISOString(), reviewReply: { comment: 'Gracias Ana' } }] }]],
  [/reviews\/rv\d\/reply/, () => [200, { comment: 'ok' }]],
  [/businessprofileperformance\.googleapis\.com\/v1\/locations\/222:fetchMultiDailyMetricsTimeSeries/, () => {
    const [y, m, d] = ayer.split('-').map(Number);
    const serie = (k, v) => ({ dailyMetric: k, timeSeries: { datedValues: [{ date: { year: y, month: m, day: d }, value: String(v) }] } });
    return [200, { multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [serie('BUSINESS_IMPRESSIONS_MOBILE_MAPS', 150), serie('BUSINESS_IMPRESSIONS_MOBILE_SEARCH', 60), serie('CALL_CLICKS', 4), serie('BUSINESS_DIRECTION_REQUESTS', 13), serie('WEBSITE_CLICKS', 8)] }] }];
  }],
  // ---- YouTube ----
  [/youtube\/v3\/commentThreads/, () => [200, { items: [{ id: 'th1', snippet: { topLevelComment: { snippet: { textOriginal: '¿Cuánto cuesta el menú del día?', authorDisplayName: 'Sergi', publishedAt: HOY.toISOString(), videoId: 'v1', authorChannelId: { value: 'UCotro' } } } } }] }]],
  [/youtube\/v3\/comments\?part=snippet/, () => [200, { id: 'yt-resp-1' }]],
  [/youtube\/v3\/channels\?part=statistics/, () => [200, { items: [{ statistics: { subscriberCount: '41' } }] }]],
  [/youtubeanalytics\.googleapis\.com\/v2\/reports\?ids=channel==MINE&dimensions=day/, () => [200, { rows: [[ayer, 230, 12, 2, 3, 1]] }]],
  // ---- TikTok ----
  [/open\.tiktokapis\.com\/v2\/user\/info\/\?fields=follower_count/, () => [200, { data: { user: { follower_count: 77, likes_count: 900, video_count: 5 } }, error: { code: 'ok' } }]],
  [/open\.tiktokapis\.com\/v2\/video\/list/, () => [200, { data: { videos: [{ id: 'tv1', view_count: 1000, like_count: 50, comment_count: 4, share_count: 2 }] }, error: { code: 'ok' } }]],
];


function instalar(s) { for (const r of redesJ.slice().reverse()) s.respuestas.unshift(r); }
module.exports = { instalar, ayer, llegaCarta: () => { if (!comentariosIG.includes(comentarioCarta)) comentariosIG = comentariosIG.concat([comentarioCarta]); } };
